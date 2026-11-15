# Pareto — AI Low-Latency Engineering Report

**Status:** Implemented in source and subjected to GitHub CI. No live Gemini/Groq or hosted Supabase performance measurements have been performed. All latency estimates below are structural, not measured speedups.

## Before vs after

| Critical path | Before | Implemented after |
| --- | --- | --- |
| Confirmed candidate search | With credentials and indexed candidates, ranking could await an extra Gemini embedding request (6-second HTTP timeout) | Default deterministic-first retrieval skips external embedding; semantic mode explicitly opt-in (`PARETO_SEMANTIC_SEARCH=1`) |
| Repeat semantic queries | Fresh remote query-embedding call at every ranking computation | 128-entry, tenant/model/query-hashed, success-only, single-flight embedding cache, five-minute TTL |
| Confirmed search pagination | Fetch and evaluate up to 1,001 profiles on every page request, slice 20 | Optional 24-entry LRU of full ranked results with 45-second TTL; on hit, check DB epoch then slice 20 |
| Candidate changes | No cross-replica result-cache invalidation | PostgreSQL owner epoch bumped by candidate, skill-link, skill-label and vector-index mutations |
| AI provider timeout | 15-second overall budget, fixed primary/fallback upper timeouts | Bounded operator-tunable overall/primary/fallback deadlines; defaults retain prior behavior |
| Embedding API billing | Query/index calls not included in shared attempt quota | Process limiter and optional durable PostgreSQL attempt reservation cover embedding misses and indexing |
| Performance diagnosis | AI per-attempt metadata and ingestion metrics | Process-local p50/p95 search stage + provider latency summaries, no recruiter data in summaries |

## Current verification

- Unit coverage: private-cache keys, coalescing, expiry/eviction, cache revision/tenant/data epoch separation, safe metrics, deadline bounds and existing retrieval contracts.
- PostgreSQL integration: confirmed search cache invalidation after candidate insert/update plus existing role/revision/ownership tests.
- Existing Pareto Frontier remains in the rebased search service; no changes to its deterministic preview authority.
- No measured end-to-end p50/p95, cost, model-quality, or production speedup can be reported until the planned live evaluation.

## Deployment checklist

1. Apply the reviewed `20261115233000_search_snapshot_epoch` migration to the intended authorized database, then set `PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED=true` on the API to activate epoch-verified snapshot reuse. Cache is disabled by default and missing migrations fall back to full recomputation.
2. Keep `PARETO_SEMANTIC_SEARCH` unset for the fastest deterministic default. If semantic tie-breaking improves judged retrieval relevance, enable with `PARETO_SEMANTIC_SEARCH=1`, rerun the same candidates, and avoid toggling mid-pagination.
3. Compare the same synthetic datasets/confirmed revisions and record p50/p95 response times, DB candidate-read time, rank time, embedding latency, model latency and cache hit rates. Only then tune `AI_PRIMARY_TIMEOUT_MS`, `AI_FALLBACK_TIMEOUT_MS`, and `AI_TOTAL_DEADLINE_MS`.
4. Test signed-in two-owner isolation, candidate update and skill changes across separate processes, concurrent model outages, Supabase private Storage, workers, and zero-provider manual fallback.
5. Verify actual ingestion polling/database load before changing `INGEST_WORKER_POLL_MS` (currently 1500ms default). No Redis/Kafka service is necessary at current scale.

## Honest limitations

- First-time natural language parsing still requires a remote model. No prompts were shortened and no claim of faster model inference is made.
- Result snapshots contain server-memory candidate profiles, tenant scoped by cache key, not public or shared storage. 24 × 1,000 entries is the configured upper bound; cache TTL is 45 seconds.
- No live DB has been modified and no provider API keys were accessed through this engineering work.
- The optional semantic ranking may reorder tied results; it never changes deterministic eligibility. Model quality must be verified before enabling it.
