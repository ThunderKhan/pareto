<div align="center">

<img src="frontend/public/brand/pareto-mark.svg" alt="Pareto mascot" width="112" height="112" />

# Pareto

### Recruitment intelligence, grounded in evidence.

**Describe the person you need. Review the requirements. Understand every match.**

A natural-language candidate search workspace that turns hiring intent into editable, explainable decisions — without letting an LLM invent candidates or decide eligibility.

[![CI](https://github.com/ThunderKhan/pareto/actions/workflows/ci.yml/badge.svg)](https://github.com/ThunderKhan/pareto/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-111111?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma_7-336791?logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Auth-Supabase-3FCF8E?logo=supabase&logoColor=white)
![Gemini + Groq](https://img.shields.io/badge/AI-Gemini_%2B_Groq-467BEB)

**Trustume AI Hackathon 2026 · Problem Statement 1 · Team `std::zero`**

[**Live demo**](https://try-pareto.vercel.app) · [**How it works**](#how-it-works) · [**Features**](#features) · [**Quick start**](#quick-start) · [**Architecture**](#architecture) · [**Documentation**](#documentation)

</div>

---

## Why Pareto?

Recruiters rarely think in Boolean filters. They think in hiring briefs:

> *Find senior Java developers in Hyderabad with 6–10 years of experience, Spring Boot experience, and a notice period under 30 days.*

Traditional keyword search loses the intent. Pure LLM ranking introduces a different problem: persuasive answers without reliable evidence.

**Pareto separates interpretation from decision-making.** An AI model helps translate the brief into structured requirements. A recruiter reviews those requirements. Only then does the backend query candidate records and explain which facts matched, failed, or were unavailable.

## How it works

```text
  Natural-language hiring brief
                │
                ▼
       Gemini / Groq gateway
     Interpret and validate intent
                │
                ▼
      Editable criteria review
        Recruiter confirms
                │
                ▼
     PostgreSQL candidate search
       Deterministic evaluation
                │
                ▼
    Eligible / Needs verification
            / Ineligible
                │
                ▼
      Evidence + near matches
       What-if / Pareto Frontier
                │
                ▼
       Follow-up refinement
         Saved search revision
```

**The confirmation boundary matters:** a generated draft never silently becomes a candidate search. The model interprets language; the application owns retrieval, eligibility, and the audit trail.

## Features

| Capability | What it does |
| --- | --- |
| **Natural-language search** | Extracts role, skills, experience, location, notice period and other constraints from a hiring brief. |
| **Review before search** | Presents an editable criteria draft and waits for explicit recruiter confirmation. |
| **Explainable matching** | Distinguishes **MATCH**, **FAIL** and **UNKNOWN** with candidate-specific evidence. Missing information is not treated as a pass. |
| **Conversational refinement** | Carries confirmed constraints forward, applies requested changes and saves revision history. |
| **Find candidates like me** | Starts a new similarity search from an existing candidate profile, excluding the reference candidate. |
| **Pareto Frontier + what-if analysis** | Explores trade-offs, near matches and how changed constraints affect a cohort without silently modifying the saved search. |
| **Recruiter workspace** | Protected candidate library, recent searches, profile settings and in-app notifications. |
| **Resume import and review** | PDF/DOCX/TXT upload, a durable processing queue, extracted-source evidence and human approve/correct/reject flows. **Requires separately configured private Storage and a running ingestion worker.** |

The initial demo database contains **48 deterministic, fictional candidate records**, not real applicants. Candidate counts depend on the exact criteria and seed data; they are never fabricated by the model.

## Architecture

Pareto uses a **pnpm monorepo** with one Next.js web application and a separate reusable TypeScript backend package. There is no second standalone HTTP backend server.

```text
Browser
  │
  ├── Supabase Auth (recruiter identity / session)
  │
  ▼
Next.js 16 · React 19 · App Router
  │
  ├── Server-rendered recruiter workspace
  ├── /api/v1/* authenticated API handlers
  │      │
  │      ▼
  │   @pareto/backend
  │      ├── Criteria parsing + validation (Zod)
  │      ├── Gemini → Groq fallback gateway
  │      ├── Deterministic search / evidence / frontier
  │      ├── Prisma 7 → PostgreSQL
  │      └── Optional durable resume ingestion queue
  │                     └── Separate worker + private Storage
  │
  └── Audit-friendly search revision history
```

### Production topology

- **[Vercel](https://try-pareto.vercel.app)** serves the Next.js frontend and Supabase authentication flow.
- **[Railway](https://pareto-production.up.railway.app)** runs the existing application/API service and remains an independent fallback URL.
- In Vercel's production configuration, authenticated `/api/v1/*` requests are forwarded through an **allowlisted server-side rewrite** to Railway. Railway performs AI calls, matching, and database writes.
- **Supabase PostgreSQL** holds recruiter-scoped candidate records, saved searches, revisions and operational data.

This split is intentional, not a claim that the entire backend runs as Vercel functions. See [the Vercel–Railway deployment guide](docs/VERCEL-RAILWAY-FRONTEND.md).

## Tech stack

| Layer | Technology |
| --- | --- |
| Interface | **Next.js 16**, **React 19**, TypeScript, Tailwind CSS 4, Phosphor Icons |
| Motion and visual system | Lenis, Paper Design shaders, custom Pareto SVG assets |
| Authentication | Supabase Auth, `@supabase/ssr`, protected server routes |
| Application API | Next.js Route Handlers, reusable `@pareto/backend` TypeScript package |
| Data | PostgreSQL, **Prisma 7**, Prisma PostgreSQL adapter |
| AI | Google **Gemini** (primary), **Groq** (fallback), Zod-validated outputs |
| Resume processing | PDF.js, Mammoth, private Supabase Storage, durable queue/worker |
| Quality | Vitest, Playwright, ESLint, TypeScript, GitHub Actions |
| Delivery | Docker, Railway, Vercel, pnpm workspaces |

## Quick start

**Requirements:** Node.js **22.18+**, pnpm **10.15.1**, Git, and a PostgreSQL database (Docker Compose is available for local development).

```powershell
git clone https://github.com/ThunderKhan/pareto.git
cd pareto

corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install --frozen-lockfile

Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env

# Optional: start the local PostgreSQL container
docker compose up -d db

# Configure the database connection in both local env files first
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Open **http://localhost:3000**.

### Enable the real recruiter demo

1. Configure the same **dedicated Pareto database** in `frontend/.env.local` and `backend/.env`. Apply the checked-in migrations with `pnpm db:deploy`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env.local`. Create a confirmed Supabase Auth test recruiter.
3. Set `DEMO_OWNER_ID` to that recruiter's actual Supabase UUID in `backend/.env`, then run `pnpm db:seed` to insert **48 synthetic candidates owned by that recruiter**.
4. For natural-language interpretation, set at least one **server-only provider key and supported model ID**: `GOOGLE_GENERATIVE_AI_API_KEY` + `GEMINI_MODEL`, and/or `GROQ_API_KEY` + `GROQ_MODEL`. Restart the dev server.

Manual criteria search and reference matching work without an AI provider, but still require real authentication and seeded PostgreSQL data. The import queue is **not** an automatically running worker: configure the private bucket, secret credentials and `pnpm ingest:worker` separately if testing ingestion.

See [Supabase database setup](docs/SUPABASE-DATABASE-SETUP.md), [release setup](docs/RELEASE-SETUP.md) and [resume ingestion](docs/RESUME-INGESTION.md) for the full runbooks.

## Try a search

Start with a brief such as:

> Find senior Java developers in Hyderabad with 6 to 10 years of experience. They must know Java and be able to join within 30 days.

1. **Extract criteria** and inspect the draft.
2. Edit any fields the model interpreted incorrectly.
3. **Confirm Search** to retrieve real rows from the demo database.
4. Expand match evidence; inspect **UNKNOWN** attributes and near matches.
5. Ask a follow-up such as *“Also require Spring Boot and AWS, but keep everything else.”*
6. Open a candidate profile to try **Find candidates like this one**.

The [live demonstration script](docs/DEMO-SCRIPT.md) contains repeatable scenarios and expected results for the unmodified seed.

## Trust by design

- **Human-in-the-loop:** extracted requirements need explicit confirmation before search.
- **Evidence over eloquence:** eligibility and counts come from validated candidate facts, not LLM-generated rankings.
- **Missing data stays unknown:** `UNKNOWN` is not silently converted into `MATCH`.
- **Owner isolation:** recruiters access their own candidates, searches and revisions.
- **Server-only credentials:** database passwords, AI API keys and Supabase private keys are never placed in `NEXT_PUBLIC_*`.
- **Failure transparency:** disabled AI providers, missing schema and paused ingestion have explicit failure/queued states instead of fabricated successes.

> **Scope note:** Private resume processing requires a configured worker and Storage. Offline ingestion benchmarks are not proof of production throughput. The seeded demo profiles are synthetic.

## Project structure

```text
pareto/
├── frontend/
│   ├── src/app/            # Pages, auth callbacks and API routes
│   ├── src/components/     # Recruiter workspace and marketing UI
│   ├── public/brand/       # Pareto SVG branding
│   └── tests/e2e/          # Browser and security tests
├── backend/
│   ├── src/ai/             # Gateway, tasks, prompts, validation
│   ├── src/search/         # Criteria, matching, frontier, retrieval
│   ├── src/ingestion/      # Parsing, queue, worker, human review
│   ├── prisma/             # Schema, migrations and synthetic seed
│   └── evals/              # Controlled quality/evaluation datasets
├── docs/                   # Product, architecture and runbooks
├── .github/workflows/      # CI
├── Dockerfile
├── compose.yaml
└── pnpm-workspace.yaml
```

## Verification

```powershell
pnpm check          # Lint, typecheck and backend tests
pnpm test:e2e       # Playwright browser suite (Chromium required)
pnpm build          # Production Next.js build
```

Some checks require dedicated disposable database or authenticated test credentials. A passing public CI run does **not** by itself verify live third-party AI calls or the complete signed-in hosted journey.

## Documentation

| Read | For |
| --- | --- |
| [Product requirements](docs/PRD.md) | Problem scope and organizer requirements |
| [Architecture](docs/ARCHITECTURE.md) | System boundaries and data flow |
| [Design system](docs/DESIGN.md) | UI language, interactions and visual decisions |
| [Demo script](docs/DEMO-SCRIPT.md) | Judge-facing end-to-end walkthrough |
| [Deployment](docs/VERCEL-RAILWAY-FRONTEND.md) | Vercel frontend + Railway API configuration |
| [Resume ingestion](docs/RESUME-INGESTION.md) | Private Storage, worker and human review |
| [AI evaluation](docs/AI-BYOK-USAGE-BENCHMARK.md) | Provider credentials, accounting and measured boundaries |
| [Documentation index](docs/README.md) | All technical references |

---

<div align="center">

**Built by team `std::zero` for Trustume AI Hackathon 2026.**

**Explain the match. Keep the human in control.**

[Live demo](https://try-pareto.vercel.app) · [Source](https://github.com/ThunderKhan/pareto)

</div>
