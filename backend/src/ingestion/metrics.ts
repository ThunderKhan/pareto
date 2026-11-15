import { database } from "../search/db";

/** Owner-scoped actual measurements. Never infer candidate quality/accuracy from
 * job status, and never return PII, raw source text or provider payloads.
 */
export async function ingestionMetrics(ownerId: string, days = 30) {
  if (![1,7,30,90].includes(days)) throw new Error("Invalid metrics window.");
  const since = new Date(Date.now() - days * 86400000);
  const db = database();
  const [documents, jobs, review, attempts, events] = await Promise.all([
    db.resumeDocument.groupBy({
      by: ["status"], where: { ownerId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.ingestionJob.groupBy({
      by: ["status"], where: { ownerId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.resumeDocument.groupBy({
      by: ["reviewState"], where: { ownerId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.$queryRaw<Array<{
      attempts: bigint; completed: bigint; retried: bigint; recovered: bigint;
      avgMs: number | null; p95Ms: number | null; avgParseMs: number | null;
      avgModelMs: number | null; avgPersistMs: number | null;
      avgChars: number | null; avgEvidence: number | null;
      avgVerifiedFields: number | null; measuredModelCalls: bigint;
    }>>`
      SELECT COUNT(*) AS "attempts",
        COUNT(*) FILTER (WHERE a."finishedAt" IS NOT NULL) AS "completed",
        COUNT(*) FILTER (WHERE a."outcome"='RETRY') AS "retried",
        COUNT(*) FILTER (WHERE a."outcome"='RECOVERED') AS "recovered",
        AVG(a."durationMs")::double precision AS "avgMs",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY a."durationMs")::double precision AS "p95Ms",
        AVG(a."parseMs")::double precision AS "avgParseMs",
        AVG(a."modelMs")::double precision AS "avgModelMs",
        AVG(a."persistMs")::double precision AS "avgPersistMs",
        AVG(a."sourceChars")::double precision AS "avgChars",
        AVG(a."evidenceCount")::double precision AS "avgEvidence",
        AVG(a."verifiedFields")::double precision AS "avgVerifiedFields",
        COUNT(*) FILTER (WHERE a."provider" IS NOT NULL) AS "measuredModelCalls"
      FROM "IngestionAttempt" a
      INNER JOIN "IngestionJob" j ON j."id"=a."jobId"
      WHERE j."ownerId"=${ownerId} AND a."startedAt">=${since}`,
    db.$queryRaw<Array<{
      extracted: bigint; reviewRequired: bigint; corrections: bigint;
      approved: bigint; rejected: bigint; correctedFields: bigint;
    }>>`
      SELECT COUNT(*) FILTER (WHERE "action"='MODEL_EXTRACTED') AS "extracted",
        COUNT(*) FILTER (WHERE "action"='REVIEW_REQUIRED') AS "reviewRequired",
        COUNT(*) FILTER (WHERE "action"='HUMAN_CORRECTED') AS "corrections",
        COUNT(*) FILTER (WHERE "action"='HUMAN_APPROVED') AS "approved",
        COUNT(*) FILTER (WHERE "action"='HUMAN_REJECTED') AS "rejected",
        COALESCE(SUM(COALESCE(array_length("changedFields",1),0))
          FILTER (WHERE "action" IN ('HUMAN_CORRECTED','HUMAN_REJECTED')),0) AS "correctedFields"
      FROM "ResumeProfileAudit"
      WHERE "ownerId"=${ownerId} AND "createdAt">=${since}`,
  ]);
  const dist = (rows: { status?: string; reviewState?: string; _count: { _all: number } }[],
    field: "status"|"reviewState") =>
    Object.fromEntries(rows.map(row => [row[field],row._count._all]));
  const a = attempts[0], q = events[0];
  const count = (x: bigint) => Number(x);
  const rounded = (v: number | null) => v === null ? null : Math.round(v);
  return {
    windowDays: days, from: since.toISOString(), measuredAt: new Date().toISOString(),
    documents: dist(documents,"status"), jobs: dist(jobs,"status"),
    reviewStates: dist(review,"reviewState"),
    attempts: {
      total: count(a.attempts), completed: count(a.completed), retries: count(a.retried),
      recovered: count(a.recovered), modelAttributed: count(a.measuredModelCalls),
      averageDurationMs: rounded(a.avgMs), p95DurationMs: rounded(a.p95Ms),
      averageParseMs: rounded(a.avgParseMs), averageModelMs: rounded(a.avgModelMs),
      averagePersistenceMs: rounded(a.avgPersistMs),
      averageSourceChars: rounded(a.avgChars), averageEvidenceCount: rounded(a.avgEvidence),
      averageVerifiedFields: rounded(a.avgVerifiedFields),
    },
    qualityActivity: {
      modelExtractions: count(q.extracted), reviewRequiredEvents: count(q.reviewRequired),
      correctionEvents: count(q.corrections), approvals: count(q.approved),
      rejections: count(q.rejected), changedFields: count(q.correctedFields),
    },
    caveats: [
      "Operational metrics are not measured extraction accuracy.",
      "Human corrections are a reviewed subset; not an unbiased accuracy estimate.",
      "Model-attributed attempts are not billing or token records.",
      "Null latency indicates no samples in the selected period.",
    ],
  };
}
