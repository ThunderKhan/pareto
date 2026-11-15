# Optional Vercel UI + Railway API deployment (production bridge)

This project is **not** a static frontend. The Next.js app also contains
Supabase Auth server callbacks and authenticated API route handlers. The
optional split below deliberately proxies **only** `/api/v1/*` to the
already-verified Railway backend, while keeping frontend pages and Supabase
login/callback requests on Vercel.

## Architecture

Browser --> Vercel Next.js UI + Supabase SSR Auth
   --> `/api/v1/*` **beforeFiles rewrite** --> Railway's existing Next.js API
   --> PostgreSQL / Gemini / Groq

This is a deployment bridge, not two independently built backend APIs.
Railway remains the canonical writer. Do not deploy a second ingestion
worker on Vercel. Railway's ingestion worker is separately supervised and
currently optional/disabled for the hackathon.

## Vercel project

- Source: `ThunderKhan/pareto` / `main`
- Project: `try-pareto`
- Framework: Next.js
- Root Directory: `frontend`
- Include source files outside root: **on** (backend workspace sources)
- Node.js: `22.x`
- Build Command: `pnpm --filter @pareto/backend db:generate && pnpm build`
- Install: the repository's pinned pnpm 10.15.1 workspace lockfile

### Vercel production variables

Add these **directly to Vercel**, not to GitHub or chat:
- `NEXT_PUBLIC_SUPABASE_URL`: same exact Supabase project URL as Railway (public).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: same publishable key as Railway (public).
- `PARETO_API_ORIGIN=https://pareto-production.up.railway.app`: exact reviewed
  backend origin; additional paths, custom ports, or HTTP are rejected.
- `DATABASE_URL`: same Pareto Postgres session pooler connection used by Railway.
  Only needed for server-rendered pages that still query PostgreSQL directly
  (e.g. the overview's recent searches). This is a secret. Make sure the
  Vercel runtime can reach this pooler; it is **not** needed for proxied API calls.
- If enabling Vercel's local (nonproxied) AI endpoints in future, also set
  server-side provider keys; not required for this proxy configuration.

Vercel builds Next.js with the public auth environment. Redeploy after adding
variables. Preview URLs are not a substitute for a stable production URL:
configure stable allowed origins for authenticated browser requests.

### Railway production variable

Set on the **existing Railway web service**:

```
PARETO_PUBLIC_ORIGIN=https://<EXACT-STABLE-VERCEL-PRODUCTION-HOST>
```

This permits only that HTTPS origin in the existing CSRF guard for proxied
browser POSTs. Do not set `*` or trust incoming X-Forwarded-Host headers.
Railway's own public origin continues to work. Apply/redeploy staged changes
and verify the deployment is healthy.

### Supabase Auth

In Supabase Authentication -> URL Configuration add the **exact Vercel
production** `https://<hostname>/auth/callback` redirect URL. If
Google OAuth is used, add the Vercel site's allowed JavaScript origin in
Google Cloud configuration and preserve existing Supabase callback settings.
Do not replace the Railway redirect entries.

## Acceptance checks

1. Both `https://<vercel-site>/` and the unchanged Railway URL load.
2. Vercel login works with the existing demo recruiter's Supabase account.
3. Vercel `/api/v1/search` GET (authenticated) shows the same candidates
   as Railway, and unauthenticated GET remains 401.
4. From Vercel, submit natural-language criteria; see the review panel,
   confirm, and see persisted results and search history.
5. Refresh, refine and check Frontier. Repeat one search on Railway to ensure
   the existing production backup was not impacted.
6. Cross-site browser POSTs still return 403.

Do not call the Vercel URL "ready" until successful build, public access,
auth, and authenticated end-to-end search are checked.
