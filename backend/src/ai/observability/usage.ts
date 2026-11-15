import type { AiTaskId } from "../contracts/task";
import type { AiErrorCode } from "../contracts/errors";

export type SafeUsageEvent = Readonly<{
  taskId: AiTaskId;
  provider: "Gemini" | "Groq";
  requestId: string;
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
