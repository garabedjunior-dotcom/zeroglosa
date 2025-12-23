import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Operadoras de saúde cadastradas no sistema
 */
export const operadoras = mysqlTable("operadoras", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  ativa: int("ativa").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Operadora = typeof operadoras.$inferSelect;
export type InsertOperadora = typeof operadoras.$inferInsert;

/**
 * Lotes de guias TISS enviados
 */
export const lotes = mysqlTable("lotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  operadoraId: int("operadoraId").notNull(),
  numeroLote: varchar("numeroLote", { length: 100 }),
  status: mysqlEnum("status", ["pronto", "revisar", "critico", "enviado", "aprovado", "glosa"]).default("revisar").notNull(),
  scoreRisco: int("scoreRisco").default(0),
  origem: mysqlEnum("origem", ["xml", "ocr"]).default("xml").notNull(),
  xmlUrl: text("xmlUrl"),
  valorTotal: int("valorTotal").default(0),
  quantidadeGuias: int("quantidadeGuias").default(0),
  dataEnvio: timestamp("dataEnvio"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lote = typeof lotes.$inferSelect;
export type InsertLote = typeof lotes.$inferInsert;

/**
 * Guias individuais dentro de cada lote
 */
export const guias = mysqlTable("guias", {
  id: int("id").autoincrement().primaryKey(),
  loteId: int("loteId").notNull(),
  nomePaciente: varchar("nomePaciente", { length: 255 }),
  cpfPaciente: varchar("cpfPaciente", { length: 14 }),
  numeroCarteirinha: varchar("numeroCarteirinha", { length: 50 }),
  dataProcedimento: timestamp("dataProcedimento"),
  codigoTUSS: varchar("codigoTUSS", { length: 20 }),
  cid: varchar("cid", { length: 10 }),
  valorProcedimento: int("valorProcedimento").default(0),
  nomeMedico: varchar("nomeMedico", { length: 255 }),
  crm: varchar("crm", { length: 20 }),
  numeroAutorizacao: varchar("numeroAutorizacao", { length: 50 }),
  status: mysqlEnum("status", ["pendente", "aprovado", "glosado"]).default("pendente").notNull(),
  motivoGlosa: text("motivoGlosa"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Guia = typeof guias.$inferSelect;
export type InsertGuia = typeof guias.$inferInsert;

/**
 * Regras de validação por operadora
 */
export const regras = mysqlTable("regras", {
  id: int("id").autoincrement().primaryKey(),
  operadoraId: int("operadoraId").notNull(),
  tipoRegra: mysqlEnum("tipoRegra", ["autorizacao_previa", "documentos_obrigatorios", "limites_valor", "cid_compativel"]).notNull(),
  descricao: text("descricao").notNull(),
  codigoTUSS: varchar("codigoTUSS", { length: 20 }),
  valorMinimo: int("valorMinimo"),
  valorMaximo: int("valorMaximo"),
  prazoAutorizacao: int("prazoAutorizacao"),
  ativa: int("ativa").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Regra = typeof regras.$inferSelect;
export type InsertRegra = typeof regras.$inferInsert;

/**
 * Histórico de conversões OCR
 */
export const conversoesOCR = mysqlTable("conversoesOCR", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  loteId: int("loteId"),
  imagemUrl: text("imagemUrl").notNull(),
  textoExtraido: text("textoExtraido"),
  camposExtraidos: text("camposExtraidos"),
  status: mysqlEnum("status", ["processando", "concluido", "erro"]).default("processando").notNull(),
  mensagemErro: text("mensagemErro"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConversaoOCR = typeof conversoesOCR.$inferSelect;
export type InsertConversaoOCR = typeof conversoesOCR.$inferInsert;

/**
 * Interações com IA Copiloto
 */
export const interacoesIA = mysqlTable("interacoesIA", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  loteId: int("loteId"),
  tipoInteracao: mysqlEnum("tipoInteracao", ["chat", "explicar_risco", "gerar_recurso"]).notNull(),
  pergunta: text("pergunta"),
  resposta: text("resposta"),
  contexto: text("contexto"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InteracaoIA = typeof interacoesIA.$inferSelect;
export type InsertInteracaoIA = typeof interacoesIA.$inferInsert;

/**
 * Validações de lotes TISS
 */
export const validacoes = mysqlTable("validacoes", {
  id: int("id").autoincrement().primaryKey(),
  loteId: int("loteId").notNull(),
  tipoValidacao: varchar("tipoValidacao", { length: 100 }).notNull(),
  campo: varchar("campo", { length: 100 }),
  status: mysqlEnum("status", ["aprovado", "alerta", "erro"]).notNull(),
  mensagem: text("mensagem").notNull(),
  detalhes: text("detalhes"),
  critico: int("critico").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Validacao = typeof validacoes.$inferSelect;
export type InsertValidacao = typeof validacoes.$inferInsert;