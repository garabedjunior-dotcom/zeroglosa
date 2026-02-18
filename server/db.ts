import { eq, desc, and, sql, count as sqlCount } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  operadoras,
  lotes,
  guias,
  regras,
  regraHistorico,
  conversoesOCR,
  interacoesIA,
  validacoes,
  InsertOperadora,
  InsertLote,
  InsertGuia,
  InsertRegra,
  InsertRegraHistorico,
  InsertConversaoOCR,
  InsertInteracaoIA,
  InsertValidacao,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Operadoras
export async function getAllOperadoras() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(operadoras).where(eq(operadoras.ativa, 1)).orderBy(operadoras.nome);
}

/** Alias para getAllOperadoras — usado em relatórios */
export const listOperadoras = getAllOperadoras;

export async function getOperadoraById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(operadoras).where(eq(operadoras.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createOperadora(data: InsertOperadora) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(operadoras).values(data);
  return result;
}

// Lotes
export async function getLotesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(lotes).where(eq(lotes.userId, userId)).orderBy(desc(lotes.createdAt));
}

export async function getLotesByUserIdPaginated(
  userId: number,
  page: number,
  limit: number,
) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const offset = (page - 1) * limit;

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(lotes)
      .where(eq(lotes.userId, userId))
      .orderBy(desc(lotes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sqlCount() })
      .from(lotes)
      .where(eq(lotes.userId, userId)),
  ]);

  return { items, total: Number(total) };
}

export async function getLoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lotes).where(eq(lotes.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createLote(data: InsertLote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(lotes).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(lotes).where(eq(lotes.id, insertId)).limit(1);
  return created[0];
}

export async function updateLote(id: number, data: Partial<InsertLote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(lotes).set(data).where(eq(lotes.id, id));
}

// Guias
export async function getGuiasByLoteId(loteId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(guias).where(eq(guias.loteId, loteId)).orderBy(guias.id);
}

export async function getGuiaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(guias).where(eq(guias.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createGuia(data: InsertGuia) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(guias).values(data);
  const insertId = result[0].insertId;
  const created = await db.select().from(guias).where(eq(guias.id, insertId)).limit(1);
  return created[0];
}

export async function updateGuia(id: number, data: Partial<InsertGuia>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(guias).set(data).where(eq(guias.id, id));
}

// Regras
export async function getRegrasByOperadoraId(operadoraId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(regras).where(
    and(eq(regras.operadoraId, operadoraId), eq(regras.ativa, 1))
  ).orderBy(regras.tipoRegra);
}

export async function createRegra(data: InsertRegra) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(regras).values(data);
  return true;
}

export async function updateRegra(id: number, data: Partial<InsertRegra>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(regras).set(data).where(eq(regras.id, id));
}

export async function getRegraById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(regras).where(eq(regras.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function desativarRegra(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(regras).set({ ativa: 0 }).where(eq(regras.id, id));
}

// Histórico de alterações de regras
export async function createRegraHistorico(data: InsertRegraHistorico) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(regraHistorico).values(data);
}

export async function getRegraHistoricoByOperadora(operadoraId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(regraHistorico)
    .where(eq(regraHistorico.operadoraId, operadoraId))
    .orderBy(desc(regraHistorico.createdAt))
    .limit(limit);
}

// Conversões OCR
export async function createConversaoOCR(data: InsertConversaoOCR) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(conversoesOCR).values(data);
  return true;
}

export async function updateConversaoOCR(id: number, data: Partial<InsertConversaoOCR>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(conversoesOCR).set(data).where(eq(conversoesOCR.id, id));
}

export async function getConversaoOCRById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversoesOCR).where(eq(conversoesOCR.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// Interações IA
export async function createInteracaoIA(data: InsertInteracaoIA) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(interacoesIA).values(data);
  return true;
}

export async function getInteracoesByLoteId(loteId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(interacoesIA).where(eq(interacoesIA.loteId, loteId)).orderBy(desc(interacoesIA.createdAt));
}

// Dashboard KPIs — uses SQL aggregations to avoid loading all rows into memory
export async function getDashboardKPIs(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [counts] = await db
    .select({
      totalLotes: sql<number>`COUNT(*)`,
      lotesAprovados: sql<number>`SUM(CASE WHEN ${lotes.status} = 'aprovado' THEN 1 ELSE 0 END)`,
      lotesGlosados: sql<number>`SUM(CASE WHEN ${lotes.status} = 'glosa' THEN 1 ELSE 0 END)`,
      valorTotal: sql<number>`COALESCE(SUM(${lotes.valorTotal}), 0)`,
      valorGlosado: sql<number>`COALESCE(SUM(CASE WHEN ${lotes.status} = 'glosa' THEN ${lotes.valorTotal} ELSE 0 END), 0)`,
    })
    .from(lotes)
    .where(eq(lotes.userId, userId));

  const totalLotes = Number(counts.totalLotes ?? 0);
  const lotesAprovados = Number(counts.lotesAprovados ?? 0);
  const lotesGlosados = Number(counts.lotesGlosados ?? 0);
  const valorTotal = Number(counts.valorTotal ?? 0);
  const valorGlosado = Number(counts.valorGlosado ?? 0);

  return {
    totalLotes,
    lotesAprovados,
    lotesGlosados,
    taxaAprovacao: totalLotes > 0 ? ((lotesAprovados / totalLotes) * 100).toFixed(1) : '0',
    valorTotal,
    valorGlosado,
    valorRecuperado: valorTotal - valorGlosado,
  };
}

// Validações
export async function createValidacao(data: InsertValidacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(validacoes).values(data);
  return true;
}

export async function getValidacoesByLoteId(loteId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(validacoes).where(eq(validacoes.loteId, loteId)).orderBy(desc(validacoes.createdAt));
}

export async function deleteValidacoesByLoteId(loteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(validacoes).where(eq(validacoes.loteId, loteId));
  return true;
}

