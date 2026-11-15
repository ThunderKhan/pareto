# Durable Batch Processing — Frontend Implementation Needed

**Product:** Pareto · **Backend branch:** `feat/durable-resume-batch-workers` stacked on `feat/private-resume-ingestion` (PR #13).  
**Frontend:** NOT implemented in this branch.  
**Integrate in:** protected `/dashboard/candidates/import`, alongside [ingestion.md](ingestion.md); existing ivory/navy/cobalt design and candidate library navigation.

## 1. User goal

A recruiter can upload several PDF/DOCX/TXT files, see **real** per-file queue/processing states, group already queued uploads into a scheduled batch, inspect safe attempt history, retry terminal failures, or cancel work.

**Important:** The backend accepts **one file per POST**, not multipart bulk uploads. The frontend should queue client file selections and send bounded individual uploads (e.g., 2 concurrent upload requests); each file has its own durable document/job. A successful upload usually means **STORED + QUEUED**, NOT that the candidate is extracted. A continuously running worker processes it asynchronously. Never show "Imported successfully" as if AI work has finished until job state actually becomes READY.

## 2. Suggested compact interface

```text
Candidates / Import resumes

Private resume imports
[Choose PDF/DOCX/TXT files] [Upload selected]
3 queued  ·  1 running  ·  2 ready  ·  1 needs review
         (all numbers come from real API responses)

File / Status / Actions
[ ] asha.pdf       READY                [View candidate]
[ ] priya.docx     RUNNING / EXTRACTING [View attempts] [Cancel]
[ ] dev.txt        RETRY_SCHEDULED      [Details] [Cancel]
[ ] next.pdf       QUEUED               [Select for batch]
[ ] scan.pdf       NEEDS_REVIEW         [Evidence] [Retry]

Selected queued files: 2
[Schedule group]  Date/time: now or <=7 days  Label: optional
[Confirm batch]

Batches
Hiring sprint — 2 total · 1 ready · 1 queued
[Show documents and outcomes]
```

These names and numbers are **illustrative only**, never hardcoded into the actual interface. Avoid fake percent-complete bars; the backend reports stages and timestamps rather than percentage progress.

## 3. Backend APIs and states

All requests are same-origin, cookie-authenticated, owner-scoped and `Cache-Control: private, no-store`. The UI never receives service-role credentials or private Storage object paths.

| API | Usage |
| --- | --- |
| `POST /api/v1/imports` | FormData with one `file`; returns 201 `{duplicate:false, document}` or 200 `{duplicate:true, document}`. A Storage failure may return document FAILED with no job; show accurate failure. |
| `GET /api/v1/imports` | Latest 50 owner-only import rows, with nested sanitized `ingestionJob` when queued. |
| `GET /api/v1/imports/:id` | Document, candidate reference and source-evidence excerpts and job progress. |
| `GET /api/v1/imports/jobs` | Latest 100 job summaries. |
| `GET /api/v1/imports/:id/job` | Job attempt history including `attempt`, `outcome`, `errorCode`, `startedAt` and `finishedAt`. |
| `POST /api/v1/imports/:id` | JSON `{"action":"retry"}` for terminal review/permanent failures (max two manual retries) or `{"action":"cancel"}` for queued/running jobs. |
| `POST /api/v1/imports/batches` | JSON `{"documentIds":["uuid",...],"runAfter":"2026-11-16T11:00:00Z","label":"optional"}`; 1–50 distinct owned, queued, unbatched documents. |
| `GET /api/v1/imports/batches` | Latest 30 owned batches with `id`, `label`, `createdAt`, `total`, `byStatus` and member document IDs/status. |

The sanitized nested job has `{id,status,stage,attempts,maxAttempts,manualRetries,runAfter,batchId,lastErrorCode,cancelRequested,startedAt,finishedAt}`. The queue's `RUNNING` stage can be `PARSING`, `EXTRACTING` or `PERSISTING`. Job terminal statuses: `READY`, `NEEDS_REVIEW`, `FAILED_PERMANENT` and `CANCELLED`; intermediate states include `QUEUED` and `RETRY_SCHEDULED`.

When cancellation is requested while a worker is running, show **Cancellation requested** until the status becomes CANCELLED; cancellation may not prevent already-incurred AI charges. Retry uses a real API call, may incur new costs and should show the remaining manual attempt budget. Avoid automatic browser retries that unexpectedly create provider charges.

## 4. Frontend state machine

1. User selects 1 or more files. Validate extension/size locally for early feedback (PDF ≤4 MiB, DOCX ≤2 MiB, TXT ≤512 KiB); server remains authoritative.
2. Start at most 2 upload requests simultaneously. If the tab closes, an already accepted document remains durable in the server; don't claim abort reversed completed upload.
3. On HTTP success, render returned `document.status` and nested job status. Deduped SHA means display the existing import instead of a new row.
4. Refresh owner-only jobs while the import screen is visible (3–5 second interval or manual refresh), stopping polling on navigation/unmount or sign-out. Do not leave perpetual high-frequency polling running.
5. Show human-readable state: QUEUED ("waiting for worker"), RUNNING/PARSING ("reading text"), RUNNING/EXTRACTING ("extracting attributes"), RUNNING/PERSISTING ("saving evidence"), RETRY_SCHEDULED ("retrying after [runAfter]"), READY ("open candidate"), NEEDS_REVIEW ("inspect evidence"), FAILED_PERMANENT ("failed"), CANCELLED ("cancelled").
6. When selecting files for a batch, allow only unbatched QUEUED items. Date/time range now through seven days. Confirm sends document IDs and displays returned batch summary; if 409 (worker claimed), refresh and offer reselect.
7. Per-job detail includes safe attempt history and source-linked candidate/evidence only as returned by API. No raw resume text in logs or analytics.
8. Retry a completed NEEDS_REVIEW / FAILED_PERMANENT import only after explaining that model inference may be billed again. A 409 indicates no retry or limit reached. Do not show nonfunctional approval/edit controls.
9. Cancel queued jobs immediately; for running jobs show "Cancellation requested" until confirmation.
10. A worker being offline leaves jobs QUEUED. The UI should say "Processing has not started; check background worker status" after a reasonable **observed** delay, not invent completion.

## 5. Error, privacy and accessibility checks

- 401: existing login flow, clear tenant cache and any signed URLs.
- 404: missing/foreign import; show generic safe error and navigation to own history.
- 409: already started/batched/terminal or retry limit; refresh job status.
- 413/415/422: unsupported document, invalid ID/time/size; show server-safe explanation.
- 500/503: infrastructure/provider/storage unavailable; keep existing uploaded record visible; do not fabricate success or reupload silently.
- If original is scanned/unreadable or fields unsupported, flag review. `UNKNOWN` means not documented, not known-absent.
- Never render untrusted source HTML, expose worker IDs/lease tokens, log resume quotes or cache private signed URLs.
- Keyboard-compatible file picker, schedule controls, selection lists, retry and cancel; visible focus, screen-reader status announcements, reduced-motion behavior and mobile compact list.

## 6. Acceptance checklist

- [ ] Multiple client-selected files become independent **single-file** upload calls; no batch API fiction.
- [ ] Upload response shows STORED / QUEUED; candidate links only after an actual saved profile exists.
- [ ] Real queue stage, attempt count, runAfter time and terminal status are displayed.
- [ ] No false success when worker offline, provider fails, or a source requires review.
- [ ] Batch creation groups 1–50 owned, unbatched QUEUED documents with all-or-nothing behavior; scheduling race 409 handled.
- [ ] Retry/cancel buttons invoke authenticated server endpoints and show actual outcomes.
- [ ] No cross-owner job/history/batch exposure, signed URL or browser secret leakage.
- [ ] No invented percentages, source quotations, AI costs or extraction confidence.
- [ ] Mobile, keyboard, screen reader, loading and error recovery tests pass.
- [ ] All existing search, profile, diagnostics, what-if and near-match UI behavior remains intact.

**Backend operational truth:** [RESUME-BATCH-PROCESSING.md](../RESUME-BATCH-PROCESSING.md). The frontend team must not start worker loops from React or Next.js API handlers.
