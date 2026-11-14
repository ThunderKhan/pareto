# Engineering log

## 2026-11-14 — M0: Project scaffold

**Scope:** Establish a minimal Next.js/TypeScript pnpm workspace with `frontend/`, `backend/`, and `docs/`; add Docker configuration, local Postgres, health endpoint, Prisma starter schema, tests, and a manual GitHub Actions workflow definition.

**Architectural decision:** Use one deployable Next.js application with the backend as a separate internal TypeScript package, instead of starting a second HTTP server.

**Repository privacy finding:** GitHub reported that `ThunderKhan/pareto` is public at scaffolding time. The organizer-provided original problem statement was not uploaded.

**Verification:** Configuration and source files committed through GitHub. Dependencies, build, Docker runtime, and tests must still be verified after installation; do not claim passing results until executed.

**Next:** Finalize specifications, produce a lockfile, verify local build, integrate Supabase and LLM credentials securely.

## 2026-11-14 — M0 documentation: MVP scope

**Action:** Added `docs/MVP.md`, including the mandatory Trustume PS1 acceptance flow, differentiating search diagnostics and what-if features, user journeys, dataset/ingestion plan, agreed Gemini + Groq-only stack, product constraints, and release gates.

**Scope boundary:** This is a product specification, not completed implementation or evidence of passing tests. Detailed API, schema and architecture specifications remain to be written.

**Privacy:** The source repository is currently public, so the original organizer-supplied statement remains uncommitted pending a privacy change.

## 2026-11-14 — M0 documentation: organizer-first PRD

**Action:** Added `docs/PRD.md` with primary and secondary user personas, explicit `P0-ORG` prioritization for all original PS1 functional sections (A–D), acceptance tests for extraction/confirmation, matching, explainability, conversation refinement, and reference-based search, plus separate Pareto add-on requirements.

**Scope decision:** Persona details and feature-level acceptance criteria live in the PRD; the MVP keeps product vision and a short audience description. Document ingestion and Google OAuth remain productization scope rather than misrepresented organizer requirements.

**Verification:** Documentation committed and fetched from GitHub; application functionality, tests and deployment remain unverified.

## 2026-11-14 — M0 documentation: system architecture

**Action:** Committed `docs/ARCHITECTURE.md` as the canonical technical design with C4-style context/deployment, horizontal layer decomposition, ten vertical slices, Mermaid diagrams, schema/API/state contracts, security trust boundaries, local/hosted infrastructure, evaluation, release flow and explicit implementation gaps.

**Important design refinement:** Prisma v7 requires a PostgreSQL driver adapter for direct runtime connections; the current M0 scaffold lacks `@prisma/adapter-pg` and `pg`. Prisma connections do not automatically inherit a signed-in Supabase request's RLS context; user-owned resources require proven authorization boundaries and cross-owner negative tests.

**Verification:** Architecture Markdown and cross-reference links committed to GitHub. No application build, Docker execution, LLM call, SQL migration or deployment was performed in this documentation milestone.

**Next:** Write a phased `IMPLEMENTATION.md`, then implement the P0 organizer vertical slices before optional features.

## 2026-11-14 — M0 documentation: implementation plan

**Action:** Committed `docs/IMPLEMENTATION.md` with organizer-first P0 acceptance gates, phased work packages and dependencies, live vertical-slice strategy, local/Docker/DB/AI test plans, realistic fallback decisions, and production-oriented deployment/release steps.

**Engineering workflow:** The plan requires actual issue/commit/test/verification evidence and records observed problems rather than inventing retrospective challenges. It explicitly protects organizer acceptance and the November 15 5:00 PM IST code freeze.

**Repository integration risk:** The development and organizer repositories have independent histories. The plan uses a reviewed merge/integration branch and warns against force-pushing organizer history.

**Verification:** GitHub returned a new document commit; the Markdown fences and key sections were inspected. **No dependency install, application test, Docker deployment or migration was performed by this documentation change.**

**Next:** Begin F-001 local runtime verification and advance through the P0 corpus/evaluator and search slices, updating task statuses only after evidence.

## 2026-11-14 — Design reference study and product navigation scope

**User direction:** Use the private `ThunderKhan/opentag-clone` as Pareto's UI reference; require a public landing, working signup/login, and protected main dashboard. Potential chat/voice components will be evaluated later.

**Source inspection:** Reviewed the private clone README, inspection notes, CSS, homepage, shared header, documentation sidebar, source tree and interactions. Confirmed CSS baseline: `#FFFDF9` page, `#020E24` ink, `#429DFC` accent, Inter body/STK Earl display (subject to font rights), responsive inset 24/32/clamp(48,8.6111vw,124)px, 91px desktop header, 12px button radius and restrained animation. The reference covers public pages **only**; auth/dashboard are Pareto adaptations.

**Deliverable:** Committed `docs/DESIGN.md` and added clear design/navigation requirements and implementation gates across MVP, PRD, ARCHITECTURE and IMPLEMENTATION. Linked the new design reference from repo documentation.

**Verification:** Source CSS variables extracted and GitHub Markdown files reviewed. No screenshot pixel comparison, new web UI implementation, authentication test, local build or deployment performed.

**Boundary:** Original organizer PS1 P0 remains above optional visual polish; no proprietary OpenTag logos, mascot or fonts copied.

## 2026-11-14 — Source-informed Scrollcraft landing and auth-shell implementation

**Requirement:** Apply [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) as a design/scroll technique reference alongside the user's OpenTag visual system; make the recruitment landing demoable.

**Inspection:** Read upstream `SKILL.md`, MIT license, CSS/JS engine headers, and references for device variation, hero depth, taste, feeling curve, uniqueness and verification. The skill is a standalone vanilla JS design workflow, **not a Framer Motion package**. Chose a small React/CSS adaptation rather than importing a competing global DOM runtime into Next.js.

**Changes:** Committed warm landing, original layered hero, sticky three-step explanation, deterministic interactive three-synthetic-candidate notice simulator, mobile menu, signup/login pages with conditional Supabase client integration, OAuth callback handler, guarded dashboard shell and honest search placeholder. Updated Playwright test source for the new routes and what-if scenario.

**Observed constraint/failure:** Local validation container failed to clone `https://github.com/ThunderKhan/pareto.git` because it could not resolve `github.com`. No pnpm install, TypeScript compile, browser screenshots, Playwright run, Google OAuth setup, or deployment was performed. **Code is implemented/unverified**, not “verified” or “released”.

**Security/provenance:** No Gemini/Groq/API keys added; auth disabled visibly if Supabase env absent; private dashboard guarded by session validation when configured. Sample profiles are explicitly synthetic; no OpenTag mascot, proprietary artwork or font binaries copied.

**Next:** Verify build/typecheck/Playwright/screenshots in an environment with network, fix observed defects, then prioritize original PS1's database-backed candidate search.

## 2026-11-14 — PostgreSQL foundation and organizer workflows

- Audited baseline `bf43d65`. The initial install rejected unapproved dependency scripts. Added an explicit build allowlist and lockfile. Next 16.4.6 lint flagged four internal anchors, and strict type checking caught Supabase cookie callback types. Fixed both.
- Added Prisma 7.10.1 with the PostgreSQL adapter. Generated the client, applied the initial migration to PostgreSQL 18.6 over TCP, and ran the idempotent 48-profile seed twice. Docker is unavailable in this workspace. Compose defines PostgreSQL 17 and a migration gate, so that topology still needs a Docker run.
- Added an authenticated search route, typed Gemini/Groq proposals and refinements, editable confirmation, owner-scoped revisions, candidate evidence, and reference similarity. Used one versioned route handler for the MVP operations. The architecture document lists the longer resource-specific paths as the target contract.
- `pnpm check` passed lint, both TypeScript projects, and 12 Vitest tests with the PostgreSQL integration test enabled. The DB test exercised owner isolation, real match counts, idempotency, optimistic concurrency, and reference exclusion. `pnpm build` passed. Gemini and Groq validation and fallback were tested with controlled provider responses.
- The system Chromium run failed before navigating because the workspace denied its socket call. Live Supabase, Gemini, Groq, OAuth, the signed-in browser smoke suite, and Railway still need configured service accounts and verification. The organizer repository returned 404 for the installed GitHub connection.
- Scope limits include a maximum of 1,000 owner-scoped profiles per search and a 20-result page. Restored search revisions use current database records. Resume ingest and the live diagnostics/simulator remain open.

## 2026-11-14 — Continuation: verified branch and missing-evidence regression

- Verified the live `feat/recruiter-search` head at `f8f2742e95d4595a906b5b2400762a52522bfe56`, reviewed its three prior commits and inspected the implementation, official-priority documents, API authorization, evaluator and acceptance tests. Confirmed the frontend worker has progressed independently on `feat/frontend-experience` (last observed `02729dc757e7691009e68279913c0a8bd0c2068c`); its branch was not edited.
- Found a substantive explanation defect: empty `pastRoles` and `certifications` arrays in the seed are not evidence of confirmed absence, yet matching marked them as FAIL. Changed evaluation to UNKNOWN for undocumented empty history/certification arrays, while keeping explicitly-known empty skills as FAIL. Added a regression test distinguishing unknown evidence from a documented mismatch.
- The current execution container cannot resolve `github.com` (fresh `git ls-remote` fails with `Could not resolve host: github.com`). GitHub's connected API remains available for source inspection and commits. **No fresh pnpm install, typecheck, full Vitest suite, browser test, authenticated end-to-end run, or deployment was possible in this container.** Prior-session green results must not be treated as rerun results.
- The personal repository visibility is **public**. The organizer repository `ai-hackathon-trustume/std-zero` still reports 404 to the connected GitHub integration. These are unresolved submission risks; no organizer files were changed.
- Next: execute `pnpm install --frozen-lockfile && pnpm check && pnpm build && pnpm test:e2e` on a networked runner with a disposable seeded database and configured authentication/provider accounts. Resolve official-repository permissions and perform the signed-in acceptance scenario before considering P1 features.

## 2026-11-14 — Continuation: CI verification attempt

- The prior CI file was manual-only and provisioned no PostgreSQL service, so even a dispatched job could not have exercised the database integration test. Updated the branch's workflow to use a disposable PostgreSQL 17 service, apply the checked-in Prisma migration, seed 48 synthetic profiles for the integration test owner, and run lint/typecheck/Vitest, Next.js production build, Chromium Playwright tests, and Docker build on push / PR / manual dispatch.
- No live Supabase or Gemini/Groq credentials are included. The authenticated recruiter Playwright scenario **will be skipped** until `PARETO_E2E_EMAIL`, `PARETO_E2E_PASSWORD`, real Supabase configuration and a model provider are supplied to a secure test environment. Public browser and signed-out authorization smoke tests remain eligible to execute.
- Workflow execution status must be inspected in GitHub Actions. A committed workflow is not evidence that jobs started, finished or passed, especially given previously noted hosted-runner billing/credits limits.

## 2026-11-14 — Continuation: reference-alias duplication regression

- Found another P0 reliability edge case: reference profiles may contain synonymous skills such as `AWS` and `Amazon Web Services` or `JS` and `JavaScript`. The reference criterion builder copied both, but `criteriaSchema` rejects canonical duplicate keys; this would fail the entire 'Find Candidates Like Me' draft for such a profile. Deduplicated using the existing `ruleKey` normalization (without merging distinct `Java` and `JavaScript`). Added a focused regression test.
- Source inspection and GitHub commits succeeded; tests and browser scenarios remain **unexecuted** in this DNS-restricted container. The new CI workflow has not yet reported a run in GitHub's Actions listing.

## 2026-11-14 — Continuation: actual hosted CI result and browser test correction

- GitHub Actions run [43574665540](https://github.com/ThunderKhan/pareto/actions/runs/43574665540) executed against `5e495068` and completed with **failure**. The frozen-lockfile install, Prisma migration and 48-profile seed, lint/typecheck, 13 Vitest tests (including PostgreSQL integration), production Next.js build, and Chromium installation **passed**. Browser results: **3 passed, 2 failed, 1 skipped** (authenticated recruiter test skipped for missing provider/Supabase test credentials). Docker image build was skipped after the browser failure.
- The two browser failures were on the public marketing preview: clicking '60 days' left the shown count at '1 / 3'; opening mobile navigation did not reveal the navigation region. Next.js logged blocked development-resource requests from `127.0.0.1`. This does **not yet prove** an application defect rather than dev-server asset/hydration interference.
- Changed the Playwright webServer command to use the production build (`pnpm start`) in CI, preserving `pnpm dev` for local development. The next run will distinguish development HMR-origin interference from a genuine client interaction defect. The frontend worker's separate branch was not edited.
