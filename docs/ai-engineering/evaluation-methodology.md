# Pareto AI — evaluation method (AE-05)

**As of 2026-11-15: offline search/refinement contract fixtures implemented; real model quality NOT measured.**

## Evaluation sets and interpretation

| Slice | Available | What the test actually verifies | NOT established |
| --- | --- | --- | --- |
| Synthetic search | 30 cases in `backend/evals/datasets/search-intents.jsonl` | Strict rule shape, normalization, acceptance | Gemini/Groq extracting correct fields from user prompts |
| Synthetic refinement | 26 cases in `backend/evals/datasets/refinements.jsonl` | `applyDelta`, preservation of unrelated constraints and confirmed criteria | Live model obeying multi-turn context |
| Security / failure | Gateway and task tests in `backend/src/ai` | Invalid-key fail-closed, 429 fallback, unsupported fields, protected filter, quotas, circuit breaker | Complete OWASP prompt-injection resistance |
| Extraction | PR #13 and stacked #17 provide separate fixtures | Parser/schema/source evidence, reviewer states when merged | Live real-resume precision/recall and fairness |
| Live search | 5 opt-in probes under `PARETO_EVAL_LIVE=1` and `PARETO_VERIFY_LIVE_MODELS=1` | Actual configured model response, if run | No conclusion until operator runs and records results |

## Meaningful scoring

For a true model-quality baseline, label *expected criteria* independently of a model's output. Evaluate:
- Exact required rule precision / recall / F1, including role, city, experience bounds, joining period, required/preferred, exclusions and skill aliases.
- Overconstraint / hallucination rate; wrong protected-trait usage; unmodeled requirements; refusal/abstain correctness.
- Multi-turn preservation and correct changes; unchanged keys must remain unchanged.
- Schematically valid but semantically false output; counts of `UNKNOWN`, contradiction and human review.
- p50/p95 model latency, timeouts, provider failures, token usage, fallback ratio and actual billed costs **only from trusted provider data**.
- Holdout prompts not used as few-shot examples. Keep the same cases when comparing prompt/model versions.

No calibrated quality percentage or fictitious 99.9% availability is claimed. Set a release threshold only after a reviewer sees a representative live baseline and regression report.

## Commands

```sh
pnpm --filter @pareto/backend test
# Optional, using synthetic input ONLY and keys configured securely by operator:
PARETO_VERIFY_LIVE_MODELS=1 PARETO_EVAL_LIVE=1 pnpm --filter @pareto/backend exec vitest run src/ai/evals/live-quality.test.ts
```

For Windows PowerShell, set environment variables with `$env:...` in the terminal rather than pasting keys into scripts or issue comments. Each live probe can incur API charges. This feature is not run by routine CI.

## Release gate

Do not claim live verification until the exact model/provider, test date, prompt/schema version, count of passed/failed cases and target environment are recorded by the operator without private inputs or credentials.
