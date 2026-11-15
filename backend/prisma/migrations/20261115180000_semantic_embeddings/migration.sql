-- Embeddings are private, scoped to the recruiter, and not accessible via
-- public Supabase Data API. pgvector may already live in extensions on Supabase.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
SET search_path TO public, extensions;

CREATE TABLE "CandidateEmbedding" (
  "candidateId" TEXT NOT NULL PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "contentVersion" INTEGER NOT NULL DEFAULT 1,
  "embedding" vector(768) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CandidateEmbedding_candidateId_fkey"
    FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CandidateEmbedding_ownerId_model_idx" ON "CandidateEmbedding" ("ownerId","model");
CREATE INDEX "CandidateEmbedding_embedding_hnsw_idx" ON "CandidateEmbedding"
  USING hnsw ("embedding" vector_cosine_ops);

-- Server-side only, as candidate-derived data contains private professional info.
REVOKE ALL ON TABLE "CandidateEmbedding" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "CandidateEmbedding" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "CandidateEmbedding" FROM authenticated;
  END IF;
END $$;
