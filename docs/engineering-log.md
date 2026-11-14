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

## 2026-11-14 — Continuation: PostgreSQL-backed organizer acceptance regression

- Added a multi-stage database integration test covering an actual seeded candidate search after controlled model interpretation; manual notice-period edit before confirmation; criterion-level negative evidence; two sequential persisted refinements with unchanged constraints retained; a reference-based search excluding the source profile; and a further reference search refinement making AWS required. The model provider is deliberately mocked for deterministic integration verification; no live Gemini or Groq call is claimed.
- The new test requires `PARETO_TEST_DATABASE_URL`; the CI job now provisions that database. This entry records added test source, **not a passing result**; check the next CI run for actual execution evidence.

## 2026-11-14 — Continuation: verified acceptance and release-build gate

- GitHub Actions run [43574951950](https://github.com/ThunderKhan/pareto/actions/runs/43574951950) at `cba6afea` completed **successfully**: frozen pnpm install, PostgreSQL 17 migration and 48-profile seed, lint, TypeScript, 14 Vitest tests, Next.js production build, Chromium install, 5 passed public/signed-out Playwright tests with 1 authenticated test skipped, and production Docker image build. Running Playwright against `next start` removed the earlier dev-server-only interaction failures.
- GitHub Actions run [43575127425](https://github.com/ThunderKhan/pareto/actions/runs/43575127425) at `f22622c4` also completed **successfully**, including the newly added PostgreSQL-backed organizer scenario. This run recorded **15/15 Vitest tests**, **5/5 executed Playwright tests**, **1 credential-dependent Playwright test skipped**, successful production build and Docker image build.
- These results do not verify live Supabase email/password/Google OAuth, live Gemini/Groq interpretation, signed-in browser navigation, Railway service startup, or Docker Compose runtime. The organizer repository remains 404 to the available GitHub integration, which is installed on the personal ThunderKhan account only (no organizer organization installation exposed).
- Reviewed the two feature branches against `main`; the only same-path overlap so far is `frontend/src/components/marketing/scroll-landing.tsx`. Preserve that dedicated marketing workstream and integrate through a reviewed branch rather than overwriting it or force-pushing either repository.

## 2026-11-14 — Temporary release integration and first combined CI

- Created the temporary `integration/release-20261114` branch with merge commit `0702b84d`, retaining both `feat/recruiter-search` and `feat/frontend-experience` as commit parents. The sole overlapping changed path was `frontend/src/components/marketing/scroll-landing.tsx`; took the frontend worker's complete updated marketing component with its CSS, preview evaluator, tests, and `docs/SCROLLCRAFT.md`. Preserved backend search, auth, Prisma, lockfile, CI, and shared CSS. Created draft PR #3 targeting `main`; nothing merged into main.
- [Integration CI #43576326020](https://github.com/ThunderKhan/pareto/actions/runs/43576326020) **failed** at lint: `frontend/src/components/marketing/scroll-landing.tsx:105` used a regular `<a>` for the internal root route. This is an observed cross-branch lint incompatibility. Migration and seed succeeded before lint; downstream build/Playwright/Docker did not run.
- Changed only the integration branch's `Brand` home link to Next.js `Link`, leaving the frontend worker's branch unchanged. Await fresh CI to verify.

## 2026-11-14 — Release auth and credentialed verification setup

- Supabase plugin access showed **no dedicated Pareto project** among the user's projects; did not change any unrelated project. Railway app is not connected, so no Railway deployment or URL is claimed. GitHub App remains personal-account only; organizer repository 404 persists.
- Added a Next.js 16 `src/proxy.ts` to keep refreshed Supabase cookies synchronized between request/server and response/browser; final `recruiter()` and owner-scoped Prisma checks remain authoritative. This source change is **not yet live-auth verified**.
- Added a manual, environment-gated `live-recruiter.yml` job that fails fast when Supabase user identity, password or both AI provider pairs are missing, migrates/seeds an ephemeral PostgreSQL database under the **actual Supabase demo recruiter's UUID**, then runs the real recruiter Playwright test against configured Supabase/model providers. It is *not* evidence of a run until securely configured and executed.
- Added `docs/RELEASE-SETUP.md` with precise account configuration, deploy steps, GitHub secrets, organizer access rights and explicit remaining blockers. Removed stale `frontend/.env.example` claims that Auth was unimplemented and removed the unused `SUPABASE_SECRET_KEY` placeholder; no secrets were added.

## 2026-11-14 — Integrated marketing Playwright test diagnostics

- [Integration CI #43576477062](https://github.com/ThunderKhan/pareto/actions/runs/43576477062) passed lint, TypeScript, 15 Vitest tests and Next.js production build, but Playwright reported **13 passed, 2 failed, 1 skipped** (real recruiter sign-in). One failure was a strict Playwright locator matching two pieces of text (`Joining window` appeared in both a summary and evidence detail), not a demonstrated product state error. The other was a mobile menu outside-click test timeout while clicking a headline that may be intercepted by the open navigation layer.
- Changed the evidence selector to the actual disclosure-list entry and replaced the potentially intercepted headline click with a real pointer click at a viewport point outside the sticky header. These are test-target corrections, not a claim of verification; rerun combined CI. Docker build had been skipped due to browser failures.

## 2026-11-14 — Manual live-workflow dispatch compatibility

- Verified GitHub's `workflow_dispatch` semantics: a workflow file must exist on the **default branch** before the UI/API can dispatch it. Since `live-recruiter.yml` was new on the integration branch only, it was not directly runnable before merging (which release policy forbids). Removed that new workflow and attached the gated `recruiter-live` job to the already-existing `.github/workflows/ci.yml` (present on main). Manual dispatch of `Recruiter search CI` selecting `integration/release-20261114` can now execute the live job after the required `pareto-demo` environment secrets and variables are installed. Automatic PR CI still runs only the credentials-free `checks` job.
- This is a workflow readiness correction only; no live credentials or browser session have been executed.

## 2026-11-14 — Production container smoke gate added

- Combined CI at `e53a2362` [run 43576880718](https://github.com/ThunderKhan/pareto/actions/runs/43576880718) passed 15/15 Vitest tests, 15/15 executed Chromium tests, with 1 credential-dependent recruiter test skipped; Next.js build and Docker image build passed.
- The existing CI only built the Docker image; this did not verify it could start. Added a post-build smoke step that runs the actual standalone container, polls `GET /api/health`, verifies an unsigned `GET /api/v1/search` returns 401, and cleans up the container. The added gate must **pass in a future CI run** before claiming runtime smoke evidence. This is still not a Railway deployment or authenticated provider verification.

## 2026-11-14 — Full integrated CI and Docker runtime verified

- Verified [GitHub Actions #43577222253](https://github.com/ThunderKhan/pareto/actions/runs/43577222253) on integration commit `71624790`: **success**. Frozen pnpm install, PostgreSQL 17 migration and seeded 48 profiles, eslint, typecheck, **15/15 Vitest**, Next.js production build, Chromium, **15 executed Playwright tests passed**, **one authenticated recruiter test skipped** (missing Supabase and AI environment), production Docker image build, and **booted Docker runtime HTTP smoke** all succeeded.
- The container smoke started the real `frontend/server.js` standalone runtime, confirmed `GET /api/health` responded, and confirmed unsigned `GET /api/v1/search` returned **401**. This is local CI production-image/runtime verification, *not* Railway deployment or real provider/auth integration.
- The secure live acceptance job is attached to the existing default-branch-dispatchable `ci.yml` with a manual-only `pareto-demo` environment. Automatic PR runs report it skipped by design. Credentials are still absent, so **live recruiter browser acceptance remains unexecuted**.
- Temporary integration branch retains both feature histories, draft PR #3 targets `main` without merging. Connected Railway app not installed, no dedicated Pareto Supabase project on this connection, and the private organizer repository still returns 404. Submit only after correcting these account-level release blockers.

## 2026-11-14 — Release candidate audit: sparse reference and negative-skill edge cases

- Inspected integrated search/API/Prisma/Auth/marketing code against the PS1 acceptance requirements. Confirmed an undocumented candidate could be stored with no role, city, history, skills, notice, or experience, but its `referenceDraft` would previously fall through to the generic `criteriaSchema` min-length error. The API did not communicate that no reference similarity search is meaningful. Added a deliberate owner-scoped 422 error with an actionable explanation; confirmed by code review that another owner's profile still resolves as 404.
- Added a PostgreSQL integration regression that creates a synthetic sparse profile for the fixture owner, expects 422 for the owner and 404 for another recruiter, then deletes the temporary profile in `finally`.
- Added an evaluator regression distinguishing Java from JavaScript under required exclusion, explicitly known absent skills vs unreported skills, and preferred unknown notice values (unknown preference must not exclude a candidate).
- All modifications are on `integration/release-20261114`; Railway remains explicitly deferred. **Tests newly added are unverified until CI executes**; previous green run [43577502070](https://github.com/ThunderKhan/pareto/actions/runs/43577502070) applies only to pre-change commit `bdb6e3a5`.

## 2026-11-14 — Reference-only result copy: prevent misleading eligibility claims

- Reviewed the seeded reference search behavior: initial `referenceCriteria()` creates **preferred** criteria only. Consequently, all 47 non-reference candidates satisfy zero required filters and the deterministic engine labels them `ELIGIBLE`. That status is internally coherent, but presenting “47 eligible” in the recruiter UI falsely suggests the cohort meets explicit mandatory filters.
- Changed the confirmed-results summary and per-profile status for a **reference-only, all-preferred search** to “candidates ranked by similarity” / “Similarity-ranked”, while preserving deterministic preference matching and the reference candidate’s self-exclusion. If a recruiter subsequently confirms any required criterion, ordinary eligible/review/ineligible status appears again. No fake eligibility counts or modifications to matching-engine policy were introduced.
- Focused browser verification for this UI state is added to the credentialed recruiter acceptance path; real authenticated verification is still blocked until account settings are configured.

## 2026-11-14 — Credentialed release test hardening (no Railway)

- Added `backend/src/search/provider-live.test.ts`, skipped in ordinary CI and requiring `PARETO_VERIFY_LIVE_MODELS=1` for real API verification. Each configured Gemini/Groq provider is exercised **independently**, for actual requirement extraction and conversational refinement; the other provider's credentials are temporarily masked so fallback cannot hide a broken account. Secrets and provider JSON are not logged. This test has **not** been executed with live credentials.
- Strengthened `frontend/tests/e2e/recruiter.spec.ts` to check all five initial required criteria, no premature candidate query, exact deterministic count after editing notice, known match evidence, preserved constraints through two revisions, reload persistence, 47 similarity-ranked peers and self-exclusion, and sign-out/private API denial. Explicit `PARETO_REQUIRE_LIVE=1` now prevents the credentialed job from silently skipping the test when missing secrets. This does not fabricate a live E2E result.
- Both checks added to the manual `recruiter-live` job in existing `ci.yml`. Ordinary CI remains credentials-free; the two real-provider paths require the dedicated Pareto Supabase/Gemini/Groq environment. No Railway actions performed.

## 2026-11-14 — No-Railway demo and reference refinement coverage

- Added `docs/DEMO-SCRIPT.md` grounded in the organizer's PS1 and official 15 November submission/deck requirements. Explicit steps cover real sign-in, human edits, 48 synthetic seeded PostgreSQL candidates, exact inclusive notice/unknown behavior, two confirmed revisions, similarity-only ranking and an additional reference AWS constraint, sign-out and an outage fallback with no fabricated model output.
- The scripted counts derive from the checked-in synthetic fixture generator and existing deterministic evaluator. They are not claims that a real Supabase/Gemini/Groq demo has been observed.
- Extended the credentialed Playwright acceptance test with the follow-up reference AWS constraint: 21 eligible, 2 needing review, self-exclusion unchanged. This new assertion requires actual provider and account configuration; it has **not** yet run live.
- Updated the release setup runbook to explicitly freeze Railway until user authorization; local/CI steps use dedicated Supabase Auth and disposable GitHub Postgres, with both localhost and 127.0.0.1 callbacks documented. No Railway resources touched.

## 2026-11-14 — Authenticated sign-out assertion corrected; organizer membership rechecked

- Found a verification defect in the live Playwright acceptance test: using the standalone `request` fixture after browser sign-out cannot prove browser cookie invalidation, because that API request context has independent cookies and would return 401 even with the browser still authenticated. Changed to `page.context().request`, the HTTP context sharing the **same browser session**, and added a pre-signout HTTP 200 assertion retrieving the actual synthetic Asha Nair record. The post-signout assertion requires the **same context** to return 401. This updated live test remains gated by real Supabase account credentials.
- Rechecked linked GitHub identity `ThunderKhan`: no organization memberships were returned to this connection; only a personal-account app installation exists. The official repository still returns 404. The organizer must confirm team invitation and selected private repository access; 404 does not prove nonexistence.
- No Railway account connections, service provisioning, deployments, or changes to any other Supabase projects were made.

## 2026-11-14 — Synthetic AWS-reference count audit and correction

- Independently enumerated `backend/prisma/fixtures.mjs` for the Asha Nair reference-excluded AWS-required cohort. Five profile records (index 6 in each non-base team) have `skills: null`, not just the two AWS-team records. Therefore **21 ELIGIBLE / 5 NEEDS_REVIEW / 21 INELIGIBLE = 47**; the earlier demo script and unexecuted live browser expectation of 2 needing review were incorrect.
- Corrected the demo script and live browser assertion to 5 needing review and added an exact PostgreSQL-backed assertion to the existing service acceptance test. This makes the demo evidence consistent with the deterministic engine's missing-attribute semantics. The newly added expectation still needs a CI run; no live model or Supabase access is implied.

## 2026-11-14 — Windows local QA and private submission readiness audit

- Compared the root README and all three `.env.example` variants against `package.json`, `frontend/package.json`, `backend/prisma.config.ts`, Prisma seeding, `compose.yaml`, Dockerfile, auth gate and the live CI workflow. The existing README used Unix shorthand for copying environment files and did not distinguish Windows Next.js and backend Prisma environment loading. Added verified PowerShell steps for branch checkout, Corepack pnpm 10.15.1, distinct `frontend/.env.local` and `backend/.env` files, local Docker Postgres, migration, dev server and browser checks.
- Clarified that without Supabase and AI credentials only public marketing/auth page layouts, local health and 401/redirect security flows are testable. Full recruiter operations require a confirmed Supabase account with a matching `DEMO_OWNER_ID`; model-backed extraction/refinement additionally requires a configured Gemini/Groq provider. Public Supabase settings must never be confused with secret database/provider credentials.
- Clarified alternative `compose.yaml` root `.env` setup and the local database hostname difference (Windows `localhost:5432` versus Compose-internal `db:5432`). Warned about ports, rebuilds after `NEXT_PUBLIC_*` updates, and deleting volumes. Identified that `pnpm check` without `PARETO_TEST_DATABASE_URL` skips DB integration tests and signed-in Playwright skips without secure credentials.
- Reviewed the actual uploaded official hackathon guideline and PS1: assigned private repo requires complete source, updated README including team/problem/architecture/tech/run commands, dependencies, and standardized presentation deck before 15 November 17:00 IST. Confirmed previous Pareto draft PPTX follows the template's five-slide format but still contains team-lead/member placeholders; it is not committed to the official repository.
- Re-checked connected GitHub organization membership (none exposed for `ThunderKhan`) and organizer private repo (404). Connected Supabase lists no dedicated Pareto project; no project changed. Kept Railway entirely deferred.
- Documentation-only correction; existing last code release check [43579912569](https://github.com/ThunderKhan/pareto/actions/runs/43579912569) remains the applicable code test evidence. Skipping redundant CI for this docs-only change; no local Windows execution was asserted.

## 2026-11-14 — Dedicated Supabase database wiring, safe API surface

- The user created an independent Pareto Supabase project `nqglypstndrdvomqyzgj`. No Supabase connector connection was requested; no database credentials were collected or remote changes executed.
- Re-read the original Prisma migration `20261114000000_core`, schema, `backend/prisma.config.ts`, seeding script, server PrismaPg adapter and Next.js Supabase authentication. Added a separate additive security migration `20261114163000_supabase_api_security`: enable RLS on all five public Pareto tables and on Prisma's existing history table if present; revoke `anon`, `authenticated`, `service_role` grants only on these tables. The DDL conditionally checks whether these API roles exist so existing Docker Postgres CI continues working. No role/policy grants were added and no Prisma models, columns or indexes changed.
- Added a precise [dedicated Supabase setup guide](SUPABASE-DATABASE-SETUP.md) for IPv4-only Windows via shared **session** pooler port 5432, separate CLI `DIRECT_DATABASE_URL` and server `DATABASE_URL`, migration/deploy/status checks, verified Supabase Auth UUID seeding, expected synthetic row count, security verification and **sequential SQL Editor fallback** with Prisma `migrate resolve` only once a database connection becomes available.
- No application provider credentials were used, no unrelated Supabase projects accessed and no Railway resources consumed. New migration must be verified by CI before claiming its validity.
