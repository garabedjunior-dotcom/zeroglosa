import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("ia.chat com contexto de lote", () => {
  it("deve incluir dados do lote quando loteId é fornecido", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Primeiro, buscar lotes existentes
    const lotes = await caller.lotes.list();
    
    if (lotes.length === 0) {
      console.log("Nenhum lote disponível para teste");
      return;
    }

    const loteId = lotes[0]!.id;

    // Fazer pergunta com contexto de lote
    const response = await caller.ia.chat({
      message: "Quais são os principais riscos deste lote?",
      loteId,
    });

    expect(response).toHaveProperty('resposta');
    expect(typeof response.resposta).toBe('string');
    expect(response.resposta.length).toBeGreaterThan(0);
  });

  it("deve funcionar sem loteId (pergunta genérica)", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const response = await caller.ia.chat({
      message: "O que é o padrão TISS?",
    });

    expect(response).toHaveProperty('resposta');
    expect(typeof response.resposta).toBe('string');
    expect(response.resposta.length).toBeGreaterThan(0);
  });
});

describe("ia.explicarRisco", () => {
  it("deve gerar análise de risco com dados reais do lote", { timeout: 30000 }, async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const lotes = await caller.lotes.list();
    
    if (lotes.length === 0) {
      console.log("Nenhum lote disponível para teste");
      return;
    }

    const loteId = lotes[0]!.id;

    const response = await caller.ia.explicarRisco({
      loteId,
    });

    expect(response).toHaveProperty('analise');
    expect(typeof response.analise).toBe('string');
    expect(response.analise.length).toBeGreaterThan(50);
  });
});
