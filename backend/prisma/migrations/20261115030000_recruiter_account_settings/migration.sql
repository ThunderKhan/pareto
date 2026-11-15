-- Profile, owner-controlled company workspaces, and real in-app search notifications.
-- All access is through server-side Prisma after Supabase user verification.
-- No foreign keys to auth.users: local PostgreSQL CI has no Supabase auth schema.
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER','ADMIN','RECRUITER','VIEWER');
CREATE TYPE "RecruitmentNotificationKind" AS ENUM ('SEARCH_CONFIRMED','SEARCH_REFINED');

CREATE TABLE "RecruiterSettings" (
  "userId" TEXT NOT NULL,
  "jobTitle" TEXT,
  "notifyConfirmed" BOOLEAN NOT NULL DEFAULT true,
  "notifyRefined" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterSettings_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_ownerId_key" ON "Organization"("ownerId");

CREATE TABLE "WorkspaceMembership" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'RECRUITER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("organizationId","userId")
);

CREATE INDEX "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RecruiterNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "kind" "RecruitmentNotificationKind" NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "RecruiterNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecruiterNotification_userId_sessionId_version_key"
  ON "RecruiterNotification"("userId","sessionId","version");
CREATE INDEX "RecruiterNotification_userId_createdAt_idx"
  ON "RecruiterNotification"("userId","createdAt");
ALTER TABLE "RecruiterNotification" ADD CONSTRAINT "RecruiterNotification_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "SearchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prevent direct Supabase Data API access. Server uses privileged Postgres
-- credentials and always checks authenticated user/owner membership.
ALTER TABLE public."RecruiterSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkspaceMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RecruiterNotification" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE api_role TEXT;
BEGIN
  FOR api_role IN SELECT rolname FROM pg_roles
    WHERE rolname IN ('anon','authenticated','service_role')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."RecruiterSettings", public."Organization", public."WorkspaceMembership", public."RecruiterNotification" FROM %I', api_role);
  END LOOP;
END
$$;
