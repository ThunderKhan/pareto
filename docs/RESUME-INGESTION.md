# Private Resume Ingestion — Backend Contract and Deployment Handoff

**Branch:** feat/private-resume-ingestion · **Priority:** P1-PRODUCT · **PRD:** DATA-FR-01/02  
**Scope:** Secure PDF/DOCX/TXT ingestion, model-assisted structured candidate profiles, evidence and statuses. **No frontend UI exists on this branch.**

## Architecture and design

A recruiter uploads **one** document per API call. The server authenticates through Supabase Auth, strictly limits the complete multipart body, validates file extension, declared MIME, file signatures, size and DOCX archive expansion, computes SHA-256 and creates an owner-scoped document record. The original is written into **private Supabase Storage** under a server-chosen key, never a client-selected path.

The server locally extracts text: Mozilla PDF.js for text-based PDFs (first 24 pages), Mammoth for DOCX, and strict UTF-8 for TXT. Extraction is capped at 24,000 characters and PDF text retains actual page numbers. Scanned/empty, encrypted or damaged documents do not silently yield a made-up profile. OCR and legacy DOC are not supported.

Gemini (primary) and Groq (fallback) receive only the first 16,000 characters in a bounded request with fixed JSON instructions and low-temperature generation. Returned candidate attributes are schema-validated with Zod; every non-null fact must have a *verbatim excerpt* present in the extracted text. Skill evidence also checks term boundaries (Java ≠ JavaScript). Missing or unsupported facts become `null` or remain unknown, never a demonstrated FAIL. Provenance is persisted in `ResumeEvidence` with `fieldKey`, `quote` and parsed PDF page number, or null for DOCX/TXT. A candidate is persisted only if its name has grounded evidence.

**Security limits:** proof of quote presence is not proof that the model interpreted employment dates or negation correctly; such details require human review. Raw resumes and extracted text are untrusted. Do not render them as HTML or obey any embedded instructions. The 1,000-profile search limit remains in force.

## Database and storage

New Prisma models: `ResumeDocument` and `ResumeEvidence`, plus optional `Candidate.sourceDocumentId`. Migration `20261115120000_private_resume_ingestion` adds enums, unique `(ownerId,sha256)` for duplicate detection, owner/date indexes, and enforces RLS with **no direct Data API grants**. Both new tables are server-only via Prisma, using owner checks on every read/write. Search uses the resulting `Candidate` and `CandidateSkill` records without reopening the PDF.

The Storage bucket `pareto-private-resumes` is created through the Supabase Storage SDK, **not** PostgreSQL migrations. It MUST remain `public: false`. The server refuses to serve or upload when the bucket is missing or public. Original bytes are stored under `<authenticated-owner-uuid>/<server-generated-document-uuid>.<ext>`. Signed read URLs last **60 seconds**, returned only after an owner-scoped server-side check.

### Private one-time setup (user executes on their own Supabase account)

1. Pull the reviewed branch and install from the committed frozen lockfile.
2. In **backend/.env**, set `DATABASE_URL`, `DIRECT_DATABASE_URL` as in the established Supabase setup; add `SUPABASE_URL=https://<project>.supabase.co` and **server-only** `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`). Do **not** put secrets in `NEXT_PUBLIC_*` variables or tracked files.
3. Run `pnpm db:generate` and `pnpm db:deploy` from repo root to apply the new migration after existing migrations. Verify `pnpm --filter @pareto/backend exec prisma migrate status`.
4. Run `pnpm --filter @pareto/backend storage:setup` **only** after selecting the correct project/account. It creates or verifies a private bucket; never opens it to anonymous access.
5. In **frontend/.env.local**, set `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the same server-only `SUPABASE_URL` and **server-only** Storage secret, and at least one Gemini/Groq key + model pair. Restart `pnpm dev`.
6. Confirm the bucket is private in the project's Storage settings. Never share service/secret keys or candidate resume contents.

**The assistant does not connect to or change the user's dedicated Supabase project.** A green disposable-PostgreSQL test does not establish live Supabase Storage compatibility. Do not use Railway until separately authorized.

## HTTP APIs

All routes are in the same Next.js server, use authenticated Supabase recruiter sessions, return `Cache-Control: private, no-store`, and never expose raw text or original Storage paths.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/imports` | Multipart/form-data with exactly one `file`; validate, upload, extract, persist; returns `{duplicate, document}` (201 new / 200 duplicate). |
| `GET` | `/api/v1/imports` | Latest 50 imports belonging to the logged-in recruiter; no raw text or Storage keys. |
| `GET` | `/api/v1/imports/:id` | Owner-scoped import details, safe review reasons, candidate reference and verbatim evidence excerpts. |
| `POST` | `/api/v1/imports/:id` | JSON `{"action":"retry"}`; limited to three attempts for FAILED/NEEDS_REVIEW and reuses the private source file. |
| `GET` | `/api/v1/imports/:id/download` | Returns `{url,expiresInSeconds:60}`, after ownership and private bucket checks. |

**Accepted files:** PDF ≤ 4 MiB, DOCX ≤ 2 MiB, TXT ≤ 512 KiB. Multipart body cap is 4 MiB + 100 KiB. A document hash is unique **per owner**: duplicate uploads return the existing document/status without a second provider request. A new owner can upload the same document independently; neither can access the other's record.

**Statuses:** `RECEIVED` → `STORED` → `TEXT_EXTRACTED` → `READY` or `NEEDS_REVIEW`; `PROCESSING` during retry, `FAILED` on processing/storage errors. A missing model key or unverifiable name leads to `NEEDS_REVIEW`, not an invented candidate. Parser issues have safe error codes. The request is synchronous and bounded; this is not an implied durable queue.

**Error mapping:** 401 sign-in required, 404 foreign/missing document, 409 invalid retry state, 413 size limit, 415 unsupported type/MIME, 422 malformed or invalid file, 503 private Storage unavailable, 500 internal error (redacted). Handle errors without logging resume content.

### Verification and current limits

Automated CI uses disposable PostgreSQL migrations, artificial PDF/DOCX/TXT bytes, isolated AI provider responses and an in-memory mock of the Storage API; it never uploads a real applicant resume to Supabase. Manually verify private bucket creation, upload, signed access and an actual configured provider in the user's own project before describing deployment as verified.

The synchronous prototype does **not** provide OCR for scanned PDFs, high-throughput batch workers, comprehensive candidate deduplication across *different* files, durable queue recovery after process crashes, full human field-edit/approval screens, resume deletion/retention workflows, or pgvector search. These are additional hardening and UI workstreams rather than claims hidden inside this feature.

**Frontend handoff:** [ingestion.md](frontend-implementation-needed/ingestion.md).
