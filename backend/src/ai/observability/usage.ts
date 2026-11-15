import type { AiTaskId } from "../contracts/task";
import type { AiErrorCode } from "../contracts/errors";

export type SafeUsageEvent = Readonly<{
  taskId: AiTaskId;
  provider: "Gemini" | "Groq";
  requestId: string;
  modelId?: string;
  promptVersion: string;
  schemaVersion: string;
  latencyMs: number;
  outcome: "ok" | AiErrorCode;
  inputTokens?: number;
  outputTokens?: number;
}>;
const recent: SafeUsageEvent[] = [];
/**
 * No PII, raw prompts, response bodies, owner IDs, document keys or secrets.
 * In-memory diagnostics are illustrative, NOT a durable monetary ledger.
 */
export function recordSafeUsage(event: SafeUsageEvent) {
  recent.push(Object.freeze({ ...event }));
  if (recent.length > 256) recent.splice(0, recent.length - 256);
}
export function localUsageSnapshot(): Readonly<{
  attempts: number; failed: number; groqAttempts: number;
  recordedInputTokens: number; recordedOutputTokens: number;
}> {
  return {
    attempts: recent.length,
    failed: recent.filter(e => e.outcome !== "ok").length,
    groqAttempts: recent.filter(e => e.provider === "Groq").length,
    recordedInputTokens: recent.reduce((n, e) => n + (e.inputTokens ?? 0), 0),
    recordedOutputTokens: recent.reduce((n, e) => n + (e.outputTokens ?? 0), 0),
  };
}


export type ProviderLatencySnapshot = Record<"Gemini" | "Groq", {
  samples: number; failures: number; p50Ms: number | null; p95Ms: number | null;
}>;
/** Process-only summary: no request, owner, model, input or response identity. */
export function localProviderLatencySnapshot(): ProviderLatencySnapshot {
  const result = {} as ProviderLatencySnapshot;
  for (const provider of ["Gemini", "Groq"] as const) {
    const rows = recent.filter(event => event.provider === provider);
    const times = rows.map(event => event.latencyMs)
      .filter(ms => Number.isFinite(ms) && ms >= 0).sort((a, b) => a - b);
    const percentile = (q: number) => times.length ? times[Math.ceil(times.length * q) - 1] : null;
    result[provider] = { samples: rows.length,
      failures: rows.filter(event => event.outcome !== "ok").length,
      p50Ms: percentile(0.5), p95Ms: percentile(0.95) };
  }
  return result;
}
