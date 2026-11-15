# Search Health Diagnostics — Frontend Implementation Needed

**Product:** Pareto · **Feature:** Search Health Diagnostics (PRD DIF-FR-01)  
**Status:** Frontend not implemented. Backend implemented and CI-verified on [PR #10](https://github.com/ThunderKhan/pareto/pull/10).  
**Where:** Existing confirmed search results in `/dashboard/search`.  
**Owner:** Frontend worker. This is a UI handoff, not a request to redesign the backend.

## Purpose

Help a recruiter understand *why* a confirmed search has few/no eligible candidates and preview measurable trade-offs. This is a deterministic analysis of saved criteria and real owner-scoped PostgreSQL candidate records, not an AI-generated recommendation. **Nothing changes until the recruiter separately confirms new criteria.**

## 1. UI placement and composition

Add a collapsible **Search health** panel inside the existing confirmed-results section of `frontend/src/components/search/workspace.tsx`, below the confirmed criteria/count summary and before candidate result cards. Preserve the existing search composer, candidates list, reference-search mode and saved revisions.

- Trigger: subtle secondary button **Analyze search health**, visible only when a search is confirmed. Lazy-fetch on click, not on every keystroke or before confirmation.
- Panel heading: **Search health**; helper copy: “Measured adjustments based on your confirmed criteria and candidate records.”
- First row: three restrained statistic tiles — **Exact matches**, **Needs review**, and **Candidates evaluated**. Optionally show Ineligible as supporting text. These are not hiring-quality ratings.
- Second row: **What’s restricting this search?** Show 2–4 top required-rule bottlenecks. For each, show the rule, the number with documented failure, the number lacking evidence, and the count blocked solely by this rule when meaningful. Counts can overlap; never sum them.
- Third row: **Measured adjustments**. Show cards with a concise description, exact eligible count before → after, “+N newly eligible”, all rule trade-offs, and up to a few affected candidate names. CTA: **Review change** — *never* “Apply instantly”.
- Footer/optional details: “Calculated from current records; suggestions are previews only.” Provide a small “How this works” expansion describing bounded analysis, unknown evidence and limitations.

**Visual direction:** Match the existing Pareto ivory/navy/cobalt visual system, serif hierarchy, rounded cards and restrained borders. Use existing workspace tokens, typography, spacing and buttons. This is not a new dashboard page or an oversized analytics dashboard. On mobile, stack cards; no horizontal overflow, color-only status or excessive animation. Respect reduced motion and keyboard navigation.

### Conceptual example (illustrative; never hardcode)

```text
Search results · Revision 2             [Edit criteria] [Analyze search health]
3 eligible · 1 needs review · 44 ineligible

Search health  |  Deterministic analysis of your confirmed search
[ 3 Exact matches ]  [ 1 Needs review ]  [ 48 Candidates evaluated ]

What's restricting this search?
Notice period ≤30 days       1 documented failure / 1 unknown
Experience ≥72 months        measured restrictive criterion

Measured adjustments
Allow joining within 45 days
3 → 4 exact matches          +1 newly eligible
Trade-off: a longer permissible notice period
Affected profile: Meera Iyer                         [Review change]

Nothing has been changed in your confirmed search.
```

The numbers above describe a possible seeded test case; actual labels, counts, rule effects and candidates **must** be read from the API response.

## 2. Backend endpoint and response contract

```http
GET /api/v1/search?diagnostics=<encodeURIComponent(sessionId)>
```

Authentication uses the existing Supabase session cookie. Use same-origin fetch with `cache: "no-store"`. The backend validates ownership of the **confirmed** search, never exposes another recruiter's records and never modifies a SearchRevision. The backend implementation lives in `backend/src/search/diagnostics.ts` and is routed by `frontend/src/app/api/v1/search/route.ts`.

Response shape (types are conceptual; reuse shared Rule type from `@pareto/backend/search`):

```ts
type SearchHealth = {
  sessionId: string;
  version: number;
  status: "PREVIEW_ONLY";
  evaluatorVersion: string;
  referenceId: string | null;
  totalCandidates: number;
  baseline: {
    criteria: Rule[];
    counts: { ELIGIBLE: number; NEEDS_REVIEW: number; INELIGIBLE: number };
  };
  bottlenecks: Array<{
    key: string;
    rule: Rule;
    failedCount: number;
    unknownCount: number;
    soleFailureCount: number;
    soleUnknownCount: number;
  }>;
  suggestions: Array<{
    id: string;
    changes: Array<{
      key: string;
      kind: "extend_notice" | "lower_experience_min" |
            "raise_experience_max" | "make_preferred";
      before: Rule;
      after: Rule;
      tradeOff: string;
    }>;
    proposedCriteria: Rule[];
    counts: { ELIGIBLE: number; NEEDS_REVIEW: number; INELIGIBLE: number };
    additionalEligibleCount: number;
    newlyEligibleTotal: number;
    newlyEligible: Array<{
      id: string;
      displayName: string;
      roleTitle: string | null;
      city: string | null;
      previousStatus: "ELIGIBLE" | "NEEDS_REVIEW" | "INELIGIBLE";
    }>;
    newlyEligibleTruncated: boolean;
    remainingRequiredCount: number;
    warnings: string[];
  }>;
  evaluatedAlternatives: { single: number; paired: number };
  noRequiredConstraints: boolean;
  noMeasuredImprovement: boolean;
  limitations: string;
};
```

### What the fields mean

- `ELIGIBLE`: matches **all required** criteria; not an automated hiring decision.
- `NEEDS_REVIEW`: at least one required attribute is unknown, with no proved required failure. **UNKNOWN ≠ FAIL.**
- `INELIGIBLE`: at least one required criterion demonstrably fails.
- `failedCount` and `unknownCount` are **per rule**, and can describe overlapping people. `soleFailureCount` reflects candidates with no *other* failed/unknown mandatory criteria.
- `suggestions` contains only alternatives with measured increases in eligibility (maximum 8). They may include longer notice windows, wider experience ranges and required→preferred changes; paired changes may appear when no single adjustment helps.
- `newlyEligible` contains only the **first 12 examples**. If `newlyEligibleTruncated` is true, show “Showing 12 of N affected candidates” using `newlyEligibleTotal` rather than implying the displayed list is exhaustive.
- If `remainingRequiredCount === 0`, visibly display `warnings`: an all-preferred search has no mandatory qualifications.
- If `noRequiredConstraints` is true, say “Similarity/preferences only — no mandatory criteria to relax”, not “all candidates are qualified”.
- If `noMeasuredImprovement` is true, say “No improvement found among the adjustments evaluated,” **not** “There is no possible way to improve this search”. Backend search is deliberately bounded, not globally optimized.
- For reference searches, `referenceId` is excluded from all analyses and counts.

## 3. Exact interaction flow

1. **User confirms a search:** existing results and version appear. The health panel is initially collapsed/unfetched.
2. **Analyze:** request the diagnostic endpoint with `results.sessionId`; show a small in-place loading state. Keep candidate results visible.
3. **Inspect:** show server-provided baseline, bottlenecks and measured adjustment cards. Do not calculate eligibility or make up counts in the browser.
4. **Review change:** compare `report.sessionId` and `report.version` against the current `results.sessionId` and `results.version`. If stale, request new diagnostics and show a clear warning; do not review a stale proposal.
5. **Open existing editor:** pass the *whole* `suggestion.proposedCriteria` into the existing `openDraft(proposedCriteria, [], { active: results })` flow. Preserve unrelated rules, the reference context, and current confirmation behavior. Show all backend `changes[].tradeOff` details alongside the edited criteria. This action must **not POST** to confirm.
6. **Discard:** leaves saved results and version unchanged. **Confirm Search:** the existing separate POST confirmation with `sessionId`, `expectedVersion`, and a fresh request ID persists the next revision.
7. **On successful confirmation / session change / reference switch:** clear the report and do not display old counts against new results. Handle 409 version conflicts by asking the user to reload.

### Required UI states

| State | Required presentation |
| --- | --- |
| Search unconfirmed | No health action or diagnostic request |
| Loading | “Analyzing confirmed search…” with an accessible progress/status region |
| Success | Real counts, bottlenecks, ranked suggestions and trade-offs |
| Empty candidate corpus | “No candidate profiles available to analyze.” |
| No suggestions | “No measured gain in the bounded set of alternatives.” |
| Preferences-only search | Explain there are no mandatory constraints to relax |
| Missing attributes | Show “Unknown / not documented”; do not label them failed |
| 401 | Prompt login through the existing auth navigation |
| 404 | Search unavailable/not owned; offer return to recent/current searches |
| 422 | Show safe server validation or corpus-limit message |
| Network/5xx | Keep search results and offer Retry |
| Stale report | Reject review and re-analyze current confirmed revision |

## 4. Implementation boundaries

- Frontend only: compose panel/components, typed fetch, state, inline error handling, responsive CSS and focused Playwright tests.
- Use the existing `CriteriaEditor`, criteria confirmation API and saved search versions. Do not introduce a second search state machine or a new page just for diagnostics.
- No artificial delay, fake candidate statistics, LLM-generated “diagnoses”, automatic application of relaxed requirements, or unauthorized dataset access.
- No Prisma migration, dependency, new model provider, Resume ingestion, What-If Simulator or Railway deployment is part of this frontend task.
- Dependency: the backend in **PR #10** must be available in the frontend worker's base branch before end-to-end integration.

## 5. Acceptance checklist for the frontend worker

- [ ] Button appears only with a confirmed search; request is lazy.
- [ ] Exact response counts and required-rule failures/unknowns shown accurately; overlaps never summed.
- [ ] Suggestions clearly list all trade-offs and exact measured before/after eligibility.
- [ ] Missing evidence differs visually and textually from known failed criteria.
- [ ] “Review change” opens the existing editable draft, preserving unchanged rules and never automatically persisting a revision.
- [ ] Discard preserves the original search. Confirm creates exactly one next revision.
- [ ] Results/version changes invalidate previous diagnostics; stale review safely blocked.
- [ ] Reference candidate excluded; preference-only and no-improvement states worded honestly.
- [ ] Loading, 401/404/422, 5xx, empty and retry UI tested.
- [ ] Mobile layout, keyboard/focus behavior and reduced-motion experience checked.
- [ ] Existing search, explainability, refinement and reference-search tests remain green.

**Technical source of truth:** [Backend Search Health contract](../SEARCH-HEALTH-DIAGNOSTICS.md). This document defines the **frontend UX to be implemented later**, not completed UI work.
