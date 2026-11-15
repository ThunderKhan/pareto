# AE-04: Durable cross-replica attempt quotas

**Status:** Implemented behind an explicit opt-in; not deployed to the target Supabase project.

The migration creates private server-only `AiRequestQuota` records using hourly windows based on PostgreSQL time. Each model attempt atomically reserves one **global** and one **recruiter** count, including any fallback or retried provider call. Failed attempts are not refunded. The global row is acquired before the owner row, and a failed reservation rolls back both increments.

AI calls are still bounded locally by `AiProcessLimiter`. Shared hourly call quotas are enabled only with `AI_DURABLE_QUOTA_ENABLED=true` on all API and worker instances. Use `AI_MAX_CALLS_PER_RECRUITER_HOUR` and `AI_MAX_GLOBAL_CALLS_PER_HOUR` for the limits. No CV text, prompt, model response, key or other source content is stored in the quota table.

## Operator sequence

1. Review exact migration and confirm the intended Supabase/PostgreSQL project. Run disposable PostgreSQL CI first.
2. Apply `pnpm db:deploy` only to that authorized project. Check migration status and effective DB role permissions.
3. Configure the flag and the hourly limits across the API and dedicated ingestion workers; restart each runtime.
4. Test two authenticated owners, fallback consumption, global exhaustion, and model outage. The fail-closed path must not bypass a limit when DB is unavailable.
5. Keep `AI_ENABLED=false` as the independent emergency kill switch.

## Honest limits

This is a durable **call-attempt** quota, not a money-denominated daily budget or bill. There is no verified provider-specific cost table and no guaranteed token billing. Records are durable until a reviewed retention cleanup is configured. The flag remains off by default because the target environment has not been migrated or verified.

Offline tests exercise atomic PostgreSQL transactions; no live provider credentials or private applicant data are used.
