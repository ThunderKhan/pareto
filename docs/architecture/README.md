# Architecture index

**Canonical technical design:** [../ARCHITECTURE.md](../ARCHITECTURE.md).

The canonical document covers system context, deployment topology, horizontal architectural layers, vertical feature slices, data model, API and state contracts, Supabase/Prisma security boundaries, AI provider routing, Docker, CI/CD, testing and known implementation gaps.

This folder is reserved for **focused architecture decision records (ADRs)** and supplemental diagrams as implementation progresses. Do not confuse architectural intent with verified implementation.

- **ADR-001:** modular monolith, one deployable Next.js application and a separate internal TypeScript backend package (recorded in the canonical document).
- **ADR-002:** PostgreSQL/Prisma and deterministic evaluator.
- **ADR-003:** Gemini primary, Groq fallback; no OpenAI/xAI.
- **ADR-004:** explicit human search confirmation and append-only revisions.

When a decision materially changes, add a dated `adr-XXX-topic.md` explaining context, considered alternatives, choice, consequences and verification.
