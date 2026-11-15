-- Private, tenant-scoped extraction audit and reviewer corrections.
-- Do not expose profile snapshots or sensitive inferred fields via Supabase Data API.
CREATE TYPE "ResumeReviewState" AS ENUM ('UNREVIEWED','NEEDS_REVIEW','HUMAN_VERIFIED');
CREATE TYPE "ResumeAuditAction" AS ENUM (
  'MODEL_EXTRACTED','REVIEW_REQUIRED','HUMAN_CORRECTED','HUMAN_APPROVED','HUMAN_REJECTED'
);
ALTER TABLE "ResumeDocument"
  ADD COLUMN "reviewState" "ResumeReviewState" NOT NULL DEFAULT 'UNREVIEWED',
  ADD COLUMN "reviewVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "ResumeDocument" ADD CONSTRAINT "ResumeDocument_reviewVersion_check"
  CHECK ("reviewVersion" >= 0);
ALTER TABLE "IngestionAttempt"
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "parseMs" INTEGER,
  ADD COLUMN "modelMs" INTEGER,
  ADD COLUMN "persistMs" INTEGER,
  ADD COLUMN "sourceChars" INTEGER,
  ADD COLUMN "evidenceCount" INTEGER,
  ADD COLUMN "verifiedFields" INTEGER,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "extractorVersion" TEXT;
ALTER TABLE "IngestionAttempt" ADD CONSTRAINT "IngestionAttempt_metrics_nonnegative_check"
  CHECK (("durationMs" IS NULL OR "durationMs" >= 0)
    AND ("parseMs" IS NULL OR "parseMs" >= 0)
    AND ("modelMs" IS NULL OR "modelMs" >= 0)
    AND ("persistMs" IS NULL OR "persistMs" >= 0)
    AND ("sourceChars" IS NULL OR "sourceChars" >= 0)
    AND ("evidenceCount" IS NULL OR "evidenceCount" >= 0)
    AND ("verifiedFields" IS NULL OR "verifiedFields" >= 0));

CREATE TABLE "ResumeProfileAudit" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "ResumeAuditAction" NOT NULL,
  "reviewVersion" INTEGER NOT NULL,
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "provider" TEXT,
  "extractorVersion" TEXT,
  "jobId" TEXT,
  "attempt" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResumeProfileAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResumeProfileAudit_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ResumeDocument"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ResumeProfileAudit_ownerId_createdAt_idx"
  ON "ResumeProfileAudit"("ownerId","createdAt");
CREATE INDEX "ResumeProfileAudit_documentId_createdAt_idx"
  ON "ResumeProfileAudit"("documentId","createdAt");
CREATE INDEX "IngestionAttempt_jobId_finishedAt_idx"
  ON "IngestionAttempt"("jobId","finishedAt");

-- Server-only Prisma access with ownerId checks. Protect PII snapshots even
-- when hosted with Supabase's public schema Data API enabled.
ALTER TABLE public."ResumeProfileAudit" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role TEXT;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles
    WHERE rolname IN ('anon','authenticated','service_role')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public."ResumeProfileAudit" FROM %I',api_role);
  END LOOP;
END $$;
