# Pareto AI low-latency implementation

Status: code optimization; NOT a measured live Gemini/Groq or hosted-Supabase latency claim.

## Interactive search

- The deterministic evaluator is the foreground path. Semantic retrieval is **explicitly opt-in** with `PARETO_SEMANTIC_SEARCH=1`; this avoids an additional remote Gemini embedding request during a normal confirmed search.
- When explicitly enabled, semantic query embeddings use a per-process, 128-entry, 5-minute success-only cache. SHA-256 keys separate owner, model, embedding task and query. In-flight identical calls coalesce; failures are never cached.
- Gemini embedding calls now pass through the shared per-process limiter and, if enabled, PostgreSQL durable owner/global attempt quotas. This includes both candidate indexing and query embeddings. Each cache miss counts as a billable-attempt reservation.
- Existing deterministic eligibility and ranking priority remain authoritative. Semantic similarity only reranks deterministic ties.

## Limitations / release validation

- The cache is local to each process, not a distributed cross-replica cache. It stores embedding vectors only, no raw user input. Key material is hashed. Process restart flushes it.
- Semantic opt-in can change ordering of tied results compared with deterministic-only mode. Do not toggle it midway through a paginated search without resetting/reconfirming the result view.
- Timings from `localSearchPerformanceSnapshot()` are process-local, privacy-safe and bounded to 256 observations; they are not a production historical service-level report.
- Run real Gemini/Groq model-quality and end-to-end latency evaluations before citing any p50/p95 results.


## Confirmed search snapshot cache

- Apply `backend/prisma/migrations/20261115233000_search_snapshot_epoch/migration.sql` to the **authorized** database before enabling `PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED=true` in the application. Default off; missing migration silently falls back to the full correct computation.
- PostgreSQL triggers increment an owner-level epoch on Candidate, CandidateSkill, CandidateEmbedding mutations, and Skill display-name edits. Every cache read fetches this epoch from PostgreSQL, providing cross-replica invalidation without Redis.
- Confirmed search snapshots use a 24-entry, 45-second process-local LRU. Cache identity is authenticated owner + session + revision + DB epoch + evaluator version. The stored full ranking is paginated in memory; changes or new revisions invalidate automatically.
- A concurrent data epoch change during computation prevents caching. No private cache keys, identities, or result bodies are logged. Entries are bounded to 1,000 candidates per workspace and are discarded on process restart.
- Search candidates, ranking, total computation and cache-lookup durations feed a bounded privacy-safe in-process percentile snapshot.
- The database migration is not automatically applied to the hackathon Supabase project; use the normal authorized migration and rollout process. No claims of remote speedups until paired before/after measurement.


## Provider deadline tuning

`AI_TOTAL_DEADLINE_MS` (default 15000, supported 1000–20000), `AI_PRIMARY_TIMEOUT_MS` (default 9000, supported 500–9000) and `AI_FALLBACK_TIMEOUT_MS` (default 6000, supported 500–9000) are bounded server-side settings. Defaults preserve the established provider time budgets; invalid overrides revert to defaults.

`localProviderLatencySnapshot()` summarizes p50/p95 and failure counts per provider from the last 256 process-local model attempts, without raw inputs, tenants, responses, or credentials. Operators should calibrate timeouts only after representative actual-provider measurements; over-aggressive deadlines can increase fallback charges and worsen answer quality.
