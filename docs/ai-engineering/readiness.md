# Operational readiness

The existing `GET /api/health` is liveness; it does not verify database access.
`GET /api/ready` performs a database connectivity query and returns HTTP 200 when the database is accessible and 503 when it is not.

AI is optional: a missing provider key does not fail required database readiness. The response includes only AI configuration status: disabled, unconfigured, partial, or configured. **Configured does not mean the provider was tested or is responding.** `ai.probed=false` makes this distinction explicit.

No model request is made, and no API key, model ID, DB connection string, tenant ID, resume, prompt, signed URL or error detail is exposed.

Use an independently gated opt-in live model smoke to test provider compatibility; separately check private Storage, the ingestion worker and the configured Supabase project.
