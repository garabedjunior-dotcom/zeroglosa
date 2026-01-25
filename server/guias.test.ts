import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Guias Router", () => {
  let testLoteId: number;
  let testGuiaId: number;
  const testUserId = 1; // ID numérico do usuário de teste

  beforeAll(async () => {
    // Criar lote de teste
    const lote = await db.createLote({
      userId: testUserId,
      operadoraId: 1,
      numeroLote: "TEST-GUIAS-001",
      dataEnvio: null,
      status: "revisar",
      scoreRisco: 0,
      valorTotal: 50000,
      quantidadeGuias: 1,
      origem: "xml",
      observacoes: "Lote de teste para edição de guias",
    });
    testLoteId = lote.id;

    // Criar guia de teste
    const guia = await db.createGuia({
      loteId: testLoteId,
      nomePaciente: "João Silva",
      cpfPaciente: "12345678901",
      numeroCarteirinha: "123456",
      codigoTUSS: "40101010",
      cid: "A00.0",
      valorProcedimento: 50000,
      nomeMedico: "Dr. Pedro Santos",
      crm: "12345-SP",
    });
    testGuiaId = guia.id;
  });

  it("deve listar guias de um lote", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const guias = await caller.guias.listByLote({ loteId: testLoteId });
    
    expect(guias).toBeDefined();
    expect(Array.isArray(guias)).toBe(true);
    expect(guias.length).toBeGreaterThan(0);
    expect(guias[0].loteId).toBe(testLoteId);
  });

  it("deve atualizar CPF de uma guia", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const novoCPF = "98765432100";
    const result = await caller.guias.update({
      id: testGuiaId,
      cpfPaciente: novoCPF,
    });

    expect(result.success).toBe(true);

    // Verificar se foi atualizado
    const guias = await caller.guias.listByLote({ loteId: testLoteId });
    const guiaAtualizada = guias.find(g => g.id === testGuiaId);
    expect(guiaAtualizada?.cpfPaciente).toBe(novoCPF);
  });

  it("deve atualizar código TUSS de uma guia", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const novoTUSS = "40202020";
    const result = await caller.guias.update({
      id: testGuiaId,
      codigoTUSS: novoTUSS,
    });

    expect(result.success).toBe(true);

    // Verificar se foi atualizado
    const guias = await caller.guias.listByLote({ loteId: testLoteId });
    const guiaAtualizada = guias.find(g => g.id === testGuiaId);
    expect(guiaAtualizada?.codigoTUSS).toBe(novoTUSS);
  });

  it("deve atualizar CID de uma guia", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const novoCID = "B01.1";
    const result = await caller.guias.update({
      id: testGuiaId,
      cid: novoCID,
    });

    expect(result.success).toBe(true);

    // Verificar se foi atualizado
    const guias = await caller.guias.listByLote({ loteId: testLoteId });
    const guiaAtualizada = guias.find(g => g.id === testGuiaId);
    expect(guiaAtualizada?.cid).toBe(novoCID);
  });

  it("deve atualizar múltiplos campos de uma vez", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, name: "Test User", email: "test@example.com", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.guias.update({
      id: testGuiaId,
      nomePaciente: "Maria Oliveira",
      cpfPaciente: "11122233344",
      valorProcedimento: 75000,
    });

    expect(result.success).toBe(true);

    // Verificar se todos os campos foram atualizados
    const guias = await caller.guias.listByLote({ loteId: testLoteId });
    const guiaAtualizada = guias.find(g => g.id === testGuiaId);
    expect(guiaAtualizada?.nomePaciente).toBe("Maria Oliveira");
    expect(guiaAtualizada?.cpfPaciente).toBe("11122233344");
    expect(guiaAtualizada?.valorProcedimento).toBe(75000);
  });
});
