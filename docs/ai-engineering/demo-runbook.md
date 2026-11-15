# Pareto — AI demonstration checklist (AE-08)

**No live demonstration sign-off recorded.** Use the intended hackathon/demo deployment, the assigned recruiter, synthetic profiles, and explicit operator approval. Do not use any unrelated Supabase project or real candidate resumes.

## Preflight

1. Confirm checkout SHA, `main` + integration PR state, correct environment and DB migration status. Do not merge unreviewed stacked PRs by accident.
2. `pnpm install --frozen-lockfile && pnpm db:generate && pnpm check && pnpm build`.
3. `pnpm --filter @pareto/backend exec vitest run src/search/provider-live.test.ts` with `PARETO_VERIFY_LIVE_MODELS=1` **only when** secure Gemini/Groq keys/model IDs are set; check both providers independently. Never print secrets.
4. Confirm signed-in recruiter authentication, seeded PostgreSQL candidate records, correct private Storage bucket only if ingestion PRs are merged and configured. Signed-out and foreign-owner endpoints must reject access.
5. Test `AI_ENABLED=false`: manual confirmed search still works, AI routes return an honest unavailable message. Restore only after tests.

## Live script (must be rehearsed, not asserted)

- **Interpret:** Organizer Java/Spring Boot/AWS, Hyderabad, 6–10 years, 30-day brief. Inspect/edit draft and click Confirm Search. AI never auto-confirms.
- **Explain:** Candidate results show `ELIGIBLE`, `NEEDS_REVIEW`, `INELIGIBLE`, criterion-by-criterion evidence and exact database-backed counts.
- **Refine:** "Also require Kubernetes" then change notice to 15 days; unchanged criteria preserved, confirmation required, stale version 409 handled.
- **Reference:** "Find similar to [seeded reference]" must exclude the source candidate, respect missing profile attributes and preserve self-exclusion.
- **Counterfactual/What-If/Search Health:** Compare only the confirmed state vs a hypothetical draft; do not silently mutate revisions.
- **Resume ingestion (conditional):** Only if #13/#14/#17 are merged, operator has configured private Supabase Storage and live provider validation passed. Upload synthetic PDF/TXT, inspect exact evidence, intentionally ambiguous fields, duplicate hash and safe download.
- **Failure:** Disable both models in a test environment; show manual structured search, not fake LLM results. Test invalid auth/429/timeouts and no unbounded fallback.

## Evidence record

| Gate | Environment + exact commit | Result | Verified at |
| --- | --- | --- | --- |
| CI: pure/DB tests and production image | PR #16 CI | Pass (as of 2026-11-15) | GitHub Actions |
| CI: runtime + synthetic corpus | PR #18 | Pending until exact-head CI is green | — |
| Gemini and Groq (real configured account) | — | NOT VERIFIED | — |
| Signed-in live browser (actual Supabase) | — | NOT VERIFIED | — |
| Live private Storage PDF/DOCX/TXT | — | NOT VERIFIED | — |
| Provider-down manual fallback | — | NOT VERIFIED in target deployment | — |
| Official submission repository exact SHA | — | NOT VERIFIED | — |

Do not change "NOT VERIFIED" until dated command/job/run evidence exists.
