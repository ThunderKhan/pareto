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
