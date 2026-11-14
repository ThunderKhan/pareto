# Pareto → dedicated Supabase PostgreSQL (no Railway)

**Project reference:** `nqglypstndrdvomqyzgj` · [Supabase dashboard](https://supabase.com/dashboard/project/nqglypstndrdvomqyzgj)

This setup uses **the existing Prisma schema and migrations**. This document contains no passwords, API keys, or real candidate data. The project account is separate and is intentionally **not connected to ChatGPT**.

## A. Connect from Windows without revealing credentials

1. In Supabase → **Connect**, copy the **Session pooler (5432)** URL if your Windows network is IPv4-only; otherwise the **Direct connection (5432)** can be used for migrations. Do not guess the pooler host. Use the **database password** set at project creation, not a publishable key. Percent-encode reserved password characters. SSL is required (append `?sslmode=require` if the copied URL has no parameters, or `&sslmode=require` if it already has parameters).
2. On a local checkout of `integration/release-20261114`, copy the ignored examples if not already present:
   ```powershell
   if (-not (Test-Path .\backend\.env)) { Copy-Item .\backend\.env.example .\backend\.env }
   if (-not (Test-Path .\frontend\.env.local)) { Copy-Item .\frontend\.env.example .\frontend\.env.local }
   corepack enable
   corepack prepare pnpm@10.15.1 --activate
   pnpm install --frozen-lockfile
   ```
3. Locally edit **`backend/.env`**; set `DATABASE_URL` to the copied Supabase **session** URL. Set `DIRECT_DATABASE_URL` to the direct (IPv6) URL if reachable, **otherwise the same session-pooler URL**. The existing `backend/prisma.config.ts` prefers `DIRECT_DATABASE_URL` for CLI migrations. Never leave the original `localhost:5432` value in place when intending to migrate Supabase.
4. Run from the **repository root**:
   ```powershell
   pnpm db:generate
   pnpm db:deploy
   pnpm --filter @pareto/backend exec prisma migrate status
   ```
   This applies `20261114000000_core` and `20261114163000_supabase_api_security` in order and records both in `public._prisma_migrations`. Unlike `migrate dev` or `db push`, `migrate deploy` is the correct command for the dedicated remote project. It does not reset data.
5. **Do not use the transaction pooler on port 6543 for migrations**. When IPv6/direct networking fails, switch `DIRECT_DATABASE_URL` to the **session pooler** host/port copied from the Supabase Connect screen. Prisma runs within a single backend CLI process, and session mode supports migrations.

## B. Verify the migrated schema in Supabase SQL Editor

Run these **read-only** queries in this exact dedicated project:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'Candidate', 'Skill', 'CandidateSkill', 'SearchSession', 'SearchRevision'
  )
order by table_name;

select migration_name, finished_at, rolled_back_at
from public."_prisma_migrations"
order by started_at;

select relname, relrowsecurity
from pg_class
where oid in (
  'public."Candidate"'::regclass,
  'public."Skill"'::regclass,
  'public."CandidateSkill"'::regclass,
  'public."SearchSession"'::regclass,
  'public."SearchRevision"'::regclass
)
order by relname;
```

Expect **five tables**, **two finished migrations with no rollback**, and **`relrowsecurity = true` for every table**. Prisma's server-side Postgres connection still works; no Data API RLS policies are deliberately added because Pareto reads these tables only from its server. Do **not** grant `anon`, `authenticated`, or `service_role` access to the candidate tables. For a second check in this Supabase project, run:

```sql
select
  has_table_privilege('anon', 'public."Candidate"', 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', 'public."Candidate"', 'SELECT') as authenticated_can_select,
  has_table_privilege('service_role', 'public."Candidate"', 'SELECT') as service_role_can_select;
```

All three should be `false`. These direct Data API roles are unrelated to the privileged PostgreSQL account used by the Prisma backend.

## C. Supabase Auth → confirmed demo recruiter

1. **Authentication → Providers → Email**: enable email/password. With email confirmation enabled, use a real accessible **demo** inbox and follow the confirmation link. Alternatively, create a known confirmed test user in **Authentication → Users → Add user** (manual account creation/confirmation controls vary); use a strong password stored privately.
2. **Authentication → URL Configuration**: set Site URL to `http://localhost:3000`; allow `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback`. Don't invent a hosted URL.
3. From **Authentication → Users**, copy the recruiter's exact **User UID (UUID)**. Supabase's `auth.users.id` is an identity UUID; Pareto stores it as the `ownerId` string and intentionally does not add a foreign key across schemas.
4. Locally edit **`backend/.env`**: set `DEMO_OWNER_ID` to the exact UUID. Make sure `DATABASE_URL` is still the intended **Pareto Supabase database**, then run:
   ```powershell
   pnpm db:seed
   ```
   The existing `backend/prisma/seed.mjs` upserts **48 deterministic synthetic candidates** for that owner. It is repeatable and uses no real applicants.
5. In Supabase SQL Editor, verify the owner and count (substitute the UUID locally):
   ```sql
   select "ownerId", count(*) as candidate_count
   from public."Candidate"
   group by "ownerId";
   ```
   Expect one UUID with **48** rows in a new clean project. Compare it with the User UID from Authentication → Users. Do not seed using an invented UUID or another project's UID.

## D. Next.js environment for the actual live UI

Open **Supabase → Connect / Project Settings → API Keys**, copy the **Project URL** and **publishable key** (not the PostgreSQL URL and not the `service_role`/secret API key). Set these locally in **`frontend/.env.local`**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://nqglypstndrdvomqyzgj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<paste the project's publishable key privately>
DATABASE_URL=<same Supabase session/direct PostgreSQL URL used for server runtime>
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
GROQ_MODEL=
```

The `DATABASE_URL` and model provider keys are **server-only**. Never prefix them with `NEXT_PUBLIC_`. Add at least one **verified provider key + model ID** to enable natural-language extraction and refinements. With Auth and seeded PostgreSQL alone, **manual confirmed criteria and reference-based matching** work without AI provider keys. Google OAuth can be configured separately in Supabase/Google Cloud; it is not necessary to test email/password first.

Run `pnpm dev` from repository root, restart it after editing env values, and open `http://localhost:3000/login`. Log in as the **confirmed** recruiter and open `/dashboard/search`. Search by reference name **Asha Nair** or enter confirmed criteria manually. An authenticated `GET /api/v1/search?q=Asha` should return the seeded owner-scoped profile; signed-out requests return HTTP 401.

**Do not start Docker Compose `db` while testing the remote Supabase database unless you specifically need a separate local testing environment**; it is unrelated to the remote project.

## E. SQL Editor fallback if Prisma cannot connect

**Use only on a fresh Pareto project after verifying those five tables do not exist.** This is a fallback, not an additional step after successful `pnpm db:deploy`.

1. In Supabase SQL Editor for `nqglypstndrdvomqyzgj`, run the exact original checked-in file `backend/prisma/migrations/20261114000000_core/migration.sql`.
2. Then run the exact new file `backend/prisma/migrations/20261114163000_supabase_api_security/migration.sql`.
3. **Manual SQL Editor execution does not record Prisma history.** Do not run `pnpm db:deploy` afterward until you have marked both migrations applied; otherwise Prisma may try to recreate existing tables. When a trusted Postgres connection becomes available, run:
   ```powershell
   pnpm --filter @pareto/backend exec prisma migrate resolve --applied 20261114000000_core
   pnpm --filter @pareto/backend exec prisma migrate resolve --applied 20261114163000_supabase_api_security
   pnpm --filter @pareto/backend exec prisma migrate status
   ```
   Use `resolve` **only after confirming** the exact SQL from each migration was applied successfully and the corresponding migration is not already recorded. This is a baseline, not a repair for a partial or unknown schema. If migrations are already recorded, do **not** mark them again.
4. If Windows cannot reach the project through either direct or session pooler, the seed script and Next.js Prisma backend also cannot connect. Fix the network/credentials rather than faking `_prisma_migrations` rows in SQL Editor. Avoid manually inserting migration tracking rows.

See Supabase's [Postgres connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres), [Data API security model](https://supabase.com/docs/guides/api/securing-your-api), and Prisma's [migrate deploy](https://www.prisma.io/docs/cli/v7/migrate/deploy) / [baseline](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining) documentation.
