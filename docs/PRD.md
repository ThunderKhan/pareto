# Pareto — Product Requirements Document (PRD)

> **Status:** Requirements baseline / proposed implementation; not evidence of shipped features  
> **Version:** 1.0 · 14 November 2026 (IST)  
> **Product:** Pareto — explainable AI recruitment intelligence  
> **Challenge:** Trustume AI Hackathon 2026 — Problem Statement 1: *AI-Powered Natural Language Candidate Search & “Find Candidates Like Me”*  
> **Related:** [MVP.md](MVP.md) · [Architecture notes](architecture/README.md) · [Engineering log](engineering-log.md)  
> **Scope authority:** The official PS1 requirements take precedence over any extra feature described here.  
> **Submission deadline:** 15 November 2026, 5:00 PM IST (official assigned GitHub repository).

## 1. Purpose and document boundaries

The [MVP](MVP.md) defines **what Pareto is**, the product philosophy, release scope, and constraints. This PRD defines **who uses it, what it must do, how each workflow behaves, and exactly how success is accepted**.

### Priority vocabulary

| Label | Meaning | Release rule |
| --- | --- | --- |
| **P0-ORG** | Directly required by the **organizer's original PS1** | **Non-negotiable**. Must be implemented and demonstrated first; overrides every other requirement. |
| **P0-FOUNDATION** | Minimal infrastructure/data necessary to demonstrate P0-ORG | Must be working for the organizer demo. |
| **P1-PRODUCT** | Pareto's chosen differentiators and productization | Implement after the core PS1 path; reduce/simplify if time constrained. |
| **P2-STRETCH** | Nice-to-have advanced features | Never delay P0-ORG or submission. |

**Important distinction:** Authentication, resume upload, constraint simulations, and a deployed hosted URL are **our product/engineering choices**, not original PS1 functional requirements. A correctly seeded mock candidate database **does meet** the organizer's data expectation; parsing individual PDF/DOCX files is an enhancement.

**Source grounding:** The P0-ORG requirements in `5 are derived from the supplied **`problem_statement_1_ai_powered_natural_language_candidate_search.md`**. The submission and evaluation requirements in `15 are from the supplied official hackathon guidelines. Other requirements are decisions for Pareto, not claims about what the organizers mandated.

## 2. Product vision and problem

Recruiters need to source candidates through nuanced criteria, not a long succession of rigid filter controls. The cost of a bad experience is wasted search effort, unexplained rankings, lost filter context, or needlessly empty results.

**Pareto's core task:** transform human descriptions or an existing example profile into structured, editable search criteria; ask for confirmation; retrieve candidates; provide evidence-based match explanations; and support multiple rounds of refinement.

**Pareto's value-add:** detect restrictive hiring requirements and let recruiters explore quantified trade-offs—without changing confirmed constraints without consent.

**Product promise:** *Discover candidates. Explain the evidence. Explore the trade-offs.*

## 3. Users, personas, and stakeholders

The detailed personas live in **this PRD**, because their needs drive functionality and acceptance tests. [MVP.md](MVP.md) keeps the short audience overview.

### 3.1 Primary user — recruiter / talent sourcer (MVP)

**Profile:** An individual recruiter or talent-acquisition specialist responsible for locating and comparing candidates against a job request.

**Goals:** Describe nuanced hiring needs quickly; see exact or close matches; understand every qualification claim; refine an existing search instead of starting over; find peers resembling an example candidate.

**Frustrations:** Too many filters; hidden black-box scores; candidate profiles with missing notice periods; query resets; no reason given when no candidates match.

**Success:** Within one session, the recruiter can define, confirm, execute, inspect and iteratively adjust a search—with traceable evidence and without assistance from an engineer.

**Main journeys:** natural-language search, criteria confirmation, results/evidence, conversational follow-ups, reference-candidate search.

### 3.2 Secondary user — hiring manager (limited support)

**Profile:** A technical manager or department lead who reviews a proposed shortlist and clarifies requirements.

**Goals:** Understand why candidates qualify, which requirements are bottlenecks, and how adjustments change the available pool.

**Pain points:** Candidate rank with no justification; unclear hard vs preferred criteria; insufficient context for trade-offs.

**MVP treatment:** This persona can be served by the *same recruiter-facing UI and explanation screens*. **No separate hiring-manager permission tier, approval workflow, or collaboration module is required** for the hackathon.

### 3.3 Secondary user — recruitment operations / sourcing coordinator (P1)

**Profile:** A team member responsible for maintaining candidate records and ingestion quality.

**Goals:** Import authorized resumes, see extraction failures, ensure evidence provenance, and prevent duplicate records.

**MVP treatment:** The import experience may be accessed by the same authenticated recruiter. A dedicated operations role and bulk administration console are **out of scope**.

### 3.4 Candidate — represented person, not application user in v1

Candidates are the subjects of profiles and documents, **not** end users of Pareto's current interface. There is no candidate signup, interview scheduling, direct messaging, or automatic hiring decision.

### 3.5 Other stakeholders (not product personas)

- **Hackathon organizers/judges:** evaluate functionality, explainability, engineering decisions and a live demo; not a special application role.
- **Developers/maintainers:** implement, test, deploy and diagnose the application; their needs belong primarily in architecture and implementation documentation.
- **Future compliance/data owners:** require private storage, source attribution and appropriate access controls.

## 4. Scope and release gates

**Gate A — Organizer compliance:** All `P0-ORG` requirements pass against a real seeded dataset in a live end-to-end demo. This gate must be met **before** presenting optional features as complete.

**Gate B — Engineering confidence:** Repeatable development setup, successful tests for the core logic, documented limitations, runnable submission, and actual deployment verification if hosted.

**Gate C — Differentiation:** Search Health Diagnostics + a demonstrably correct What-If comparison, added only after Gate A. More elaborate versions are optional.

**Explicit implementation rule:** A beautiful dashboard or advanced importer cannot substitute for missing “Find Candidates Like Me,” missing criteria confirmation, or broken multi-turn refinement.

## 5. Mandatory organizer functional requirements — P0-ORG

The organizer's statement organizes the product into **four functional areas (A–D)** and supplies a **six-item demo acceptance checklist**. Both are represented below. These are authoritative over Pareto's additional features.

### ORG-FR-01 — Natural-language requirement extraction (Section A)

**User story:** As a recruiter, I want to describe candidate requirements in ordinary English so I do not need to configure each search filter manually.

**Required behavior:**
- Accept a text requirement describing a candidate or role. Voice input is allowed in the original statement but is **not required**, so our MVP will use text.
- Interpret structured attributes including **job role/title, location, experience range, required skills and notice period** when present.
- Support other explicitly stated attributes where stored data exists, such as education, employment type or certifications, without inventing missing fields.
- Produce a *draft* typed criteria object; make omissions and ambiguities visible.
- Do not implicitly execute the candidate-database search before confirmation.

**Original statement example:** Senior Java Developer; Hyderabad; six to ten years of experience; Java, Spring Boot, AWS; available within 30 days.

**Acceptance tests:**
1. **Given** the example prompt, **when** the interpretation finishes, **then** the draft shows all five specified attribute groups correctly.
2. **Given** “Java developers, not JavaScript developers,” **then** JavaScript is not silently treated as a matching required skill.
3. **Given** an ambiguous or incomplete prompt, **then** unclear fields are not fabricated and the recruiter can edit them.
4. **Given** no model response or an invalid schema, **then** the UI reports the error and no unconfirmed search occurs.

### ORG-FR-02 — Recruiter review, edit and **Confirm Search** (Section A)

**User story:** As a recruiter, I want to verify and modify AI-extracted criteria before a database query is run.

**Required behavior:**
- Render extracted criteria in a readable, editable form.
- Allow changing/removing a role, skill, experience range, location, and notice-period limit.
- Make the final effective criteria apparent before execution.
- Provide an explicit **Confirm Search** action.
- Store the confirmed criteria as the authoritative search state; AI text is not authoritative once edited.
- Subsequent revised criteria must also be confirmed before executing a new search.

**Acceptance tests:**
1. **Given** an extracted 30-day notice limit, **when** the recruiter edits it to 45 days and confirms, **then** the search uses 45, not 30.
2. **Given** an extracted draft, **when** the recruiter has not confirmed, **then** no candidate-result query is presented as a completed confirmed search.
3. **Given** an invalid experience range (minimum greater than maximum), **then** confirmation is blocked with actionable validation feedback.

### ORG-FR-03 — Search a real candidate dataset (expected workflow + checklist)

**User story:** As a recruiter, I want the confirmed criteria evaluated against candidate records so the result is grounded in actual stored data.

**Required behavior:**
- Search a **mock/generated, realistic candidate dataset** maintained by the team (none is provided by the organizers).
- Apply every confirmed hard requirement consistently to stored attributes.
- Distinguish **exact eligible candidates** from partial matches or records needing more evidence.
- Rank and display candidate records using stable, documented logic.
- Candidate counts and result details must be computed, not generated by the LLM as imagined data.
- Show meaningful empty, loading, and error states.

**Acceptance tests:**
1. **Given** two records identical except 15 vs 60 days' notice, **when** notice ≤30 days is confirmed, **then** the 15-day record can qualify and the 60-day record cannot qualify as an exact match.
2. **Given** no exact matches, **then** the UI displays an accurate zero count and must not mislabel partial matches as exact ones.
3. **Given** the same dataset and criteria, **then** the deterministic engine returns the same eligibility results.

### ORG-FR-04 — Explainable criterion-by-criterion candidate matching (Section B)

**User story:** As a recruiter, I need to know *why* a candidate matches or partially misses each requirement.

**Required behavior:**
- For each result, show a **criterion-by-criterion** explanation and an understandable aggregate indicator (e.g., “4/5 criteria met”), as demonstrated in the original statement.
- Clearly show matched, failed and unknown criteria, not just an opaque percent.
- Explain the decisive mismatch (“notice period exceeds the 30-day requirement”).
- Where source documents support an attribute, retain a link to the stored field or extracted evidence.
- Avoid fabricating skills, dates, notice periods, degrees or similarity percentages.
- The counting denominator must be defined consistently and reflect the effective confirmed criteria.

**Acceptance tests:**
1. **Given** a candidate meeting every requirement except joining date, **then** the explanation identifies the actual notice-period discrepancy.
2. **Given** a missing notice period, **then** the result says “unknown” rather than presenting a fabricated value or a confirmed match.
3. **Given** a stored skill mismatch, **then** the summary and detailed breakdown agree.
4. **Given** a score displayed as a percentage, **then** its computation and meaning are documented; it is not presented as an employment-success probability.

### ORG-FR-05 — Conversational, multi-turn search refinement (Section C)

**User story:** As a recruiter, I want to narrow or modify my ongoing search in natural language without restarting or manually rebuilding my previous filters.

**Required behavior:**
- Accept follow-up prompts against an existing confirmed search.
- Interpret each follow-up as a **change to active criteria**, preserving fields not explicitly modified.
- Preview the proposed changes to the recruiter, then require confirmation before the revised query executes (our human-in-the-loop extension consistent with Section A).
- Show updated candidate counts from the dataset; preserve search context throughout multiple turns.
- Support narrowing and broadening; do not silently drop older restrictions.

**Original statement sequence:** Java developers with at least five years in Hyderabad → restrict to Spring Boot and AWS → restrict to joining within 30 days.

**Acceptance tests:**
1. **Given** role=Java developer, experience≥5, location=Hyderabad, **when** “only with Spring Boot and AWS” is proposed and confirmed, **then** role, location and experience remain intact.
2. **Given** the updated search, **when** “within 30 days” is applied, **then** previous constraints remain intact and result counts are recomputed.
3. **Given** “remove the Hyderabad requirement,” **then** only the specified location restriction is removed after review.
4. **Given** a reference to nonexistent context, **then** the system requests clarification or shows a non-destructive error, rather than rewriting filters unpredictably.

### ORG-FR-06 — “Find Candidates Like Me” / reference-based search (Section D)

**User story:** As a recruiter, I want to select a strong reference candidate and find other candidates with similar verified attributes.

**Required behavior:**
- Select or find an **existing** reference candidate by name or identifier.
- Extract **current title and previous roles, total experience, professional/technical skills, industry/domain background, location, education and certifications** from the stored reference **when available**, as the original statement specifies.
- Convert the reference into **editable criteria** and require recruiter confirmation before searching.
- Return **other** matching/similar candidates, with intelligible, feature-level similarity explanations and transparently defined scoring.
- Allow conversational refinement of the reference-based cohort (for example, “like this candidate but with AWS experience”).
- Exclude the reference candidate from its own recommendation list.
- If a name is ambiguous, require the recruiter to pick the correct existing profile.

**Acceptance tests:**
1. **Given** an existing reference profile, **when** selected, **then** supported attributes appear in a reviewable draft.
2. **Given** the recruiter confirms a reference search, **then** the reference record is excluded and peer candidates are ranked with reasons.
3. **Given** “like this candidate, but with AWS,” **then** the AWS requirement is applied without discarding other confirmed reference criteria.
4. **Given** an ambiguous name or missing attribute, **then** the UI resolves ambiguity or marks the attribute unknown; no imaginary candidate details are added.

### 5.7 Organizer acceptance checklist mapping

| Organizer's minimum demonstration | Pareto requirement | Priority |
| --- | --- | --- |
| Enter plain-English requirements **or** select a reference candidate | ORG-FR-01 and ORG-FR-06 | **P0-ORG** |
| View AI-extracted structured criteria | ORG-FR-01 | **P0-ORG** |
| Edit and **confirm** criteria before search | ORG-FR-02 | **P0-ORG** |
| Retrieve candidates from a sample/mock database | ORG-FR-03 | **P0-ORG** |
| See transparent criterion-by-criterion matching reasons | ORG-FR-04 | **P0-ORG** |
| Refine an active search with conversational follow-ups | ORG-FR-05 | **P0-ORG** |

**All six rows must be demonstrable** before optional product enhancements receive polish. “Find Candidates Like Me” is explicitly described in Section D of the organizer's requirements even though the compact checklist combines it with prompt entry.

## 6. P0-FOUNDATION — essential supporting requirements

### FND-FR-01 — Searchable candidate corpus
- Seed/query a real database of realistic **synthetic** profiles with roles, experience, location, skills, notice period and optional education/industry/certification attributes.
- Target roughly **300–500** profiles if feasible; do **not** block initial functionality on reaching that size. A small controlled corpus is sufficient for first end-to-end verification.
- Maintain a **30–50-case** curated evaluation subset as a target, with known expected outcomes, including incomplete and negative examples.
- Keep seed generation reproducible, with a known fixed seed or versioned fixtures.

### FND-FR-02 — Session and criteria state
- Store the active search's confirmed criteria, mode (plain English vs reference), and conversation context.
- Separate **draft**, **confirmed**, and **results** states.
- Make partial refinement updates explicit and non-destructive.
- Handle refresh or navigational changes predictably; persistence mechanisms will be defined in the architecture specification.

### FND-FR-03 — Reliable application delivery
- Provide a runnable Next.js application and backend workspace package.
- Provide an explicit local setup, environment variable template, seed command, database setup, and container runtime.
- Validate a live deployment, if feasible, without exposing credentials or private resumes.

## 7. P1-PRODUCT — Pareto differentiators

### DIF-FR-01 — Search Health Diagnostics

**Problem:** “0 exact matches” does not explain which requirements cause the result.

**Behavior:**
- Show the confirmed constraints and measured exact-match count.
- Identify candidate-pool bottlenecks through deterministic re-evaluation of proposed relaxed constraints.
- Suggest a small set of meaningful alternatives (e.g. notice ≤45 rather than ≤30 days, AWS preferred rather than required).
- Display for each alternative: which constraint changed, exact candidate count, additional eligible records, and any key qualifications compromised.
- Clearly label suggestions as options, **not replacements** for confirmed criteria.

**Acceptance:** all displayed counts match the underlying dataset query; an unchanged requirement cannot silently disappear.

### DIF-FR-02 — What-If Hiring Simulator

**Behavior:**
- Compare confirmed original search vs simulated alternate criteria in parallel.
- Display changed filters, before/after exact eligible counts, and newly eligible candidates.
- Simulation changes have **no side effects** on the active confirmed search.
- An **Apply for review** action opens the editable criteria form; the recruiter must **Confirm Search** before the alternate becomes active.

**Acceptance:** dismissing a simulation leaves the active search untouched; applying a change updates the search only after explicit confirmation.

### DIF-FR-03 — Evidence-backed near-match explanations

**Behavior:**
- Explain the minimum relevant difference between a candidate and confirmed requirements.
- Tie claims to stored candidate facts or extracted resume excerpts where available.
- Treat missing evidence as a request to verify, not evidence of a mismatch or an opportunity to invent a value.

**Acceptance:** proposed changes and explanations correspond to the same deterministic matching engine used by regular search.

### DIF-FR-04 — Search decision-history interface (P2-STRETCH)

If time remains, show previously confirmed search revisions with their changed fields and measured result counts. Basic state persistence is required for conversational refinement; a dedicated history-browsing UI is **not** mandatory.

## 8. P1-PRODUCT — resume ingestion and data quality

### DATA-FR-01 — Supported documents
- Accept text-based **PDF**, **DOCX**, and **TXT** in the prototype; CSV/JSON can be used for structured bulk import.
- Parse PDF text with a suitable PDF parser and DOCX with Mammoth; defer OCR for scanned/image-only PDF and legacy `.doc`.
- Detect and report unsupported, damaged or unreadable documents.
- Restrict file size and quantity (exact thresholds to be fixed in the technical specification).

### DATA-FR-02 — Ingestion and structured records
- Validate file signature/type and uploading user's authorization.
- Save permitted source documents into a **private** Supabase Storage bucket.
- Extract text, obtain structured profile attributes through **Gemini** or **Groq**, and validate the output using **Zod**.
- Preserve an evidence/provenance reference, including source document and any reliable excerpt/field mapping.
- Store normalized profile data in PostgreSQL through Prisma.
- Surface success, failure, duplicate and needs-review states.
- Do not read and re-parse original PDFs during normal candidate searches.

### DATA-FR-03 — Dataset usage constraints
- Start with synthetic profiles and review candidate external datasets for licensing, permitted use, and the presence of real personal information.
- Do not commit raw resumes or sensitive applicant information into Git history.
- Use a controlled, explainable demonstration dataset to support acceptance tests and live demos.

**Priority:** All document upload features are **P1-PRODUCT**. The organizer does **not** require PDF ingestion; it requires a populated mock/sample candidate database.

## 9. P1-PRODUCT — authentication and access control

### AUTH-FR-01 — Sign-in
- Supabase Auth shall support **Continue with Google** (Google OAuth) and email/password sign-in.
- Show useful loading, success, cancellation and failure states.
- Persist sessions using supported server-side Next.js patterns.

### AUTH-FR-02 — Authorized data access
- Require authentication for real recruiter workspaces, document uploads and private candidate records.
- Verify ownership/access on backend operations; never rely solely on client-side navigation guards or a verified login.
- Apply appropriate access policies to Supabase-exposed tables and private storage objects.
- Protect access to original document contents and avoid permanent public file URLs.

### AUTH-FR-03 — Safe demo fallback
If OAuth configuration cannot be completed before code freeze, a **synthetic-only demo dataset** may be exposed in a deliberately limited demo experience **without** making real/private candidate uploads available anonymously. This is an explicit Pareto release contingency, not part of organizer PS1.

## 10. AI, validation, and matching product rules

### AI-FR-01 — Allowed providers
- **Google Gemini (primary)** and **Groq (secondary/fallback)** only.
- **No OpenAI API** and **no xAI Grok** integration.
- Use a unified server-side provider interface and Zod schema validation.
- Bounded timeouts/failover. A failed AI call must not silently produce invented requirements.

### AI-FR-02 — Search interpretation and revision
- Separate *new search* interpretation from *search refinement* interpretation.
- Generate a typed requirements draft or typed partial-delta proposal, respectively.
- User confirmation is required before executing either.
- If no model is available, show an actionable retry/error state; never misrepresent a failed AI request as a valid interpretation.

### MATCH-FR-01 — Hard requirements and preferences
- Preserve a distinction between **mandatory** and **preferred** filters.
- Evaluate hard constraints deterministically. Missing mandatory evidence is **unknown/needs review**, not verified eligibility.
- Use explicit, documented scoring/ranking rules for preferred attributes.
- Do not present a score as a predicted hiring outcome or make automatic employment decisions.

### MATCH-FR-02 — Explainability invariants
- No criterion counts or percentages without defined denominators and inputs.
- Normal search, reference-based search, diagnostics and what-if use the **same core evaluation rules**.
- Unknown fields remain unknown across all views.
- Sorting/ranking ties and null handling shall be stable and documented.

## 11. Main user experience surfaces

| Surface | Primary actions | Related requirements |
| --- | --- | --- |
| Search workspace | Enter prompt; choose reference; view current search context | ORG-FR-01, ORG-FR-05, ORG-FR-06 |
| Criteria editor | Review, change, remove, confirm interpreted constraints | ORG-FR-02 |
| Candidate results | Inspect ranked candidates, exact vs partial status, breakdown | ORG-FR-03, ORG-FR-04 |
| Candidate detail | Inspect evidence; select as reference candidate | ORG-FR-04, ORG-FR-06 |
| Refinement input | Propose follow-up change; preview diff; confirm | ORG-FR-05 |
| Search health | View diagnosed bottlenecks and alternatives | DIF-FR-01 |
| What-if comparison | Evaluate an alternative and return to confirmation | DIF-FR-02 |
| Resume import | Upload documents, see parsing status | DATA-FR-01/02 |
| Authentication | Google or email sign-in | AUTH-FR-01/02 |
| Loading, empty, error states | Communicate status and next safe action | All relevant flows |

**UI principle:** explainability and user agency over flashy animations. The original problem statement is about the quality of candidate search, not an AI-chatbot aesthetic.

## 12. User stories by persona

| ID | Persona | Story | Priority |
| --- | --- | --- | --- |
| US-01 | Recruiter | “I can describe a nuanced hiring need in English.” | **P0-ORG** |
| US-02 | Recruiter | “I can review and correct AI-extracted filters before any search.” | **P0-ORG** |
| US-03 | Recruiter | “I can retrieve and inspect results from an actual candidate dataset.” | **P0-ORG** |
| US-04 | Recruiter | “I can see why every candidate matches or misses my criteria.” | **P0-ORG** |
| US-05 | Recruiter | “I can refine my previous search without losing earlier constraints.” | **P0-ORG** |
| US-06 | Recruiter | “I can find candidates resembling someone I already know.” | **P0-ORG** |
| US-07 | Recruiter / hiring manager | “I can understand why my search returns few or zero matches.” | P1-PRODUCT |
| US-08 | Recruiter / hiring manager | “I can compare hiring trade-offs without changing my current search.” | P1-PRODUCT |
| US-09 | Recruiter | “I can verify a candidate's near-match differences using evidence.” | P1-PRODUCT |
| US-10 | Sourcing coordinator | “I can import authorized PDF/DOCX/TXT resumes and review errors.” | P1-PRODUCT |
| US-11 | Recruiter | “I can sign in safely with Google or email.” | P1-PRODUCT |
| US-12 | Recruiter | “I can review confirmed historical changes.” | P2-STRETCH |

## 13. Edge cases and failure behavior

The following scenarios must be explicitly exercised in tests or manual evaluation:

1. **Negation / terminology:** “Java, not JavaScript”; “Spring” vs “Spring Boot”; canonicalization must not conflate different technologies.
2. **Experience range:** ≥5 years, 6–10 years, contradictory min/max constraints; no negative years.
3. **Notice period:** missing data, 0 days, 30 days exactly, 45 days, 60 days; use correct inclusive boundary.
4. **Reference resolution:** no candidate by that name; duplicate names; reference profile missing industry/education fields.
5. **Conversational state:** refine skills without losing location; remove just one constraint; ambiguous “make it more flexible”.
6. **No results:** honest zero exact matches and clearly labeled near matches; optional diagnostics computed on real data.
7. **Model failures:** timeout, provider unavailable, malformed output, missing required fields, unrecognized skill.
8. **Data issues:** duplicates, incomplete resumes, malformed PDF/DOCX, excessive upload size; no silent corruption.
9. **Security:** attempt to access another user's private document or record; reject even if the user is signed in.
10. **Fairness and provenance:** do not infer or rank by race, religion, sex, age or other protected characteristics; explain unknown evidence honestly.

## 14. Non-functional requirements and engineering quality

| ID | Requirement | Verification approach |
| --- | --- | --- |
| NFR-01 — Functional correctness | P0-ORG tests and deterministic golden-record expectations take precedence over visual polish. | Vitest unit + integration; Playwright end-to-end |
| NFR-02 — Data reproducibility | Candidate corpus must be reproducibly seeded and testable, without private live data in repo. | Seed log, fixed fixtures, verified counts |
| NFR-03 — API boundary validation | Validate incoming requests and model outputs before query execution. | Zod tests, rejected malformed input |
| NFR-04 — Privacy and security | Protected routes, private storage, no exposed keys or sensitive logs. | Auth/authorization negative tests |
| NFR-05 — Observability | Log request IDs, safe error categories, model failures and relevant operation durations, without PII. | Pino structured log examples |
| NFR-06 — Performance evidence | Measure live/demo search and parsing times; **no made-up latency SLA or benchmark**. | Timed runs on documented hardware/environment |
| NFR-07 — Reliable recovery | Network/model/database failures show an actionable error, not hallucinated candidates. | Failure-injection tests |
| NFR-08 — Accessibility | Keyboard operability, readable labels, meaningful status messages, contrast-aware interface. | Manual audits + Playwright |
| NFR-09 — Deployability | Runnable Docker image; local Compose with PostgreSQL; deployed verification if available. | Build + health check + smoke tests |
| NFR-10 — Traceability | Requirements, tests, real engineering issues, decisions and releases linked in Git. | Docs and PR history review |

**Testing tools:** Vitest for TypeScript logic, Playwright for browser flows, and PostgreSQL integration tests where required. **No pytest** is needed unless a Python subsystem is later introduced.

**CI/CD constraint:** GitHub Actions workflows may be committed, but GitHub-hosted Actions must **not** be a release dependency while the account's Actions credits are unavailable. Verified local checks and direct hosting integration are the fallback.

## 15. Hackathon delivery and judging criteria

The official event guidelines require the following artifacts in the organizer-assigned **private** GitHub repo by **15 November 2026 at 5:00 PM IST**:

- Complete, organized source code for the application and processing logic.
- README with team name, selected problem, architecture, stack, and step-by-step local startup.
- Dependency manifest(s), e.g. package.json / Dockerfile.
- Final presentation deck using the provided standardized slide format.

Presentations occur **15 November, 6:00–8:00 PM IST**, with a live prototype demo, architecture explanation, and discussion of edge cases and explainability.

**Official evaluation weights:**

| Judging dimension | Weight | Pareto demonstration |
| --- | ---: | --- |
| Intent understanding and functional accuracy | **40%** | Accurate parsing, confirmation, persisted criteria, working matching and refinements |
| Explainability and edge-case reasoning | **25%** | Criterion-level evidence, missing-value handling, transparent scores, real diagnostic calculations |
| Architecture and code cleanliness | **20%** | Modular application, tests, readable code, migrations, documented design decisions |
| UI/UX and live demo | **15%** | Clear recruiter workflow and stable end-to-end walkthrough |

**There is no official requirement to deploy to Railway or build Google OAuth.** Those are productization choices; none may jeopardize submitting the P0-ORG features on time.

## 16. Acceptance matrix — release-blocking tests

| Gate | Test / scenario | Expected observation |
| --- | --- | --- |
| **ORG-1** | Example Java/Hyderabad prompt | Structured role, location, 6–10 years, Java/Spring Boot/AWS, ≤30-day notice |
| **ORG-2** | Edit notice ≤30 → ≤45 | No search until confirmation; confirmed query uses 45 |
| **ORG-3** | Seeded candidate database | Actual matching candidates returned; true zero states possible |
| **ORG-4** | Two near-identical candidates with different joining times | Accurate per-criterion pass/fail and explanation |
| **ORG-5** | Multi-turn Spring Boot/AWS then ≤30-day refinement | Earlier role/location/experience restrictions preserved |
| **ORG-6** | Select a reference candidate and confirm | Non-self similar candidates ranked and explained |
| **ORG-7** | “Like this candidate but with AWS” | Reference-based search refinement preserves relevant context |
| **ORG-8** | Unknown notice period / malformed model output | Honest unknown or safe error; no fictional eligibility |
| **ENG-1** | Run installation, database seed and core tests | Reproducible documented result |
| **ENG-2** | Run live demo using actual stored candidates | Results agree with deterministic reference checks |

The first eight rows are mapped to the **organizer's original functionality** plus implementation edge-case verification. Engineering checks support the reliability of that demo; additional Pareto features are evaluated only afterward.

## 17. Feature sequencing for implementation

1. **M0 — Scaffold:** already committed as source files; dependency/runtime verification still pending.
2. **M1 — Candidate corpus + query contracts:** Prisma candidate model, repeatable seed fixtures, typed search criteria, basic deterministic matching.
3. **M2 — All original PS1:** natural-language extraction, editing/confirmation, results/explanations, multi-turn refinement, reference-candidate search; end-to-end verification.
4. **M3 — Differentiation:** accurate search bottleneck calculations and what-if comparison.
5. **M4 — Production-oriented enhancements:** document ingestion, Google OAuth, private file storage, error handling, logs, Railway verification where viable; reorder lower-priority work around deadline.
6. **M5 — Delivery:** README, final presentation, demo rehearsal and synchronization of tested milestone commits to `ai-hackathon-trustume/std-zero`.

**Schedule rule:** stop expanding scope when needed to finish ORG-FR-01 through ORG-FR-06 and deliver the official submission.

## 18. Out of scope

- Building/training an original language model.
- Audio/video forensic detection or gaze tracking (different hackathon problem statements).
- Candidate-response email triage or sending automated recruiter follow-ups (different problem statement).
- Automated candidate rejection/acceptance; predictions of job performance.
- Voice input for v1 (the original statement allows text **or** voice).
- OCR for scanned PDFs; legacy Word `.doc` parsing.
- Dedicated vector DB, Kafka, Kubernetes, Redis, complex agents, second independently deployed backend service.
- Billing, enterprise multi-tenancy, calendar interview booking, outbound recruiting CRM, candidate self-service accounts.

## 19. Dependencies, implementation decisions and risks

**To resolve in ARCHITECTURE.md / IMPLEMENTATION.md:**
- Exact Prisma schema for Candidate, Resume, SearchSession, SearchRevision and evidence.
- Stable hard-vs-preferred ranking rules, null behavior and similarity math.
- Definition of a canonical skill (for example Java vs JavaScript).
- Storage policies and exact authorization model.
- LLM model IDs, availability, timeouts, rate limits and API cost ceiling.
- Dataset source licensing, genuine synthetic quality and seed counts.
- Deployment feasibility on Railway's current free offering.
- Git remotes / safe synchronization from personal development repo to the organizer repo.

**Current known risks:**
- The development repo was last verified as **public** although a private repo was intended. No private credentials, real resumes, or verbatim organizer-provided documents should be committed before visibility is corrected.
- Hosted GitHub Actions credits may be exhausted; use local test gates.
- PDF/DOCX ingestion and Google OAuth consume time beyond original PS1 and should be prioritized accordingly.
- LLM parsing can be inconsistent; use explicit confirmation and test-backed deterministic candidate evaluation.
- “Pareto” is a working name and has not been cleared for commercial recruitment branding.

## 20. Definition of done (MVP)

Pareto is **hackathon MVP-complete** only when:

1. All **six organizer minimum acceptance items** are demonstrably implemented, including the full reference-based search described by PS1.
2. The output is grounded in a real seeded dataset with transparent, criterion-level explanations and meaningful unknown handling.
3. Every interpreted/new/refined search passes through an editable recruiter confirmation step.
4. End-to-end core tests have been executed; their **actual** results and limitations are recorded.
5. The application can run from the documented source; a live deployment is tested if used.
6. The assigned organizer repository contains the source, manifest, README and presentation by the official freeze.
7. Engineering decisions and real problems/fixes are documented without manufacturing test scores or incidents.

**Pareto-specific differentiation is valuable but never a substitute for any of the above.**

---

*This PRD preserves the organizer's functional structure while separating Pareto's additional scope. For exact original organizer wording, consult the supplied PS1 Markdown and official guidelines; their content remains authoritative.*
