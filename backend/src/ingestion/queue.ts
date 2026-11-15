import { randomUUID } from "node:crypto";
import { database } from "../search/db";
import type { Prisma } from "../generated/prisma/client";

export class JobConflict extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export class LeaseLost extends Error {
  constructor() { super("The worker no longer owns the job lease."); }
}
export type ClaimedJob = { id: string; ownerId: string; documentId: string; leaseToken: string;
  attempts: number; maxAttempts: number; generation: number; cancelRequested: boolean };
export const MAX_BATCH_DOCUMENTS = 50;
export const LEASE_SECONDS = 120;
const MAX_MANUAL_RETRIES = 2;
export function configLimit(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(name + " must be " + min + "–" + max);
  return n;
}
export function retryDelaySeconds(attempt: number, jitter = 0) {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error("Invalid attempt.");
  const base = Math.min(300, 5 * 2 ** Math.min(8, attempt - 1));
  return Math.min(300, Math.ceil(base * (1 + Math.max(0, Math.min(1, jitter)) * 0.25)));
}
const publicJob = {
  id: true, documentId: true, batchId: true, status: true, stage: true,
  attempts: true, maxAttempts: true, manualRetries: true, runAfter: true,
  cancelRequested: true, lastErrorCode: true, startedAt: true, finishedAt: true,
  createdAt: true, updatedAt: true,
} as const;
export async function enqueueStoredDocument(ownerId: string, documentId: string) {
  return database().$transaction(async tx => {
    const doc = await tx.resumeDocument.findFirst({ where: { id: documentId, ownerId },
      select: { status: true } });
    if (!doc) throw new JobConflict(404, "NOT_FOUND", "Resume unavailable.");
    if (doc.status !== "STORED") throw new JobConflict(409, "NOT_STORED", "Resume upload is not complete.");
    const job = await tx.ingestionJob.upsert({
      where: { documentId }, update: {},
      create: { documentId, ownerId, attempts: 0, maxAttempts: 3 },
    });
    if (job.ownerId !== ownerId) throw new JobConflict(404, "NOT_FOUND", "Resume unavailable.");
    return job;
  });
}
export async function jobForDocument(ownerId: string, documentId: string) {
  return database().ingestionJob.findFirst({ where: { ownerId, documentId }, select: publicJob });
}
export async function jobHistory(ownerId: string, documentId: string) {
  const job = await database().ingestionJob.findFirst({ where: { ownerId, documentId },
    select: { ...publicJob, history: { select: { attempt: true, outcome: true,
      errorCode: true, startedAt: true, finishedAt: true,
      durationMs: true, parseMs: true, modelMs: true, persistMs: true,
      sourceChars: true, evidenceCount: true, verifiedFields: true,
      provider: true, extractorVersion: true },
      orderBy: { attempt: "asc" as const } } } });
  if (!job) throw new JobConflict(404, "NOT_FOUND", "Import job not found.");
  return job;
}
export async function listJobs(ownerId: string) {
  return database().ingestionJob.findMany({ where: { ownerId }, select: publicJob,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 });
}
export async function scheduleBatch(ownerId: string, documentIds: string[], runAfter: Date, label?: string) {
  if (!documentIds.length || documentIds.length > MAX_BATCH_DOCUMENTS ||
      new Set(documentIds).size !== documentIds.length ||
      documentIds.some(x => !/^[0-9a-f-]{36}$/i.test(x)))
    throw new JobConflict(422, "INVALID_BATCH", "Specify 1–50 distinct uploaded IDs.");
  if (Number.isNaN(runAfter.getTime()) || runAfter.getTime() < Date.now()-60000 ||
      runAfter.getTime() > Date.now()+604800000)
    throw new JobConflict(422, "INVALID_TIME", "Schedule within the next seven days.");
  if (label && label.length > 100) throw new JobConflict(422, "INVALID_LABEL", "Label too long.");
  return database().$transaction(async tx => {
    const jobs = await tx.ingestionJob.findMany({ where: { ownerId, documentId: { in: documentIds } },
      select: { id: true, status: true, batchId: true } });
    if (jobs.length !== documentIds.length) throw new JobConflict(404, "NOT_FOUND",
      "A selected resume is unavailable or belongs to another recruiter.");
    if (jobs.some(x => x.batchId || x.status !== "QUEUED"))
      throw new JobConflict(409, "ALREADY_STARTED", "Only unscheduled queued jobs can be grouped.");
    const batch = await tx.ingestionBatch.create({ data: { ownerId, label: label ?? null } });
    const written = await tx.ingestionJob.updateMany({
      where: { id: { in: jobs.map(x => x.id) }, ownerId, status: "QUEUED", batchId: null },
      data: { batchId: batch.id, runAfter },
    });
    if (written.count !== documentIds.length) throw new JobConflict(409, "CHANGED",
      "A job started while this batch was being scheduled.");
    return { id: batch.id, label: batch.label, runAfter, documentCount: written.count };
  });
}
export async function listBatches(ownerId: string) {
  const batches = await database().ingestionBatch.findMany({ where: { ownerId },
    orderBy: { createdAt: "desc" }, take: 30,
    include: { jobs: { select: { documentId: true, status: true } } } });
  return batches.map(({ jobs, ...batch }) => ({
    ...batch, total: jobs.length,
    byStatus: jobs.reduce((counts, job) => {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>),
    documents: jobs,
  }));
}
/** Database-wide global and per-owner concurrency check under advisory xact lock.
 * Atomic claim + attempt insert; SKIP LOCKED prevents duplicate work.
 */
export async function claimJob(workerId: string, limits: { global: number; perOwner: number }) {
  if (!workerId || workerId.length > 100 || limits.global < 1 || limits.perOwner < 1)
    throw new Error("Invalid worker capacity settings.");
  const token = randomUUID(), attemptId = randomUUID();
  const rows = await database().$queryRaw<ClaimedJob[]>`
    WITH gate AS MATERIALIZED (SELECT pg_try_advisory_xact_lock(61423, 2026) AS ok),
    next_job AS MATERIALIZED (
      SELECT j."id" FROM "IngestionJob" j CROSS JOIN gate g
      WHERE g.ok AND j."status" IN ('QUEUED','RETRY_SCHEDULED')
        AND j."runAfter"<=NOW() AND j."attempts"<j."maxAttempts"
        AND j."cancelRequested"=false
        AND (SELECT COUNT(*) FROM "IngestionJob" r
           WHERE r."status"='RUNNING' AND r."leaseExpiresAt">NOW()) < ${limits.global}
        AND (SELECT COUNT(*) FROM "IngestionJob" o
           WHERE o."status"='RUNNING' AND o."ownerId"=j."ownerId"
             AND o."leaseExpiresAt">NOW()) < ${limits.perOwner}
      ORDER BY j."runAfter" ASC, j."priority" DESC, j."createdAt" ASC
      FOR UPDATE OF j SKIP LOCKED LIMIT 1
    ), claimed AS (
      UPDATE "IngestionJob" j SET "status"='RUNNING', "stage"='PARSING',
        "attempts"=j."attempts"+1, "leaseToken"=${token}, "workerId"=${workerId},
        "leaseExpiresAt"=NOW()+INTERVAL '120 seconds', "heartbeatAt"=NOW(),
        "startedAt"=COALESCE(j."startedAt",NOW()), "updatedAt"=NOW()
      FROM next_job n WHERE j."id"=n."id"
      RETURNING j."id", j."ownerId", j."documentId", j."leaseToken", j."attempts",
        j."maxAttempts", j."generation", j."cancelRequested"
    ), audit AS (
      INSERT INTO "IngestionAttempt" ("id","jobId","attempt","generation","leaseToken","workerId","outcome","startedAt")
      SELECT ${attemptId}, c."id",c."attempts",c."generation",${token},${workerId},'RUNNING',NOW() FROM claimed c
      RETURNING "jobId"
    ), document_state AS (
      UPDATE "ResumeDocument" d SET
        "status"='PROCESSING', "attempts"=c."attempts", "updatedAt"=NOW()
      FROM claimed c WHERE d."id"=c."documentId" RETURNING d."id"
    )
    SELECT c.* FROM claimed c JOIN audit a ON a."jobId"=c."id"
      JOIN document_state d ON d."id"=c."documentId"`;
  return rows[0] ?? null;
}
export async function heartbeatJob(job: ClaimedJob) {
  const count = await database().$executeRaw`
    UPDATE "IngestionJob" SET "heartbeatAt"=NOW(),
      "leaseExpiresAt"=NOW()+INTERVAL '120 seconds', "updatedAt"=NOW()
    WHERE "id"=${job.id} AND "leaseToken"=${job.leaseToken}
      AND "status"='RUNNING' AND "leaseExpiresAt">NOW()
      AND "cancelRequested"=false`;
  return count === 1;
}
export async function changeStage(job: ClaimedJob, stage: "PARSING"|"EXTRACTING"|"PERSISTING") {
  const count = await database().$executeRaw`
    UPDATE "IngestionJob" SET "stage"=${stage}::"IngestionJobStage", "updatedAt"=NOW()
    WHERE "id"=${job.id} AND "leaseToken"=${job.leaseToken}
      AND "status"='RUNNING' AND "leaseExpiresAt">NOW()
      AND "cancelRequested"=false`;
  if (count !== 1) throw new LeaseLost();
}
export type JobTx = Prisma.TransactionClient;
export type AttemptMetrics = {
  durationMs?: number; parseMs?: number; modelMs?: number; sourceChars?: number;
  evidenceCount?: number; verifiedFields?: number; provider?: string | null;
  extractorVersion?: string;
};
function measured(metrics?: AttemptMetrics) {
  if (!metrics) return {};
  const count = (value: number | undefined) => value === undefined ? undefined
    : Math.min(86_400_000, Math.max(0, Math.round(value)));
  return {
    durationMs: count(metrics.durationMs),
    parseMs: count(metrics.parseMs),
    modelMs: count(metrics.modelMs),
    sourceChars: count(metrics.sourceChars),
    evidenceCount: count(metrics.evidenceCount),
    verifiedFields: count(metrics.verifiedFields),
    provider: metrics.provider ?? null,
    extractorVersion: metrics.extractorVersion ?? null,
  };
}
/** Fenced transaction: any extracted candidate write occurs AFTER the lease
 * gate update, in the SAME transaction, protecting against stale workers.
 */
export async function finishJob(
  job: ClaimedJob,
  outcome: "READY"|"NEEDS_REVIEW"|"FAILED_PERMANENT"|"CANCELLED",
  document: { status: "READY"|"NEEDS_REVIEW"|"FAILED"; errorCode?: string|null;
    reviewReasons?: string[]; provider?: string|null; extractedText?: string;
    textTruncated?: boolean; metrics?: AttemptMetrics },
  sideEffects?: (tx: JobTx) => Promise<void>,
) {
  return database().$transaction(async tx => {
    const owned = await tx.$queryRaw<{id:string}[]>`
      UPDATE "IngestionJob" SET "status"=${outcome}::"IngestionJobStatus",
        "stage"='COMPLETE', "leaseToken"=NULL, "leaseExpiresAt"=NULL,
        "workerId"=NULL, "heartbeatAt"=NULL, "finishedAt"=NOW(),
        "lastErrorCode"=${document.errorCode ?? null}, "updatedAt"=NOW()
      WHERE "id"=${job.id} AND "leaseToken"=${job.leaseToken}
        AND "status"='RUNNING' AND "leaseExpiresAt">NOW()
        AND ("cancelRequested"=false OR ${outcome}='CANCELLED')
      RETURNING "id"`;
    if (owned.length !== 1) throw new LeaseLost();
    const persistenceStartedAt = Date.now();
    if (sideEffects) await sideEffects(tx);
    await tx.resumeDocument.update({ where: { id: job.documentId },
      data: { status: document.status, errorCode: document.errorCode ?? null,
        reviewReasons: document.reviewReasons ?? [], provider: document.provider ?? null,
        reviewState: outcome === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "UNREVIEWED",
        ...(document.extractedText !== undefined ? { extractedText: document.extractedText } : {}),
        ...(document.textTruncated !== undefined ? { textTruncated: document.textTruncated } : {}) },
    });
    await tx.ingestionAttempt.updateMany({ where: { jobId: job.id,
      leaseToken: job.leaseToken, outcome: "RUNNING" },
      data: { outcome: outcome === "FAILED_PERMANENT" ? "FAILED" : outcome,
        errorCode: document.errorCode ?? null, finishedAt: new Date(),
        ...measured(document.metrics),
        persistMs: Date.now() - persistenceStartedAt,
      } });
    if (outcome === "NEEDS_REVIEW" && !sideEffects) {
      await tx.resumeProfileAudit.create({ data: {
        ownerId: job.ownerId, documentId: job.documentId,
        action: "REVIEW_REQUIRED", reviewVersion: 0,
        changedFields: [], provider: document.metrics?.provider ?? null,
        extractorVersion: document.metrics?.extractorVersion ?? null,
        jobId: job.id, attempt: job.attempts,
        reason: "Automated extraction did not yield a verified candidate.",
      } });
    }
  }, { maxWait: 10000, timeout: 30000 });
}
export async function failJob(job: ClaimedJob, code: string, retryable: boolean,
  finalReview = false, jitter = Math.random(), metrics?: AttemptMetrics) {
  const terminal = !retryable || job.attempts >= job.maxAttempts;
  if (terminal) return finishJob(job, finalReview ? "NEEDS_REVIEW" : "FAILED_PERMANENT",
    { status: finalReview ? "NEEDS_REVIEW" : "FAILED", errorCode: code,
      reviewReasons: [finalReview ? "Extraction needs verification." : "Processing could not complete."],
      metrics });
  const delay = retryDelaySeconds(job.attempts, jitter);
  return database().$transaction(async tx => {
    const owned = await tx.$queryRaw<{id:string}[]>`
      UPDATE "IngestionJob" SET "status"='RETRY_SCHEDULED', "stage"='QUEUED',
        "runAfter"=NOW()+(${delay}::int*INTERVAL '1 second'),
        "leaseToken"=NULL, "leaseExpiresAt"=NULL, "workerId"=NULL,
        "heartbeatAt"=NULL, "lastErrorCode"=${code}, "updatedAt"=NOW()
      WHERE "id"=${job.id} AND "leaseToken"=${job.leaseToken}
        AND "status"='RUNNING' AND "leaseExpiresAt">NOW()
        AND "cancelRequested"=false RETURNING "id"`;
    if (owned.length !== 1) throw new LeaseLost();
    await tx.resumeDocument.update({ where: { id: job.documentId },
      data: { status: "STORED", errorCode: code,
        reviewReasons: ["Temporary processing problem; retry is scheduled."] } });
    await tx.ingestionAttempt.updateMany({ where: { jobId: job.id,
      leaseToken: job.leaseToken, outcome: "RUNNING" },
      data: { outcome: "RETRY", errorCode: code, finishedAt: new Date(),
        ...measured(metrics) } });
  });
}
/** Recover interrupted attempts, respecting the attempt budget and fencing. */
export async function recoverExpiredJobs(limit = 25) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid recovery bound.");
  return database().$transaction(async tx => {
    const rows = await tx.$queryRaw<{
      id: string; documentId: string; priorToken: string;
      status: "CANCELLED"|"RETRY_SCHEDULED"|"FAILED_PERMANENT";
    }[]>`
      WITH stale AS (
        SELECT "id","leaseToken" FROM "IngestionJob"
        WHERE "status"='RUNNING' AND "leaseExpiresAt"<=NOW()
        ORDER BY "leaseExpiresAt" ASC FOR UPDATE SKIP LOCKED LIMIT ${limit}
      )
      UPDATE "IngestionJob" j SET "status"=CASE
        WHEN j."cancelRequested" THEN 'CANCELLED'::"IngestionJobStatus"
        WHEN j."attempts">=j."maxAttempts" THEN 'FAILED_PERMANENT'::"IngestionJobStatus"
        ELSE 'RETRY_SCHEDULED'::"IngestionJobStatus" END,
        "stage"='QUEUED', "runAfter"=NOW()+INTERVAL '10 seconds',
        "leaseToken"=NULL,"leaseExpiresAt"=NULL,"heartbeatAt"=NULL,"workerId"=NULL,
        "lastErrorCode"='WORKER_LEASE_EXPIRED', "updatedAt"=NOW()
      FROM stale s WHERE j."id"=s."id"
      RETURNING j."id",j."documentId",s."leaseToken" AS "priorToken",j."status"`;
    for (const row of rows) {
      const final = row.status !== "RETRY_SCHEDULED";
      await tx.resumeDocument.update({ where: { id: row.documentId },
        data: { status: final ? "FAILED" : "STORED", errorCode: "WORKER_LEASE_EXPIRED",
          reviewReasons: [final ? "Worker interrupted; attempts exhausted or cancelled."
            : "Interrupted worker will be retried."] } });
      await tx.ingestionAttempt.updateMany({ where: { jobId: row.id,
        leaseToken: row.priorToken, outcome: "RUNNING" },
        data: { outcome: "RECOVERED", errorCode: "WORKER_LEASE_EXPIRED", finishedAt: new Date() } });
    }
    return rows.length;
  });
}
export async function recoverUnqueuedDocuments(limit = 25) {
  return database().$transaction(async tx => {
    const orphans = await tx.$queryRaw<{ id:string; ownerId:string }[]>`
      SELECT d."id",d."ownerId" FROM "ResumeDocument" d
      LEFT JOIN "IngestionJob" j ON j."documentId"=d."id"
      WHERE j."id" IS NULL AND d."status"='STORED'
        AND d."updatedAt"<NOW()-INTERVAL '30 seconds'
      ORDER BY d."createdAt" ASC FOR UPDATE OF d SKIP LOCKED LIMIT ${limit}`;
    for (const row of orphans) await tx.ingestionJob.create({
      data: { ownerId: row.ownerId, documentId: row.id } });
    return orphans.length;
  });
}
export async function retryQueuedDocument(ownerId: string, documentId: string) {
  return database().$transaction(async tx => {
    const job = await tx.ingestionJob.findFirst({
      where: { ownerId, documentId },
      include: { document: { select: { errorCode: true } } },
    });
    if (!job) throw new JobConflict(404, "NOT_FOUND", "Import job not found.");
    if (!["NEEDS_REVIEW","FAILED_PERMANENT"].includes(job.status))
      throw new JobConflict(409, "NOT_RETRYABLE", "Only failed/review jobs may be retried.");
    if (["STORAGE_FAILED","REUPLOAD_REQUIRED"].includes(job.document.errorCode ?? ""))
      throw new JobConflict(409, "REUPLOAD_REQUIRED", "Reupload after correcting private Storage.");
    if (job.manualRetries >= MAX_MANUAL_RETRIES)
      throw new JobConflict(409, "RETRY_LIMIT", "Manual retry limit reached.");
    const changed = await tx.ingestionJob.updateMany({ where: { id: job.id, ownerId,
      status: job.status, manualRetries: job.manualRetries },
      data: { status: "QUEUED", stage: "QUEUED", attempts: 0,
        manualRetries: { increment: 1 }, generation: { increment: 1 },
        runAfter: new Date(),
        lastErrorCode: null, cancelRequested: false, finishedAt: null } });
    if (!changed.count) throw new JobConflict(409, "JOB_CHANGED", "Reload job status.");
    await tx.resumeDocument.update({ where: { id: documentId },
      data: { status: "STORED", errorCode: null, reviewReasons: [] } });
    return tx.ingestionJob.findUniqueOrThrow({ where: { id: job.id }, select: publicJob });
  });
}
export async function cancelQueuedDocument(ownerId: string, documentId: string) {
  return database().$transaction(async tx => {
    const job = await tx.ingestionJob.findFirst({ where: { ownerId, documentId } });
    if (!job) throw new JobConflict(404, "NOT_FOUND", "Import job not found.");
    if (["READY","NEEDS_REVIEW","FAILED_PERMANENT","CANCELLED"].includes(job.status))
      throw new JobConflict(409, "JOB_COMPLETE", "This import has already completed.");
    if (job.status === "RUNNING") {
      const requested = await tx.ingestionJob.updateMany({
        where: { id: job.id, ownerId, status: "RUNNING", cancelRequested: false },
        data: { cancelRequested: true },
      });
      if (requested.count !== 1) throw new JobConflict(409, "JOB_CHANGED", "Reload job status.");
      return { status: "CANCELLATION_REQUESTED" as const };
    }
    const count = await tx.ingestionJob.updateMany({
      where: { id: job.id, ownerId, status: { in: ["QUEUED","RETRY_SCHEDULED"] } },
      data: { status: "CANCELLED", stage: "COMPLETE", cancelRequested: true,
        finishedAt: new Date() } });
    if (!count.count) throw new JobConflict(409, "JOB_CHANGED", "Reload job status.");
    await tx.resumeDocument.update({ where: { id: documentId },
      data: { status: "FAILED", errorCode: "CANCELLED", reviewReasons: ["Import cancelled."] } });
    return { status: "CANCELLED" as const };
  });
}
