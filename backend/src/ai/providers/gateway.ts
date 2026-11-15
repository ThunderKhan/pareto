import { AiFailure, canFallback, classifyProviderError } from "../contracts/errors";
import { availableProviders, type JsonProvider } from "./http";

const TOTAL_DEADLINE_MS = 15000;
/**
 * One bounded call per approved provider. Output-invalid fallback is intentional
 * schema recovery; invalid credentials, bad input and exhausted budgets fail closed.
 * Does not retry the same provider, preventing unbounded bills.
 */
export async function proposeStructured<T extends object>(
  system: string, input: string, validate: (raw: unknown) => T,
  providers: JsonProvider[] = availableProviders(),
): Promise<T & { provider: string }> {
  if (process.env.AI_ENABLED === "false") throw new AiFailure("BUDGET_EXCEEDED", false);
  if (!providers.length) throw new AiFailure("AUTH_CONFIG", false);
  if (input.length > 8000 || system.length > 10000) throw new AiFailure("BAD_INPUT", false);
  const started = Date.now();
  const selected = process.env.AI_FALLBACK_ENABLED === "false" ? providers.slice(0, 1) : providers.slice(0, 2);
  let last: AiFailure = new AiFailure("OUTPUT_INVALID", false);
  for (const [index, provider] of selected.entries()) {
    const remaining = TOTAL_DEADLINE_MS - (Date.now() - started);
    if (remaining < 100) { last = new AiFailure("TIMEOUT"); break; }
    try {
      const result = await provider(system, input, Math.min(9000, remaining));
      try { return { ...validate(result.raw), provider: result.provider }; }
      catch { throw new AiFailure("OUTPUT_INVALID", false); }
    } catch (error) {
      last = classifyProviderError(error);
      if (!canFallback(last.code) || index === selected.length - 1) break;
    }
  }
  throw last;
}
