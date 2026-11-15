# Pareto AI tasks

AI has **no side-effect authority**. The application authenticates, scopes data by owner and explicitly confirms a draft before any search revision is saved. The deterministic evaluator in \`src/search/evaluate.ts\` and Zod schemas in \`src/search/criteria.ts\` remain canonical.

- \`prompts/\`: immutable versioned, narrow prompts. Untrusted recruiter input is JSON-wrapped as data.
- \`tasks/\`: validates and translates model proposals; does not access Prisma or private storage.
- \`providers/\`: fixed Gemini/Groq hosts; bounded responses, timeouts and categorized failures.
- \`safety/\`: input policy and untrusted-content delimiters. This does not replace route authorization, owner scoping or downstream semantic checks.
- \`registry.ts\`: task/schema versions and limits. Planned extraction and evidence-review task identifiers are registered but **not yet runnable in this branch**: they depend on PR #13.

Existing \`search/interpret.ts\` exports remain compatible. Live model calls require explicit server-side key+model environment configuration. Routine tests use injected providers. No telemetry should include raw prompts, resumes, candidate identities, API keys or provider responses.

The plan is \`docs/AI-ENGINEERING-IMPLEMENTATION-PLAN.md\`; see \`docs/ai-engineering/threat-model.md\` for explicit remaining risks.
