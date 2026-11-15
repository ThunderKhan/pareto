/** Operational kill switch for new resume work; existing records remain readable. */
export function isResumeIngestionEnabled() {
  return process.env.RESUME_INGESTION_ENABLED !== "false";
}
