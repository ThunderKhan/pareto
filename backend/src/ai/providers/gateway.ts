import { randomUUID } from "node:crypto";
import { AiFailure, canFallback, classifyProviderError } from "../contracts/errors";
import type { AiTaskId } from "../contracts/task";
import { taskDefinition } from "../registry";
import { recordSafeUsage } from "../observability/usage";
import { aiProcessLimiter } from "./budgets";
import { providerCircuitBreaker } from "./circuit-breaker";
import { availableProviders, type JsonProvider } from "./http";

const TOTAL_DEADLINE_MS = 15000;
export type AiCallContext = { ownerId?: string; taskId?: AiTaskId };
/** One model attempt per provider. Secondary is allowed only for transient/schema errors. */
export async function proposeStructured<T extends object>(
  system: string, input: string, validate: (raw: unknown) => T,
  providers: JsonProvider[] = availableProviders(),
  context: AiCallContext = {},
): Promise<T & { provider: string }> {
  const taskId = context.taskId ?? "search.interpret.v1";
  const config = taskDefinition(taskId);
  if (process.env.AI_ENABLED === "false") throw new AiFailure("BUDGET_EXCEEDED", false);
  if (!providers.length) throw new AiFailure("AUTH_CONFIG", false);
  // 512 bytes of JSON envelope slack, not arbitrary unbounded source content.
  if (input.length > config.maxInputChars + 512 || system.length > 12000)
    throw new AiFailure("BAD_INPUT", false);
  const requestId = randomUUID(), started = Date.now();
  const selected = process.env.AI_FALLBACK_ENABLED === "false" ? providers.slice(0, 1) : providers.slice(0, 2);
  let last = new AiFailure("OUTPUT_INVALID", false);
  for (const [index, provider] of selected.entries()) {
    const remaining = TOTAL_DEADLINE_MS - (Date.now() - started);
    if (remaining < 100) { last = new AiFailure("TIMEOUT"); break; }
    if (provider.providerName && !providerCircuitBreaker.allows(provider.providerName)) {
      last = new AiFailure("PROVIDER_5XX");
      continue;
    }
    // Each fallback consumes a separate budget reservation. This is per-process only.
    const release = aiProcessLimiter.acquire(context.ownerId ?? "unscoped");
    const attemptStarted = Date.now();
    try {
      const response = await provider(system, input, Math.min(9000, remaining));
      let proposal: T;
      try { proposal = validate(response.raw); }
      catch { throw new AiFailure("OUTPUT_INVALID", false); }
      if (provider.providerName) providerCircuitBreaker.onSuccess(provider.providerName);
      recordSafeUsage({
        taskId, requestId, provider: response.provider === "Groq" ? "Groq" : "Gemini",
        outcome: "ok", latencyMs: Date.now() - attemptStarted,
        modelId: response.modelId, promptVersion: config.promptVersion, schemaVersion: config.schemaVersion,
        inputTokens: response.inputTokens, outputTokens: response.outputTokens,
      });
      return { ...proposal, provider: response.provider };
    } catch (error) {
      last = classifyProviderError(error);
      if (provider.providerName) providerCircuitBreaker.onFailure(provider.providerName, last.code);
      recordSafeUsage({ taskId, requestId, provider: provider.providerName ?? (index === 0 ? "Gemini" : "Groq"),
        outcome: last.code, latencyMs: Date.now() - attemptStarted,
        promptVersion: config.promptVersion, schemaVersion: config.schemaVersion });
      if (!canFallback(last.code) || index === selected.length - 1) break;
    } finally { release(); }
  }
  throw last;
}
