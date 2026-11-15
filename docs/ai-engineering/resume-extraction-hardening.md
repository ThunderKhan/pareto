# Resume extraction — semantic evidence hardening (AE-03)

**Integration:** stacked on `feat/ingestion-quality-audit` (#17), which depends on #14 → #13. Separate from search AI PR #16 and gateway/evals PR #18.

## What changed

- One immutable `backend/src/ai/prompts/resume-extract.v1.ts` prompt with strong source-isolation rules, explicit JSON shape, field-level quote requirements, no protected-attribute inference, no fabricated experience/notice, no model tool permissions.
- `ingestion/extract.ts` still validates strict Zod output and locates verbatim quotes in privately parsed source pages, but now checks the **meaning** of the source near each quote.
- Missing/negated/aspirational skills (e.g. "No Java experience", "Planning to learn Java") do not establish positive skills.
- A 30-day project does not establish a 30-day notice period. A joining/notice phrase must be associated with the exact number and units.
- Numerical experience requires an explicit experience statement whose unit matches total months; arbitrary date strings or project durations are `UNKNOWN` until interval verification or human review.
- Existing `NEEDS_REVIEW` and human correction/approval workflow (#17) remains authoritative for uncertain facts; no invented confidence percentages.

## Evidence and gaps

Synthetic unit tests cover a legitimate Asha Nair profile, false skills, mislabeled notice periods, invalid model outputs and attacker-controlled resume text. These are deterministic tests, **not** calibrated real-resume model precision.

Remaining work before release: reconcile the entire branch chain with search AI #16/#18; use the unified gateway for ingestion so quotas and classified errors apply, add independent interval/date evidence extraction and fairness assessments, verify real PDF/DOCX behavior against the target private Supabase project, review provider privacy terms, and record live tests. No key or real applicant resume has been used.
