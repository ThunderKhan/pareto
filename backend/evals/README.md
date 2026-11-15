# Synthetic AI search contract corpus

- 30 search proposals and 26 refinement proposals in JSONL.
- Fixtures are **hand-authored, expected model proposals**, not observed Gemini/Groq generations. Offline tests verify validation, contract compatibility, and deterministic refinement invariants; they **do not measure model accuracy**.
- Real provider checks are separately opt-in under `PARETO_VERIFY_LIVE_MODELS=1` and `PARETO_EVAL_LIVE=1`, with synthetic inputs only.
- No real resumes, recruiter data, user IDs or API secrets are permitted in this corpus.
- New samples must include a traceable expectation, reviewer, and relevant edge-case category. Version prompt changes and report regressions rather than cherry-picking successful outputs.
