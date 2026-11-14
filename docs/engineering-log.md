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
