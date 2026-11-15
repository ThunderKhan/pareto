-- Durable invalidation watermark shared by API instances and background workers.
-- The table contains only owner IDs and monotonic counts, never candidate data.
CREATE TABLE "CandidateSearchEpoch" (
  "ownerId" TEXT PRIMARY KEY,
  "version" BIGINT NOT NULL DEFAULT 0
);
REVOKE ALL ON TABLE "CandidateSearchEpoch" FROM PUBLIC;
DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "CandidateSearchEpoch" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "CandidateSearchEpoch" FROM authenticated;
  END IF;
END $roles$;

CREATE FUNCTION pareto_search_epoch_bump(p_owner TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
BEGIN
  IF p_owner IS NOT NULL THEN
    INSERT INTO public."CandidateSearchEpoch" ("ownerId","version") VALUES (p_owner, 1)
    ON CONFLICT ("ownerId") DO UPDATE
      SET "version" = "CandidateSearchEpoch"."version" + 1;
  END IF;
END $fn$;

CREATE FUNCTION pareto_search_epoch_candidate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
BEGIN
  IF TG_OP <> 'INSERT' THEN PERFORM pareto_search_epoch_bump(OLD."ownerId"); END IF;
  IF TG_OP <> 'DELETE' THEN
    IF TG_OP = 'INSERT' OR NEW."ownerId" IS DISTINCT FROM OLD."ownerId" THEN
      PERFORM pareto_search_epoch_bump(NEW."ownerId");
    ELSIF TG_OP = 'UPDATE' THEN
      PERFORM pareto_search_epoch_bump(NEW."ownerId");
    END IF;
  END IF;
  RETURN NULL;
END $fn$;

CREATE TRIGGER pareto_search_epoch_candidate AFTER INSERT OR UPDATE OR DELETE ON "Candidate"
FOR EACH ROW EXECUTE FUNCTION pareto_search_epoch_candidate();

CREATE FUNCTION pareto_search_epoch_skill_link() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
DECLARE old_owner TEXT; new_owner TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "ownerId" INTO old_owner FROM "Candidate" WHERE "id" = OLD."candidateId";
    PERFORM pareto_search_epoch_bump(old_owner);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT "ownerId" INTO new_owner FROM "Candidate" WHERE "id" = NEW."candidateId";
    IF TG_OP = 'INSERT' OR new_owner IS DISTINCT FROM old_owner THEN
      PERFORM pareto_search_epoch_bump(new_owner);
    ELSIF TG_OP = 'UPDATE' THEN PERFORM pareto_search_epoch_bump(new_owner); END IF;
  END IF;
  RETURN NULL;
END $fn$;
CREATE TRIGGER pareto_search_epoch_skill_link AFTER INSERT OR UPDATE OR DELETE ON "CandidateSkill"
FOR EACH ROW EXECUTE FUNCTION pareto_search_epoch_skill_link();

CREATE TRIGGER pareto_search_epoch_embedding AFTER INSERT OR UPDATE OR DELETE ON "CandidateEmbedding"
FOR EACH ROW EXECUTE FUNCTION pareto_search_epoch_candidate();

CREATE FUNCTION pareto_search_epoch_skill_label() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $fn$
DECLARE target_owner TEXT;
BEGIN
  IF NEW."displayName" IS DISTINCT FROM OLD."displayName" THEN
    FOR target_owner IN
      SELECT DISTINCT c."ownerId" FROM "CandidateSkill" cs
      JOIN "Candidate" c ON c."id" = cs."candidateId"
      WHERE cs."skillId" = NEW."id"
    LOOP
      PERFORM pareto_search_epoch_bump(target_owner);
    END LOOP;
  END IF;
  RETURN NULL;
END $fn$;
CREATE TRIGGER pareto_search_epoch_skill_label AFTER UPDATE OF "displayName" ON "Skill"
FOR EACH ROW EXECUTE FUNCTION pareto_search_epoch_skill_label();

REVOKE ALL ON FUNCTION pareto_search_epoch_bump(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pareto_search_epoch_candidate() FROM PUBLIC;
REVOKE ALL ON FUNCTION pareto_search_epoch_skill_link() FROM PUBLIC;
REVOKE ALL ON FUNCTION pareto_search_epoch_skill_label() FROM PUBLIC;
