# Pareto

**Pareto** is the std::zero recruitment intelligence prototype for Trustume AI Hackathon 2026, Problem Statement 1 — AI-Powered Natural Language Candidate Search & Find Candidates Like Me.

> The protected workspace supports confirmed PostgreSQL search, match evidence, conversational refinement, and reference-based search. Live AI and sign-in require configured provider accounts.

## Workspace

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS, API route handlers and UI.
- `backend/`: reusable server-side TypeScript modules, validation, logging, Prisma schema, and tests.
- `docs/`: project references, architecture notes, and engineering log.

We intentionally use **one deployable Next.js application**. The `frontend/src/app/api` routes invoke services in the `@pareto/backend` workspace package. This maintains the requested frontend/backend separation without introducing another web server.

## Requirements

- Node.js **22.18+**
- pnpm **10.x** (Corepack recommended)
- Docker + Docker Compose (optional for local Postgres)

## Run locally

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example frontend/.env.local
cp backend/.env.example backend/.env
docker compose up -d db
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Open http://localhost:3000. Configure the Supabase values in `frontend/.env.local`, sign in, and set `DEMO_OWNER_ID` in `backend/.env` to the synthetic workspace recruiter's Supabase UUID. Then run `pnpm db:seed`. The seed is reproducible and scoped to that account. Use `pnpm check`, `pnpm build`, and `pnpm test:e2e` to verify. Install Playwright's Chromium with `pnpm --filter @pareto/frontend exec playwright install chromium`.

Set `PARETO_TEST_DATABASE_URL` to a migrated, disposable test database seeded for `11111111-1111-4111-8111-111111111111` to include PostgreSQL integration tests in `pnpm check`. Set `PARETO_E2E_EMAIL` and `PARETO_E2E_PASSWORD` plus the standard Supabase/database/AI configuration to exercise the signed-in Playwright journey.

## Docker and Railway

Copy `.env.example` to the repository-root `.env`, fill in the public Supabase variables and server-side model settings, then run `docker compose up --build`. Compose starts PostgreSQL, applies the checked-in migration and starts the app. Set `DEMO_OWNER_ID` in that root file and run `docker compose run --rm migrate pnpm db:seed` to seed the test recruiter's workspace.

See [Railway deployment and environment variables](docs/DEPLOYMENT.md).

**Release integration (Nov 14):** Both feature branches are combined without rewriting history on `integration/release-20261114` ([draft PR #3](https://github.com/ThunderKhan/pareto/pull/3)). See [live credential setup, gated acceptance, Railway and organizer repository runbook](docs/RELEASE-SETUP.md). CI verifies the production Docker runtime and unsigned 401; real Supabase/Gemini/Groq login, Railway URL, and organizer submission are **not yet verified**.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Phosphor Icons, PostgreSQL, Prisma 7, Supabase Auth, Gemini and Groq, Zod, Pino, Vitest, Playwright, Docker and pnpm.

See [`docs/SCROLLCRAFT.md`](docs/SCROLLCRAFT.md) for the source skill, creative brief, motion score and verification plan. See [`docs/MVP.md`](docs/MVP.md) for product scope, [`docs/PRD.md`](docs/PRD.md) for organizer-priority requirements, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the technical system design, [`docs/DESIGN.md`](docs/DESIGN.md) for the OpenTag-derived UI system and landing/auth/dashboard journey, [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) for the build and release sequence, and [`docs/README.md`](docs/README.md) for the documentation index. **Never commit API keys, actual resumes, or private applicant data.**

## Hackathon submission

This personal development repository is separate from the organizer-assigned `ai-hackathon-trustume/std-zero` repository. Final tested milestones and presentation materials must reach the assigned repository before the official deadline.
