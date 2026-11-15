# AI engineering progress

## AE-00 baseline — 2026-11-15

- Audited `main` at `a7a32a48996634bf11dae9ee29ba8d7575d680ef`: reusable TypeScript `backend/`, existing `search/interpret.ts`, deterministic `criteria.ts`/`evaluate.ts`.
- PR #13 adds secure synchronous resume extraction and storage; PR #14 stacks queued ingestion on #13. Neither is assumed merged. Keep this branch independent of those changes.
- CI workflow on pull requests to `main` includes PostgreSQL, build, browser security and container smoke. No local dependencies or live Gemini/Groq keys are available in this worker environment.
- Existing interpret adapter swallowed all provider errors; did not differentiate auth failures from transient failures.

## AE-01 / AE-02 initial implementation

- `backend/src/ai` with versioned, strict, narrowly authorized search tasks; typed provider errors and task registry.
- Central fixed-endpoint Gemini/Groq provider client with response-byte/deadline bounds and fallback only for eligible errors; old `search/interpret.ts` API preserved.
- Synthetic adversarial and compatibility unit tests; initial threat model.
- This **does not complete AE-03–AE-08**, nor does it certify real provider/Storage/production operation.
- Extraction task IDs are planned, **not implemented** until reviewed PR #13 integration.

## Remaining

1. Run exact-head PR checks; fix any failures.
2. Integrate PR #13 / #14 after review without overwriting their extraction/batch services.
3. Add semantic evidence checks for skills/negation/experience, human review and recorded provenance.
4. Implement durable per-tenant spend/rate ledger, full provider capability registry, retry/circuit breaker, privacy-safe usage metrics and eval corpus.
5. Test target Supabase project/private Storage, both real models, signed-in browser flows and deployment fallback with approvals.
