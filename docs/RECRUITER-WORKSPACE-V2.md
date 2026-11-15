# Pareto Recruiter Workspace V2

## What changed

The dashboard, search, candidates, and profile pages now share Pareto's existing ivory, navy, blue, and serif identity.

- Dashboard: real navigation with collapse, mobile drawer, active route, account menu, and sign out.
- Profile: first and last name editing, read-only email, password update using the authenticated Supabase session.
- Candidate library: name lookup and detailed, account-scoped candidate profiles with a link to similarity search.
- Search: bottom composer, editable criteria, explicit confirmation, ranked results, evidence, and conversational refinements.
- History: most recent confirmed search sessions read from PostgreSQL for the authenticated recruiter.

## User component references

The provided dashboard component informed the grouped sidebar, account entry, and responsive layout. Mock workspace switching, billing, fake activity counts, and empty actions were deliberately not carried over.

The provided MorphOrb component inspired the dotted processing orb. Its original demo relied on an external stylesheet not included with the paste, artificial minimum waiting time, and single-answer presentation. Pareto uses a smaller, reduced-motion-safe orb while a real API call is pending; no synthetic wait or fake provider status is introduced.

## Preserved contracts

The backend is still responsible for typed criteria, deterministic candidate evaluation, owner isolation, and confirmed revision persistence. The frontend does not invent candidates, matching scores, or search-session history. A model proposes criteria; only the recruiter's explicit confirmation runs a candidate search.

## Scope boundaries

The layout is conversational but is not a fully persisted chat transcript. Stored criteria and confirmed revisions can be reopened. Document uploads and bulk imports have not been implemented; they need separate ingestion, parsing, and candidate-data safeguards. A dedicated Supabase account and working hosted model provider are still required for a complete live demo.

## QA

- GitHub CI tests lint, TypeScript, backend integration cases, protected routes, public UI, production build, and Docker smoke checks.
- The optional credentialed recruiter browser flow and live Gemini/Groq request checks require correctly configured third-party credentials. Standard CI alone does not prove these external flows.
- Human review should verify the authenticated UI at desktop and mobile widths, keyboard traversal and reduced motion.
