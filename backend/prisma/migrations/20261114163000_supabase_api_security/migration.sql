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
