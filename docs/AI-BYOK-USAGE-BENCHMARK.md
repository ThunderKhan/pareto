# Sprint B / D / E — BYOK, AI usage metadata, and offline benchmarks

**Scope:** Backend + authenticated owner-only API contracts, plus a standalone AI settings screen at `/dashboard/ai-settings`. No production credentials, schema, or services were changed. Existing frontend profile/navigation files are not modified while the independent frontend worker is operating.

## B — Bring Your Own Key (Gemini and Groq)

The existing server-side AI gateway can now select user-owned provider keys for resume extraction, search interpretation/refinement, evidence review and Gemini semantic embeddings. Keys are encrypted at rest using AES-256-GCM with random IVs and authentication data bound to the authenticated user + provider. No plaintext secrets are returned by any API.

**Server prerequisite:** set `PARETO_BYOK_MASTER_KEY` to 64 cryptographically random hexadecimal characters (32 bytes), for example create **locally** with `openssl rand -hex 32`. Keep it server-only and identical on frontend server and ingestion workers. **Never** expose as a NEXT_PUBLIC variable, publish it, log it, or paste it into GitHub/chat. Losing this key makes stored credentials unrecoverable. Rotating the master key requires a planned re-encryption migration (not yet implemented). This is an application-managed encryption key, **not** an external KMS or security certification.

Run `pnpm db:deploy` on the correctly authorized deployment before enabling BYOK. Ensure `GEMINI_MODEL` and/or `GROQ_MODEL` are configured for supported fixed endpoints. Models and provider destinations are operator-controlled; user-supplied URLs/models are not accepted.

Authenticated API route: `/api/v1/account/ai/providers` (owner-only, no-store, same-origin mutation guard):

- `GET`: returns mode `PLATFORM` or `BYOK`, and `[{provider,connected,updatedAt}]` (never API key values).
- `PUT`: `{provider:"Gemini"|"Groq",key:"..."}`; validates the credential through the provider's fixed list-models endpoint **without sending resumes** and stores only encrypted ciphertext.
- `POST`: `{provider:"Gemini"|"Groq"}`; rechecks a saved credential; returns only verification status.
- `PATCH`: `{mode:"PLATFORM"|"BYOK"}`; BYOK can be activated only if a key exists and the encryption key is configured.
- `DELETE`: `{provider:"Gemini"|"Groq"}`; removes a saved credential.

**No silent billing fallback:** once BYOK is selected, Pareto uses only that user's connected providers (Gemini, Groq); a missing/invalid personal credential yields an error rather than automatically charging a platform-owned credential. Optional Gemini embeddings also respect the selected credential source. Platform concurrency/owner call limits still apply, even with BYOK. A single user's key remains accessible to their authorized backend workflows only, not to other recruiters or other users' REST sessions. Immediate in-flight requests may complete after a key is deleted.

The account now has a standalone `/dashboard/ai-settings` screen with a credential form, connect/verify/remove controls, mode selection, and aggregated usage. The frontend worker can link it into shared Settings navigation without conflicting with this sprint. This PR does not modify shared dashboard navigation. Existing API/worker processes need a restart after adding server secrets. **Do not claim KMS-backed protection**: this version uses independent AES-GCM encryption with a server-managed master key.

## D — Usage and cost metadata

The gateway writes separate, owner-scoped `AiUsageRecord` rows for successes and provider errors (including fallbacks), without storing prompts, resumes, candidate names, outputs, secrets or IP addresses. Direct Gemini embedding requests record outcomes but do not currently return token counts.

Enable only after migration with `AI_USAGE_LEDGER_ENABLED=true` on API and workers. `GET /api/v1/account/ai/usage?days=1|7|30|90` returns owner-scoped aggregations by task/provider/model/credential-source/outcome, recorded token totals, attempt count, average latency and optional cost estimates.

Set `AI_PRICE_CATALOG_JSON` to an **operator-verified** JSON array of pricing rules, for example:
```json
[{"provider":"Gemini","model":"YOUR_CONFIGURED_MODEL","version":"operator-reviewed-2026-11","inputPerMillionUsd":0.0,"outputPerMillionUsd":0.0}]
```
**The numeric zeros above are placeholders, not actual pricing. Do not configure them as real rates.** Unknown model pricing or missing token usage is returned as `null`, not falsely reported as $0. This metadata is **not** a provider invoice, spending cap or exact billing ledger. Fail-open best-effort writes may leave gaps during DB outages; the client must display caveats.

## E — Offline repeatable benchmarks

Run:
```bash
pnpm --filter @pareto/backend ingest:bench:offline --docs 50 --search 500 --runs 20
pnpm --filter @pareto/backend ingest:bench:offline --docs 500 --search 1000 --runs 20
```
`bench-ingestion-offline.ts` measures the **actual PDF.js parsing path** using ten distinct generated one-page PDFs repeated N times; also measures the in-memory deterministic ranking engine against 500/1,000 synthetic candidate objects. It reports p50/p95, throughput, RSS, hardware metadata and strict limitations. It does not contact Supabase, a hosted worker or any AI provider, and must **never** be represented as a validated 500-PDF upload throughput. CI runs a small deterministic smoke benchmark.

## Remaining live deployment / next-hour testing

- Confirm Supabase schema migrations, bucket policy, storage upload, worker health and end-to-end 10-resume extraction with actual provider models.
- With a **test provider key**, exercise save -> list metadata -> select BYOK -> live search and import -> usage report -> verify -> delete -> confirm fail-closed; inspect access boundaries between two real signed-in recruiters.
- Confirm `AI_DURABLE_QUOTA_ENABLED` and uniform owner/global limits for API/workers. The audit ledger does not replace the request cap.
- Determine and verify **current** provider pricing before enabling any cost estimates. Do not paste credentials into code, CI, logs or messages.
- Conduct a deployed benchmark only after operations are verified; record successful uploaded documents, actual model quality, rate-limits and timings.

**Not implemented in this sprint:** an xAI/Grok adapter, shared Settings navigation integration, KMS-backed master-key management, master-key rotation automation, money-denominated hard spending limits, a 500-file live import, a production upload load test, or deployment updates.
