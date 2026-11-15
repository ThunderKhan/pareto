-- Private BYOK credential and metadata-only usage records.
-- Credential ciphertext is encrypted in application code with an independent
-- 256-bit master key, never the database password or a Supabase public key.
CREATE TABLE "AiUserCredential" (
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "encryptedKey" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "keyVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUserCredential_pkey" PRIMARY KEY ("userId","provider"),
  CONSTRAINT "AiUserCredential_provider_check" CHECK ("provider" IN ('Gemini','Groq')),
  CONSTRAINT "AiUserCredential_key_version_check" CHECK ("keyVersion" = 1)
);
CREATE TABLE "AiUserPreference" (
  "userId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'PLATFORM',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUserPreference_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "AiUserPreference_mode_check" CHECK ("mode" IN ('PLATFORM','BYOK'))
);
CREATE TABLE "AiUsageRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelId" TEXT,
  "credentialSource" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "latencyMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsageRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiUsageRecord_token_check" CHECK (
    ("inputTokens" IS NULL OR "inputTokens" BETWEEN 0 AND 10000000)
    AND ("outputTokens" IS NULL OR "outputTokens" BETWEEN 0 AND 10000000)
    AND "latencyMs" BETWEEN 0 AND 86400000
  ),
  CONSTRAINT "AiUsageRecord_source_check" CHECK ("credentialSource" IN ('platform','byok'))
);
CREATE INDEX "AiUsageRecord_userId_createdAt_idx" ON "AiUsageRecord"("userId","createdAt");
CREATE INDEX "AiUsageRecord_createdAt_idx" ON "AiUsageRecord"("createdAt");
ALTER TABLE public."AiUserCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AiUserPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AiUsageRecord" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE api_role TEXT;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles
    WHERE rolname IN ('anon','authenticated','service_role')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."AiUserCredential", public."AiUserPreference", public."AiUsageRecord" FROM %I',api_role);
  END LOOP;
END $$;
