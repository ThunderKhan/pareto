# Semantic retrieval / pgvector — implementation and operations

Scope: 768-dimensional Gemini embeddings, private PostgreSQL pgvector HNSW index, human-confirmed search integration, idempotent backfill, retrieval evaluation. Semantic similarity is a **ranking signal only**; the existing deterministic rule evaluator remains the authority for eligibility and explanations. No separate deployed API/vector database or new model provider is introduced.

## Data and embedding contract

- Source: documented professional candidate attributes from Candidate and CandidateSkill. Embeddings exclude candidate names, original resume text, email addresses and protected personal attributes.
- Model: Google gemini-embedding-001 with outputDimensionality=768; RETRIEVAL_DOCUMENT for candidates and RETRIEVAL_QUERY for search requests. Indexed model key is gemini-embedding-001:768. Other embedding models require full re-indexing.
- Representation: candidateDocument and queryDocument in backend/src/search/retrieval.ts. DOCUMENT_VERSION=1 and SHA-256 of the versioned professional document identify stale records and make backfill idempotent.
- Private table: CandidateEmbedding, candidateId FK with cascade deletion, ownerId, model, contentHash, contentVersion and 768-dimensional pgvector. Owner/model B-tree plus HNSW cosine index. SQL retrieval joins Candidate and checks both owner IDs.
- Upon ingestion and verified profile updates, an index refresh is attempted after the actual profile transaction commits. Its failure cannot undo ingestion or human review; backfill repairs gaps. Rejected/deleted candidates cascade-delete their vectors.
- Existing /api/v1/search actions and confirmed revision semantics are unchanged. Where valid embeddings exist, results gain retrieval.lexicalScore, retrieval.semanticSimilarity (cosine similarity, NOT a hiring qualification percentage) and retrieval.hybridScore.

## Ranking and safety

1. The deterministic evaluator still computes MATCH, FAIL and UNKNOWN, preserving ELIGIBLE, NEEDS_REVIEW and INELIGIBLE.
2. Preserve order by eligibility, required criteria met, and preferred criteria met. Only ties are reranked using 0.5 lexical RRF + 0.5 semantic RRF (k=60). Candidate IDs are the stable final tie break.
3. Excluded skill rules never enter the semantic query. Those rules stay in the deterministic evaluator.
4. Missing or stale embedding entries use lexical rank only. With no valid index, key or provider response, the **original** deterministic ordering is returned.
5. Never present a vector similarity as proof of a candidate skill or eligibility.

## Deployment and backfill

1. Use PostgreSQL 17 with pgvector available. compose.yaml and CI use pgvector/pgvector:0.8.7-pg17. Existing unmodified postgres:17 images need pgvector installed before migrations. Supabase may already host the extension in its extensions schema; run DB migrations against the intended Pareto database with sufficiently privileged credentials.
2. Execute pnpm db:generate, pnpm db:deploy, then pnpm db:seed with the intended DEMO_OWNER_ID. Do not index arbitrary tenants.
3. Set GOOGLE_GENERATIVE_AI_API_KEY on the **server** and set PARETO_INDEX_OWNER_ID to the exact recruiter's UUID. Run pnpm --filter @pareto/backend semantic:index from the repository root. Optional PARETO_INDEX_LIMIT=1..1000 makes a bounded, repeatable partial pass. The indexer emits counts only, not candidate data.
4. Hybrid retrieval becomes active automatically when the configured Gemini key and at least one **fresh** indexed document are available. Disable with PARETO_SEMANTIC_SEARCH=0.
5. Re-run semantic:index after changing the document builder, model, source fixtures or professional profile attributes. Unchanged documents skip API requests.
6. Gemini receives bounded professional text, not the complete CV. Verify consent, privacy and external-provider data handling before indexing real candidate information.

## Retrieval evaluation

- Run pnpm --filter @pareto/backend test for offline tests of documents, rule/unknown safety, hybrid ranks and retrieval metrics. PostgreSQL integration uses injected synthetic vectors, **not live model calls**.
- After backfilling the demo owner, set PARETO_EVAL_OWNER_ID to the seed owner's UUID. Run pnpm --filter @pareto/backend semantic:evaluate with a working Gemini key.
- The evaluation compares the original deterministic baseline to actual hybrid ranking on a synthetic 48-profile corpus, with judgments in backend/evals/fixtures/retrieval-gold.json. It reports Recall@10, MRR@10, nDCG@10, and their differences. It fails explicitly if semantic scores were absent for every query.
- This tiny benchmark provides regressions and a starting point for relevance tuning; it does not establish real-world improvement, fairness, or production retrieval quality. Check judgments and actual results before claiming an improvement.

## Known limits

- Maximum 1,000 candidates per owner remains inherited from confirmed search. HNSW supports future scale, but candidate-wide deterministic evaluation currently caps throughput.
- Confirmed search and page loads perform a bounded query-embedding call if indexed candidates exist; a future per-revision embedding cache would reduce latency/cost.
- Gemini is currently the only embedding provider. Groq remains the existing structured-search interpretation fallback, not an imaginary embedding fallback.
- The six-second provider deadline and safe deterministic fallback are deliberate reliability tradeoffs; embedding outages do not fabricate results.
