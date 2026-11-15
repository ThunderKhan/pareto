export const errorCodes = [
  "BAD_INPUT", "AUTH_CONFIG", "RATE_LIMIT", "PROVIDER_5XX", "TIMEOUT", "NETWORK",
  "OUTPUT_INVALID", "SEMANTIC_UNVERIFIED", "BUDGET_EXCEEDED", "CANCELLED",
] as const;
export type AiErrorCode = typeof errorCodes[number];
const transient = new Set<AiErrorCode>(["RATE_LIMIT", "PROVIDER_5XX", "TIMEOUT", "NETWORK"]);
const fallbackEligible = new Set<AiErrorCode>([...transient, "OUTPUT_INVALID", "SEMANTIC_UNVERIFIED"]);
export class AiFailure extends Error {
  constructor(readonly code: AiErrorCode, readonly retryable = transient.has(code)) {
    super("AI could not produce a verified draft. Try again or enter criteria manually.");
    this.name = "AiFailure";
  }
}
export function canFallback(code: AiErrorCode) { return fallbackEligible.has(code); }
export function classifyProviderError(error: unknown): AiFailure {
  if (error instanceof AiFailure) return error;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return new AiFailure("TIMEOUT");
  if (error instanceof SyntaxError) return new AiFailure("OUTPUT_INVALID", false);
  if (error instanceof TypeError) return new AiFailure("NETWORK");
  return new AiFailure("OUTPUT_INVALID", false);
}
export function classifyHttpStatus(status: number): AiFailure {
  if (status === 401 || status === 403) return new AiFailure("AUTH_CONFIG", false);
  if (status === 429) return new AiFailure("RATE_LIMIT");
  if (status >= 500) return new AiFailure("PROVIDER_5XX");
  return new AiFailure("BAD_INPUT", false);
}
