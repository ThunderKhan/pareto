# Search Health Diagnostics — backend contract and frontend handoff

**Status:** Implemented on `feat/search-health-diagnostics`, awaiting exact-head CI and review.
**Scope:** Pareto P1 / `DIF-FR-01`. No What-If Simulator or frontend UI in this branch. No Prisma migration, dependency, model-provider call, or production deployment required.

## Intended behavior

Diagnostics are available **only for an existing confirmed search session**, to the recruiter who owns it. They analyze the candidate dataset **currently stored** under that owner; they do not invent candidates, scores or match reasons. The same matcher used by `GET /api/v1/search?session=<id>` computes all baselines and alternative counts. No candidate or SearchRevision is written. Each response includes the session version so the client can discard stale previews.

**Endpoint:** `GET /api/v1/search?diagnostics=<sessionId>`
- Supabase Auth cookie required. Missing session → 401; unknown or another recruiter's session → 404; bad session ID → 422.
- Response header: `Cache-Control: private, no-store`.
- Querying another recruiter's candidate library is impossible through the service: `activeSearch(ownerId, sessionId)` enforces ownership and the candidate query filters `ownerId`.
- JSON response keys: `sessionId`, `version`, `status: "PREVIEW_ONLY"`, `evaluatorVersion`, `referenceId`, `totalCandidates`, `baseline`, `bottlenecks`, `suggestions`, `evaluatedAlternatives`, `noRequiredConstraints`, `noMeasuredImprovement`, `limitations`.
- `baseline: { criteria, counts: { ELIGIBLE, NEEDS_REVIEW, INELIGIBLE } }`. Counts are across all owner-scoped candidates, excluding the selected reference candidate. `ELIGIBLE` means every **required** criterion matched; it is not a hiring-quality prediction.
- `bottlenecks[]: { key, rule, failedCount, unknownCount, soleFailureCount, soleUnknownCount }` for required rules. Counts overlap across rules and **must never be summed**. `soleFailureCount` counts candidates failing that rule with all other required rules matched; `soleUnknownCount` analogously counts only that rule unknown.
- `suggestions[]` is a bounded, descending-by-measured-gain array (at most 8). Each includes `id`, `changes[]: { key, kind, before, after, tradeOff }`, `proposedCriteria`, `counts`, `additionalEligibleCount`, `newlyEligibleTotal`, `newlyEligible[]`, `newlyEligibleTruncated`, `remainingRequiredCount`, `warnings`. `newlyEligible[]` is capped at 12 examples, with `id`, `displayName`, `roleTitle`, `city`, `previousStatus`; **the total count is never truncated**.
- `evaluatedAlternatives: { single, paired }`. Search is intentionally bounded: up to 60 single-rule alternatives; up to 15 two-rule combinations **only if single-rule alternatives give no gain**. This is NOT an exhaustive optimization.
- `noRequiredConstraints: true` means a preference-only search; every record is technically eligible because none is mandatory. `noMeasuredImprovement: true` means no positive-gain preview was found under **the evaluated bounded alternatives**, not that candidates cannot exist.

### Deterministic relaxation policies

- **Notice availability:** required ≤N days → ≤N+15 and ≤N+30 (clamped to 365). The limit remains inclusive. Notice `null` stays **UNKNOWN** when the requirement remains required.
- **Experience range:** lower a required minimum by 12 months (never negative); raise a required maximum by 12 months (never above 720). Preserve the other bound.
- **Any required criterion:** optionally convert only that requirement to `preferred`; `before` and `after` specify exactly what is weakened. This may admit candidates with failed/undocumented attributes. A warning is emitted when **no mandatory criteria remain**.
- **Coupled blockers:** if singles yield no improvement, evaluate a bounded subset of pairs of *different* required criteria and describe both compromises.
- **Ranking:** higher actual gain first; then fewer changes and smaller relaxations; tie-break deterministically. Show a candidate's previous eligibility rather than claiming all newly eligible profiles satisfied the old requirements.

### Data/provenance and limits

- Same criteria validation, normalization, alias rules and `evaluate()` as normal search. No LLM explanation, prompt-engineered prediction or made-up PDF provenance.
- Candidate corpus uses the existing owner's max-1000 record bound; larger workspaces receive the existing 422 error. Evaluation is currently in-memory per authorized request.
- `referenceId` is excluded from **baseline, bottlenecks and every preview**. No cross-owner data.
- Diagnostics are recomputed from the live database at request time. If records change, use the returned version and fresh counts; do not assume an old response is a permanently reproducible snapshot.

## Frontend worker handoff (no UI changes in this backend branch)

Integrate a compact **Search health** section **inside the confirmed-search results view** (`frontend/src/components/search/workspace.tsx`). This should not be a new marketing page or a second search engine.

1. Show an accessible `Analyze search health` action after a confirmed result (particularly useful for 0–3 eligible candidates). Lazy-fetch `GET /api/v1/search?diagnostics=${encodeURIComponent(results.sessionId)}` only on demand. Display real loading/error/empty states; never call for an unconfirmed draft.
2. Summary: baseline `ELIGIBLE` / `NEEDS_REVIEW` / `INELIGIBLE` and total candidate pool; clearly label "Exact matches" versus "Needs review", not candidate employability. For reference-only, explain "No mandatory criteria; similarity preferences only."
3. "What's restricting this search?" Show 2–4 top bottlenecks, their actual **failed** vs **unknown** counts, and `soleFailureCount` if helpful. These may overlap; never sum them or call unknown a failure.
4. "Try a measured adjustment" cards: `3 → 4 exact matches`, `+1 newly eligible`, list every `tradeOff` and a few newly eligible profile names, `newlyEligibleTotal` with "showing first 12" if truncated. Display explicit "No mandatory requirements remain" warning when returned.
5. **Review change** (not "Apply now"): load that item's `proposedCriteria` into the existing editable criteria draft, keep `sessionId` and `version`, and run the existing `Confirm Search` endpoint only after a separate explicit user confirmation. If active results `version` no longer matches diagnostics `version`, refetch and show a stale-preview message instead of applying it.
6. After confirmation refresh search results and invalidate diagnostics. When `suggestions=[]`, show the distinction between "No measured gain under the limited alternatives" and "No candidates exist."
7. Responsive behavior: one-column cards on narrow screens, keyboard focus and screen-reader descriptions; stable count typography; reduced-motion-friendly transitions. Reuse existing Pareto design tokens, not synthetic sample metrics.
8. Do **not** pretend a diagnostic suggestion is an LLM response or a final candidate recommendation. The backend suggestions are deterministic **preview-only**.

## Acceptance evidence

- Unit tests for inclusive notice 30→45, unknown vs fail, Java vs JavaScript, experience boundaries, correlated two-rule blocks, reference self-exclusion, preferences-only behavior, immutability and capped examples.
- PostgreSQL integration test creates a confirmed owner-scoped session, verifies exact 3→4 on real seeded profiles and lack of SearchRevision changes, and checks another owner gets 404.
- Signed-out Playwright smoke asserts diagnostics returns 401. Live Supabase recruiter browser test remains a separate credentialed step.
