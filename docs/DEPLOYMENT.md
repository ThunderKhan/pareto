# Deploy Pareto to Railway

1. Provision PostgreSQL. Use a dedicated database, or a schema that the Supabase Data API does not expose. Prisma access is server-side and every candidate and search query is scoped to the authenticated owner.
2. Create a Supabase Auth project. Enable email/password, optionally configure Google, and allow `https://<pareto-host>/auth/callback` and `http://localhost:3000/auth/callback`. For Google, configure the Supabase provider callback URL in the Google OAuth client.
3. Set the configuration below. Run `pnpm install --frozen-lockfile`, `pnpm db:generate`, and `pnpm db:deploy` from a machine that can reach PostgreSQL. Alternatively, build the `migrate` Docker target and run its default command with the migration credentials. The standalone runtime image excludes Prisma CLI.
4. Set the Railway service root to the repository root and use the root Dockerfile. Configure `/api/health` as the HTTP liveness check. Run migrations before activating a new image. A passing liveness check confirms the app process responds. Verify PostgreSQL with a signed-in search after rollout.
5. Create or sign in as a demo recruiter, copy that user's Supabase UUID from the Auth dashboard, and run `pnpm db:seed` with `DEMO_OWNER_ID` set to that UUID. Seed only synthetic demo data. Sign in as that same recruiter for the walkthrough.

| Variable | Where it is needed |
| --- | --- |
| `DATABASE_URL` | Server only. Application PostgreSQL connection. |
| `DIRECT_DATABASE_URL` | Optional migration connection. Defaults to `DATABASE_URL`. Use a connection that supports migrations. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public values required both at image build and runtime. Rebuild when they change. |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODEL` | Server only. Set both to enable Gemini. |
| `GROQ_API_KEY`, `GROQ_MODEL` | Server only. Set both to enable Groq fallback. Verify model access and JSON output with the configured account. |
| `DEMO_OWNER_ID` | Seed command only. Supabase demo recruiter UUID. |

Keep database and model credentials in Railway variables. Give the application database role only the grants it needs. Separate migration privileges from runtime privileges. If PostgreSQL shares a Supabase project, restrict application tables from the Data API and supply a connection that selects the intended schema.

The application supports manual criteria and reference search when model keys are unavailable. Natural-language extraction and refinement require a configured provider. Browser auth requires the public Supabase settings. Private resume uploads are outside this release slice.

Reference criteria contribute one point each when matched. They are preferences by default. Required rules determine eligibility independently. The reference candidate is excluded. Confirmed criteria and revision history persist. Results are recomputed from current owner-scoped data when opened.
