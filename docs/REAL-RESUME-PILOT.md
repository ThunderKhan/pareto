# Milestone: 10 real, one-page ATS-style resume PDFs

**Status:** Offline document-generation and parsing/evidence smoke test delivered. **No live authenticated API upload or Gemini/Groq call has occurred.**

## Why these documents exist

A candidate-table seed is **not** an ingestion test. The pilot generates 10 original, fictional candidate resumes as **actual PDF files**, with conventional single-column headings, two experience entries, project, education, explicit skills, professional experience, and optional notice period. The PDFs contain selectable text, not screenshots, and use only standard PDF fonts. Fake `example.test` contact identifiers protect real applicants.

The generated corpus covers backend engineering, data analytics, frontend, ML engineering, DevOps, product design, cybersecurity, Java full-stack, data engineering, and QA automation. Two candidates deliberately omit a verified notice period so downstream evaluation can verify the `unknown` case.

## Reproduce the pilot

From repository root after `pnpm install --frozen-lockfile`:

```bash
pnpm --filter @pareto/backend ingest:generate:pdfs --out ./ats-resume-pilot
pnpm --filter @pareto/backend ingest:verify:pdfs
```

The generator is `backend/scripts/generate-ats-resume-corpus.mjs` and does not require third-party PDF-authoring packages. It writes:

- `resume-001.pdf` through `resume-010.pdf`: 10 original PDFs, exactly one page each
- `ground-truth.json`: independent expected values and each file's SHA-256 digest

**Do not insert ground-truth values into Pareto's candidate tables.** That would bypass the upload/extraction behavior under evaluation. Ground truth is an external benchmark oracle only.

The verifier (`backend/scripts/verify-ats-resume-corpus.mjs`) is exercised in CI. It validates all 10 with **the actual backend `validateResume` and `parseResume` functions** (including PDF.js), asserts real one-page PDFs, checks text content, and tests evidence grounding using a *test-supplied* valid model proposal through `validateExtractedProfile`. No paid provider is called, so this is an offline **parser/evidence contract test** and not an AI field-accuracy measurement.

## Next live step: authenticated ingestion (not yet verified)

1. Provision the **correct** private Supabase Storage bucket, apply the migrations, configure a supervised worker process, and configure an approved Gemini/Groq model and its key. Confirm consent/privacy conditions.
2. Use the generated PDFs (not the JSON) in `/dashboard/candidates/import` or send 10 authenticated `POST /api/v1/imports` multipart requests. Do not commit session cookies or API keys.
3. Poll `GET /api/v1/imports/jobs` and the owner-scoped import details until each reaches `READY`, `NEEDS_REVIEW`, or a terminal failure. Verify actual worker progress, source evidence and distinct candidate IDs.
4. Export a private, PII-free evaluation summary: document ID / source hash prefix, processing outcome, verified-field count, duration, measured provider usage where available. Compare saved candidate attributes to the separately held `ground-truth.json`. **Never claim 100% AI accuracy from the offline mocked-proposal test.**
5. Check deduplication by reuploading one identical document and confirming no second extraction job/provider request; check missing-notice fields remain unknown; verify cancellation and quota deferral.
6. If the 10-document test passes with real provider, expand to 50, 100 and ultimately 500 **real documents**. Handle provider rate limits and budget explicitly; current ingestion is capped at 1,000 candidate profiles per recruiter.

## Public dataset alternative

[Syn​thResume (jijunhao/SyntheticResumeData)](https://github.com/jijunhao/SyntheticResumeData) describes 2,994 synthetic resumes and ground-truth annotations in PDF and JSON folders, under Apache-2.0. A source tree inspection confirms PDF blobs are present, but **their page counts, parseability and ATS compatibility have not been verified in this sprint**. Do not present them as screened one-page documents. An external validation pass can filter for: exactly one page, parsable PDF text, reasonable section structure, deduplicated hashes, acceptable source/license, and ≤4 MiB PDFs. If selected, preserve provenance and source license notices.

## Constraints and non-goals

- No DB seeding is done by this generator or verifier.
- No real personal data is included in the sample corpus.
- No production Supabase or model secrets were accessed.
- Does not attempt to claim 10 real Gemini/Groq extractions, a live upload throughput figure, or a 500-file production benchmark.
- PDF fixture generation is an **evaluation utility**, not a new user-facing feature.
