/** Operational kill switch for new resume work; existing records remain readable. */
export function isResumeIngestionEnabled() {
  return process.env.RESUME_INGESTION_ENABLED !== "false";
}

/** Embedding calls during ingestion are optional and consume a separate AI attempt.
 * Skip them unless semantic retrieval is explicitly enabled. When enabled later,
 * run the existing idempotent owner-scoped semantic backfill.
 */
export function shouldIndexResumeCandidate() {
  return process.env.PARETO_SEMANTIC_SEARCH === "1" &&
    process.env.AI_ENABLED !== "false" && Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
