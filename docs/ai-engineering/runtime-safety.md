# AI output budgets and resume-ingestion circuit controls

- Gemini/Groq task adapters now accept a bounded output-token allowance. Search interpretation and refinement use **2,600 tokens**; resume extraction uses **4,096 tokens** to better accommodate structured evidence. Provider-specific maximums are not guaranteed; unsupported limits may still yield a clear model error.
- A Gemini MAX_TOKENS or Groq length finish reason is rejected even when a syntactically valid partial JSON object is returned.
- Provider inputs, outputs and AI matching rules remain untrusted. All candidates still require deterministic validation and recruiter confirmation.
- Set `RESUME_INGESTION_ENABLED=false` on the API **and** dedicated worker environment, restarting each process to stop new uploads, retries, batch scheduling and future job claims while preserving existing import reads and manual search. In-flight claims may finish after a toggle; this is not an immediate cancellation mechanism.
- Set `AI_ENABLED=false` separately to disable all model calls, including resume extraction, while retaining manual search.
- Provider fallback and process-local quotas are still not durable financial spend tracking. No live provider calls have been made by these tests.
