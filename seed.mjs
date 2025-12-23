import { drizzle } from "drizzle-orm/mysql2";
import { operadoras } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const operadorasPadrao = [
  { nome: "Unimed", codigo: "UNIMED" },
  { nome: "Bradesco Saúde", codigo: "BRADESCO" },
  { nome: "Amil", codigo: "AMIL" },
  { nome: "Porto Seguro Saúde", codigo: "PORTOSEGURO" },
  { nome: "SulAmérica Saúde", codigo: "SULAMERICA" },
  { nome: "NotreDame Intermédica", codigo: "NOTREDAME" },
  { nome: "Prevent Senior", codigo: "PREVENTSENIOR" },
  { nome: "Hapvida", codigo: "HAPVIDA" },
];

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    for (const op of operadorasPadrao) {
      await db.insert(operadoras).values(op).onDuplicateKeyUpdate({
        set: { nome: op.nome }
      });
      console.log(`✓ Operadora ${op.nome} inserida`);
    }

    console.log("✅ Seed concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  }
}

seed();
