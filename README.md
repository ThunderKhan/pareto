# Pareto

**Pareto** is a recruitment intelligence prototype for Trustume AI Hackathon 2026.

> Status: **M0 foundation scaffold**. Candidate search, document ingestion, authentication, and the LLM integration are **not yet implemented**.

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
pnpm install
cp .env.example frontend/.env.local
cp backend/.env.example backend/.env
pnpm dev
```

Open http://localhost:3000 and check http://localhost:3000/api/health.

Use `pnpm check` for lint, types, and unit tests. The first `pnpm install` creates the lockfile; commit `pnpm-lock.yaml` before enforcing frozen installs in CI.

## Docker

```bash
docker compose up --build
```

This runs the app on :3000 and a local development PostgreSQL service on :5432. No production secrets are needed for the starter page.

## Tooling and future integrations

Next.js, TypeScript, Tailwind v4, shadcn/ui configuration, Phosphor Icons, PostgreSQL, Prisma, Supabase Auth (including future Google OAuth), private Supabase Storage, Zod, Gemini and Groq only, Vitest, Playwright (browser smoke-test scaffold), Pino, Docker, Railway, and GitHub Actions.

Only the foundation is initialized. Configuring OAuth, external providers, uploads, application database models, and full E2E tests requires the next implementation milestones.

See `docs/README.md`. **Never commit API keys, actual resumes, or private applicant data.**

## Hackathon submission

This personal development repository is separate from the organizer-assigned `ai-hackathon-trustume/std-zero` repository. Final tested milestones and presentation materials must reach the assigned repository before the official deadline.
