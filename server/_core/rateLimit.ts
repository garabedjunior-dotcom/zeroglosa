/**
 * Rate limiter simples em memória.
 * Usa uma janela deslizante por chave (ex.: userId:endpoint).
 * Reinicia automaticamente após `windowMs` milissegundos.
 *
 * Suficiente para uma instância única; em multi-instância use Redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

interface RateLimitOptions {
  /** Janela de tempo em ms (padrão: 60 000 ms = 1 min) */
  windowMs?: number;
  /** Máximo de requisições por janela (padrão: 20) */
  max?: number;
}

/**
 * Testa se a chave excedeu o limite.
 * @returns `true` se ainda dentro do limite, `false` se bloqueado.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions = {}): boolean {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 20;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count += 1;
  store.set(key, entry);

  return entry.count <= max;
}

/** Retorna quantos segundos faltam para a janela reiniciar. */
export function retryAfterSeconds(key: string): number {
  const entry = store.get(key);
  if (!entry) return 0;
  return Math.ceil(Math.max(0, entry.resetAt - Date.now()) / 1000);
}

// Limpa entradas expiradas a cada 5 minutos para evitar leak de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 5 * 60_000).unref?.();
