# Pareto AI — threat model (AE-01)

**Status:** Initial controls implemented in branch `feat/ai-security-contracts`; security review incomplete. This is an engineering threat model, **not** a claim of injection-proof or production-ready behavior.

| Asset | Attacker / exploit path | Enforcement boundary | Current mitigation and regression | Remaining verification |
| --- | --- | --- | --- | --- |
| Recruiter candidate data | Cross-tenant session or candidate IDs | Authenticated Next.js routes, owner-scoped Prisma | Existing owner checks in `search/service.ts`; existing PostgreSQL suite | Live two-user authorization and document-route tests after PR #13 |
| Search criteria and revisions | Prompt tells LLM to bypass confirmation | Application's `confirmSearch` transaction | AI tasks return drafts only; evaluator remains deterministic | Signed-in browser confirmation / stale version test in target deployment |
| Search semantics | JSON injection, forged scoring, protected traits | Strict Zod rule/delta schemas; application evaluator | Search schema tests, unsupported-key regression, preliminary protected-condition policy | Expand fairness and indirect-proxy corpus |
| Uploaded resume | Hidden instructions / fabricated skills / misleading evidence | Parser and field evidence verifier, no model tools | No model tool execution; extraction feature is still on PR #13 | Negation, dates, provenance, malicious PDF and reviewer approval on integration branch |
| API keys and private prompts | Prompt disclosure, exfiltration, malicious URL | Fixed provider HTTPS hosts and no model tools | Keys only in server request headers; strict response shape; no raw error echo | Network egress restrictions, secret scanning, provider contract review |
| Availability and spending | Cost amplification, model outage and huge responses | Gateway length/deadline/attempt caps | 15s total model deadline; max two attempts; 64KiB response cap; non-retry of invalid auth | Per-tenant and global durable rate/spend ledger, proper retry budget, circuit breaker |
| Candidate privacy | Logs or metrics leak CVs/signed URL | Server logging allowlist | Existing route logs only opaque request ID, new gateway does not log payloads | Storage and resume routes, observability, deletion/retention audit |
| Document ingestion lifecycle | Crash/dup retries | Database jobs/leases | PR #14 implements queue independently, stacked on #13 | Rebase PRs, ensure a single extraction adapter and end-to-end recovery tests |

## Security invariants

1. Treat all prompts, PDF/DOCX content and model responses as untrusted data. Schema validation establishes structure, not truth.
2. The model has **no SQL, shell, browser, fetch, email or plugin tools**. A model response may not authorize candidate access or change a revision.
3. Preserve `MATCH`, `FAIL`, `UNKNOWN` and reviewer confirmation. An undocumented fact must not become known-absent by default.
4. Reject unsupported protected-attribute requirements. The initial input heuristic is defense in depth, not reliable detection for all indirect proxies.
5. Keep Gemini primary and Groq secondary; do not forward tenant IDs, raw provider errors or secrets to clients.
6. Live provider credentials, private Supabase buckets, safe deletion and actual costs are **not** verified by these offline tests.

## Initial test evidence

- `backend/src/ai/tasks/search-interpret.test.ts`: protected conditions, strict output, refinement preservation, ambiguous follow-up.
- `backend/src/ai/providers/gateway.test.ts`: invalid-key no-fallback, 429 fallback, JSON failure recovery and input caps.
- `backend/src/search/interpret.test.ts`: existing organizer search and provider compatibility.
- `backend/src/search/service.test.ts`: existing owner/revision integration (to be rerun in CI).

**P0 follow-up:** request-origin checks, comprehensive per-tenant throttling, adversarial dataset, post-extraction semantic checking and privacy-safe usage metrics; then verify integration with ingestion PRs.
