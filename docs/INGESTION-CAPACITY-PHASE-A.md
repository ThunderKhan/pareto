# Phase A — Quota-aware resume ingestion (2026-11-15)

## Implemented

- Preserve the distinction between **AI capacity/configuration failure** and **resume evidence failure**. The worker defers `BUDGET_EXCEEDED`, `RATE_LIMIT`, and `AUTH_CONFIG` rather than treating them as unsupported candidate evidence.
- Deferral uses the existing fenced PostgreSQL transaction: verify the active lease, return the document to `STORED`, set `RETRY_SCHEDULED` with a future `runAfter`, close the attempt audit, release the worker lease, and preserve the finite document-processing retry budget.
- Because the `IngestionAttempt` table has `@@unique([jobId,generation,attempt])`, every capacity deferral increments the queue generation while restoring the attempt number. `manualRetries` remains unchanged. The audit row remains immutable and visible; generation is a uniqueness epoch, **not a count of paid model requests**.
- With `AI_DURABLE_QUOTA_ENABLED=true`, `claimJob` checks the existing global and recruiter hourly attempt counters before claiming a job. This is a read-only admission hint; the AI gateway still reserves calls atomically and remains the authoritative quota gate.
- Existing malformed-document, storage, evidence-validation, worker-interruption, cancellation, and owner-isolation paths remain unchanged.

## Timing and costs

- App quota exhausted: defer ~65–67 minutes (covers process-local sliding hour windows).
- Upstream provider 429: defer ~30–32 minutes.
- No usable provider configuration: defer ~60–62 minutes until an operator fixes the credentials.
- Jitter spreads retries. None of these are a promise of provider recovery.
- **Deferring an ingestion job does not refund a model request already sent to Gemini/Groq.** Hourly provider-attempt reservations remain accounted for. Only the job's processing retry allowance is preserved.

## Production prerequisites (not performed here)

1. Apply migrations, provision and verify the private Supabase resume bucket.
2. Deploy and supervise a separate `pnpm ingest:worker` process.
3. Configure working Gemini/Groq keys and models, and enable `AI_DURABLE_QUOTA_ENABLED=true` **on both API and worker** after the quota migration is confirmed. Set consistent `AI_MAX_CALLS_PER_RECRUITER_HOUR` and `AI_MAX_GLOBAL_CALLS_PER_HOUR` across replicas.
4. Observe queue wait, `lastErrorCode`, attempt history, throughput and provider usage before increasing concurrency. Stopped workers leave jobs queued.
5. Complete real signed-in Supabase and provider smoke tests; CI fakes do not verify provider billing or live hosting.

## Candidate document dataset for the next validation stage

- Candidate source: [jijunhao/SyntheticResumeData](https://github.com/jijunhao/SyntheticResumeData). Its repository describes 2,994 *synthetic* PDFs in `resume_list_pdf/` with corresponding annotations in `result_gt/` and includes an Apache-2.0 `LICENSE`.
- **Do not imply all files are one-page/ATS-friendly.** Filter PDFs for one page, successful text extraction, no scanned-only content, size <= 4 MiB, plausible layout, and unique source hashes. Retain source attribution/license and exclude copyrighted third-party templates if downstream rights are unclear.
- Upload a verified 10-document pilot through authenticated `POST /api/v1/imports`, then 50/100/500 with real storage and the durable worker. Compare extracted candidate fields to a separate ground-truth manifest and record actual `READY`, `NEEDS_REVIEW`, and error totals. Never seed candidate records directly to claim ingestion success.
- Current UI selects max 50 files (two concurrent POSTs), batch scheduler groups up to 50 queued documents, and history is truncated to latest records; full 500-document import-run tracking and pagination are **separate future work**.

## Remaining risks

- Durable quotas are opt-in; without them the database admission hint is inactive and each worker may still claim work that then defers on a process-local limit. Worker quotas must also reflect real provider limits.
- Provider `Retry-After` is not parsed; conservative fixed waits are used.
- If a provider repeatedly returns 429, the queue can continue deferring until credentials/limits recover; alerting, provider-level scheduling and capped operational alert thresholds remain future work.
- BYOK, bulk import-run identifiers, paid-token ledgers and the 500-document live benchmark are not part of this change.
