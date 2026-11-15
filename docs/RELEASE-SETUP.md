# Pareto release runbook — 14 November 2026

**Hard freeze:** 15 November 2026 at **5:00 PM IST**. This is a release gate, not a claim of verified live deployment.

## Account ownership and current audit

- GitHub development repository `ThunderKhan/pareto` is **public**. Private applicant records and credentials must never be committed.
- The authenticated GitHub account is `ThunderKhan`. The connected app sees a personal `ThunderKhan` installation and reports **no organization memberships**; it cannot see `ai-hackathon-trustume`. Calls to `ai-hackathon-trustume/std-zero` return 404. This does **not** establish whether the organizer repository exists. Verify the team invitation and repository membership in the browser, then request selected-repository installation approval from the organizer.
- Connected Supabase currently lists four existing projects, none named Pareto. **Do not change another project's Auth or production database.** Create or explicitly authorize a dedicated Pareto demo project.
- **Railway credits are intentionally preserved. Do not install/connect its app, provision a database or project, or deploy until explicitly authorized by the user.** Local Docker, GitHub CI, a dedicated Supabase Auth project and disposable CI PostgreSQL are the only current release verification paths.

## 1. Supabase Auth — dedicated Pareto project

1. In the [Supabase dashboard](https://supabase.com/dashboard), create a project for **Pareto demo** (or explicitly select an authorized dedicated one); review any charges before provisioning. Obtain the **Project URL** and **publishable key** from Connect/API Keys. Only these two values are intended to reach the browser.
2. **Authentication → Providers → Email**: enable email/password sign-in. Decide whether email confirmation is enabled and make sure the demo recruiter has a **confirmed account**. Check email delivery; do not assume sign-up works if confirmation messages are blocked. Under **Authentication → Users**, locate the test recruiter and record its UUID privately.
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` for local testing. Do not configure a fictional production domain; update it after a deployment is explicitly authorized.
   - Redirect URLs **before cloud deployment**: `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback` (Playwright's actual base URL). Add a production callback only after an authorized host exists.
4. For **Google OAuth**, create a Google Cloud OAuth **Web application** after configuring the OAuth consent screen/test users:
   - Authorized JavaScript origins: `http://localhost:3000` (and `http://127.0.0.1:3000` if using that host). Add a production origin only after a real domain exists.
   - Authorized redirect URI **in Google Cloud**: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` (copy the exact callback shown on Supabase's Google provider page).
   - Save the **Google client ID and client secret only in Supabase → Authentication → Providers → Google**; enable the provider. Do **not** put the Google OAuth client secret in Pareto env or GitHub source.
   - Supabase's provider callback and Pareto's `/auth/callback` are two distinct URLs. Pareto performs the PKCE code exchange at its own callback.
5. Validate email/password login, logout, dashboard redirect, invalid credentials, Google consent/redirect, expired-session refresh and API 401 after sign-out. These tests have **not** run against a real provider yet. Password recovery is currently an explicit *unimplemented* page; do not claim it is supported.

Reference: https://supabase.com/docs/guides/auth/server-side/creating-a-client and https://supabase.com/docs/guides/auth/social-login/auth-google

## 2. Gemini and Groq — account keys stored only in secrets

- In Google AI Studio, create a Gemini API key; set server-side `GOOGLE_GENERATIVE_AI_API_KEY` and a supported `GEMINI_MODEL` for that account (currently documented stable example: `gemini-3.6-flash`; verify availability and JSON-mode support before the demo).
- In Groq Console, create a Groq API key; set server-side `GROQ_API_KEY` and an active `GROQ_MODEL` (currently documented JSON-mode example: `qwen/qwen3.8-27b`). Older `llama-3.3-70b-versatile` can be unavailable on free/developer accounts after its 2026 deprecation; do not silently choose it.
- Pareto uses **Gemini first, Groq second**. Each needs its key **and** model ID. At least one pair is required for extraction; two pairs are preferred for fallback. Raw model responses are Zod-validated. A 503 when both are unavailable is expected; never fabricate counts.
- These are hosted model APIs only. **Do not configure OpenAI or xAI Grok**.

References: https://ai.google.dev/gemini-api/docs/models and https://console.groq.com/docs/models and https://console.groq.com/docs/deprecations

## 2A. Verify with GitHub Actions without Railway

- Configure a **dedicated Pareto Supabase Auth** project, not an existing project's account. The CI PostgreSQL server is created as a disposable GitHub Actions service container; it is never connected to Railway.
- Go to the personal development repo's GitHub **Settings → Environments**, create `pareto-demo`, then add the secret and variable names from Section 4. The test user must have a confirmed email in Supabase and its exact UUID must match `PARETO_E2E_USER_ID`.
- In **GitHub → Actions**, select the workflow backed by `.github/workflows/ci.yml` (the default branch may display its older title **CI (manual)** rather than the integration branch's **Recruiter search CI**), then **Run workflow** and select branch `integration/release-20261114`. Confirm the selected run exposes the `recruiter-live` job. This is a manual job and fails on missing configuration; it tests **each configured Gemini/Groq model independently** with actual HTTP requests, then runs the signed-in recruiter browser test against seeded CI PostgreSQL.
- The normal `checks` job uses controlled AI responses, not live inference. When provider APIs are unavailable during the presentation, use manual criteria entry in the real protected workspace; clearly disclose that the NLP portion is offline and never replay recorded outputs as if live.
- A green manual CI does **not** confirm Google OAuth consent or third-party account permissions. Verify Google sign-in manually against the dedicated Supabase project and actual local callback before the presentation.
- Follow the exact repeatable [PS1 demo script](DEMO-SCRIPT.md); use only synthetic candidates.

## 3. Railway deployment — FROZEN until the user's explicit authorization

**Reference instructions only. Do not execute any steps in this section until the user separately authorizes Railway.**

1. Connect the Railway app in ChatGPT or grant access to a Railway project via the Railway dashboard. Use the **integration branch** (not main) until verification is complete. Railway service root: repository root; Dockerfile: root `Dockerfile`.
2. Provision a **dedicated PostgreSQL** service. Its Postgres connection string goes to runtime `DATABASE_URL` (server secret). Provide `DIRECT_DATABASE_URL` only for Prisma migration (can equal the direct DB URL). **Never set DATABASE_URL as NEXT_PUBLIC_**.
3. Configure Railway variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `DATABASE_URL`. The Dockerfile declares the two `NEXT_PUBLIC_*` values as **build-time ARGs**; change those values by rebuilding the image, not only restarting.
4. Apply checked-in migration **before** deployment: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm db:deploy` using the production database connection from a trusted runner, or use the Dockerfile `migrate` target. Migrations are **not** run by the runtime image.
5. After the Supabase demo recruiter's UUID is known, seed the Railway database using `DEMO_OWNER_ID=<Supabase-user-UUID> pnpm db:seed` in a trusted command environment. The seed generates 48 synthetic profiles scoped to this exact user.
6. Assign a Railway public domain, update Supabase's allowed redirects and Google Cloud Authorized Origins accordingly, deploy, then test `/api/health`, signed-out `/dashboard/search` redirect, signed-out `/api/v1/search` 401, and **the whole authenticated workflow with a real provider and DB**. `/api/health` is *liveness*, not evidence that DB/auth/AI work.
7. Record the actual Railway deployment URL, failure logs, smoke results and rollback reference in `docs/engineering-log.md`. A green Docker build alone does not prove deployment.

### Railway public proxy and browser-origin checks

Railway forwards public HTTPS requests to the Next.js container over an internal
HTTP address. Do **not** compare the browser Origin header exclusively to
`new URL(request.url).origin`: internal host/port may differ, causing legitimate
authenticated POST requests to return 403.

Pareto accepts the exact HTTPS origin from Railway's server-provided
`RAILWAY_PUBLIC_DOMAIN` (e.g. `https://pareto-production.up.railway.app`).
This is automatically set by Railway, so no custom variable or permissive CORS
configuration is needed for the generated Railway domain. For an independently
configured HTTPS custom domain, add the **server-only**
`PARETO_PUBLIC_ORIGIN=https://your-owned-domain` environment variable and
redeploy. Do not add untrusted domains or use a wildcard. Cross-site requests,
malformed origins and untrusted X-Forwarded-Host remain rejected.

After deployment verify an **authenticated POST**, not just `/api/ready`,
since readiness does not exercise the origin security guard.

Railway Docker ARG reference: https://docs.railway.com/builds/dockerfiles

## 4. Credentialed end-to-end run — GitHub Actions, no chat secrets

The existing `.github/workflows/ci.yml` has an optional **`recruiter-live`** job, activated by manually dispatching **Recruiter search CI** with branch **`integration/release-20261114`** after setting up an environment named **`pareto-demo`** under GitHub → Settings → Environments. Configure only secure GitHub Environment secrets and variables; no secret values belong in chat.

Environment **secrets**:
```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
PARETO_E2E_EMAIL
PARETO_E2E_PASSWORD
GOOGLE_GENERATIVE_AI_API_KEY    # at least one model provider pair
GROQ_API_KEY                    # second optional but recommended
```

Environment **variables** (non-credentials):
```text
PARETO_E2E_USER_ID              # actual authenticated test user's UUID; seed owner
GEMINI_MODEL                    # if Gemini is configured
GROQ_MODEL                      # if Groq is configured
```

The manual `recruiter-live` job independently checks every configured Gemini and Groq provider and provisions **disposable PostgreSQL 17**, migrates and seeds it for exactly `PARETO_E2E_USER_ID`, builds the release against the configured Supabase project, and runs **`frontend/tests/e2e/recruiter.spec.ts` against actual Supabase + Gemini/Groq**. A preflight fails if identity/password/provider configuration is absent. Unlike the regular CI, **the live test must not silently skip**. Do not upload logs/traces containing secrets.

Automatic pull-request CI runs the separate `checks` job; the credentialed `recruiter-live` job is limited to a manual dispatch. Ordinary integration CI still exercises the same database/search services with *controlled model responses* and signed-out/public browser smoke tests; it cannot prove real OAuth or LLM inference.

## 5. Organizer private repository

1. Ensure the GitHub identity accepting the team invitation has at least **Write** permission to `ai-hackathon-trustume/std-zero` (or a team with Write/Maintain/Admin access).
2. An organization owner or repository admin (subject to organization policy) must install/approve the **GitHub app used by ChatGPT** on the `ai-hackathon-trustume` organization **with selected-repository access to `std-zero`**. Minimum repository permissions for this workflow: **Metadata (read), Contents (read/write)**; add **Pull Requests (read/write)** if reviewing changes by PR and **Actions (read)** for CI checks. Organization policies may require owner approval.
3. Check repository visibility and starter files/history *before* copying anything. Create a safe integration branch and PR against its current default branch. **Do not force-push, replace Git history, or delete organizer files.**
4. Verify that the official repository contains integrated source, lockfile, README, Dockerfile or dependency manifests, and final presentation deck **before 15 November 2026 5:00 PM IST**.

GitHub App installation reference: https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party

## Release gate / current limitations

- Do not merge PR #3 or label the demo live-verified until integrated CI passes **and** the real signed-in journey has run against actual Supabase and model-provider credentials. **Railway deployment is separately deferred by the user even after these gates pass.**
- No Railway URL is confirmed. No organizer write access is confirmed. Those actions depend on account permissions outside the current connection.
- Optional diagnostics, simulators and resume ingestion remain deferred until the release blockers are resolved.
