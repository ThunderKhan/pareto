# Pareto Frontier — Flagship Feature Specification

**Document:** docs/Flagship_Feature.md  
**Feature ID:** FLAG-FR-01 / Pareto Frontier  
**Product:** Pareto — Trustume AI Hackathon 2026, Problem Statement 1  
**Owner:** std::zero · Backend + Frontend workstreams  
**Status:** IMPLEMENTED ON MAIN (PR #30) — CI verified; live signed-in Supabase demo validation remains pending  
**Target:** 15 November 2026, before the 17:00 IST code-freeze gate  
**Source of truth:** This document for the Frontier; docs/PRD.md for organizer requirements and backend/src/search/evaluate.ts for eligibility semantics.

> **One flagship, not four loosely connected widgets.** We are building a single recruiter decision experience that combines existing Search Health Diagnostics (DIF-FR-01), What-If Hiring Simulator (DIF-FR-02), and Near-Match Counterfactual Explanations (DIF-FR-03). Natural-language search, human confirmation, explainability, and Find Candidates Like Me remain non-negotiable organizer flows. This document records the original design and the implemented scope. Live signed-in Supabase acceptance remains a separate release check.

## Implementation evidence (15 November 2026)

- **Merged:** [PR #30](https://github.com/ThunderKhan/pareto/pull/30), merge commit `c75ddcd0033ae86b5ca8bf103b587d03c127eaf0`.
- **Verified CI:** [GitHub Actions run #43687878536](https://github.com/ThunderKhan/pareto/actions/runs/43687878536) passed: **246 backend tests passed, 6 skipped**, **56 Playwright browser tests passed**, Prisma migration/seed, typecheck, production build, Docker image build, signed-out runtime access-denial smoke.
- **Backend implementation:** `backend/src/search/frontier.ts`, `backend/src/search/frontier.test.ts`, owner-scoped `searchFrontier` service and strict authenticated `POST /api/v1/search` with `action: "frontier"`.
- **Frontend implementation:** `frontend/src/components/search/pareto-frontier.tsx` and `frontier.css`, mounted in `workspace.tsx` after confirmed results. Review passes a complete proposed criteria draft into the existing explicit confirmation flow.
- **Verified behaviors:** actual candidate partitions, tested bounded single/pair relaxations, non-dominance under per-rule partial order, reference exclusion, owner access separation, no preview revision writes, stale-version failure, deterministic output and optimized/full-evaluator equivalence on synthetic fixtures.
- **Release caveat:** CI's credentialed recruiter-live job was **skipped**. A signed-in Supabase browser run with real owner-scoped credentials, deployed environment and demo smoke test must still be performed before declaring production/demo readiness.
- **Scope note:** the existing Search Health and What-If widgets remain below the new primary Frontier module for compatibility. The optional data-visualization graph, full historical snapshotting, arbitrary recruiter weights and exhaustive multi-objective optimization were **not** implemented.
- **Algorithm detail:** current implementation evaluates up to 48 single variants and up to 24 pairs of distinct rule keys from its bounded representatives; it does not claim global optimality or search outside its owned 1,000-profile limit.

## 0. Executive decision

Build **Pareto Frontier**, subtitled **“Explore better hiring strategies without guessing.”**

A recruiter with an overconstrained search should discover *a small, defensible selection of alternative requirement sets*, see exact consequences on the owner's **current candidate records**, inspect newly eligible candidates and unknown evidence, and choose an alternative for **explicit review and confirmation**. Pareto never changes a confirmed search based on a preview or model text.

The product's “aha” moment:

1. Confirm an ordinary candidate search and see only 0–3 eligible profiles.
2. Open **Explore hiring strategies** within the same search workspace.
3. See the baseline and 3–5 meaningfully distinct, measured compromises, not fabricated “AI scores.”
4. Select an alternative; understand which criterion changed, newly eligible records, remaining failures and unknowns.
5. Choose **Review this strategy**, which opens the existing editable draft. Only **Confirm Search** persists a new revision and executes it.

**User value:** reduce repeated manual filter-tweaking, explain bottlenecks, make realistic negotiation of hiring requirements auditable, and expose uncertainty instead of overclaiming candidate suitability.

**Positioning:** “Pareto doesn't just find candidates. It shows the trade-offs behind your hiring requirements.” The name *Pareto* should earn its meaning; the algorithm must implement an honest **bounded non-dominance** analysis, not a decorative frontier chart.

**Non-goals:** autonomous hiring, approval/rejection of applicants, estimated time-to-hire or salary, candidate employability probabilities, externally sourced candidates, protected-characteristic optimization, unlimited combinatorial optimization, extra agents, or another separate dashboard.

## 1. Existing system facts and integration points

Verified against the repository on 15 November 2026:

| Existing implementation | Actual location / contract | How Frontier uses it |
| --- | --- | --- |
| Canonical rules + normalization | backend/src/search/criteria.ts: Rule, criteriaSchema, ruleKey | Validate generated modifications and preserve unaffected rules |
| Deterministic evaluator | backend/src/search/evaluate.ts: evaluate(), rank(), three eligibility states | Sole authority for all candidate outcomes |
| Search Health | backend/src/search/diagnostics.ts: diagnoseSearch(), bounded alternatives | Reuse/refactor safe relaxation generation and bottleneck data |
| What-If | backend/src/search/simulator.ts: compareSearches(), diffCriteria() | Use candidate-state transitions, counts and change explanations |
| Near-Match | backend/src/search/counterfactual.ts: explainNearMatch() | Optional evidence drawer for newly eligible or near-match profiles |
| Search service | backend/src/search/service.ts: activeSearch(), searchDiagnostics(), simulateSearch(), confirmSearch() | Owner checks, confirmed revisions, current candidate corpus |
| Existing API | frontend/src/app/api/v1/search/route.ts | Add a strictly validated read-only action without breaking existing actions |
| Existing search UI | frontend/src/components/search/workspace.tsx | Embed Frontier beneath confirmed results, reuse openDraft(...) callback |
| Existing insight UI | frontend/src/components/search/search-health.tsx and what-if.tsx | Consolidate/cross-link, avoid repeated competing primary buttons |
| Existing PRD | docs/PRD.md: ORG-FR-01–06, DIF-FR-01–04 | Keep human review/confirmation, evidence, reference exclusions |
| Backend persistence | Prisma PostgreSQL, SearchSession and SearchRevision | No new persistence table required for previews |
| Semantic retrieval | backend/src/search/semantic.ts, merged via PR #21 | May reorder results, **never** change deterministic eligibility counts |

**Real current limits:** owner-scoped corpus read is capped at 1,000 profiles (fetch 1,001 to detect overflow); criteriaSchema permits 1–40 rules; references must be excluded from both candidate counts and preview examples; existing diagnostics cap 60 single alternatives and 15 paired alternatives (pairs explored only if singles have no positive gain). Existing diagnostics returns up to eight suggestions and 12 newly eligible examples per alternative. New Frontier should be a separate bounded algorithm that *shares primitives*; do not repurpose the top-eight suggestions as an exhaustive optimality search.

**Important distinction:** semantic vector ranking and embeddings are not needed to generate Frontier strategies. Frontier uses stored structured evidence and the deterministic evaluator so that the feature works without an AI key.

## 2. Primary user, problem and expected benefit

**Persona:** recruiter or talent sourcer screening an existing, permissioned candidate library under a hiring manager's constraints.

**Trigger:** “I found too few candidates for my current requirements. What trade-offs are defensible?”

**Jobs to be done:**
- Understand which *documented* criteria cause exclusions, separate from missing documentation.
- Quantify how different relaxations change exact eligibility and review-required cases.
- Compare strategies with different types of compromise without treating all requirements as equally expendable.
- Inspect actual candidate records and the precise required-rule differences.
- Review an alternative with a hiring manager before saving a new search revision.

**Success measurements (engineering):** correct eligibility transitions, zero changes before confirmation, no cross-owner information, stable deterministic ordering, bounded runtime, readable mobile flow, and test-backed counts. Product impact such as “time saved” is a hypothesis until observed in user tests.

**Anti-goal:** do not claim “find 3× more qualified candidates” when counts only reflect eligibility under *relaxed* rules. Changing mandatory to preferred may enlarge the **eligible** set without verifying the missing qualification.

## 3. Hard principles and invariants

1. **Human authority:** Frontier is preview-only; no SearchRevision, Candidate, ResumeDocument or notification writes.
2. **One evaluator:** exact match, unknown, and failure semantics must match evaluate() exactly. Reuse MATCH / FAIL / UNKNOWN, and ELIGIBLE / NEEDS_REVIEW / INELIGIBLE unchanged.
3. **No fabricated facts:** read owner-scoped Candidate records; do not invent qualifications, candidate names, page numbers, market statistics, or outcomes.
4. **Unknown is not a failure:** show review-needed totals and never count UNKNOWN as an exact match.
5. **No silent relaxation:** the UI opens the existing criteria editor, then relies on the existing confirm route and idempotent requestId.
6. **Respect reference context:** exclude referenceCandidateId from all baselines, alternatives and candidate examples, and preserve it through confirmation.
7. **Stable versions:** every preview refers to one confirmed session version; stale 409 responses require reload.
8. **Private by default:** server derives ownerId from authenticated session, never from client JSON; no cross-owner profiles or raw resume text.
9. **No protected-trait trade-offs:** only fields in criteriaSchema; do not infer demographic or sensitive attributes.
10. **No invented objective costs:** notice days, experience months, and skill requirements have different meanings. Do not add them into a universal “quality” or “compromise” score.
11. **Bounded search:** finite candidate reads, alternatives, example records, request body, time and memory.
12. **Measurable claims:** label “non-dominated among evaluated strategies”; never imply globally optimal or statistically representative of a wider talent market.
13. **Explicit release condition:** do not ship a pretty, static mock as a live quantified optimization experience.

## 4. Intended user experience and information architecture

**Location:** /dashboard/search, **only after an authenticated, confirmed search**. This is not a new /dashboard/frontier page and is not part of public marketing. Integrate as a prominent but non-obstructive **Pareto Frontier** module immediately below the current result summary and above the candidate list. The original results remain navigable and normal search never depends on Frontier loading.

### 4.1 Surface hierarchy — desktop

~~~text
Dashboard / Search                                   [Recent searches]
─────────────────────────────────────────────────────────────────────────
Confirmed: Senior Java Developer · Hyderabad        Revision 3
[role] [skills] [experience] [notice]                [Edit criteria]

Candidate results: 2 eligible · 5 need review · 41 ineligible
─────────────────────────────────────────────────────────────────────────
PARETO FRONTIER
Explore hiring strategies, grounded in your candidate library
[ Explore strategies ]      [How this is calculated?]

After calculation:
   BASELINE                        YOUR OPTIONS
   2 exact matches                 3–5 distinct measured strategies
   5 need review                   Never applied automatically
  ┌──────────────────┐    ┌─────────────────────────────────────────┐
  │ CURRENT SEARCH   │    │ Extend notice: 30 → 45 days             │
  │ 2 eligible       │    │ 2 → 5 eligible  (+3)                      │
  │ No changes       │    │ 1 required rule softened                 │
  └──────────────────┘    │ [Review impact]   [Review this strategy]│
                          └─────────────────────────────────────────┘
                          ┌─────────────────────────────────────────┐
                          │ Reduce experience: 8 → 7 years          │
                          │ 2 → 4 eligible  (+2)                      │
                          │ [Review impact]   [Review this strategy]│
                          └─────────────────────────────────────────┘

Expanded option:   [Before vs proposed criteria] [Eligibility transitions]
                 [Newly eligible records] [Unknown evidence] [Warnings]
─────────────────────────────────────────────────────────────────────────
Normal candidate results, Near-match evidence, conversation refinement...
~~~

The numbers above are **illustrative**, never a UI fixture to show as real results. Choose a deterministic demo query whose counts have been verified against the current seed.

### 4.2 Mobile (320px+)

Use one-column layout; put baseline summary first and strategy cards below. No horizontal chart with unreadable ticks; no carousel dots or hidden overflow. A horizontal rule-change summary can wrap onto multiple lines. Sticky confirmation belongs to the existing editor only, not to a preview card.

### 4.3 Placement of existing differentiators

- **Pareto Frontier is the primary consolidated insight module.** It combines Health's bottlenecks and What-If's transition summary, rather than showing three large equally weighted panels.
- Keep the individual Search Health / What-If modules available only as secondary details, progressively disclosed sections, or existing legacy panels if the merger risks regression before freeze.
- Candidate-level Near-Match stays available on result cards; Frontier may link to the same explanation component.
- No separate AI chat to ask Frontier for advice. Existing conversational refinements continue as an independent, unchanged organizer feature.
- Existing design system (Pareto's architectural minimalism, compact UI density, tokens, typography and accessible motion) applies. No new UI dependency strictly required.

### 4.4 UI states and microcopy

| State | UI behavior |
| --- | --- |
| No confirmed search | Do not render Frontier |
| Initial | “Explore hiring strategies” CTA with a short explanation |
| Loading | “Comparing bounded alternatives against your candidate records…”; support cancel/unmount via AbortController |
| Success | Baseline, alternatives, actual counts and explicit limitations |
| No candidates | “No candidate profiles are available to analyze.” |
| Preference-only / no hard requirements | “Nothing mandatory to relax; consider adding criteria instead.” No fake frontier |
| Zero measured improvement | “No improvement within the alternatives tested.” Never “No candidates exist” |
| Zero-risk improvement | May display “Same eligible pool with a smaller relaxation”; explain precisely |
| Unknown-heavy | Keep a distinct “Needs review” count; suggest verifying missing facts, not inventing skills |
| Stale search | “Search changed. Reload results to explore current strategies.” |
| 401 | Show sign-in recovery |
| 403 / 404 | Generic unavailable search message; never disclose other owners' data |
| 429 / 503 | Try again or use normal search; preview failures never corrupt the confirmed search |
| Network/offline | Keep normal results usable; do not display stale suggestions as current |
| Confirm opened | “Review strategy before confirming”; no auto-save |
| Confirmation succeeded | Existing search revision, updated counts and invalidated old Frontier |

**Labels:** “Eligible under these requirements”, not “top hires”, “approved” or “qualified”; “Trade-off”, not “AI recommendation”; “Alternative strategy”, not “optimal strategy”; “Needs review” separate from “ineligible”.

### 4.5 Interaction and accessibility

- Visible buttons: Explore strategies, Review impact, Review this strategy, Return to results / Close.
- Every strategy card shows original eligible count, new eligible count, **net delta and gross additions/losses**; never hide losses behind a positive net.
- Display the exact before→after rule edit and a plain-language caution for converting required→preferred.
- Include max 12 candidate examples per impact group, with exact untruncated counts. Defer full lists to normal result navigation.
- Cards are not activated by hover; keyboard focus and Enter/Space support all controls.
- Use headings and aria-live polite for loading/success, role=alert for failures, visible focus, reduced-motion preference, minimum contrast AA.
- For a graph (stretch), provide a **table/list equivalent**; graphs are optional, not the core deliverable.
- Prefer static data-bound transitions; no fake loading animation and no artificial model delay.
- Metrics and counts use tabular digits; prevent layout shift; respect touch targets and text wrapping.
- Avoid an automatic “best option” badge. Recruiters may value different trade-offs.

## 5. Data vocabulary and model

**Baseline:** current confirmed criteria + same owner-scoped candidate cohort.

**Scenario:** one concrete, validated, monotone weakening of one or two required rules. Never add candidates or rewrite the original search while previewing.

**Relaxation:** notice max increased; experience min decreased or max increased; or converting a required rule to preferred. Proposed values must remain within criteriaSchema and must not remove other constraints. Never substitute JavaScript for Java or replace a role with an AI-inferred synonym.

**Eligibility counts:** full three-way partition of all considered profiles. For a reference search, exclude exactly the reference profile before counting.

**Newly eligible:** candidate was not ELIGIBLE under baseline and becomes ELIGIBLE under proposed. A previous UNKNOWN is a move from NEEDS_REVIEW to ELIGIBLE *because of weakening*, not newly verified competence.

**Lost eligibility:** candidate was ELIGIBLE before and no longer ELIGIBLE after. For correctly implemented *monotone relaxations*, this should always be zero. If nonzero, fail tests / do not publish the scenario; still expose transitions in response for defensiveness.

**Rule burden:** how far each **individual** rule has been relaxed. No automatic exchange rate between days, months, skills or different rule keys.

**Non-dominated among evaluated scenarios:** no other evaluated proposal yields at least as many eligible candidates while requiring *no greater relaxation on every rule*, with one strict advantage. This is an intentionally conservative partial-order definition.

**Bottleneck:** per-rule failed and unknown counts as defined by existing diagnostics; counts can overlap.

**Algorithm version:** stable named version, e.g. frontier-v1, independent of evaluatorVersion and current semantic ranking model.

## 6. Exact Pareto/non-dominance semantics

A naïve “rank by number of extra candidates” encourages reckless rule relaxation. A naïve scalar compromiseScore = extraDays + missingSkills is invalid because units and consequences are incomparable.

For each original required rule, define a **pointwise relaxation order**:

- Unchanged is the least relaxed state.
- Notice limit maxDays: 30 ≤ 45 ≤ 60 in permissiveness (within the same original notice rule).
- Experience interval: A is no more relaxed than B when A's accepted interval is a subset of B's accepted interval. Lowering a minimum and raising a maximum in *different directions* may be incomparable.
- Original mandatory categorical/skill rule: unchanged is less relaxed than converting it to preferred. Do not compare distinct categories or change values.
- A preferred rule remains untouched in Frontier; its rank contribution can differ when another required rule is changed, but it is never silently rewritten.

For two scenarios A and B derived from the **same baseline**:

A dominates B iff:
1. eligible(A) ≥ eligible(B);
2. for every original required rule r, A's accepted-value set is a subset of or equal to B's accepted-value set (A requires no greater concession anywhere);
3. at least one of these comparisons is strict.

Consequences:
- Different kinds of concessions (e.g. relaxing AWS vs extending notice) are usually **incomparable**. Keep both available rather than pretending one is objectively “cheaper.”
- An extra relaxation that yields no new candidates is potentially dominated by a stricter scenario with the same result.
- This partial order intentionally favors transparency over a fabricated universal preference score.
- This is a **frontier of the bounded set actually examined**, not the mathematical globally optimal frontier of every imaginable hiring strategy.
- “Top recommendations” shown by UI are a *diverse subset* of the non-dominated options. Explain that other evaluated options may be hidden by the display cap.

**Optional recruiter controls (post-MVP):** choose rules that may never be relaxed and mark high-priority constraints; re-run generation inside explicit client-supplied safe policy. For freeze MVP, default to all original required rules eligible for modest relaxations, except avoid eliminating all mandatory requirements.

**Important nuance:** “ELIGIBLE” is a formal result of stated criteria. It is not a personnel decision or a measure of human worth.

## 7. Algorithm — optimized, bounded, deterministic

### 7.1 Input and budget

- One authenticated user, one confirmed session/version.
- Up to 1,000 owner-scoped candidate profiles; reject 1,001+ as existing services do.
- Up to 40 structured rules.
- At most **48 evaluated single-rule variants** and **24 evaluated two-rule variants** = **72 scenarios**, excluding baseline.
- Explore pairs **only when useful**: when zero/low singles, or when a top bottleneck pair has plausible joint effects; never enumerate every pair of all variants.
- Return at most **5 diverse non-dominated strategy cards** and 12 examples per candidate-transition group.
- Evaluate under a bounded compute budget. No model API, embeddings or expensive SQL inside the scenario loop.

**Freeze-safe cut:** if pair search threatens performance or quality, ship singles + correct non-dominance + end-to-end UI. Do not fake paired optimization.

### 7.2 Required optimized approach

1. Read the confirmed session, rule set and **entire owner-scoped candidate set once**.
2. Exclude reference candidate. Validate the original criteria once.
3. Precompute each candidate's evaluation by rule: indexed outcomes (MATCH/FAIL/UNKNOWN), and the number of failed and unknown **required** rules. O(NR), N≤1,000, R≤40.
4. Precompute the original three-way eligible/review/ineligible counts, original status per candidate, and bottleneck frequencies.
5. Generate a deterministic, bounded set of monotone relaxations. Reuse safe variant creation from diagnostics by extracting a shared helper, rather than parsing literal prose or using an LLM.
6. For each scenario touching k≤2 rules, evaluate **only those affected rules** per candidate and update the precomputed required fail/unknown counters. If a required rule becomes preferred, subtract its prior required contribution; if a notice/experience bound changes, replace its prior contribution with the new one. Derive the three-way status from the counters.
7. Count exact transitions using the full cohort. Assert candidate conservation (sum statuses = totalCandidates), reference exclusion and monotonicity.
8. Discard unchanged and invalid proposals, duplicate canonical rule sets, and any proposals that leave zero mandatory requirements for MVP.
9. Keep proposals yielding a positive exact-count gain; when none exists, retain a precise “none found in evaluated set” response. Optionally preserve the one most informative no-gain alternative only as a clearly labeled inspection, not a success.
10. Determine partial-order domination by comparing rule-by-rule permissiveness. With M≤72, O(M²R) comparison is cheap and predictable.
11. Diversity selection of ≤5 *non-dominated* options: prioritize distinct affected rule keys and modes, show meaningful gain, prefer fewer changed rules as a deterministic presentation tie-break, and keep alternative families represented. **Do not re-label a dominated fallback as frontier-optimal.**
12. Produce short stable IDs derived from hash(canonical base criteria + canonical modifications + algorithmVersion), not raw JSON concatenations that expose resume data. Include changed rules, before/after, measurable counts, candidate examples, warnings and scope limits.

### 7.3 Pseudocode

~~~ts
function computeFrontier(candidates, confirmedCriteria, referenceId):
  assertValid(confirmedCriteria)
  cohort = candidates.filter(candidate => candidate.id !== referenceId)
  base = precomputeRuleOutcomes(cohort, confirmedCriteria)
  options = generateBoundedRelaxations(confirmedCriteria, base.bottlenecks)
  scenarios = []

  for option in options.single.slice(0, 48):
    scenarios.push(evaluateDelta(base, option))

  if shouldExplorePairs(scenarios, base):
    for pair in chooseDistinctRulePairs(options).slice(0, 24):
      scenarios.push(evaluateDelta(base, pair))

  scenarios = deduplicateAndValidateMonotonic(scenarios)
  positive = scenarios.filter(s => s.newlyEligible > 0)
  frontier = positive.filter(b =>
    !positive.some(a => a.id !== b.id && dominates(a, b))
  )
  shown = selectDiverse(frontier, maxItems = 5)
  return { base, shown, searched: scenarios.length,
           nonDominatedCount: frontier.length, isExhaustive: false }
~~~

### 7.4 Complexity and scalability

With N candidates, R rules and M scenarios, naive repeated full evaluation is O(MNR), expensive and wasteful. Cached rule outcomes require O(NR) preparation, plus **O(MNk)** recomputation for k≤2 changed rules, plus O(M²R) dominance checks. Memory is O(NR + MN) if retaining all transitions, but use only compact status arrays and bounded example snapshots; prefer O(NR + M + N) working memory and collect examples only for selected strategies. Worst-case 1,000 × 40 baseline statuses + 72 × 1,000 × 2 rule checks is comfortably bounded for an ordinary Node request, though actual p95 needs testing—do not invent latency metrics.

Optimization details:
- Use indexed arrays/typed small integers for outcomes; avoid repeated Zod parsing per candidate.
- Make candidate ordering deterministic (candidate ID).
- Reuse precomputed base results rather than calling rank() separately for each option.
- Do not recompute embeddings or call the LLM.
- Optional cache key must include owner, session/version, algorithm version and an invalidation strategy for candidate corpus changes; default **no persistent cache** for the hackathon.
- Give a safety fallback to full evaluate() for correctness comparisons in test code.
- Do not over-engineer distributed workers, Redis or a generic optimization solver for 48 seed profiles.

### 7.5 Fairness and risk boundaries

No demographic proxy optimization, protected traits or automated hiring decisions. A relaxation is not evidence that a candidate meets the original conditions. Indicate the recruiter-set trade-off; don't claim experience can be “compensated” by other skills. Keep unknown evidence separate and show that widening the pool can increase candidates requiring verification.

## 8. System design and responsibilities

~~~text
Recruiter browser (Next.js)
  └── POST /api/v1/search { action: "frontier", ... }
        ├── Supabase recruiter() session/auth
        ├── same-origin and bounded-body checks
        ├── strict Zod discriminated union
        └── backend/src/search/service.ts: searchFrontier(ownerId, ...)
             ├── owned confirmed SearchSession + revision/version
             ├── owner-scoped Candidate + skills in PostgreSQL
             ├── backend/src/search/frontier.ts (PURE engine)
             │    ├── baseline outcomes
             │    ├── bounded variant generation
             │    ├── delta scenario scoring
             │    ├── non-dominance + diversity
             │    └── limited DTO
             └── recheck active revision/version before response
  └── Read-only PREVIEW_ONLY output, Cache-Control: private, no-store
        └── Review this strategy
             └── existing SearchWorkspace.openDraft(..., active)
                  └── existing POST { action: "confirm", requestId, ... }
                       └── transaction: SearchSession/SearchRevision
~~~

No new database migration or new backend service process for Frontier. Implement a pure TypeScript module and thin service/API adapter, reusing existing one-deployable-Next.js architecture. Preserve semantic retrieval and AI tasks independently.

**Source consistency:** Candidate reads should use a consistent snapshot for the entire calculation. Prefer Prisma transaction isolation REPEATABLE READ for version+corpus, if compatible with the existing database adapter; otherwise use one cohort query and recheck the revision before emitting the response, explicitly describe current-snapshot semantics. A candidate update after a preview means the next confirmed search may return different totals. Never promise a historical snapshot unless one is actually persisted.

**If duplicate requests race:** preview is side-effect-free; AbortController cancels obsolete frontend requests, while the server may finish bounded computation. No generation on component mount unless user explicitly selects Explore. Do not spam expensive preview calls while dragging input controls.

## 9. API design — stable, minimal and consistent with existing routes

**Decision:** extend the existing authenticated JSON endpoint with one action to avoid a second API style for this timeboxed feature. Existing route: **POST /api/v1/search**, action **frontier**. POST is acceptable for a complex, read-only, non-cacheable calculation with typed JSON parameters. A future REST route may be introduced after freeze, but **do not ship two competing contracts now**.

### 9.1 Request (proposed)

~~~json
{
  "action": "frontier",
  "sessionId": "owned-search-session-id",
  "expectedVersion": 3,
  "maxStrategies": 5
}
~~~

- Strict Zod schema: action literal, sessionId 1–120 chars, expectedVersion positive integer, optional maxStrategies integer 1–5 (default 5); reject unknown fields.
- Server obtains ownerId from authenticated recruiter(), never accepts ownerId or candidate list in JSON.
- No required AI key, model prompt, raw resume, or new salary/location market data.
- No query to draft or unconfirmed state.
- Require same-origin request, JSON content-type, max existing 32,000-byte request body; use current error envelope and bounded responses.
- Server can enforce a local operation rate limit if warranted; quota must not conflict with AI inference budget because this action invokes no AI.

### 9.2 Response (proposed contract, example numbers illustrative)

~~~json
{
  "status": "PREVIEW_ONLY",
  "algorithmVersion": "frontier-v1",
  "evaluatorVersion": "1",
  "sessionId": "owned-search-session-id",
  "version": 3,
  "referenceId": null,
  "computedAt": "2026-11-15T06:45:00.000Z",
  "scope": {
    "totalCandidates": 48,
    "evaluatedSingle": 12,
    "evaluatedPairs": 5,
    "nonDominatedCount": 4,
    "displayedCount": 3,
    "exhaustive": false,
    "maxCandidates": 1000
  },
  "baseline": {
    "counts": { "ELIGIBLE": 2, "NEEDS_REVIEW": 5, "INELIGIBLE": 41 },
    "requiredCriteriaCount": 4
  },
  "strategies": [
    {
      "id": "stable-canonical-hash",
      "title": "Extend the joining window",
      "status": "NON_DOMINATED_IN_EVALUATED_SET",
      "changes": [
        {
          "key": "notice",
          "kind": "extend_notice",
          "before": { "field": "notice", "mode": "required", "maxDays": 30 },
          "after": { "field": "notice", "mode": "required", "maxDays": 45 },
          "tradeOff": "Recruiter accepts candidates who may need 15 more days to join."
        }
      ],
      "proposedCriteria": [],
      "counts": { "ELIGIBLE": 5, "NEEDS_REVIEW": 4, "INELIGIBLE": 39 },
      "impact": {
        "newlyEligibleCount": 3,
        "noLongerEligibleCount": 0,
        "netEligibleDelta": 3,
        "newlyEligibleExamples": [],
        "examplesTruncated": false
      },
      "remainingRequiredCount": 4,
      "warnings": []
    }
  ],
  "limitations": [
    "Only a bounded set of relaxations was evaluated.",
    "Counts describe the currently stored candidate corpus, not the labor market.",
    "All changes are previews until separately confirmed."
  ]
}
~~~

This is **contract shape only**. The example's proposedCriteria and examples are abbreviated; real successful responses MUST carry a complete criteriaSchema-valid array, and example records when nonempty. DTO types should be inferred from shared Zod/types rather than duplicated in the UI. Response arrays must be bounded. Avoid embedded full resumes, evidence text or PII beyond authorized candidate summary fields.

**No strategy token or hidden server-side confirmation needed:** “Review” passes the returned proposedCriteria to the existing draft editor; the regular confirm route validates all rules and recomputes results. The response is not trusted merely because it came from Frontier.

### 9.3 Error contract

Reuse existing { error: string, requestId: string } envelope and HTTP semantics:

| HTTP | Situation | Required behavior |
| --- | --- | --- |
| 400 | Malformed JSON | Reject, no writes |
| 401 | Unauthenticated | Sign-in prompt; no owner data |
| 403 | Cross-site origin | Reject |
| 404 | Search session missing or owned by someone else | Same indistinguishable message |
| 409 | expectedVersion stale or changed during computation | Reload current session; clear old strategy cards |
| 413 | Body beyond byte cap | Reject |
| 415 | Not application/json | Reject |
| 422 | Invalid parameters, no confirmed criteria, >1,000 records | Actionable safe error; avoid exposing PII |
| 429 | Bounded endpoint quota exceeded, if introduced | Retry later; original search stays usable |
| 503 | Backend/database unavailable | Normal search UI remains available if already loaded |
| 500 | Internal algorithm/server failure | Generic error with requestId; never echo candidate details |

Do not treat zero candidates, zero improvements or preference-only searches as HTTP errors; return 200 with truthful empty result and explanatory limitations.

### 9.4 Version handling and confirmation interoperability

- Request must include expectedVersion, as for existing What-If.
- Verify owned current version before and after computing; stale yields 409.
- Each card's proposedCriteria is checked with criteriaSchema before response and again at confirmation.
- On **Review this strategy**, call existing openDraft(criteria, warnings, { active: { sessionId, version } }); do not directly call confirmSearch.
- Existing confirm request uses UUID requestId, expectedVersion and transactional CAS; preserves referenceId in active session.
- On successful confirm, invalidate Frontier state and call normal results retrieval on the new version. On error leave old confirmed results unchanged.

### 9.5 Future API evolution (not in freeze MVP)

If required later, add POST /api/v1/search/frontier for a dedicated contract and stable client versioning; do not invent pagination or async job semantics until scale requires them. New fields should be additive; use explicit algorithmVersion, preserve error codes, and document breaking changes.

## 10. Exact implementation file map and workstream ownership

**Backend workstream — owns:**
1. backend/src/search/frontier.ts — pure strategy generator, candidate-state delta evaluation, partial order and diversity selection.
2. backend/src/search/frontier.test.ts — complete pure algorithm acceptance, optimization equivalence and boundaries.
3. backend/src/search/diagnostics.ts — optionally extract reusable variants/bottlenecks helper without changing old diagnostics output; preserve old tests.
4. backend/src/search/service.ts — searchFrontier owner-scoped orchestration, version and candidate bounds.
5. frontend/src/app/api/v1/search/route.ts — new strict POST action, existing origin/auth/error contract.
6. backend/src/search/service.test.ts (or existing integration suite) — owner isolation and transaction/revision preservation.

**Frontend workstream — owns:**
1. frontend/src/components/search/pareto-frontier.tsx — read-only module with accessible cards, loading/error/empty states, request abort and stale checks.
2. frontend/src/components/search/frontier.css (or existing search.css scoped classes) — layout, responsive and accessible styling.
3. frontend/src/components/search/workspace.tsx — mount under confirmed results and pass onReview to existing openDraft.
4. frontend/tests/e2e/pareto-frontier.spec.ts — keyboard, responsive and interaction tests with fixture-backed API response.
5. Optional consolidation of Search Health + What-If presentation; defer if it risks regression.

**Integration owner:** keep all six organizer flows working, no separate server/deployment, no lost current changes from other branches. One feature branch/PR for backend, one for frontend if concurrent, then run full integrated CI before freeze. Frontend can start with typed fixture response while API is built, but **must replace fixture with real service** before calling the feature complete.

**Do not** modify the AI extraction or embeddings workstream merely for the Frontier; no model provider dependency is needed.

## 11. Algorithmic acceptance tests — mandatory

### 11.1 Pure deterministic unit tests

- Baseline with Java+Spring Boot+Hyderabad+notice=30 gives correct exact/review/ineligible partition.
- Notice 30→45 admits documented 45-day candidates but not 46; 30 remains included.
- Experience minimum 96→84 months treats inclusive boundary correctly.
- Experience maximum expansion never reverses min/max bounds or exceeds 720 months.
- Java is distinct from JavaScript; aliases use current skillKey and do not merge incompatible skills.
- A null notice field remains UNKNOWN while notice is mandatory, and does not magically become verified.
- Converting the *only* mandatory rule to preferred is excluded by the MVP default.
- All unrelated required and preferred rules remain identical and in the same canonical order.
- No duplicate/invalid criteria; no accidental replacement of exclusions.
- A two-change scenario touches distinct rule keys, never applies two edits to the same key.
- A coupled-blocker fixture yields zero improvement for singles but a positive improvement for an allowed pair.
- Reference candidate never appears in counts, example lists or returned suggestions.
- Multi-tenant candidate sets never mix even if candidate IDs/roles resemble each other.
- Every count partition sums to totalCandidates, including empty and all-unknown datasets.
- Every pure relaxation satisfies newlyEligibleCount≥0 and noLongerEligibleCount=0.
- Two identical calls against identical input yield byte-stable strategy order and IDs (excluding computedAt).
- A strictly over-relaxed scenario with equal coverage is dominated by a tighter scenario.
- AWS demotion versus notice extension remains incomparable; no invented common cost.
- Experience min-relaxation versus max-relaxation is incomparable unless one interval contains the other.
- Bounded generation never exceeds 48 singles, 24 pairs, five presented cards and 12 examples per group.
- With no improvement, return an honest empty frontier and evaluated-count metadata.
- Preferred-only reference search returns a truthful no-hard-rules state.
- A malformed synthetic scenario fails closed; never emit a partial invalid criteria array.

### 11.2 Metamorphic/property checks

- Compare optimized delta-evaluation with **full evaluate()** for every candidate and scenario across a deterministic randomized corpus.
- All allowed monotone relaxations must not decrease exact eligibility on a fixed dataset.
- Reordering candidates cannot change counts, dominance or scenario IDs.
- Reordering semantically equivalent rule input cannot change normalized scenario identity.
- Adding a clearly ineligible candidate updates total/ineligible counts, not the eligibility status of existing candidates.
- For each non-dominated presented strategy, no evaluated strategy dominates it under the same exact defined partial order.
- Count equality and candidate conservation across all 3×3 transition cells.
- Deep freeze source candidate objects/rules in unit tests and verify zero mutations.

### 11.3 Database/API integration tests

- Authorized session retrieves real seeded profiles and agrees with brute-force full evaluator.
- Owner A cannot preview owner B's confirmed session; return 404 without metadata.
- Signed-out POST returns 401; CSRF/cross-site POST returns 403.
- Wrong version returns 409, including a race where revision changes mid-calculation.
- Preview leaves SearchSession.latestVersion, SearchRevision count, notifications and candidate data unchanged.
- A valid review+confirm flow creates exactly one new revision through existing idempotency logic.
- For reference searches, maintain and exclude the referenceId before and after confirmation.
- >1,000 profiles triggers documented bound without incomplete misleading results.
- Database unavailability yields safe error and does not leak connection strings or raw text.
- Existing Search Health, What-If and Near-Match contracts remain backwards compatible.
- Run migration/seed checks with the same pgvector PostgreSQL image now used by CI.
- No AI key required for the Frontier endpoint to function.

### 11.4 Frontend/Playwright acceptance

- No Frontier CTA before confirmation.
- One click initiates one preview; loading state then actual API results.
- Counts in displayed cards equal returned response, never hard-coded fixture/demo numbers.
- Expand a card: see exact before→after, impact groups, warnings and non-exhaustive notice.
- Review strategy opens existing editable draft; underlying confirmed results unchanged.
- Cancel edit leaves old confirmed search untouched; confirm creates next version and refreshes UI.
- 409 stale response clears cards and offers reload.
- Empty, no-improvement, missing data, unknown-heavy, 401/403/422/503 and aborted request states.
- Test keyboard-only navigation, responsive 320px width, focus order, screen-reader labels and prefers-reduced-motion.
- Confirm PS1 natural-language, refinement and Find Candidates Like Me still work; zero regressions.
- Inspect browser console for errors, visible data leaks or client bundle imports of server modules.

## 12. Performance and operational test gates

Performance goals are **proposed budgets**, not claimed measurements:
- **48-profile seed:** median Frontier compute below 100 ms on GitHub CI Node runner when warm, excluding initial DB read; **target**, not release truth.
- **1,000 profiles, 40 rules, 72 scenarios:** target p95 service time below 1.0 s on a representative test runner, excluding infrastructure cold start; adapt cap if real measured results exceed it.
- At most one candidate query and one session retrieval per preview (plus recheck); no N+1 queries.
- No network calls per candidate/scenario, no provider requests, bounded JSON output.
- Keep response modest (<150 KiB preferred; hard bound as appropriate) by capping examples.
- Memory should remain stable under repeated previews; no owner/candidate PII in persistent caches.
- Add benchmark tests with synthetic 48/1,000-record cohorts; log only numeric p50/p95 and evaluated counts, not resumes or PII.
- CI must pass pnpm check, pnpm build, pnpm test:e2e, Docker production smoke and existing ingestion/evaluation checks.
- Simulated provider outages must not affect deterministic Frontier; normal search still needs a valid session/database.

**Fallback on missed performance target:** cap paired strategies first, then display fewer strategies; do not silently truncate the candidate dataset or fabricate results.

## 13. Demonstration narrative — judge-ready

Choose a **real deterministic seeded scenario** that, when measured, contains at least one single-rule improvement and, ideally, a coupled alternative. Do not hardcode an illustrative 2→7 result. Run the actual search + Frontier endpoint against that seed and record exact counts and IDs privately.

Suggested 75–105 second segment:
1. Start with existing confirmed natural-language search; show exact and review counts.
2. Explain: “The recruiter only has a few candidates. Which requirements could change without losing track of trade-offs?”
3. Click **Explore hiring strategies**. Baseline and alternative scenarios appear from the actual candidate database.
4. Select two distinct alternatives: e.g. notice extension versus making AWS preferred. Call out that they are **not interchangeable or scored by a made-up AI number**.
5. Expand one card to show exactly which profiles changed eligibility and what remains unknown.
6. Click **Review this strategy**; show that the confirmed search remains untouched.
7. Optionally edit and **Confirm Search**, show new revision and grounded results.
8. Mention bounded analysis and no automated hiring decision.

**Opening line:** “Recruitment is not just finding people; it's understanding which constraints make a search impossible.”

**Closing line:** “Pareto helps you negotiate requirements with evidence, and the recruiter stays in control.”

## 14. Release plan under hackathon freeze

Do not create a second flagship. Prioritize correct integration over ornamental motion.

| Stage | Must deliver | Exit gate |
| --- | --- | --- |
| P0 backend | Pure bounded Frontier + safe POST + test suite | Recomputed counts equal authoritative evaluator, CI green |
| P0 frontend | One integrated results module, card expansion, review-to-draft | Authenticated UI and 409/empty cases work, no regression |
| P0 integration | Real source-backed response, consistent versions and reference mode | Full browser search→preview→review→confirm |
| P0 demo | Deterministic seeded scenario + repeatable backup path | Operator can reproduce without manually editing DB |
| P1 polish | Presentation clarity and accessibility | Keyboard/mobile/overflow clean |
| Deferred | Charts, custom optimizer weights, unlimited pair search, collaboration analytics | Explicitly left unimplemented rather than claimed |

**Freeze rules:**
1. Preserve organizer PS1 behavior if time runs short.
2. If backend/UI integration is late, simplify to the existing measured single-rule alternatives plus a defensible partial-order and one unified UI. **Do not fake global Pareto optimization.**
3. If real provider credentials are unavailable, demonstrate Frontier against a genuinely confirmed manual-criteria search, disclosing that AI extraction is offline.
4. Stop expanding scope in time to rerun end-to-end CI, verify deployment, and package the official submission.
5. Don't imply an official submitted project exists unless the organizer repo is actually accessible and verified.

## 15. Definition of Done / release blockers

A feature is **IMPLEMENTED** only if:
- [ ] backend/src/search/frontier.ts exists and uses exact evaluate() semantics.
- [ ] The bounded algorithm returns correct non-dominated measured alternatives, not sample data.
- [ ] A real owned session from PostgreSQL is used; another owner gets 404.
- [ ] No preview writes, no invented demographics, no model-generated counts.
- [ ] Every strategy provides valid complete proposedCriteria and explicit changes.
- [ ] Request and response types are bounded; clear 401/403/409/422/503 states.
- [ ] The existing review→explicit confirm process persists the **only** changes.
- [ ] Reference profiles are excluded from all analysis.
- [ ] Pure, metamorphic and owner-scoped integration tests pass.
- [ ] UI is integrated into /dashboard/search and accessible by keyboard/mobile.
- [ ] Playwright confirms preview-only semantics and stale-state recovery.
- [ ] Actual CI passes on the integrated head and the deterministic demo runs.
- [ ] Docs/engineering log records exact verification and known limitations.

**Do not mark done because this specification exists.** Update the implementation ledger only after code, integration and tests are committed.

## 16. Technical trade-offs and future evolution

**Why not a generic optimization solver?** The problem is tightly bounded, candidate counts are small and constraints have distinct semantics; a bespoke auditable enumerator is simpler and easier to test.

**Why not embedding-based recommendations?** Semantics may improve ranking but cannot override hard rule evidence. Frontier aims to identify transparent changes to those requirements.

**Why no cross-field “trade-off score”?** Its units would be arbitrary. Explicit, per-rule comparisons preserve recruiter agency. Future owner-defined weights could produce an *additional*, clearly labeled subjective view after validation.

**Why no new tables?** Previews are ephemeral and reconstructible from confirmed criteria and current candidate records. Existing revision history remains authoritative on confirmation.

**When to scale:** increase corpus by moving to a shared query planner/bitmap indexes or precomputed normalized candidate-attribute indexes, track corpus versions, and add bounded pagination/async jobs only after actual profiling justifies it. Revisit whether a full multi-objective frontier is computationally and product-wise valuable at that size.

**Main engineering risk:** inconsistent counts if backend builds a new evaluation path rather than reusing evaluate(). Mitigation: one canonical evaluator; precomputed delta optimization cross-checked exhaustively against the brute-force evaluator.

**Main UX risk:** the interface becomes three widgets renamed to “Frontier.” Mitigation: one dominant story—baseline → measured alternative → what changed → review → explicit confirmation.

**Main product risk:** fabricated “optimal hiring strategy” claims. Mitigation: explicit candidate corpus scope, explicit recruiter priorities, bounded partial-order non-dominance, visible UNKNOWN and source evidence, and no autonomous selection.

---

## 17. Handoff snapshot

**Backend deliverable:** pure frontier algorithm, thin authenticated search service, typed POST action and tests.  
**Frontend deliverable:** one Pareto Frontier panel in confirmed search results, accessible strategy comparison and review-to-draft integration.  
**AI workstream:** separate; Frontier has no dependency on live Gemini/Groq.  
**Release owner:** validate integrated CI, deterministic seeded demonstration, and official-submission handoff.  

**Single-sentence acceptance:** A signed-in recruiter can open a real confirmed search, explore non-dominated (among bounded evaluated alternatives) hiring strategies with accurately calculated candidate impacts, review one strategy without changing saved state, and only persist it through the existing explicit Confirm Search action.
