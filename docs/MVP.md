# Pareto — Minimum Viable Product (MVP)

> **Document status:** Product scope and acceptance baseline for development; not a claim of implemented functionality.  
> **Date:** 14 November 2026 (IST)  
> **Product:** Pareto (working hackathon name)  
> **Challenge:** Trustume AI Hackathon 2026 — Problem Statement 1, *AI-Powered Natural Language Candidate Search & “Find Candidates Like Me”*  
> **Team / official submission:** std::zero — organizer-assigned private repository `ai-hackathon-trustume/std-zero`  
> **Development repository:** `ThunderKhan/pareto`  
> **Code freeze:** 15 November 2026, 5:00 PM IST; live presentations 6:00–8:00 PM IST.

## 1. Executive summary

**Pareto** is an explainable, human-controlled AI recruitment intelligence platform. It converts natural-language hiring requirements into editable filters, finds candidates from a structured resume database, explains exactly why each candidate matches or does not match, supports conversational search refinement, and finds candidates similar to a recruiter-selected reference profile.

On top of the full original challenge, Pareto adds **Search Health Diagnostics**, a **What-If Hiring Simulator**, and **evidence-backed counterfactual explanations**. Instead of merely displaying “no results,” Pareto can show which restrictions are eliminating candidates and what alternative searches would produce—without silently changing the recruiter’s requirements.

**Product promise:** *Discover candidates. Explain the evidence. Explore the trade-offs.*

This is a **production-oriented hackathon MVP**, not a claim that the system is ready to make real-world hiring decisions autonomously. It must work end-to-end against test data, be deployed, be demonstrable, and be supported by tests and an honest engineering record.

## 2. Problem and opportunity

Recruiters translate nuanced hiring requirements into rigid filters for role, location, experience, skills, education and joining availability. This is slow, hard to refine, and insufficiently transparent. A search often returns too many loosely relevant candidates or none at all, without explaining why.

The original Trustume problem statement requires: natural-language requirement extraction; recruiter review and confirmation; explainable, criterion-level matching; multi-turn conversational refinement; and reference-based search (“Find Candidates Like Me”). It supplies no candidate dataset; teams must provide realistic test records.

**Our extension:** move from passive retrieval to *decision support*. When hiring criteria are too restrictive, Pareto explains the bottleneck, proposes measurable adjustments, and keeps the final decision with the recruiter.

## 3. Target users and permissions

**Primary user:** recruiter or hiring team member sourcing and reviewing candidates. Detailed primary and secondary personas, user stories and feature-specific acceptance criteria are maintained in [PRD.md](PRD.md), §3.

**MVP role model:** one authenticated recruiter role; no multi-tenant enterprise administrator, automated rejection workflow, applicant self-service portal, or complex organizational permissions.

**Authentication:** Supabase Auth; Google sign-in as a first-class option, with email/password sign-in also supported. Users must be authenticated before accessing private candidate records and document uploads. Server-side routes must enforce authorization; a signed-in session alone is not sufficient proof that a resource belongs to a user.

## 4. Product principles

1. **Preserve the full original PS1.** Differentiating features must not replace or weaken its acceptance criteria.
2. **Human-in-the-loop.** Never execute a newly interpreted or modified search until the recruiter reviews and confirms its criteria.
3. **LLMs interpret; our engine decides.** AI models parse intents and extract evidence; the search/ranking/optimization engine deterministically evaluates records.
4. **Truthful evidence.** A missing field is **unknown**, not a failure or a fabricated success. Explanations must link to stored profile fields or document excerpts where available.
5. **No silent constraint relaxation.** The system may recommend alternatives, but must not silently override hard constraints.
6. **Reproducible engineering.** Keep seed data, tests, migration history, decision notes and genuinely observed development challenges.
7. **Respect applicant privacy and fair review.** Keep resumes private, use synthetic/demo data, and do not score protected personal characteristics.

## 5. Scope and priorities

| Priority | Capability | Scope |
| --- | --- | --- |
| **P0 — Mandatory PS1** | Plain-English candidate search | Text prompt to typed, structured requirements |
| **P0 — Mandatory PS1** | Review, edit and confirm | Editable structured fields and explicit Confirm Search |
| **P0 — Mandatory PS1** | Candidate retrieval | Real query against the seeded candidate database |
| **P0 — Mandatory PS1** | Explainable ranking | Criterion-by-criterion matched, unmatched and unknown evidence |
| **P0 — Mandatory PS1** | Conversational refinement | Apply follow-up changes without discarding unchanged filters |
| **P0 — Mandatory PS1** | Reference-candidate search | Select a profile, derive editable similarity criteria, confirm and rank peers |
| **P0 — Foundation** | Reproducible data + working app | Seed/import synthetic profiles, database, tested API flow, deployed demo |
| **P1 — Differentiator** | Search Health Diagnostics | Identify restrictive conditions and show candidate counts under measurable relaxations |
| **P1 — Differentiator** | What-If Hiring Simulator | Compare original and proposed criteria side by side; no automatic application |
| **P1 — Differentiator** | Evidence and counterfactual panel | Explain a near match and the minimum relevant requirements it misses |
| **P1 — Product workflow** | Resume ingestion | At least text-based PDF and DOCX, plus TXT; private source storage and parsed profiles |
| **P1 — Product workflow** | Recruiter sign-in | Google OAuth + email/password via Supabase Auth |
| **P2 — Stretch** | Search decision-history UI | Browse past confirmed search revisions and compare their outcomes |
| **P2 — Stretch** | Advanced semantic matching | Embeddings / pgvector if demonstrated necessary |
| **Out of scope** | OCR, voice search, agent swarms | Defer until core accuracy and demo are stable |

**Release rule:** P0 must be completed and tested before spending significant effort on P1. P2 is never allowed to jeopardize the official acceptance checklist or code-freeze deadline.

## 6. End-to-end user journeys

### 6.1 Recruiter onboarding

1. Recruiter opens Pareto, signs in using Google or email/password.
2. On successful sign-in, Pareto loads the authenticated workspace and available candidate dataset.
3. Unauthorized users cannot query private resumes, browse candidate profiles, or import documents.
4. Errors and missing configuration are surfaced rather than bypassing authentication.

### 6.2 Search by plain-English description — mandatory

**Example recruiter prompt:**

> Find a Senior Java Developer in Hyderabad with 6–10 years of experience, Java, Spring Boot, AWS, and a notice period of no more than 30 days.

1. Recruiter enters the prompt.
2. Gemini (primary) or Groq (fallback) returns a validated **draft** requirements object: role, location, experience range, required/preferred skills, joining availability, and relevant optional attributes.
3. Pareto displays the extracted requirements in an **editable** form. Ambiguous, unsupported or omitted constraints are visibly indicated.
4. Recruiter can change values and distinguish **mandatory** requirements from **preferences**.
5. Only after clicking **Confirm Search** does Pareto query the candidate database.
6. Results show eligibility, ranked relevance, and evidence-backed criterion breakdowns; a zero-result state offers meaningful diagnosis rather than an empty screen.

**Acceptance:** the system does not run a confirmed search solely because the model returned criteria; edits are respected; exact constraints are evaluated against stored records.

### 6.3 Explainable candidate results — mandatory

Each result card must present:
- Candidate identifier/display name, role, location, experience and supported skills.
- **Hard-constraint eligibility:** eligible, ineligible, or needs-review where essential data is missing; not conflated with a relevance score.
- **Preferred-fit assessment:** transparent, deterministic criteria and weights. Any percentage must be tied to clearly documented scoring rules and must not imply a calibrated probability of hiring success.
- Per-criterion state: **matched / not matched / unknown**, with source field or resume excerpt where available.
- A plain-language explanation of important matches, missing facts and trade-offs.

**Example:** “Java, Spring Boot, AWS and seven years’ experience are documented. Notice period is 60 days, exceeding the required 30 days. This profile is not an exact match.” If notice period is absent, state *unknown*, not “60 days” or “meets requirement.”

A rule-based scorer must not turn a missing required fact into a verified exact match.

### 6.4 Conversational refinement — mandatory

1. Recruiter starts from a confirmed search.
2. Recruiter says: “Only show candidates with Spring Boot and AWS” or “Now restrict joining to 30 days.”
3. AI generates a **search delta** (only proposed changes), not a replacement search object.
4. The editor highlights changed criteria and retains all unaffected criteria.
5. Recruiter confirms the revision.
6. Results are recalculated with the new criteria; the active conversation remains attached to the search session.

**Acceptance:** follow-ups do not reset role, location or experience unless expressly requested; ambiguous changes request clarification or remain uncommitted.

### 6.5 “Find Candidates Like Me” — mandatory

1. Recruiter searches for or selects a reference candidate (for example, an ideal known employee).
2. Pareto derives role history, experience, skills, domain, location, education and certifications **only when present in the stored profile**.
3. Recruiter sees and edits the derived similarity criteria before confirmation.
4. Pareto finds other candidate records and provides explainable similarity breakdowns.
5. Follow-up requests (e.g. “Like this person but with AWS”) refine the active reference-based search without resetting its other criteria.

**Acceptance:** the reference profile is not returned as its own recommended peer; similarity scores, if used, are transparently defined and not invented by an LLM.

### 6.6 Search Health Diagnostics — differentiated feature

When a search is restrictive or yields zero/few exact matches:
1. Show the original confirmed constraints and exact eligible-candidate count.
2. Recalculate eligibility for individual feasible relaxations (e.g. notice period 30 → 45 days, reduce minimum years, or change AWS from required to preferred).
3. Identify which constraint changes increase the eligible pool.
4. Rank **suggestions** by their actual effects and the recruiter's priorities; clearly state which requirements are being weakened.
5. Never claim a count not computed from the current dataset. Never automatically accept a relaxation.

For multi-constraint bottlenecks, evaluate a limited set of two-constraint alternatives only if required for the demo and computationally practical.

### 6.7 What-If Hiring Simulator — differentiated feature

A recruiter can select a proposed adjustment and view:
- **Original search vs proposed search** (criteria, exact matches, and newly eligible candidates).
- The precise relaxed or changed requirement.
- Candidate-level explanations for why new records qualify or remain excluded.
- An **Apply for review** action that returns to the editable criteria screen; a further **Confirm Search** is required to make the variation active.

The simulator must be backed by the same deterministic engine as normal search, not fabricated counters or static dashboard cards.

### 6.8 Evidence-backed near-match explanations — differentiated feature

For partially matching candidates, explain the smallest relevant difference from the confirmed criteria, such as “Meets all listed technical skills but can join in 45 rather than 30 days.” Cite the stored field or document snippet where available. If a candidate lacks a notice period, the result should be flagged for verification rather than proposing a fictional value.

## 7. Candidate dataset and resume ingestion

**Data availability:** no official resumes or videos are provided for PS1. Our demo will use **synthetic or appropriately licensed sample records**, never real applicants uploaded without authorization.

**Initial target:** approximately **300–500 searchable candidate profiles**, with a separately curated evaluation set of **30–50 synthetic edge-case profiles**. These are target sizes, not a prerequisite for showing the first working vertical slice.

**Dataset options to assess:** SyntheticResumeData as a possible PDF source; supplement with original synthetic DOCX/TXT records and deliberate missing-field cases. Before importing any external source, verify file format, licensing, use permissions, completeness and whether the data is genuinely synthetic.

**First supported input formats:**
- **PDF (`.pdf`):** extract embedded text from text-based PDFs.
- **Word (`.docx`):** extract text using Mammoth.
- **Plain text (`.txt`):** direct text extraction.
- **CSV / JSON:** supported as bulk structured-record import, not necessarily as resume-upload documents.

**Deferred:** legacy `.doc` and scanned/image-only PDFs requiring OCR.

**Ingestion flow:**
1. Validate actual file type, size, upload permissions and request limits.
2. Store the original document in a **private Supabase Storage bucket**.
3. Extract text; reject or flag unreadable/scanned documents.
4. Use an LLM to propose structured candidate attributes.
5. Validate via Zod and normalize skill names, dates, experience and availability.
6. Persist candidate records, source-document references, extraction status and evidence excerpts in PostgreSQL via Prisma.
7. Show extraction errors or unknown fields honestly. Prevent unintended duplicate imports where possible.

Parsing occurs **once during ingestion**, not on every candidate search. Source-document access is restricted and must not leak public URLs or credentials.

## 8. Application surfaces

| Screen / surface | Initial scope |
| --- | --- |
| Sign-in | Google OAuth and email/password through Supabase |
| Search workspace | Natural-language prompt, reference candidate selection and refinement history |
| Criteria confirmation | Editable typed filters, mandatory/preferred controls, diff preview |
| Results | Ranked candidate cards, hard-constraint statuses and criterion breakdowns |
| Candidate detail | Profile, evidence and reference-based “find similar” action |
| Search diagnostics | Bottlenecks, candidate counts and proposed relaxations |
| What-if comparison | Side-by-side original/proposed criteria and results |
| Resume import | Upload status and structured extraction feedback (P1) |
| Error/empty/loading states | Explicitly handled throughout the core workflow |

**UI direction:** restrained, modern, accessible enterprise interface—not a generic chatbot or decorative “AI dashboard.” Good keyboard support, clear labels and readable evidence take priority over animations.

## 9. Technical architecture and selected stack

**Structure:** pnpm monorepo with `frontend/` (Next.js App Router UI and API route handlers), `backend/` (internal TypeScript domain/service package, Prisma schema and tests), and `docs/`. **One deployable application**, not a separate backend HTTP server.

| Concern | Decision |
| --- | --- |
| Framework & language | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui, **Phosphor Icons** (not Lucide as default) |
| Database | PostgreSQL, hosted on Supabase in production |
| ORM & migrations | Prisma |
| Authentication | Supabase Auth, **Google OAuth** and email/password |
| Resume storage | Private Supabase Storage |
| Resume text extraction | pdf-parse, Mammoth, native TXT parsing |
| Input / model validation | Zod |
| AI provider integration | Vercel AI SDK/provider adapters |
| **Only LLM providers** | **Google Gemini (primary) and Groq (fallback)** |
| Search/ranking/diagnostics | Deterministic TypeScript application services |
| Tests | Vitest + Playwright; real Postgres integration testing where applicable |
| Logs | Pino JSON structured server logging with sensitive-field redaction |
| Containers | Docker multi-stage image, Docker Compose for app + local PostgreSQL |
| Deployment | Railway container hosting, conditional on free-tier/network verification |
| CI/CD | GitHub Actions workflow checked into Git; **local checks are authoritative while hosted Actions credits are unavailable** |
| Package management | pnpm workspaces |

**AI fallback behavior:** select configured, tested model IDs and bound provider call time. If the primary fails transiently, try the other provider; validate both against the same typed schema. Do not indiscriminately retry authentication errors or fabricate successful outputs. LLM availability failure should be visible as a recoverable error.

**No OpenAI API and no xAI Grok** are in scope. Groq and Grok are different providers/products; the chosen provider is **Groq**.

## 10. Data, security, privacy and fairness

- Use synthetic, public-licensed or explicitly authorized data only; do not publish actual resumes in the source repository.
- Restrict candidate profiles and uploaded files by authenticated ownership or authorized workspace scope.
- Check authorization on each server-side operation, including Prisma calls; Supabase login alone does not secure database queries.
- Configure Supabase storage policies and row-level security for any exposed tables or objects. Keep admin/service credentials server-side.
- Never expose LLM keys, database secrets, or private document URLs through the browser or Git.
- Redact credentials, prompts containing personal data and raw resume content from ordinary logs.
- Protect ingestion against unsupported types, oversized uploads, malformed documents and duplicate processing.
- Do not use protected demographic characteristics as ranking inputs or infer them from names/photos.
- Keep a recruiter in control of search criteria and decisions. This is sourcing support, **not automatic employment eligibility determination**.
- Explanations and match scores communicate search-rule fit, not personal worth or validated job performance.

## 11. Quality and evaluation plan

### Functional acceptance (non-negotiable)

- [ ] A recruiter can enter a plain-English requirement (or choose a reference candidate).
- [ ] The system extracts **structured** criteria and shows them **before search**.
- [ ] A recruiter can edit criteria and must explicitly confirm before querying.
- [ ] The system retrieves candidates from a real seeded database.
- [ ] Each result has transparent, criterion-level explanations.
- [ ] Multi-turn refinement retains unchanged filters.
- [ ] Reference-based similarity search works and is explainable.
- [ ] Zero results, unknown fields and invalid model responses are handled visibly.

### Differentiation acceptance

- [ ] Diagnostics identify at least one *genuine* restrictive criterion from live dataset calculations.
- [ ] A what-if variation reports its real effects and keeps the original search unchanged until confirmation.
- [ ] Candidate counterfactuals agree with the matching engine and stored evidence.

### Engineering acceptance

- [ ] Reproducible local installation and Docker startup.
- [ ] Prisma migration + seed process documented and repeatable.
- [ ] No secrets committed; sample environment variables documented.
- [ ] Authentication and private-resource authorization tested where enabled.
- [ ] Vitest tests cover constraint parsing contracts, scoring, unknown data, refinement deltas and diagnosis calculations.
- [ ] Playwright covers at least one full search flow and the critical confirmation interaction.
- [ ] Deployed environment is verified with health and end-to-end smoke checks.
- [ ] README includes architecture, run steps, test commands, dependencies and known limitations.
- [ ] Presentation deck and complete source reach the **assigned private hackathon repository** by code freeze.

### Evaluation evidence

Use a deterministic synthetic test corpus with varied roles, skills, locations, notice periods, negations, contradictory requirements and missing data. Evaluate:
- AI criteria extraction against expected structured labels.
- Hard-constraint accuracy and unknown handling.
- Search refinement retention behavior.
- Similarity ranking and explanation consistency.
- Diagnostic candidate-count correctness.
- Measured latency and provider errors under documented test conditions.

**Never invent test-pass rates, dataset sizes, latency statistics, or engineering incident reports.** Report measurements only after execution.

## 12. Milestones and release gates

| Milestone | Goal | Gate to advance |
| --- | --- | --- |
| **M0 — Scaffold** | Next.js workspace, backend package, docs, Docker, sample CI files | Files committed; installation and runtime validation tracked separately |
| **M1 — Data foundation** | PostgreSQL models, seed data, import/extraction vertical slice | Profiles can be queried with verified fields |
| **M2 — Original PS1 complete** | Extraction, criteria confirmation, search, explainability, refinement, reference search | Mandatory checklist works end-to-end |
| **M3 — Differentiation** | Diagnostics, what-if comparisons, near-match evidence | Suggested alternatives agree with recomputed dataset results |
| **M4 — Hardening** | Authentication, testing, errors, logs, deployment, docs | Demo stable and claims supported by evidence |
| **M5 — Submission** | README, presentation, official repository integration | All required deliverables pushed by Nov 15, 5:00 PM IST |

M1 and basic authentication can progress concurrently only if this does not delay M2. During a time crunch, protect the original PS1 over advanced optimization features.

## 13. Live demo outline

1. Open the deployed Pareto application and identify it as the working production-oriented prototype.
2. Enter a nuanced Senior Java Developer search. Show draft structured criteria, edit one parameter, and **confirm**.
3. Display actual ranked candidates and inspect a criterion-level explanation.
4. Refine the confirmed search conversationally; demonstrate preserved constraints.
5. Select an ideal profile and perform **Find Candidates Like Me**, including confirmation and explainable similarity.
6. Trigger a restrictive search and use diagnostics to explain the zero/low result count.
7. Preview a what-if relaxation side by side; show newly eligible candidates and explicit approval.
8. Show engineering artifacts: architecture, Git milestones, failing/passing tests where genuinely observed, deployment and limitations.

The presentation should respect the organizer-provided five-slide template (team, problem, solution, impact, thank you), supplemented with a short live product and GitHub walkthrough.

## 14. Engineering-process evidence

The organizers expect a truthful **start-to-finish engineering journey**, not just a polished UI. Maintain:
- Requirements traceability to each PS1 acceptance item.
- Small, meaningful commits and PRs where repository permissions permit.
- Architecture decision records: modular monolith, data contracts, deterministic scoring, privacy boundaries.
- A dated `docs/engineering-log.md` recording **actual** roadblocks, investigations, tests and fixes.
- Seed dataset generation/import notes and versioned evaluation cases.
- Deployment configuration and verification results.
- Explicit deferred work and known limitations.

Our personal development repository is the working source. The organizer-assigned private `std-zero` repository must receive integrated, tested code, documents and presentation **incrementally**, not only in the final minutes.

## 15. Explicit non-goals for v1

- Training an original foundation model or custom LLM.
- Off-screen gaze detection or audio/video lip-sync detection (other hackathon statements).
- Email-response triage and outbound messaging automation (a different problem statement).
- Automated hiring acceptance/rejection, candidate surveillance, demographic-based scoring.
- OCR-heavy document reconstruction, legacy `.doc` conversion, voice input.
- Kafka, Redis, Kubernetes, microservices, a second backend HTTP API, dedicated vector database.
- Full enterprise multitenancy, billing, applicant tracking, calendar scheduling, email sending.
- A guaranteed accurate prediction of candidate job performance.

## 16. Status, dependencies and open implementation decisions

**As of this document:** the GitHub scaffold contains project folders, an initial Next.js page, Prisma starter schema, a health endpoint, logging and starter tests. **No functional candidate search, deployed application, authenticated recruiter flow, resume ingestion, or LLM integration has been verified yet.**

Implementation details to settle in subsequent specification documents:
- Exact normalized candidate schema and evidence provenance format.
- Deterministic ranking weights and required/preferred eligibility semantics.
- Per-user ownership model, authorization strategy and Supabase RLS/storage policies.
- The final synthetic dataset source and its license/quality verification.
- Exact Gemini/Groq models, budgets, timeouts and error handling.
- Railway account deployment feasibility and GitHub Actions alternative workflow.
- API contracts, processing limits, resume size caps and rate limiting.

**Brand caveat:** “Pareto” is the working hackathon name; it has not been trademark-cleared for a commercial recruitment product.

---

**Source of truth:** the original Trustume Problem Statement 1 and official event instructions remain authoritative for hackathon compliance. This document adds our agreed product scope and engineering direction; where conflicts arise, official acceptance requirements take priority.

## 17. Product entry experience and OpenTag-derived design (new requirement)

**Design authority:** [DESIGN.md](DESIGN.md). The selected visual reference is the user's private [`ThunderKhan/opentag-clone`](https://github.com/ThunderKhan/opentag-clone), a faithful recreation of **OpenTag's public marketing website**, not its private web application. Its actual CSS tokens, type scales, spacing, buttons, header and motion define Pareto's preferred visual language. **The authentication and internal dashboard are new Pareto designs derived from that language.**

### Public-to-private product journey

1. **Landing page (`/`):** public, substantial, and distinctly Pareto-branded; editorial hero, clear candidate-search value proposition, realistic demonstration preview, trust/explainability messaging, and visible **Get started / Sign up** and **Log in** actions.
2. **Signup (`/signup`) and login (`/login`):** real Supabase Auth forms supporting **Google OAuth** and email/password, with callback, verification/recovery and failure states; no imitation of OpenTag's external account service.
3. **Protected dashboard (`/dashboard`):** orient the authenticated recruiter; dominant **Start candidate search** action and navigation to search, candidates, and optional imports.
4. **Core workspace (`/dashboard/search`):** all **P0 organizer** flows—prompt/reference selection, AI-extracted criteria, editing, explicit confirmation, real candidate results, per-criterion explanations, conversational follow-ups.
5. **Candidate exploration:** list/detail + “Find Candidates Like Me”, with explanations and actual data. P1 diagnostics and what-if may extend the same working surface.
6. **Optional P1 imports and settings:** secure document ingestion and account management when actually implemented.

### UI design rules and scope

- **Verified source aesthetic:** warm off-white `#FFFDF9` canvas, navy `#020E24` ink/CTA, restrained body grays, blue accent `#429DFC`, serif editorial display, Inter working typography, fine borders, subtle transitions and responsive spacing.
- Preserve visual fidelity to the clone's **public-site patterns** while writing original Pareto copy, creating a distinct wordmark, using licensed assets/fonts, and implementing with Next.js + Tailwind + shadcn/ui + **Phosphor Icons**. Do not transplant OpenTag logos, mascot, customer marks or proprietary fonts without permission.
- The clone **does not** contain authenticated OpenTag dashboard or login UI. Any such Pareto surfaces are **design extrapolations**, not verified “exact copies.”
- Additional chat/voice components, if later requested, must follow this design system. **Voice is not required** for original PS1.

**Priority clarification:** The landing→auth→dashboard route journey is a committed **P1 product UX requirement**, to scaffold early for coherence and finish alongside secure authentication. However, **P0-ORG search, editing/confirmation, explanation, refinement and reference mode remain release-critical**. A beautiful landing page cannot replace them.
