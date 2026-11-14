-- Pareto SQL Editor fallback: project nqglypstndrdvomqyzgj
-- Fresh dedicated project ONLY. Never run after successful Prisma migrations.
-- Original core and security migration contents are copied verbatim below.
-- SQL Editor does NOT record Prisma migration history; see docs/SUPABASE-DATABASE-SETUP.md.
BEGIN;
-- Begin original Prisma migration: 20261114000000_core
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "roleTitle" TEXT,
    "city" TEXT,
    "experienceMonths" INTEGER,
    "noticePeriodDays" INTEGER,
    "industry" TEXT,
    "education" TEXT,
    "employmentType" TEXT,
    "pastRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillsKnown" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "candidateId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("candidateId","skillId")
);

-- CreateTable
CREATE TABLE "SearchSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "referenceCandidateId" TEXT,
    "latestVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRevision" (
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "evaluatorVersion" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchRevision_pkey" PRIMARY KEY ("sessionId","version")
);

-- CreateIndex
CREATE INDEX "Candidate_ownerId_roleTitle_city_idx" ON "Candidate"("ownerId", "roleTitle", "city");

-- CreateIndex
CREATE INDEX "Candidate_ownerId_displayName_id_idx" ON "Candidate"("ownerId", "displayName", "id");

-- CreateIndex
CREATE INDEX "CandidateSkill_skillId_idx" ON "CandidateSkill"("skillId");

-- CreateIndex
CREATE INDEX "SearchSession_ownerId_createdAt_idx" ON "SearchSession"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchRevision_requestId_key" ON "SearchRevision"("requestId");

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRevision" ADD CONSTRAINT "SearchRevision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SearchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- End original Prisma migration
-- Begin security migration: 20261114163000_supabase_api_security
-- Pareto uses Supabase Auth for login and server-side Prisma for candidate data.
-- No direct Supabase Data API access to these tables is required.
-- Preserve existing Prisma schema, indexes and server-side ownership checks.
-- RLS without policies denies API roles; the privileged Postgres database
-- connection used by Prisma (the table owner) continues to work.
ALTER TABLE public."Candidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CandidateSkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SearchSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SearchRevision" ENABLE ROW LEVEL SECURITY;

-- Prisma creates its private history table before running migrations.
-- Make it inaccessible through Supabase's Data API as well.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- Supabase defines anon/authenticated/service_role; local CI PostgreSQL does
-- not. Revoke only existing API roles, and only on Pareto-owned tables.
-- Never revoke privileges across unrelated schemas or other project tables.
DO $$
DECLARE
  api_role text;
BEGIN
  FOR api_role IN
    SELECT rolname FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'service_role')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public."Candidate", public."Skill", public."CandidateSkill", public."SearchSession", public."SearchRevision" FROM %I',
      api_role
    );
    IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM %I',
        api_role
      );
    END IF;
  END LOOP;
END
$$;

-- End security migration
COMMIT;

-- Read-only checks: 5 tables and relrowsecurity true for each.
SELECT count(*) AS pareto_table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Candidate','Skill','CandidateSkill','SearchSession','SearchRevision');
SELECT relname, relrowsecurity FROM pg_class WHERE oid IN ('public."Candidate"'::regclass,'public."Skill"'::regclass,'public."CandidateSkill"'::regclass,'public."SearchSession"'::regclass,'public."SearchRevision"'::regclass) ORDER BY relname;
