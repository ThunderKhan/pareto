# Pareto — Ingestion Tracking, Data Quality and Extraction Audit

**Scope:** Backend-only feature `feat/ingestion-quality-audit`, **stacked on PR #14** `feat/durable-resume-batch-workers`, which depends on resume ingestion PR #13.  
**Status:** Feature code and tests; not deployed to a live Supabase project.  
**UI handoff:** [ingestion-quality.md](frontend-implementation-needed/ingestion-quality.md).  
**Design context:** [AI Engineering Plan](AI-ENGINEERING-IMPLEMENTATION-PLAN.md) AE-03/05/06. **This implementation does not replace the AI prompt/security gateway work happening in other branches.**

## What is implemented

The existing private single-file uploads, PostgreSQL queue and independent worker from PRs #13/#14 remain intact. This branch adds:

1. **Per-attempt measurements:** `IngestionAttempt` tracks elapsed processing duration, parser duration, model invocation duration when a provider returned, persistence-work duration, source text character count, verified evidence count, supported field count (currently equal to accepted evidence entries), provider identity and extractor version. All metrics are nullable, nonnegative and from measured execution; they are **not confidence scores**, token usage or invoices. The existing job attempt history API exposes these sanitized values for the owning recruiter.
2. **Extraction history:** `ResumeProfileAudit` stores immutable, private `MODEL_EXTRACTED` snapshots (normalized, validated profile only) and `REVIEW_REQUIRED` events when no verifiable candidate could be created. The audit includes source document/job/attempt identifiers, prompt-extractor version and review version, not raw provider responses or arbitrary uploaded files. Source quotes/pages remain in `ResumeEvidence`.
3. **Optimistic human review:** `ResumeDocument` stores `reviewState`, `reviewVersion`, `reviewedBy` and `reviewedAt`. A recruiter can **correct**, **approve** or **reject** a terminal extraction, only after explicitly attesting they checked the original source; all actions require the current expected review version and an authorized source document. Concurrent/stale updates return HTTP 409. The transaction writes candidate, skills, review version, status and immutable audit together. A successful manual correction creates a candidate if the model could not verify a name. Rejection removes an unsafe candidate from search while preserving private audit history.
4. **Evidence integrity:** a human edit to name/role/city/experience/notice or other scalar deletes the old model `ResumeEvidence` for that field. Changes to skills, past roles or certifications remove their outdated model evidence prefixes. Unchanged model evidence is retained. Manually corrected facts are identified through the actor/revision audit, **not falsely presented as an automatically verified quote**.
5. **Owner-scoped aggregates:** a lightweight operational metrics endpoint reports real documents/jobs by status, 1/7/30/90-day attempt counts, retries/recoveries, mean and p95 recorded durations, model-attributed attempts, audit/review activity and changed-field counts. All SQL is parameterized and scoped to the signed-in recruiter's owner ID. **Correction rate is a selected-subset activity metric, not a production AI accuracy estimate.**
6. **Reproducible offline quality scoring:** `backend/evals/fixtures/resume-quality.json` contains deliberately varied synthetic, labelled correct/incorrect field observations (unknown, unsupported, negation, skill alias, date ambiguity). `pnpm --filter @pareto/backend ingest:evaluate` outputs JSON counts of supported claims, unsupported claims, missed claims and unknown abstentions, precision/recall/F1 and case exact-match rate. Does not call Gemini/Groq, read real resumes, or consume tokens. CI runs the same evaluation command and regression tests.

## Important API details

All requests require authenticated recruiter cookies, enforce owner scope and respond with `Cache-Control: private, no-store`. Audits contain sensitive profile data: show only to an authorized recruiter, never write to public logs, analytics or localStorage.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/imports/:id/profile` | Current editable canonical profile, candidate ID, review state/version and document status. Does not expose raw resume or Storage key. |
| POST | `/api/v1/imports/:id/profile` | Full typed `correct`, `approve` or `reject` command with expected review version; returns updated review state. |
| GET | `/api/v1/imports/:id/audit` | Latest 100 owner-only extraction/human audit events with before/after snapshots and changed fields. |
| GET | `/api/v1/imports/metrics?days=30` | Owner-only operational and review statistics, days 1/7/30/90. |
| GET | `/api/v1/imports/:id/job` | Previous job history extended with measured durations/source/evidence/provider metadata. |
| GET | `/api/v1/imports` | Existing import listing now includes `reviewState`, `reviewVersion` and `reviewedAt`. |

### Manual review commands

Human **approval** of an existing candidate:

```json
{"action":"approve","expectedVersion":0,"confirmedAgainstSource":true}
```

Human **correction**, **full typed profile** required (not a permissive arbitrary field patch):

```json
{
  "action":"correct",
  "expectedVersion":0,
  "confirmedAgainstSource":true,
  "reason":"Verified the full employment history against the original source.",
  "profile":{
    "displayName":"Asha Nair",
    "roleTitle":"Backend Developer",
    "city":"Hyderabad",
    "experienceMonths":72,
    "noticePeriodDays":null,
    "industry":null,
    "education":null,
    "employmentType":null,
    "skills":["Java","AWS"],
    "pastRoles":[],
    "certifications":[]
  }
}
```

Human **rejection** (removes associated candidate from search; audit retains previous profile snapshot):

```json
{"action":"reject","expectedVersion":0,"confirmedAgainstSource":true,
 "reason":"The name and experience belong to two different people."}
```

**Semantics:** `null` for missing fields/unknown skills, `[]` for an explicitly reviewed list that is empty; do not turn `UNKNOWN` into known-absent inadvertently. `expectedVersion` prevents lost updates. Rejection or correction must include a reason 8–250 characters; no-change correction returns 422 (use Approve). Approval without a candidate returns 409. Active jobs are not editable; user must wait for a terminal state. A completed human-reviewed profile must not be overwritten silently by an automatic re-extraction.

### Example owner-only operational report

```text
windowDays: 30
documents: {READY: ..., NEEDS_REVIEW: ...}
jobs: {READY: ..., RETRY_SCHEDULED: ...}
reviewStates: {UNREVIEWED: ..., HUMAN_VERIFIED: ...}
attempts: {
  total, completed, retries, recovered, modelAttributed,
  averageDurationMs, p95DurationMs,
  averageParseMs, averageModelMs, averagePersistenceMs,
  averageSourceChars, averageEvidenceCount, averageVerifiedFields
}
qualityActivity: {
  modelExtractions, reviewRequiredEvents,
  correctionEvents, approvals, rejections, changedFields
}
caveats: ["Operational measurements are not measured extraction accuracy", ...]
```

No billing/token accounting is included (the current JsonProvider adapter does not reliably expose usage fields); never label modelAttributed as actual AI calls billed. p95 is calculated from **attempts that have durationMs**. No quality claim is made for unreviewed resumes.

## Database/security and migration

- New migration: `backend/prisma/migrations/20261115170000_ingestion_quality_audit` after previous ingest migrations.
- New private table `ResumeProfileAudit` has RLS enabled and explicit revocation from Supabase public API roles; **application owner checks remain mandatory**.
- `ResumeDocument.reviewVersion` increments atomically during reviewer transactions. `IngestionAttempt` adds nullable operational metrics. Old documents retain UNREVIEWED and version zero until explicitly processed/reviewed; migration does not retroactively infer verification.
- Audit snapshots are sensitive (may include candidate PII); production privacy retention/deletion obligations apply. The audit FK cascades on document deletion. User-facing profile/history endpoints never expose worker lease tokens or private object paths.
- A review action changes job status and document status as one database transaction, but does not alter historical model attempt outcomes or falsely claim the model was accurate.
- No changes to the correct project’s live Supabase bucket, provider keys or deployment are performed by this feature.

## Validation / go-no-go

Run from repo root on disposable PostgreSQL with existing CI:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm check
pnpm --filter @pareto/backend ingest:evaluate
pnpm test:e2e
pnpm build
```

Tests must cover:
- [ ] No unauthenticated metrics/profile/audit requests.
- [ ] No cross-owner access, even with a known foreign document ID.
- [ ] No correction while QUEUED/RUNNING or when `expectedVersion` is stale; no partial transaction commit.
- [ ] Approved/human-corrected candidate is searchable with correctly normalized skills and unknowns.
- [ ] Changed model evidence removed; original extraction and human before/after events preserved privately.
- [ ] Rejection removes unreliable candidate but leaves an immutable audit trail.
- [ ] Actual measured attempt durations, input count, evidence count/provider available in job history.
- [ ] Metrics only count authorized owner's rows and report unknown/no-sample cases honestly.
- [ ] Offline synthetic quality scorer deterministic and independently tested; **no live provider claims**.
- [ ] Existing Search/Diagnostics/What-If/Near-Match/ingestion regression tests and production Docker smoke remain green.

**Limitations / next-phase dependencies:** Gemini/Groq structured usage accounting, measured semantic evidence entailment, comprehensive protected-trait fairness review, live candidate-ground-truth accuracy, scheduled online quality dashboards, automatic alerting and calibrated cost gates belong to the independent AI engineering roadmap. These are not faked by a synthetic test suite.
