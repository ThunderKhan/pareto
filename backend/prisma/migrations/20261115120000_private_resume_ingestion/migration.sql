-- Private, owner-scoped resume ingestion; local PostgreSQL and Supabase compatible.
-- Storage bucket is created separately using Supabase Storage API (not SQL).
CREATE TYPE "ResumeDocumentKind" AS ENUM ('PDF', 'DOCX', 'TXT');
CREATE TYPE "ResumeIngestionStatus" AS ENUM (
  'RECEIVED', 'PROCESSING', 'STORED', 'TEXT_EXTRACTED', 'READY', 'NEEDS_REVIEW', 'FAILED'
);

CREATE TABLE "ResumeDocument" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "kind" "ResumeDocumentKind" NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" "ResumeIngestionStatus" NOT NULL DEFAULT 'RECEIVED',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "extractedText" TEXT,
  "textTruncated" BOOLEAN NOT NULL DEFAULT false,
  "provider" TEXT,
  "errorCode" TEXT,
  "reviewReasons" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResumeDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResumeDocument_ownerId_sha256_key" ON "ResumeDocument"("ownerId","sha256");
CREATE UNIQUE INDEX "ResumeDocument_storageKey_key" ON "ResumeDocument"("storageKey");
CREATE INDEX "ResumeDocument_ownerId_createdAt_idx" ON "ResumeDocument"("ownerId","createdAt");

ALTER TABLE "Candidate" ADD COLUMN "sourceDocumentId" TEXT;
CREATE UNIQUE INDEX "Candidate_sourceDocumentId_key" ON "Candidate"("sourceDocumentId");
ALTER TABLE "Candidate"
  ADD CONSTRAINT "Candidate_sourceDocumentId_fkey"
  FOREIGN KEY ("sourceDocumentId") REFERENCES "ResumeDocument"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ResumeEvidence" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "sourceStart" INTEGER,
  "sourceEnd" INTEGER,
  CONSTRAINT "ResumeEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResumeEvidence_documentId_fieldKey_key"
  ON "ResumeEvidence"("documentId","fieldKey");
ALTER TABLE "ResumeEvidence"
  ADD CONSTRAINT "ResumeEvidence_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "ResumeDocument"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- No direct Data API access to sensitive resumes or evidence.
ALTER TABLE public."ResumeDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ResumeEvidence" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role TEXT;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles
    WHERE rolname IN ('anon','authenticated','service_role')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public."ResumeDocument", public."ResumeEvidence" FROM %I',
      api_role
    );
  END LOOP;
END
$$;
