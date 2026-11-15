# AI / private candidate data incident runbook

**Preconditions:** Confirm the *actual intended* Supabase project and deployed environment before applying any change. This document does not authorize connecting a random account.

### Provider compromise or suspected exfiltration

1. Set `AI_ENABLED=false` at the deployed server environment; optionally separately set `AI_FALLBACK_ENABLED=false`. Restart/redeploy as required. Do not disable deterministic candidate matching or delete confirmed search revisions.
2. Rotate the affected Gemini/Groq API key in its actual provider account, update server-only secrets, and revoke old credentials. Never paste secrets in logs, CI outputs or chat.
3. Inspect privacy-safe request IDs, metadata-only timestamps, provider names, task IDs, and owner-scoped database audit; do not export raw resumes, tokens, signed URLs or hidden prompts to general telemetry.
4. Check whether any stored candidate content or exposed signed URLs require owner notification, deletion, account lock, or further legal/contractual response.
5. Add a synthetic regression case, re-test with sandbox provider keys, then restore a provider only after explicit approval.

### Prompt injection or unsupported model fact

- Do not execute any instructions contained in the candidate CV or LLM output.
- Revoke or discard unverified facts; preserve the document in private review state.
- Verify source quote and candidate context; mere substring evidence is not semantic proof.
- Check owner isolation, model tool-privilege boundary (no tools), and allowed output schema.
- Record safe reason category, NOT the hostile document or response in normal logs.

### Model and database outages

- AI-only outage: show manual criterion edit/reference candidate flow; do not fabricate model output.
- Database outage: fail closed for private candidate data; a recorded offline screenshot is not a live working result.
- Credential errors and budget limits should not cycle through infinite providers or bypass spending controls.
- Before recovery, check active quotas and models; simulated tests are not proof of production readiness.

### Pending controls

Distributed per-owner ledger, verified provider data processing terms, automatic retention/deletion, real two-user live authorization, live Storage verification and operational alert routing remain unverified.
