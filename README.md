# Pareto

**Pareto** is the std::zero recruitment intelligence prototype for Trustume AI Hackathon 2026, Problem Statement 1 — AI-Powered Natural Language Candidate Search & Find Candidates Like Me.

> The protected workspace supports confirmed PostgreSQL search, match evidence, conversational refinement, and reference-based search. Live AI and sign-in require configured provider accounts.

## Recruiter workspace on `main`

The protected recruiter experience now includes:

- `/dashboard`: Pareto-branded workspace overview and collapsible/mobile sidebar.
- `/dashboard/search`: conversational composer, AI-extracted criteria, mandatory human confirmation, explainable candidate results, and follow-up refinement.
- `/dashboard/candidates`: search and inspect recruiter-owned candidate records, then start reference-based similarity search.
- `/dashboard/profile`: edit first and last names via Supabase, view account email, and update password.
- `/dashboard/search` confirmed results: on-demand Search health, editable What-if simulator, and per-candidate Near-match explanations. All three use deterministic owner-scoped backend analyses and are preview-only: only Confirm Search persists criteria.
- Recent confirmed search sessions are retrieved from PostgreSQL with owner checks. The orb animation reflects real request activity and never adds artificial thinking delays.

The supplied sidebar and morphing-orb component concepts were adapted to Pareto's existing typography, colors, Phosphor icons, and API flows. Full chat transcripts, PDF ingestion, bulk import, and hosted deployment are **not** implemented by this UI work.

**AI engineering implementation roadmap:** [End-to-end AI Engineering Plan](docs/AI-ENGINEERING-IMPLEMENTATION-PLAN.md) — task modules, versioned prompts, prompt-injection security, provider budgets, evidence checks, evals and demo-release gates. This is a **planned workstream**, not a completed runtime system.

## Workspace

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS, API route handlers and UI.
- `backend/`: reusable server-side TypeScript modules, validation, logging, Prisma schema, and tests.
- `docs/`: project references, architecture notes, and engineering log.

We intentionally use **one deployable Next.js application**. The `frontend/src/app/api` routes invoke services in the `@pareto/backend` workspace package. This maintains the requested frontend/backend separation without introducing another web server.

## Architecture and confirmation boundary

Pareto is one Next.js application with a separate reusable TypeScript backend package. The recruiter signs in with **Supabase Auth**; server-side requests resolve the authenticated user and scope Prisma candidate and search queries to that user's ID in **PostgreSQL**. Gemini (primary) and Groq (fallback) can translate a hiring brief into validated, **editable** criteria, but do not generate candidate records or scores. The recruiter explicitly confirms a draft before the deterministic matcher retrieves and ranks real seeded candidate rows and explains each MATCH, FAIL, and UNKNOWN. Confirmed sessions persist revisions for conversational follow-ups, and reference-profile searches rank other candidates by documented attributes.

### Private resume imports and human review

The recruiter workspace now has **Candidates → Import resumes** (`/dashboard/candidates/import`). Authenticated users can upload PDF (4 MiB), DOCX (2 MiB) or TXT (512 KiB), follow durable queue stages, schedule batches, inspect exact source evidence and processing attempts, and explicitly approve, correct or reject extracted profiles with versioned audit history. This is an evidence-and-review UI, **not** an assurance of AI accuracy or a live configured Storage/provider integration.

For a dedicated Pareto Supabase project (never an unrelated VSPH/IET database): configure a **private** `pareto-private-resumes` Storage bucket and server-only credentials per [resume ingestion runbook](docs/RESUME-INGESTION.md); apply the repo's versioned migrations; configure AI model keys if you want extraction; run the web server **and** an independently supervised background worker:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm --filter @pareto/backend storage:setup  # only after verifying the correct private Supabase project
pnpm --filter @pareto/backend ingest:worker  # separate long-running process (not a web request)
```

A stopped worker leaves jobs truthfully `QUEUED`; absence of model credentials yields review/failure states, never fabricated candidate completions. See [durable queue runbook](docs/RESUME-BATCH-PROCESSING.md) and [review/quality audit](docs/INGESTION-QUALITY-AUDIT.md). The authenticated full flow requires dedicated real test credentials; CI's signed-out browser checks cannot prove production readiness.

**Demo data:** 48 deterministic synthetic candidate records; no applicant/resume uploads. Only the public marketing preview is illustrative client-side sample data, clearly labelled as such. Missing credentials never unlock the protected workspace.
## Requirements

- Node.js **22.18+**
- pnpm **10.x** (Corepack recommended)
- Docker + Docker Compose (optional for local Postgres)

## Windows / PowerShell local setup (recommended)

Use **PowerShell** in the repository root. Install Node.js **22.18+**, Docker Desktop with its Linux/WSL2 engine running, and Git first. Docker Compose provides only local PostgreSQL in this route; the Next.js app runs on Windows. Ensure TCP ports **5432** (PostgreSQL) and **3000** (Next.js) are free.

```powershell
git clone https://github.com/ThunderKhan/pareto.git
cd pareto
git switch main
git pull --ff-only origin main
node --version
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm --version
pnpm install --frozen-lockfile
if (-not (Test-Path .\frontend\.env.local)) { Copy-Item .\frontend\.env.example .\frontend\.env.local }
if (-not (Test-Path .\backend\.env)) { Copy-Item .\backend\.env.example .\backend\.env }
docker compose up -d db
docker compose ps
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Visit **http://localhost:3000**. Keep the `pnpm dev` terminal running. If you already have a local checkout, preserve uncommitted changes before running `git switch main` and `git pull --ff-only origin main`.

### Two separate local environment files

| File | Read by | What belongs there |
| --- | --- | --- |
| `frontend/.env.local` | Next.js web server and browser build | The existing **local** `DATABASE_URL`; later, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and optional **server-only** Gemini/Groq key + model pairs. |
| `backend/.env` | Prisma migration and seed commands | The same local `DATABASE_URL`; optional `DIRECT_DATABASE_URL`; after creating a confirmed Supabase demo recruiter, `DEMO_OWNER_ID` equal to their exact UUID. |
| Root `.env` | Full-app **Docker Compose** only | Copy `.env.example` when choosing the alternative full-container app. It is **not needed** for the PowerShell/dev-server route above. |

**Important:** The Compose database is accessible from Windows as `localhost:5432`, while the Compose app connects through `db:5432` internally. Do **not** replace the local Windows `DATABASE_URL` host with `db`. Do not set a Supabase URL as the Prisma database URL. Public `NEXT_PUBLIC_*` values are shipped to browsers; never place database passwords, Supabase secret/service-role keys or AI API keys under `NEXT_PUBLIC_*`. The checked-in examples contain no working credentials.

### What you can inspect without any live accounts

The homepage, scrolling marketing preview, signup/login **layouts**, and `GET /api/health` work with empty Supabase and AI settings. Authentication controls explain they are unavailable. `/dashboard` and `/dashboard/search` redirect to login; candidate APIs return **401**. PostgreSQL can be migrated without an Auth account, but **do not expect a working recruiter search** until a real Supabase user exists and their UUID owns the seeded records.

To unlock the full local demo: create a **dedicated** Pareto Supabase project, enable email/password login, verify a test recruiter's email and copy their UUID from Supabase Auth; add the public Supabase URL/key to `frontend/.env.local`. Add at least one verified Gemini/Groq **key + model** pair there for natural-language extraction/refinement. Set `DEMO_OWNER_ID` to the recruiter's UUID in `backend/.env`, then (from repo root) run `pnpm db:seed` to populate 48 **synthetic** candidates scoped to that user. Restart `pnpm dev` after editing environment files. See the [dedicated Supabase PostgreSQL setup and SQL Editor fallback](docs/SUPABASE-DATABASE-SETUP.md), [secure live setup](docs/RELEASE-SETUP.md), and the [demo script](docs/DEMO-SCRIPT.md). Manual criteria and reference searches need Auth + seeded PostgreSQL but no model key.

### Pulling an update that adds account settings and notifications

The 15 November feedback introduced PostgreSQL tables for recruiter settings, workspace memberships and in-app notifications. **`pnpm install`, `pnpm db:generate`, and `pnpm dev` do not apply migrations.** If an existing local checkout can load search history but account/notifications return a schema error, update the **correct Pareto database** before reopening those pages.

```powershell
# Stop the running Next.js dev server (Ctrl+C) and use the repo root.
# First check backend/.env and frontend/.env.local target the SAME Pareto database.
# Do not run this against IET Grid, VSPH, or any unrelated database.
docker compose up -d db   # Only if you use the local Compose PostgreSQL service
pnpm db:generate
pnpm db:deploy
pnpm dev
```

A missing table/column now returns a descriptive 503 (`SCHEMA_NOT_READY`) rather than an unexplained 500. If the schema has already been deployed and the error continues, check that the server and Prisma migration commands use the same database connection.

### Focused verification and troubleshooting

```powershell
# In a second PowerShell terminal, from the repository root:
docker compose ps
docker compose exec db pg_isready -U pareto -d pareto
pnpm check
pnpm --filter @pareto/frontend exec playwright install chromium
pnpm test:e2e
```

The browser suite now builds and starts the **production** app for local runs, just as CI does. **Stop `pnpm dev` first** so port 3000 is free; otherwise Playwright will refuse to reuse the development server. This prevents cross-origin HMR failures from being mistaken for broken click handlers. For manual UI exploration, keep using `pnpm dev` and `http://localhost:3000`; `127.0.0.1` is permitted as an additional development origin.

`pnpm check` without `PARETO_TEST_DATABASE_URL` skips the backend PostgreSQL integration tests (the release CI covers those with disposable data). Without `PARETO_E2E_EMAIL`/`PARETO_E2E_PASSWORD`, Playwright intentionally skips the authenticated journey; ordinary public and signed-out browser tests still run. Never point integration tests at another project's database. If Docker says port 5432 is already allocated, stop the conflicting local PostgreSQL instance before trying again. If `pnpm dev` says port 3000 is occupied, close the other Next.js/Compose web process instead of silently switching demo origins.

### Alternative: entire app through local Docker Compose

Do this **instead** of the `pnpm dev` web process, not concurrently:

```powershell
if (-not (Test-Path .\.env)) { Copy-Item .\.env.example .\.env }
docker compose up --build
# After a real demo recruiter exists: set DEMO_OWNER_ID in root .env, then run
# docker compose run --rm migrate pnpm db:seed
```

Compose creates a local Postgres service and applies migrations before launching the web app. You must **rebuild** the web image after editing build-time `NEXT_PUBLIC_*` settings. Do not run `docker compose down -v` unless you intentionally want to delete local demo data.

**Railway is deferred by explicit decision.** Keep the existing [deployment procedure](docs/DEPLOYMENT.md) for later; do not connect, provision, or deploy until separately authorized. The integration remains in [draft PR #3](https://github.com/ThunderKhan/pareto/pull/3), not merged to `main`.
## Stack

Next.js App Router, TypeScript, Tailwind CSS, Phosphor Icons, PostgreSQL, Prisma 7, Supabase Auth, Gemini and Groq, Zod, Pino, Vitest, Playwright, Docker and pnpm.

See [`docs/SCROLLCRAFT.md`](docs/SCROLLCRAFT.md) for the source skill, creative brief, motion score and verification plan. See [`docs/MVP.md`](docs/MVP.md) for product scope, [`docs/PRD.md`](docs/PRD.md) for organizer-priority requirements, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the technical system design, [`docs/DESIGN.md`](docs/DESIGN.md) for the OpenTag-derived UI system and landing/auth/dashboard journey, [`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md) for the build and release sequence, and [`docs/README.md`](docs/README.md) for the documentation index. **Never commit API keys, actual resumes, or private applicant data.**

## Hackathon submission

This personal development repository is separate from the organizer-assigned `ai-hackathon-trustume/std-zero` repository. Final tested milestones and presentation materials must reach the assigned repository before the official deadline.
