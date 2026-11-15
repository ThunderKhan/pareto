# Independent live search quality measurement

The existing JSONL corpus contains independently authored **synthetic expected** search criteria and refinement operations. The offline Vitest suite checks the schema/contracts; it does **not** measure model accuracy.

This CLI adds a separately gated, **real-provider** quality run with the existing Gemini-primary/Groq-fallback configuration. It compares each actual returned proposal against the labelled expected criteria, computing exact micro-case precision, recall, F1, model-error counts, p50 and p95. Case results contain only synthetic IDs, task type, numbers and provider, **never prompts or model responses**.

No model call is made unless both flags are set:
```sh
PARETO_VERIFY_LIVE_MODELS=1 PARETO_EVAL_LIVE=1 pnpm --filter @pareto/backend ai:evaluate:live
```

Defaults: first 5 synthetic search cases and first 5 refinement cases (10 billable calls, potentially more when fallback occurs). Operator-controlled limits: `PARETO_EVAL_SEARCH_CASES` (0–30) and `PARETO_EVAL_REFINE_CASES` (0–26). Avoid maximum coverage without checking quotas and cost. The normal per-process quota applies, including fallback. A real account must have approved model IDs configured in server-only environment variables.

This is an evaluation tool—not a certification of fairness, résumé extraction accuracy, privacy compliance, or production availability. Record the exact commit, provider/model settings, date, failed cases and caveats before citing measured quality results. No evaluation result is hard-coded.
