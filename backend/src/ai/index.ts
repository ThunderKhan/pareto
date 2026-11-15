/** Server-only AI task entrypoint. Do not import from browser code. */
export { proposeSearchDraft } from "./tasks/search-interpret";
export { proposeRefinementDraft } from "./tasks/search-refine";
export { aiRegistry } from "./registry";
export type { AiTaskId, AiResult } from "./contracts/task";
export { proposeEvidenceReview } from "./tasks/evidence-review";
