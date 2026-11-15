-- Durable at-least-once source-document ingestion: atomic lease/fencing queue,
-- per-attempt audit, and user-owned batch scheduling. No public Data API grants.
CREATE TYPE "IngestionJobStatus" AS ENUM (
  'QUEUED','RUNNING','RETRY_SCHEDULED','READY','NEEDS_REVIEW','FAILED_PERMANENT','CANCELLED'
);
CREATE TYPE "IngestionJobStage" AS ENUM ('QUEUED','PARSING','EXTRACTING','PERSISTING','COMPLETE');
CREATE TYPE "IngestionAttemptOutcome" AS ENUM (
  'RUNNING','RETRY','READY','NEEDS_REVIEW','FAILED','CANCELLED','RECOVERED'
);

CREATE TABLE "IngestionBatch" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestionBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IngestionBatch_ownerId_createdAt_idx" ON "IngestionBatch"("ownerId","createdAt");

CREATE TABLE "IngestionJob" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "batchId" TEXT,
  "status" "IngestionJobStatus" NOT NULL DEFAULT 'QUEUED',
  "stage" "IngestionJobStage" NOT NULL DEFAULT 'QUEUED',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "manualRetries" INTEGER NOT NULL DEFAULT 0,
  "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workerId" TEXT,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  "lastErrorCode" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IngestionJob_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "ResumeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IngestionJob_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "IngestionBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "IngestionJob_attempts_check" CHECK ("attempts" >= 0 AND "attempts" <= "maxAttempts"),
  CONSTRAINT "IngestionJob_maxAttempts_check" CHECK ("maxAttempts" BETWEEN 1 AND 8),
  CONSTRAINT "IngestionJob_manualRetries_check" CHECK ("manualRetries" BETWEEN 0 AND 2),
  CONSTRAINT "IngestionJob_priority_check" CHECK ("priority" BETWEEN -5 AND 5)
);
CREATE UNIQUE INDEX "IngestionJob_documentId_key" ON "IngestionJob"("documentId");
CREATE UNIQUE INDEX "IngestionJob_leaseToken_key" ON "IngestionJob"("leaseToken");
CREATE INDEX "IngestionJob_ownerId_createdAt_idx" ON "IngestionJob"("ownerId","createdAt");
CREATE INDEX "IngestionJob_batchId_createdAt_idx" ON "IngestionJob"("batchId","createdAt");
CREATE INDEX "IngestionJob_status_runAfter_priority_idx" ON "IngestionJob"("status","runAfter","priority");
CREATE INDEX "IngestionJob_status_leaseExpiresAt_idx" ON "IngestionJob"("status","leaseExpiresAt");

CREATE TABLE "IngestionAttempt" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "leaseToken" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "outcome" "IngestionAttemptOutcome" NOT NULL DEFAULT 'RUNNING',
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "IngestionAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IngestionAttempt_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "IngestionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IngestionAttempt_jobId_attempt_key" ON "IngestionAttempt"("jobId","attempt");
CREATE INDEX "IngestionAttempt_jobId_startedAt_idx" ON "IngestionAttempt"("jobId","startedAt");

-- These records contain resume processing and owner-identity metadata.
-- Always access through private server-side Prisma after authorization.
ALTER TABLE public."IngestionJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IngestionBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IngestionAttempt" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role TEXT;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles
      WHERE rolname IN ('anon','authenticated','service_role')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public."IngestionJob", public."IngestionBatch", public."IngestionAttempt" FROM %I',
      api_role);
  END LOOP;
END $$;
