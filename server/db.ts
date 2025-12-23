import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  operadoras, 
  lotes, 
  guias, 
  regras, 
  conversoesOCR, 
  interacoesIA,
  InsertOperadora,
  InsertLote,
  InsertGuia,
  InsertRegra,
  InsertConversaoOCR,
  InsertInteracaoIA
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

export async function getLoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lotes).where(eq(lotes.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createLote(data: InsertLote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(lotes).values(data);
  return true;
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

export async function createGuia(data: InsertGuia) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(guias).values(data);
  return true;
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

// Dashboard KPIs
export async function getDashboardKPIs(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Buscar todos os lotes do usuário
  const userLotes = await db.select().from(lotes).where(eq(lotes.userId, userId));
  
  // Calcular métricas
  const totalLotes = userLotes.length;
  const lotesAprovados = userLotes.filter(l => l.status === 'aprovado').length;
  const lotesGlosados = userLotes.filter(l => l.status === 'glosa').length;
  const valorTotal = userLotes.reduce((sum, l) => sum + (l.valorTotal || 0), 0);
  const valorGlosado = userLotes.filter(l => l.status === 'glosa').reduce((sum, l) => sum + (l.valorTotal || 0), 0);
  
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
