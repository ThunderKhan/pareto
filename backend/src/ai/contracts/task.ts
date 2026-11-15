/** Pareto models propose data. Only the authenticated app may authorize side effects. */
export const taskIds = ["search.interpret.v1", "search.refine.v1", "resume.extract.v1", "resume.evidence-review.v1"] as const;
export type AiTaskId = typeof taskIds[number];
export type ProviderName = "Gemini" | "Groq";
export type SafeAiMetadata = Readonly<{
  taskId: AiTaskId;
  promptVersion: string;
  schemaVersion: string;
  provider: ProviderName;
  requestId: string;
  latencyMs: number;
}>;
export type AiResult<T> =
  | { status: "ok"; data: T; meta: SafeAiMetadata }
  | { status: "needs_review"; partial?: T; reasons: string[]; meta: SafeAiMetadata }
  | { status: "ambiguous"; questions: string[]; meta: SafeAiMetadata }
  | { status: "failed"; code: string; retryable: boolean; requestId: string };
