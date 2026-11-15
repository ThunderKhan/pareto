-- Private, durable hourly AI call counters. No model inputs or credentials.
CREATE TABLE "AiRequestQuota" (
  "scope" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiRequestQuota_pkey" PRIMARY KEY ("scope","subject","windowStart"),
  CONSTRAINT "AiRequestQuota_scope_check" CHECK ("scope" IN ('global','owner')),
  CONSTRAINT "AiRequestQuota_attempts_nonnegative_check" CHECK ("attempts" >= 0),
  CONSTRAINT "AiRequestQuota_subject_size_check" CHECK (char_length("subject") BETWEEN 1 AND 128)
);
ALTER TABLE public."AiRequestQuota" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role TEXT;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles
    WHERE rolname IN ('anon','authenticated','service_role')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."AiRequestQuota" FROM %I',api_role);
  END LOOP;
END $$;
