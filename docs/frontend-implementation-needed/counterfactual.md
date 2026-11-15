# Counterfactual Near-Match Explanations — Frontend Implementation Needed

**Product:** Pareto · **PRD:** DIF-FR-03 · **MVP:** §6.8 · **Work package:** P-303  
**Current state:** Backend implementation on `feat/counterfactual-near-match`, frontend UI **not yet implemented**.  
**Target location:** Existing confirmed result cards in `/dashboard/search`, next to candidate evidence.  
**Scope:** UI integration and tests only. No new database tables, resume parsing, scoring model, or direct hiring recommendation.

## 1. Purpose and UX principle

Recruiters currently see whether a candidate is `ELIGIBLE`, `INELIGIBLE`, or `NEEDS_REVIEW`. This feature answers a narrower, evidence-backed question: **“What precisely prevents this candidate from meeting the confirmed requirements, and what would have to change?”**

The response must **never** invent candidate skills, job history, availability or evidence. Any proposed change is to the **recruiter's search criteria**, not to the candidate's actual attributes.

- A documented notice period of **60 days** versus a required **≤30 days** yields a proposed `maxDays: 60` (exact minimal numeric threshold). Never claim the candidate can join in 30 days.
- A documented **71 months** versus required **≥72 months** yields `minMonths: 71`, preserving other experience bounds.
- A known failure of **Java required** when the candidate only lists **JavaScript** does **not** justify claiming Java experience. The only available generic categorical alternative is explicitly demoting the Java requirement to **preferred**. The skill remains a mismatch.
- An **unknown** notice period is **not** a documented mismatch and gets **Verify evidence**, not a guessed value or relaxation.
- If more than one required criterion fails, show **every** proposed rule change and its trade-off; the preview is recomputed using the actual evaluator. The term “minimal” refers to *only known-failing required rules*, with field-local exact numeric thresholds—not global business optimization.

## 2. Visual placement

Add a compact expandable **“Why a near match?”** or **“Explore differences”** action to candidate result cards in `frontend/src/components/search/workspace.tsx`, alongside the existing **Match evidence** and **Candidate details** controls. Do not interrupt the result grid or create a new dashboard page.

**Recommended display:**
1. Candidate name, current eligibility and role, as already shown.
2. Small heading **“What keeps this candidate from matching?”**.
3. Inline facts: **Known mismatches: N** and **Unverified requirements: M**.
4. List of documented blockers, one row per required rule, showing the stored evidence and *exact* proposed requirement adjustment.
5. A separate **Needs verification** group for `UNKNOWN` fields.
6. Preview outcome: **Ineligible → Eligible** or **Ineligible → Needs review**. The latter must emphasize that evidence is still missing.
7. Clear statement: **“This only previews changes to your search; nothing has been applied.”**
8. Optional **Review criteria changes** action, available only when there are actual proposed changes. It opens the existing search criteria editor and requires a subsequent independent **Confirm Search**. Hide/disable it if the response has zero changes.

### Illustrative layout (not static application data)

```text
Dev Shah  ·  Senior Java Developer
Ineligible                               [Why a near match?]

  WHY A NEAR MATCH?
  All other required criteria match; one documented gap:

  Notice period
  Required                  Candidate's stored value
  Within 30 days            60 days

  Smallest threshold change: 30 → 60 days
  Trade-off: You would accept a longer joining window.

  Before: Ineligible        After preview: Eligible
  Evidence: Candidate record · noticePeriodDays = 60

  [Dismiss]                         [Review criteria changes]
```

If a candidate has unknown evidence, instead say:

```text
Notice period: Not documented
Action: Verify candidate's notice period
After preview: Needs review — cannot confirm eligibility
```

Use Pareto's existing ivory/navy/cobalt UI tokens, readable typography, restrained borders, semantic icons, mobile single-column layout, keyboard focus and reduced-motion support. Avoid celebratory badges, ungrounded percentage scores or fictional source document quotations.

## 3. Existing backend API

This is a **protected, read-only GET**. Only call it after a search has been **confirmed**, and only for a candidate belonging to the recruiter.

```http
GET /api/v1/search?counterfactual=<encodeURIComponent(sessionId)>&candidate=<encodeURIComponent(candidateId)>&version=<confirmedVersion>
```

Existing Supabase session cookie is used automatically. Fetch same-origin with `cache: "no-store"`. There is no need for Gemini, Groq, a new model key, or any client-supplied owner ID.

The server verifies the owned confirmed search, ensures its version matches, fetches an owned candidate, rejects a reference candidate analyzing itself, runs the deterministic evaluator twice and returns an immutable proposal. It **never writes** a search revision, candidate attribute or notification.

### Response contract

```ts
type NearMatchResponse = {
  sessionId: string;
  version: number;
  referenceId: string | null;
  status: "PREVIEW_ONLY";
  evaluatorVersion: string;
  candidate: {
    id: string;
    displayName: string;
    roleTitle: string | null;
    city: string | null;
  };
  originalCriteria: Rule[];
  proposedCriteria: Rule[];
  before: {
    eligibility: "ELIGIBLE" | "NEEDS_REVIEW" | "INELIGIBLE";
    details: CriterionEvidence[];
    requiredMet: number; requiredTotal: number;
    preferenceMet: number; preferenceTotal: number;
  };
  after: NearMatchResponse["before"];
  knownRequiredFailures: number;
  changedRuleCount: number;
  changes: Array<{
    key: string;
    kind: "EXPAND_NOTICE" | "EXPAND_EXPERIENCE" | "MAKE_PREFERRED";
    before: Rule;
    after: Rule;
    tradeOff: string;
    evidence: {
      source: "structured_candidate_record";
      field: string;
      actual: unknown;
      outcome: "FAIL";
      reason: string;
    };
  }>;
  missingEvidence: Array<{
    key: string;
    rule: Rule;
    source: "structured_candidate_record";
    field: string;
    actual: unknown;
    reason: string;
    action: "VERIFY_EVIDENCE";
    message: string;
  }>;
  remainingKnownFailures: Array<{
    key: string;
    rule: Rule;
    field: string;
    actual: unknown;
    reason: string;
  }>;
  remainingRequiredCount: number;
  warnings: string[];
  limitations: string;
};
```

`Rule` already exists in `@pareto/backend/search`. `CriterionEvidence` follows the normal evaluator detail shape: `{ rule, requested, actual, field, outcome, reason }`. Prefer type inference/shared contracts rather than divergent handwritten client logic.

### Important response semantics

- `changes[]` describes only **documented failures of mandatory requirements**; it is not a list of all profile facts or a hiring recommendation.
- `MAKE_PREFERRED` means **weaken the recruiter requirement**, not “candidate now has this skill.” The corresponding after-evidence may still say `FAIL` while the candidate becomes formally `ELIGIBLE` because the rule is no longer mandatory.
- `missingEvidence[]` lists unknown mandatory fields with the action `VERIFY_EVIDENCE`. **Do not generate a number** or silently remove the required rule.
- `before.eligibility` and `after.eligibility` are calculated by the same exact evaluator as ordinary search; the UI must **not derive its own eligibility**.
- A preview may change `INELIGIBLE → NEEDS_REVIEW`, not necessarily to `ELIGIBLE`. Display the actual returned status.
- `remainingRequiredCount === 0` must trigger the backend `warnings[]` prominently: no mandatory requirements remain.
- Only **structured candidate records** are supported as provenance today. The resume-ingestion system does not yet supply excerpts or page references. Don't create PDF quotes, source links or page numbers that don't exist.
- Only the candidate with `candidate.id` is analyzed; no global alternative statistics are returned. Search Health Diagnostics and the What-If Simulator are separate features.

## 4. Interaction and state machine

1. **Confirmed search and result:** show the near-match action on an `INELIGIBLE` or `NEEDS_REVIEW` candidate card. Optional eligible state should simply say “Already meets mandatory requirements” without proposing a relaxation.
2. **On demand:** clicking opens a local panel and performs the read-only GET. Show actual request loading; don't fetch all candidates' explanations eagerly.
3. **Render:** show known failed rules and evidence, unknown verification tasks, precise suggestions and all trade-offs. Where numeric, label the actual boundary in days or months.
4. **Review criteria changes:** if `changedRuleCount > 0`, compare `response.sessionId` and `response.version` to current `results`. On match, open the existing `CriteriaEditor` with the full `response.proposedCriteria`, plus `active: { sessionId, version }`. Show changes in its existing diff, not as immediate applied filters.
5. **Do not confirm automatically:** the first click makes a *draft only*. The recruiter can discard the draft and preserve their confirmed search, or independently press **Confirm Search** to save one new revision through the existing endpoint.
6. **On confirmed revision, changed session or reference profile:** clear any stale counterfactual report. A 409 means the saved version changed; request a refresh instead of silently overwriting it.
7. **Dismiss:** close the explanation and leave stored search criteria, notification history and candidate facts unchanged.

## 5. Required states and error treatment

| State | UI behavior |
| --- | --- |
| No confirmed search | No counterfactual request/action |
| Loading | “Checking documented gaps…”; keep the result card visible |
| Known mismatches only | Show exact proposed rule changes, verified before/after outcome |
| Unknown only | “Nothing documented to relax; verify these fields” and no Review button |
| Known mismatches + unknowns | Show both separately; expected outcome may remain Needs review |
| Already eligible | “Meets all required criteria”; no artificial gap or Review action |
| Categorical rule relaxed | Display mandatory → preferred trade-off and caution that the candidate still lacks a documented match |
| No mandatory rules remain | Show a prominent caution from `warnings[]` |
| HTTP 401 | Use current sign-in guidance |
| HTTP 404 | Candidate or search unavailable / not accessible |
| HTTP 409 | Stale search revision: reload current results |
| HTTP 422 | Invalid request / reference candidate cannot be its own near match |
| Network/5xx | Keep saved results and display Retry; no synthetic fallback |
| Candidate/session changed | Invalidate the previous response and request new evidence |

## 6. Suggested components

- `NearMatchExplanation`: toggles panel, manages read-only request and stale response.
- `KnownGapList`: displays documented failing mandatory rules and precise trade-offs.
- `VerificationChecklist`: presents `UNKNOWN` mandatory requirements separately.
- `NearMatchOutcome`: compares the server-returned eligibility before and after, and shows caution messages.

Reuse the existing `frontend/src/components/search/workspace.tsx` and `CriteriaEditor`. Avoid new routes, redundant design systems and a separate confirmation workflow. A candidate-detail page can reuse the same component later, but the first integration belongs in search results.

## 7. Frontend acceptance tests

- [ ] Explain action exists for near-matches only after a confirmed search; request is lazy.
- [ ] A notice failure of 60 versus 30 shows **30→60**, with real stored evidence, never 30→45 unless the candidate's actual value is 45.
- [ ] Experience 71 versus minimum 72 shows a one-month adjustment; no unrelated criteria are modified.
- [ ] JavaScript is not presented as Java; making Java preferred never claims Java expertise.
- [ ] Missing notice remains verification-only, and “Needs review” is preserved after documented gaps are relaxed.
- [ ] Multiple known gaps render separately and the proposed criteria include all changes, with no silently removed original requirements.
- [ ] No hard requirements left → show prominent warning; candidate status is not hiring suitability.
- [ ] Auth/owner errors, stale version and reference self-exclusion are handled without data leakage.
- [ ] Review opens existing editable confirmation form **without a POST**; discard does not save, explicit confirmation does.
- [ ] Search revisions/refinements invalidate old explanations; no fake excerpts, scores or hard-coded examples.
- [ ] Keyboard, screen readers, responsive layout and existing search tests remain correct.

## 8. Developer references / dependencies

- Backend: `backend/src/search/counterfactual.ts`
- Owner-scoped service: `backend/src/search/service.ts` → `counterfactualFor`
- Protected route: `frontend/src/app/api/v1/search/route.ts`
- Existing result cards: `frontend/src/components/search/workspace.tsx`
- Original PRD: `docs/PRD.md`, DIF-FR-03
- Related UI handoffs: `docs/frontend-implementation-needed/health.md` (PR #10) and `simulator.md` (PR #11), currently on separate branches

**Definition of done:** an authenticated recruiter can inspect exactly which known requirements prevent a specific candidate from qualifying, distinguish missing evidence, preview the minimum field-local changes, discard them or review them in the existing criteria editor **without a database mutation until Confirm Search**.
