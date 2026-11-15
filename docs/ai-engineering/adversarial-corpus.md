# Adversarial AI boundary corpus (AE-01/05)

At least 30 hand-authored synthetic model-output attacks are stored in backend/evals/datasets/adversarial.jsonl. Each case injects a malicious or invalid provider JSON response at the adapter boundary while the recruiter prompt is treated as untrusted content.

The Vitest suite asserts that invalid fields, demographic filter values, unauthorized actions, invented SQL/IDs, malformed number bounds, duplicate rules, and extra properties cannot be accepted as confirmed search criteria. It also checks that refinement cannot create protected-attribute rules or fake cross-tenant deletions.

**Scope limit:** These tests do not query live Gemini/Groq models and therefore cannot measure live prompt injection success. They test deterministic schema/policy rejection AFTER a hostile response. Real attack-resistance evaluation requires approved model accounts, documented cases and explicit opt-in live runs. The input heuristics are defense-in-depth; implicit demographic proxies and broader employment fairness still need independent review.

Eligibility remains the deterministic evaluator's decision, and recruiter confirmation remains necessary before any search revision persists.
