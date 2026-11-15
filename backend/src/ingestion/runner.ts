import { randomUUID } from "node:crypto";
import { database } from "../search/db";
import { logger } from "../index";
import { processClaim, type ProcessingDependencies } from "./processor";
import { recoverInterruptedUploads } from "./reconcile";
import { claimJob, heartbeatJob, recoverExpiredJobs, recoverUnqueuedDocuments,
  finishJob, LeaseLost, configLimit, type ClaimedJob } from "./queue";

export type WorkerOptions = {
  id: string; concurrency: number; globalConcurrency: number; perOwnerConcurrency: number;
  pollMs: number; recoveryMs: number; signal: AbortSignal;
};
export function workerOptions(signal: AbortSignal): WorkerOptions {
  return {
    id: "ingest-" + process.pid + "-" + randomUUID().slice(0, 8),
    concurrency: configLimit("INGEST_WORKER_CONCURRENCY", 2, 1, 4),
    globalConcurrency: configLimit("INGEST_GLOBAL_CONCURRENCY", 4, 1, 16),
    perOwnerConcurrency: configLimit("INGEST_PER_OWNER_CONCURRENCY", 2, 1, 8),
    pollMs: configLimit("INGEST_WORKER_POLL_MS", 1500, 250, 30000),
    recoveryMs: configLimit("INGEST_RECOVERY_INTERVAL_MS", 15000, 1000, 300000),
    signal,
  };
}
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
/** Execute exactly one queued claim, with a lease heartbeat while its work runs. */
export async function workOnce(
  id: string, limits: {global: number; perOwner: number},
  deps: ProcessingDependencies = {},
) {
  const claimed = await claimJob(id, limits);
  if (!claimed) return false;
  await workClaimed(claimed, deps);
  return true;
}
async function workClaimed(claim: ClaimedJob, deps: ProcessingDependencies) {
  let heartbeating = false;
  const pulse = setInterval(() => {
    if (heartbeating) return;
    heartbeating = true;
    void heartbeatJob(claim).catch(() => false).finally(() => { heartbeating = false; });
  }, 15000);
  pulse.unref();
  try {
    const state = await processClaim(claim, deps);
    if (state === "LOST_LEASE") {
      // Running cancellations keep the original lease token until the worker
      // acknowledges them. A different/newer worker cannot be overwritten.
      try {
        await finishJob(claim, "CANCELLED", {
          status: "FAILED", errorCode: "CANCELLED",
          reviewReasons: ["Import cancelled by recruiter."],
        });
      } catch (error) {
        if (!(error instanceof LeaseLost)) throw error;
      }
    }
  } finally { clearInterval(pulse); }
}
/** Durable worker loop. Must run in a SUPERVISED dedicated process.
 * Polling is just a wake-up mechanism; queued jobs are durable in PostgreSQL.
 */
export async function runWorker(options: WorkerOptions, deps: ProcessingDependencies = {}) {
  const active = new Set<Promise<void>>();
  let recoveredAt = 0;
  while (!options.signal.aborted) {
    if (Date.now() - recoveredAt > options.recoveryMs) {
      recoveredAt = Date.now();
      try {
        await recoverExpiredJobs();
        await recoverUnqueuedDocuments();
        await recoverInterruptedUploads(deps.storage);
      } catch {
        logger.warn({ event: "ingestion_recovery_failed" }, "Ingestion recovery will retry.");
      }
    }
    let launched = false;
    while (!options.signal.aborted && active.size < options.concurrency) {
      let job: ClaimedJob | null = null;
      try {
        job = await claimJob(options.id, {
          global: options.globalConcurrency, perOwner: options.perOwnerConcurrency,
        });
      } catch {
        logger.warn({ event: "ingestion_claim_failed" }, "Worker claim unavailable.");
        break;
      }
      if (!job) break;
      const claimed = job;
      launched = true;
      const pending = workClaimed(claimed, deps)
        .catch(() => {
          // Never include provider exceptions or resume metadata in ordinary logs.
          logger.error({ event: "ingestion_attempt_interrupted" },
            "Ingestion attempt interrupted; lease recovery will reconcile.");
        }).finally(() => { active.delete(pending); });
      active.add(pending);
    }
    if (options.signal.aborted) break;
    if (!launched) await delay(options.pollMs);
    else await delay(100);
  }
  // Deployment should provide a shutdown grace period; if force-killed while
  // jobs run, abandoned leases are reclaimed by the next worker.
  await Promise.allSettled([...active]);
}
