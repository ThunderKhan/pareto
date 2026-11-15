# Pareto — Durable Resume Batch Processing

**Delivery:** backend on `feat/durable-resume-batch-workers`, stacked on unmerged resume-ingestion PR #13 (`feat/private-resume-ingestion`). No production database, Supabase account or Railway deployment has been changed. **Frontend is not implemented.**

**Architecture reference:** [AI Engineering Implementation Plan](AI-ENGINEERING-IMPLEMENTATION-PLAN.md), AE-07. **UI handoff:** [batch-processing.md](frontend-implementation-needed/batch-processing.md).

## 1. Architecture and exact guarantees

- A browser uploads **one** PDF/DOCX/TXT at a time using authenticated `POST /api/v1/imports`. It validates format/size, saves to the private Supabase bucket, hashes the document and durably creates a PostgreSQL `IngestionJob`. **HTTP does not parse the document, call Gemini/Groq or wait for extraction.**
- A **separately deployed, supervised Node worker process** polls the jobs table, claims due work atomically with PostgreSQL `FOR UPDATE SKIP LOCKED` and a database advisory transaction lock for shared global/per-owner concurrency limits, and performs PDF/DOCX/TXT parsing + AI extraction.
- Job claim, attempt audit and status update occur in one DB statement. Each running attempt has a 120-second lease token, 15-second heartbeat and explicit stage; interrupted jobs are reclaimed by the reaper after lease expiry. Stale workers cannot publish profile/evidence updates after their token is lost.
- Final candidate/skill/evidence writes and job completion are in **the same transaction after the lease-ownership check**. A retry cannot create duplicate source-linked candidates. File dedup is keyed by authenticated owner + SHA-256. Attempts are audited across separate manual retry generations.
- Queue delivery is **at least once**. An already-issued model request may be charged twice if a worker dies before committing success. It is incorrect to claim exactly-once provider billing or uninterrupted service during downtime.
- Staged uploads that committed Storage and `STORED` but not a job are reconciled after a safety delay. Crash-between-Storage-upload-and-metadata-commit remains an operational orphan case requiring reconciliation; no false success is reported.

## 2. Worker state machine

```text
Private upload → STORED + QUEUED
  QUEUED → RUNNING/PARSING → RUNNING/EXTRACTING → RUNNING/PERSISTING
                                   ├─ READY (candidate and source evidence stored)
                                   ├─ NEEDS_REVIEW (unsupported or uncertain facts)
                                   ├─ RETRY_SCHEDULED (future runAfter, then claim again)
                                   └─ FAILED_PERMANENT (bad source / retries exhausted)
  QUEUED/RETRY_SCHEDULED → CANCELLED
  RUNNING → cancellation requested → cooperative finish or lease recovery
```

The parent `ResumeDocument.status` is still returned, but the new nested `ingestionJob.status` and `ingestionJob.stage` are the authoritative processing progress. No fake numeric completion estimate is computed.

Job attempts: automatic max **3**, exponential backoff 5, 10, 20 seconds and a 300-second cap with bounded jitter; **up to 2 explicit manual retry generations** for terminal review/failure states. Running attempts also count when interrupted. All errors are safe categories, not raw provider errors or resume text.

## 3. Run the dedicated worker — mandatory operational step

After merging the reviewed ingestion PR in order and applying migrations to the intended environment with **explicit authorization**:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm ingest:worker
```

`pnpm ingest:worker` invokes a pinned `tsx`-based Node worker from the backend workspace. It runs **continuously until SIGINT/SIGTERM**. Deploy as a separate always-on process/container using a supervisor and restart policy; do not start it inside a Next.js API handler, a serverless response, a browser tab, or a GitHub Actions job intended to finish. A stopped worker leaves jobs honestly queued. The search product can continue serving existing PostgreSQL candidates.

Configure server-only `DATABASE_URL` and **the same correct private Supabase Storage** settings as the web server (`SUPABASE_URL`, `SUPABASE_SECRET_KEY` or legacy service role), with Gemini/Groq credentials if inference is desired. The browser never gets these secrets. The worker must have read/write permissions to its own private bucket and DB queue tables.

Supported controls, validated at worker startup:

| Variable | Default | Allowed |
| --- | --- | --- |
| `INGEST_WORKER_CONCURRENCY` | 2 | 1–4 per process |
| `INGEST_GLOBAL_CONCURRENCY` | 4 | 1–16 across cooperative processes |
| `INGEST_PER_OWNER_CONCURRENCY` | 2 | 1–8 active per owner |
| `INGEST_WORKER_POLL_MS` | 1500 | 250–30000 |
| `INGEST_RECOVERY_INTERVAL_MS` | 15000 | 1000–300000 |

Keep global concurrency configuration **consistent across worker replicas**. Capacity limits are not measured throughput or monetary quotas. Gemini/Groq provider calls still have their separate API token/time limits. A worker that is force-killed relies on another live worker (or itself after restart) to sweep expired leases.

**Critical:** the automatic database migration creates `IngestionJob`, `IngestionAttempt`, `IngestionBatch` and their RLS/privilege protections. Migration `20261115150000_durable_ingestion_queue` depends on PR #13's `20261115120000_private_resume_ingestion`. No Storage bucket is created by this migration.

## 4. API contract (owner-scoped; Cache-Control: private, no-store)

| Verb | Endpoint | Request / result |
| --- | --- | --- |
| POST | `/api/v1/imports` | Existing single-file multipart upload, returns `{duplicate,document}`; typically 201 STORED + QUEUED. |
| GET | `/api/v1/imports` | Owner's import history with nested sanitized ingestionJob. |
| GET | `/api/v1/imports/:id` | Import metadata, candidate and evidence plus job progress. |
| GET | `/api/v1/imports/jobs` | Latest 100 owner-only job summaries. |
| GET | `/api/v1/imports/:id/job` | Sanitized attempt history, status, error codes and timestamps. |
| POST | `/api/v1/imports/:id` | JSON `{"action":"retry"}` or `{"action":"cancel"}`. |
| POST | `/api/v1/imports/batches` | JSON `{"documentIds":["uuid",...],"runAfter":"2026-11-16T11:00:00Z","label":"Optional"}`. |
| GET | `/api/v1/imports/batches` | 30 latest owned batches with member document IDs and actual status counts. |

Batch grouping is **all-or-nothing for 1–50 already-uploaded, still QUEUED and unbatched documents**. Optional runAfter can be set up to seven days ahead. If the worker has started a document, scheduling rejects with HTTP 409; the client must refresh. This is **not** a multipart batch-file-upload endpoint. Retries/cancellation require an owned existing job; other users' identifiers return safe 404.

No worker lease tokens, private object keys, raw extracted text, provider responses, credentials or signed URLs appear in job or batch metadata. Signed download access is still separately owner-scoped.

## 5. Resilience and failure-recovery contracts

- Two concurrent workers cannot claim one attempt twice; short DB transactions and SKIP LOCKED handle contention.
- Expired RUNNING leases are marked RETRY_SCHEDULED, FAILED_PERMANENT, or CANCELLED; attempt history records RECOVERED. Old tokens cannot finish a newer attempt.
- Transient errors are retried after a persisted future runAfter; malformed/unreadable files go directly to failure/review; model failure after the attempt limit becomes review-needed, not an invented candidate.
- Manual retry is explicitly requested, costs may increase, and retry generations prevent audit history collisions.
- A worker can stop accepting new jobs on SIGTERM and finish in-flight tasks; forced termination relies on lease expiry and the next worker's recovery sweep.
- The original file remains private, per-file size and parser bounds remain enforced, and a document's stored hash is rechecked before the worker trusts the bytes.
- No Redis, Kafka, separate vector database, scanning OCR worker, production hosting, semantic retrieval, token-cost billing ledger, or automatic approval of resume facts is claimed in this feature.

## 6. Verification and production release checklist

1. Run frozen installation, Prisma generation/migrations, repeated seed, unit/integration tests, browser security tests, Next production build and Docker smoke against isolated PostgreSQL.
2. Upload synthetic TXT/PDF/DOCX through the authenticated API with an actual private bucket in the **correct** project. Confirm 201 STORED/QUEUED, then separate worker transitions to READY or NEEDS_REVIEW with truthful evidence.
3. Disable all worker processes and verify jobs remain QUEUED. Restart and verify they process.
4. Simulate worker crash or expired lease and validate RECOVERED attempt, new token, and no duplicate candidate.
5. Simulate provider/storage transient failure, retry/backoff, final dead-letter state and explicit manual retry generation.
6. Verify owner boundaries, cross-owner SHA uploads, batch grouping races, per-owner/global caps and cancellation.
7. Rehearse invalid MIME/size, scanned/encrypted PDF, missing provider key, DB unavailability, missing/public Storage bucket and disabled worker.
8. Verify deployment supervisor, worker restart policy, server-only secrets, alerting for stuck queued jobs, and correct deletion/reconciliation policy.
9. Record exactly which live integration tests passed and which remain unverified; never claim successful live operation based solely on mocked adapters.

**Status of this PR is code delivery, not live deployment.** Only operators with access to the correct Supabase project should enable the worker and run production migrations.
