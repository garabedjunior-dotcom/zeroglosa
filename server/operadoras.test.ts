import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

describe("operadoras.list", () => {
  it("retorna lista de operadoras para usuário autenticado", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.operadoras.list();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Verificar estrutura de uma operadora
    if (result.length > 0) {
      const operadora = result[0];
      expect(operadora).toHaveProperty('id');
      expect(operadora).toHaveProperty('nome');
      expect(operadora).toHaveProperty('codigo');
      expect(operadora).toHaveProperty('ativa');
    }
  });
});

describe("dashboard.kpis", () => {
  it("retorna KPIs do dashboard para usuário autenticado", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.kpis();

    expect(result).toHaveProperty('totalLotes');
    expect(result).toHaveProperty('lotesAprovados');
    expect(result).toHaveProperty('lotesGlosados');
    expect(result).toHaveProperty('taxaAprovacao');
    expect(result).toHaveProperty('valorTotal');
    expect(result).toHaveProperty('valorGlosado');
    expect(result).toHaveProperty('valorRecuperado');
    
    expect(typeof result?.totalLotes).toBe('number');
    expect(typeof result?.taxaAprovacao).toBe('string');
  });
});
