# Architecture — initial direction

This is a structural note, **not** the finalized architecture specification.

- `frontend/`: Next.js App Router, React and thin HTTP route handlers.
- `backend/`: reusable server-side TypeScript modules. Imported by the Next.js app as the `@pareto/backend` workspace package.
- `backend/prisma/`: initial Prisma PostgreSQL schema and migration configuration.
- Docker Compose: application container and local development PostgreSQL.
- Future external services: Supabase Auth (Google OAuth), Supabase Storage, Gemini and Groq.
- No separate Fastify/FastAPI service, vector database, Redis or message queue at M0.

**Security invariants:** keep raw resumes private; validate inputs; never expose provider API keys client-side; enforce authorization independently from authentication.

Next: write and review the full technical specifications before implementing business workflows.
