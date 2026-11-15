# What-If Hiring Simulator — Frontend Implementation Needed

**Product:** Pareto · **Feature:** What-If Hiring Simulator (PRD DIF-FR-02, MVP §6.7, implementation slice P-302)  
**Status:** Backend implemented in the separate `feat/what-if-hiring-simulator` branch; **frontend not implemented**.  
**Screen:** Existing recruiter `/dashboard/search` → a **confirmed** search and its candidate results.  
**Developer brief:** Build the UI against the real backend; do not redesign matching, invent metrics or bypass human confirmation.

## 1. Product goal

A recruiter should be able to answer: **“What happens to my shortlist if I change these requirements?”**

The simulator displays original versus hypothetical criteria **side by side**, recalculates exact eligibility against the **same owner-scoped candidate snapshot**, identifies which candidates would enter or leave the eligible pool, and shows actual criterion-level reasons. Simulations never commit changes. A recruiter can dismiss the experiment or choose **Apply for review**, which simply opens the existing editable criteria form. The normal **Confirm Search** action is the *only* action that may save a revision.

Unlike **Search Health Diagnostics**, which automatically proposes a small set of measured adjustments, the simulator accepts the recruiter's own complete hypothetical criteria set. The two modules should ultimately work together but remain distinct UI responsibilities.

## 2. Location and layout

Embed a **What-if simulator** section within the existing confirmed results experience in `frontend/src/components/search/workspace.tsx`, alongside (not replacing) Search Health Diagnostics and candidate results.

- Entry point: secondary, clearly labeled **Try a what-if scenario**, visible **only when a confirmed session is active**.
- Main layout: desktop split comparison, **Current search** on the left and **What-if search · preview** on the right. Both show criteria and the actual counts from the API.
- Scenario editor: initialize from `results.criteria` and reuse the existing `CriteriaEditor`. The recruiter may change required/preferred modes, notice windows, experience bounds, location, skills and other supported `Rule` fields. Do not edit the confirmed criteria object in place: use a separate draft copy.
- Explicit primary action: **Run simulation** (read-only; not Confirm Search). The button should require a valid alternative criteria set. Loading must be genuine and should not block viewing saved results.
- After simulation: show **before → after** exact matches, needs-review counts, newly eligible candidates, and candidates that would cease to be eligible. Use real changed-filter chips and source-backed reasons—not an unsourced fit score.
- **Apply for review** opens the normal criteria-confirmation editor, with a diff against the saved search. **Discard scenario** closes without changing confirmed criteria. Never have a one-click “Apply search” action.
- Optional bridge: when Search Health Diagnostics is merged, `suggestion.proposedCriteria` can be passed to this simulator for further experimentation. This is a **follow-up integration**, not a dependency for the simulator.
- Palette, type and spacing: follow Pareto's existing restrained ivory/navy/cobalt design language, responsive dashboard, serif headings and native controls. Do not build a colorful BI dashboard or new analytics route.

### Screen hierarchy — illustrative wireframe (numbers are examples only)

```text
CONFIRMED RESULTS · Revision 2       [Edit criteria] [Try a what-if scenario]

┌───────────────────── CURRENT ────────────┬──────────── WHAT-IF · PREVIEW ────────┐
│ Senior Java Developer                    │ Senior Java Developer                 │
│ Hyderabad                                │ Hyderabad                             │
│ 6–10 years experience                    │ 6–10 years experience                 │
│ Notice ≤ 30 days                         │ Notice ≤ 45 days                      │
│ Required: Java, Spring Boot, AWS         │ Required: Java, Spring Boot, AWS      │
│                                         │                                      │
│ 3 exact  ·  1 needs review               │ 4 exact  ·  1 needs review            │
└─────────────────────────────────────────┴──────────────────────────────────────┘

Changed: Notice ≤30 → ≤45 days           +1 exact match
Newly eligible: Meera Iyer · notice 31 days matches proposed window
No longer eligible: none                  Still excluded: show verified reasons

[Discard scenario]    [Modify scenario]    [Apply for review]
                            ↓
              Existing criteria editor + diff
                            ↓
                 [Confirm Search]
```

**These figures and candidate names are illustrative only.** Never embed demo counters into the actual simulator.

## 3. Backend API and typed data contract

Authenticated, same-origin POST:

```http
POST /api/v1/search
Content-Type: application/json

{
  "action": "simulate",
  "sessionId": "<confirmed search session ID>",
  "expectedVersion": 2,
  "criteria": [ /* complete validated alternative Rule[] */ ]
}
```

- `sessionId` must be a currently owned, **confirmed** search, not an unconfirmed draft. The server obtains the owner ID from Supabase Auth; never accept or send an owner ID.
- `expectedVersion` is the currently displayed confirmed search version. Outdated version → HTTP **409**; unknown/foreign session → **404**; missing auth → **401**; invalid criteria → **422**. Requests are subject to the existing 32 KB request-body bound.
- The endpoint returns `Cache-Control: private, no-store`. Do not cache or publish private candidate details.
- Uses existing hard-vs-preferred, skill aliases, unknown evidence, and reference self-exclusion. No LLM query is needed.

### Response shape

```ts
type Counts = {
  ELIGIBLE: number;
  NEEDS_REVIEW: number;
  INELIGIBLE: number;
};

type RuleChange = {
  key: string;
  type: "ADDED" | "REMOVED" | "MODIFIED";
  before: Rule | null;
  after: Rule | null;
  hardConstraintImpact: "WEAKENED" | "STRENGTHENED" | "CHANGED" | "NONE";
};

type CandidateImpact = {
  id: string;
  displayName: string;
  roleTitle: string | null;
  city: string | null;
  before: {
    eligibility: "ELIGIBLE" | "NEEDS_REVIEW" | "INELIGIBLE";
    requiredMet: number; requiredTotal: number;
    preferenceMet: number; preferenceTotal: number;
    details: Array<{ rule: Rule; requested: string; actual: unknown;
      field: string; outcome: "MATCH" | "FAIL" | "UNKNOWN"; reason: string }>;
  };
  after: CandidateImpact["before"];
};

type ImpactGroup = {
  count: number;              // Full accurate count
  examples: CandidateImpact[]; // Up to 12 documented examples
  truncated: boolean;
};

type SimulationResponse = {
  sessionId: string;
  version: number;
  status: "PREVIEW_ONLY";
  evaluatorVersion: string;
  referenceId: string | null;
  totalCandidates: number;
  changed: boolean;
  changes: RuleChange[];
  original: { criteria: Rule[]; counts: Counts };
  proposed: { criteria: Rule[]; counts: Counts; remainingRequiredCount: number };
  delta: { exactMatches: number; needsReview: number; ineligible: number };
  transitions: Record<"ELIGIBLE" | "NEEDS_REVIEW" | "INELIGIBLE", Counts>;
  groups: {
    newlyEligible: ImpactGroup;
    noLongerEligible: ImpactGroup;
    stillIneligible: ImpactGroup;
    stillNeedsReview: ImpactGroup;
  };
  warnings: string[];
  limitations: string;
};
```

`Rule` comes from `@pareto/backend/search`. Prefer importing/inferencing types from the backend package where practical rather than silently duplicating a diverging contract. Implementation sources: `backend/src/search/simulator.ts`, `backend/src/search/service.ts`, `frontend/src/app/api/v1/search/route.ts`.

### Interpretation safeguards

- **Exact matches** means candidates whose **documented** data meets every mandatory rule; it does not predict job success or license automated rejection.
- A missing field yields **NEEDS_REVIEW** when it is the only obstacle, not a fabricated pass/fail. `details[]` contains the actual stored value (or `null`) and a precise reason.
- `delta.exactMatches` is a **net change**, not necessarily equal to `groups.newlyEligible.count`. Both newly eligible **and** no-longer-eligible candidates can occur simultaneously when criteria change in different directions.
- Use `changes[].hardConstraintImpact` to flag known weakening/strengthening. A changed role/skill may have `CHANGED` because semantic strictness cannot be ordered automatically.
- `transitions[beforeStatus][afterStatus]` gives the measured complete transition matrix, including review-status changes.
- Show `groups.newlyEligible` and `groups.noLongerEligible` prominently; `stillIneligible` and `stillNeedsReview` should be expandable so users can inspect why somebody still fails or lacks evidence.
- Each group's `count` covers the full cohort; `examples` contains **up to 12** sorted by candidate ID. When `truncated` is true, label “Showing first 12 of N”. Never call the example list exhaustive.
- Display `warnings[]`, especially for proposals that weaken mandatory criteria or have **zero required criteria**.
- `referenceId` is excluded from original counts, hypothetical counts, transitions and all groups.
- `changed: false` means the user hasn't meaningfully changed the typed rule payload. Present “No change to simulate” rather than implying an improvement.
- Both sides are evaluated from one database read for that request. Results are **not historical snapshots**: records may change after it returns; re-run a scenario to refresh.

## 4. UI state machine and critical workflow

1. **Confirmed search displayed:** the user sees the existing results. What-if panel is collapsed and no simulation request has run.
2. **Start scenario:** copy `results.criteria` into an independent editor draft and retain `{sessionId: results.sessionId, expectedVersion: results.version}`. Modifying controls changes *only* the draft.
3. **Run simulation:** validate draft with `criteriaSchema` for guidance; then POST the real API. Show an accessible loading state and retain saved results.
4. **Compare:** display both criteria, counts, changed rules, exact net change, newly eligible and lost eligibility groups; render evidence on demand.
5. **Edit again:** modifying the alternative marks the previous preview **stale**, because it no longer reflects the editor. Clear or visually invalidate previous counts until re-simulated.
6. **Apply for review:** check `response.sessionId === results.sessionId`, `response.version === results.version` and that the current scenario criteria still match the simulated `response.proposed.criteria`. If not, require a fresh simulation.
7. **Open existing confirmation editor:** call the existing `openDraft(response.proposed.criteria, response.warnings, { active: results })` pattern. Show the existing diffs and retain the original session/reference context. **Do not send a confirm POST here.**
8. **Discard:** close scenario/draft; do not save anything. **Confirm Search** in the existing editor is the separate action that appends a revision. On success, clear all previous simulations/diagnostics and display the newly confirmed results.
9. **Other tab confirmed a revision:** API returns 409. Display “This search was updated. Reload its latest revision before simulating.” Never overwrite or automatically reapply stale criteria.

A scenario may also be based on a Search Health suggestion in future by initializing the alternative draft from its `proposedCriteria`, but it must still run **this simulation API** before presenting actual side-by-side counts.

## 5. Component recommendations

| Component | Purpose |
| --- | --- |
| `WhatIfPanel` | Entry point; draft/preview/discard/error and version management |
| `WhatIfCriteriaEditor` | Wrapper around the **existing CriteriaEditor**, not a new search rule model |
| `WhatIfCompare` | Responsive current vs proposed criteria and counts |
| `WhatIfRuleChanges` | Changed-rule chips with mandatory requirement warnings |
| `WhatIfCandidateChanges` | Four measured transition groups with expandable per-criterion evidence |

This should fit naturally into `frontend/src/components/search/` and existing search/dashboard styling. Keep all server logic in the backend and API handler.

## 6. Empty states, errors and accessibility

| State | Required UI treatment |
| --- | --- |
| No confirmed session | Hide the simulator entry point and do not call API |
| No changed criteria | “Adjust at least one criterion to compare outcomes” |
| Loading | In-place “Calculating what-if results…” status; no fake wait |
| No candidate records | Both sides show zero; no invented candidates |
| Zero newly eligible | Show “No new exact matches under this scenario,” while retaining lost-eligibility and review counts |
| Candidate loses eligibility | Display **No longer eligible**, not “newly excluded” without explanation |
| No mandatory rules remain | Prominent caution: eligibility no longer means mandatory conditions were checked |
| 401 / 404 | Existing login / missing-or-unowned search messaging |
| 409 | Version conflict; require latest session and rerun |
| 413 / 422 | Safe message about oversized request, invalid criteria or 1,000-record corpus limit |
| Network / 5xx | Error + Retry; preserve saved results and local draft |
| Stale due to edit/session change | Invalidate preview; no Apply for review from a stale response |

Provide visible focus indicators, semantic headings and status messages, keyboard-friendly inputs and details, screen-reader announcements, no color-only eligibility distinction, mobile single-column stacking and reduced-motion support.

## 7. Frontend acceptance checklist

- [ ] Entry point appears only for confirmed searches; no request on page load.
- [ ] Simulator edits a separate copy of criteria and never alters saved results or a revision.
- [ ] Same-origin POST uses `action:"simulate"`, correct session, expectedVersion and the **complete** proposed criteria array.
- [ ] Both panes show exact API counts; required-vs-preferred changes have conspicuous warnings.
- [ ] Rule differences show ADDED/REMOVED/MODIFIED and truthful hard-constraint impact.
- [ ] Net exact change, newly eligible and no-longer-eligible groups are not confused.
- [ ] At least one candidate's before/after evidence proves a changed notice-period outcome.
- [ ] Remaining ineligible/review profiles have inspectable per-rule reasons.
- [ ] Capped example lists disclose their full totals; reference candidate is absent.
- [ ] Editing a simulated draft invalidates prior preview; 409 rejects stale simulations.
- [ ] **Apply for review** opens existing CriteriaEditor; it performs no confirm request.
- [ ] Discard leaves stored SearchSession/SearchRevision/notification state intact; explicit Confirm Search alone updates them.
- [ ] Error, empty, preferences-only, 401/404/409/422, network and responsive states are tested.
- [ ] Existing plain-English search, explanations, refinement, reference search and Search Health Diagnostics remain unaffected.

## 8. Dependency and delivery boundary

This **document is the frontend to-do specification**, not a claim that the UI exists. Implement this only after the What-If backend PR is merged or made available in the frontend worker's branch. It can coexist with `docs/frontend-implementation-needed/health.md` from the separately open Search Health Diagnostics branch.

**Not part of the simulator UI task:** PDF ingestion, new LLM providers, embeddings, arbitrary automatic constraint relaxation, job acceptance/rejection, new Prisma migrations, unauthenticated demo bypass, or Railway deployment.

**Definition of done:** a recruiter can create a hypothetical change, compare verified before/after counts and evidence, discard it, or explicitly review and confirm it as a normal search revision—**without the simulation itself changing any stored state**.
