import { afterAll, describe, expect, it } from "vitest";
import { database } from "../search/db";
import type { ResumeStorage } from "./storage";
import type { JsonProvider } from "../search/interpret";
import { queueResumeUpload, resumeImport } from "./service";
import { processClaim } from "./processor";
import {
  claimJob, heartbeatJob, changeStage, finishJob, failJob, recoverExpiredJobs,
  recoverUnqueuedDocuments, retryQueuedDocument, cancelQueuedDocument,
  scheduleBatch, listBatches, jobHistory, retryDelaySeconds, configLimit, LeaseLost,
} from "./queue";
import { workOnce } from "./runner";
import { recoverInterruptedUploads } from "./reconcile";
import { validateResume } from "./parse";
import { randomUUID } from "node:crypto";

const url = process.env.PARETO_TEST_DATABASE_URL;
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
if (url) process.env.DATABASE_URL = url;
const text = "Asha Example\nSenior Java Developer\nHyderabad\n6 years experience\nJava, AWS\nNotice period: 30 days\n";
const provider: JsonProvider = async () => ({
  provider: "Gemini", raw: {
    displayName: "Asha Example", roleTitle: "Senior Java Developer", city: "Hyderabad",
    experienceMonths: 72, noticePeriodDays: 30,
    industry: null, education: null, employmentType: null,
    skills: ["Java", "AWS"], pastRoles: [], certifications: [],
    warnings: [],
    evidence: [
      { field: "displayName", quote: "Asha Example" },
      { field: "roleTitle", quote: "Senior Java Developer" },
      { field: "city", quote: "Hyderabad" },
      { field: "experienceMonths", quote: "6 years experience" },
      { field: "noticePeriodDays", quote: "30 days" },
      { field: "skill:Java", quote: "Java, AWS" },
      { field: "skill:AWS", quote: "Java, AWS" },
    ],
  },
});
function vault() {
  const objects = new Map<string, Buffer>();
  const storage: ResumeStorage = {
    async upload(key, file) { objects.set(key, Buffer.from(file.bytes)); },
    async read(key) { const result = objects.get(key); if (!result) throw Error("source missing"); return result; },
    async signedUrl(key) { return "https://private.invalid/" + encodeURIComponent(key); },
    async remove(key) { objects.delete(key); },
  };
  return { storage, objects };
}
function fixture(n: string) { return Buffer.from(text + "\nunique import " + n); }

describe("queue scheduling calculations", () => {
  it("uses capped exponential delays with explicit bounded jitter", () => {
    expect(retryDelaySeconds(1, 0)).toBe(5);
    expect(retryDelaySeconds(2, 0)).toBe(10);
    expect(retryDelaySeconds(3, 0)).toBe(20);
    expect(retryDelaySeconds(3, 1)).toBe(25);
    expect(retryDelaySeconds(20, 1)).toBe(300);
    expect(() => retryDelaySeconds(0)).toThrow();
  });
  it("validates all configured worker resource limits", () => {
    const saved = process.env.INGEST_WORKER_CONCURRENCY;
    try {
      process.env.INGEST_WORKER_CONCURRENCY = "900";
      expect(() => configLimit("INGEST_WORKER_CONCURRENCY", 2, 1, 4)).toThrow();
      process.env.INGEST_WORKER_CONCURRENCY = "2";
      expect(configLimit("INGEST_WORKER_CONCURRENCY", 1, 1, 4)).toBe(2);
    } finally {
      if (saved === undefined) delete process.env.INGEST_WORKER_CONCURRENCY;
      else process.env.INGEST_WORKER_CONCURRENCY = saved;
    }
  });
});

describe.skipIf(!url)("PostgreSQL durable ingestion queue", () => {
  const db = url ? database() : (undefined as never);
  const ids: string[] = [], batchIds: string[] = [];
  afterAll(async () => {
    await db.candidate.deleteMany({ where: { sourceDocumentId: { in: ids } } });
    await db.resumeDocument.deleteMany({ where: { id: { in: ids } } });
    await db.ingestionBatch.deleteMany({ where: { id: { in: batchIds } } });
    await db.$disconnect();
  });
  async function queue(suffix: string, user = owner, storage = vault().storage) {
    const result = await queueResumeUpload(user, "cv-" + suffix + ".txt",
      "text/plain", fixture(suffix), storage);
    ids.push(result.document.id);
    return result;
  }
  it("uploads only once, enqueues immediately, and never runs AI on the HTTP path", async () => {
    const { storage } = vault();
    const created = await queue("a", owner, storage);
    expect(created).toMatchObject({ duplicate: false,
      document: { status: "STORED", attempts: 0,
        ingestionJob: { status: "QUEUED", attempts: 0 } } });
    expect(await db.candidate.count({ where: { sourceDocumentId: created.document.id } })).toBe(0);
    const again = await queueResumeUpload(owner, "duplicate.txt", "text/plain", fixture("a"), storage);
    expect(again.duplicate).toBe(true);
    expect(again.document.id).toBe(created.document.id);
    expect(await db.ingestionJob.count({ where: { documentId: created.document.id } })).toBe(1);
    await expect(resumeImport(foreign, created.document.id)).rejects.toMatchObject({ status: 404 });
    const claim = await claimJob("test-one", { global: 1, perOwner: 1 });
    expect(claim?.documentId).toBe(created.document.id);
    const state = await processClaim(claim!, { storage, providers: [provider] });
    expect(state).toBe("READY");
    expect((await resumeImport(owner, created.document.id))).toMatchObject({
      status: "READY", ingestionJob: { status: "READY", attempts: 1 },
      candidate: { displayName: "Asha Example" },
    });
    const evidence = await db.resumeEvidence.findMany({ where: { documentId: created.document.id } });
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: "noticePeriodDays", quote: "30 days" }),
    ]));
  });
  it("globally/per-owner limits active claims, and no workers can own one job twice", async () => {
    const { storage } = vault();
    const a = await queue("b", owner, storage);
    const b = await queue("c", owner, storage);
    const c = await queue("d", foreign, storage);
    const first = await claimJob("limit-1", { global: 2, perOwner: 1 });
    expect(first?.ownerId).toBe(owner);
    const second = await claimJob("limit-2", { global: 2, perOwner: 1 });
    expect(second?.ownerId).toBe(foreign);
    expect(second?.id).not.toBe(first?.id);
    expect(await claimJob("limit-3", { global: 2, perOwner: 1 })).toBeNull();
    expect(await heartbeatJob(first!)).toBe(true);
    await processClaim(first!, { storage, providers: [provider] });
    await processClaim(second!, { storage, providers: [provider] });
    const third = await claimJob("limit-3", { global: 2, perOwner: 1 });
    expect(third?.documentId).toBe(b.document.id);
    await processClaim(third!, { storage, providers: [provider] });
    expect((await resumeImport(owner, a.document.id)).status).toBe("READY");
    expect((await resumeImport(foreign, c.document.id)).status).toBe("READY");
  });
  it("batches due jobs atomically and protects foreign records", async () => {
    const { storage } = vault();
    const a = await queue("e", owner, storage);
    const b = await queue("f", owner, storage);
    const x = await queue("g", foreign, storage);
    const scheduled = new Date(Date.now() + 30 * 60_000);
    const batch = await scheduleBatch(owner, [a.document.id, b.document.id], scheduled, "Afternoon");
    batchIds.push(batch.id);
    expect(batch.documentCount).toBe(2);
    const list = await listBatches(owner);
    expect(list.find(v => v.id === batch.id)).toMatchObject({ total: 2, byStatus: { QUEUED: 2 } });
    await expect(scheduleBatch(owner, [x.document.id], new Date())).rejects.toMatchObject({ status: 404 });
    await expect(scheduleBatch(owner, [a.document.id], new Date())).rejects.toMatchObject({ status: 409 });
    await expect(scheduleBatch(owner, [a.document.id, a.document.id], new Date()))
      .rejects.toMatchObject({ status: 422 });
    // The foreign job can be independently handled; scheduled future jobs do not run early.
    const due = await claimJob("batch-independent", { global: 2, perOwner: 2 });
    expect(due?.documentId).toBe(x.document.id);
    await processClaim(due!, { storage, providers: [provider] });
    expect(await claimJob("batch-waits", { global: 2, perOwner: 2 })).toBeNull();
    await db.ingestionJob.updateMany({ where: { documentId: { in: [a.document.id,b.document.id] } },
      data: { runAfter: new Date(Date.now() - 2000) } });
    const count = await Promise.all([workOnce("batch-one", { global: 2, perOwner: 2 }, { storage, providers: [provider] }),
      workOnce("batch-two", { global: 2, perOwner: 2 }, { storage, providers: [provider] })]);
    // Advisory-locked claims can conservatively return false under contention,
    // so run one more drain to handle whichever job did not claim.
    if (!count.every(Boolean)) await workOnce("batch-three", { global: 2, perOwner: 2 }, { storage, providers: [provider] });
    expect((await listBatches(owner)).find(v => v.id === batch.id)?.byStatus.READY).toBe(2);
  });
  it("retries transient failures with backoff and recovers into an idempotent profile", async () => {
    const { storage } = vault();
    const created = await queue("h", owner, storage);
    const transient: ResumeStorage = { ...storage, async read() { throw Error("temporary network failure"); } };
    const first = await claimJob("temporary", { global: 1, perOwner: 1 });
    await processClaim(first!, { storage: transient, providers: [provider] });
    let job = await db.ingestionJob.findUniqueOrThrow({ where: { documentId: created.document.id } });
    expect(job).toMatchObject({ status: "RETRY_SCHEDULED", attempts: 1, lastErrorCode: "PROCESSING_FAILED" });
    expect(job.runAfter.getTime()).toBeGreaterThan(Date.now());
    expect(await claimJob("early", { global: 1, perOwner: 1 })).toBeNull();
    await db.ingestionJob.update({ where: { id: job.id }, data: { runAfter: new Date(Date.now()-1000) } });
    const next = await claimJob("recovered", { global: 1, perOwner: 1 });
    expect(next?.attempts).toBe(2);
    await processClaim(next!, { storage, providers: [provider] });
    expect(await db.candidate.count({ where: { sourceDocumentId: created.document.id } })).toBe(1);
    job = await db.ingestionJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(job.status).toBe("READY");
    expect((await jobHistory(owner, created.document.id)).history.map(x => x.outcome)).toEqual(["RETRY", "READY"]);
  });
  it("reclaims expired leases and fences obsolete workers from writing", async () => {
    const { storage } = vault();
    const created = await queue("i", owner, storage);
    const old = await claimJob("crashed", { global: 2, perOwner: 2 });
    expect(old?.documentId).toBe(created.document.id);
    await db.ingestionJob.update({ where: { id: old!.id },
      data: { leaseExpiresAt: new Date(Date.now()-1000) } });
    expect(await recoverExpiredJobs()).toBeGreaterThanOrEqual(1);
    expect(await heartbeatJob(old!)).toBe(false);
    await expect(finishJob(old!, "READY", { status: "READY" }))
      .rejects.toBeInstanceOf(LeaseLost);
    const after = await db.ingestionJob.findUniqueOrThrow({ where: { id: old!.id } });
    expect(after).toMatchObject({ status: "RETRY_SCHEDULED", lastErrorCode: "WORKER_LEASE_EXPIRED" });
    await db.ingestionJob.update({ where: { id: old!.id },
      data: { runAfter: new Date(Date.now()-1000) } });
    const current = await claimJob("replacement", { global: 2, perOwner: 2 });
    expect(current?.leaseToken).not.toBe(old?.leaseToken);
    await processClaim(current!, { storage, providers: [provider] });
    expect((await resumeImport(owner, created.document.id)).status).toBe("READY");
    expect((await jobHistory(owner, created.document.id)).history[0].outcome).toBe("RECOVERED");
  });
  it("requires human review after unverifiable extraction and allows bounded manual requeue", async () => {
    const { storage } = vault();
    const created = await queue("j", owner, storage);
    const missing: JsonProvider = async () => { throw Error("provider unavailable"); };
    for (let attempt = 1; attempt <= 3; attempt++) {
      const claimed = await claimJob("provider-down", { global: 1, perOwner: 1 });
      expect(claimed?.attempts).toBe(attempt);
      await processClaim(claimed!, { storage, providers: [missing] });
      if (attempt < 3) await db.ingestionJob.update({
        where: { id: claimed!.id }, data: { runAfter: new Date(Date.now()-1000) },
      });
    }
    const final = await db.ingestionJob.findUniqueOrThrow({ where: { documentId: created.document.id } });
    expect(final).toMatchObject({ status: "NEEDS_REVIEW", attempts: 3 });
    expect((await resumeImport(owner, created.document.id)).candidate).toBeNull();
    await expect(retryQueuedDocument(foreign, created.document.id)).rejects.toMatchObject({ status: 404 });
    const retry = await retryQueuedDocument(owner, created.document.id);
    expect(retry).toMatchObject({ status: "QUEUED", manualRetries: 1, attempts: 0 });
    const claimed = await claimJob("operator-retry", { global: 1, perOwner: 1 });
    expect(claimed?.generation).toBe(1);
    await processClaim(claimed!, { storage, providers: [provider] });
    expect((await jobHistory(owner, created.document.id)).history).toHaveLength(4);
    expect(await db.candidate.count({ where: { sourceDocumentId: created.document.id } })).toBe(1);
    await expect(retryQueuedDocument(owner, created.document.id)).rejects.toMatchObject({ status: 409 });
  });
  it("can cancel queued jobs without processing, and prevents cancellation of completed jobs", async () => {
    const { storage } = vault();
    const created = await queue("k", owner, storage);
    await expect(cancelQueuedDocument(foreign, created.document.id)).rejects.toMatchObject({ status: 404 });
    expect(await cancelQueuedDocument(owner, created.document.id)).toEqual({ status: "CANCELLED" });
    expect((await resumeImport(owner, created.document.id)).errorCode).toBe("CANCELLED");
    expect(await claimJob("no-cancelled", { global: 1, perOwner: 1 })).toBeNull();
    await expect(cancelQueuedDocument(owner, created.document.id)).rejects.toMatchObject({ status: 409 });
  });
  it("recreates a durable queue entry for a stale stored-but-unqueued document", async () => {
    const { storage } = vault();
    const created = await queue("l", owner, storage);
    await db.ingestionJob.delete({ where: { documentId: created.document.id } });
    await db.resumeDocument.update({ where: { id: created.document.id }, data: {
      updatedAt: new Date(Date.now()-120_000), status: "STORED",
    } });
    expect(await recoverUnqueuedDocuments()).toBeGreaterThanOrEqual(1);
    expect(await db.ingestionJob.count({ where: { documentId: created.document.id } })).toBe(1);
    const next = await claimJob("orphan-recovered", { global: 1, perOwner: 1 });
    await processClaim(next!, { storage, providers: [provider] });
    expect((await resumeImport(owner, created.document.id)).status).toBe("READY");
  });
  it("reconciles crashed HTTP uploads and marks truly missing objects for reupload", async () => {
    const { storage } = vault();
    const id = randomUUID(), key = owner + "/" + id + ".txt";
    const source = validateResume("interrupted.txt", "text/plain", fixture("m"));
    ids.push(id);
    await storage.upload(key, source);
    await db.resumeDocument.create({ data: {
      id, ownerId: owner, fileName: "interrupted.txt", kind: "TXT",
      mimeType: "text/plain", byteSize: source.bytes.length,
      sha256: source.sha256, storageKey: key, status: "RECEIVED",
      updatedAt: new Date(Date.now()-420000), attempts: 0,
    } });
    const recovered = await recoverInterruptedUploads(storage, 300000);
    expect(recovered.recovered).toBeGreaterThanOrEqual(1);
    expect(await db.ingestionJob.count({ where: { documentId: id } })).toBe(1);
    expect((await resumeImport(owner, id)).status).toBe("STORED");
    await workOnce("recovered-upload", {global:1,perOwner:1}, {storage,providers:[provider]});
    expect((await resumeImport(owner,id)).status).toBe("READY");

    const lostId = randomUUID();
    ids.push(lostId);
    await db.resumeDocument.create({ data: {
      id: lostId, ownerId: owner, fileName: "missing.txt", kind: "TXT",
      mimeType: "text/plain", byteSize: source.bytes.length,
      sha256: "f".repeat(64), storageKey: owner+"/"+lostId+".txt",
      status: "RECEIVED", updatedAt: new Date(Date.now()-420000), attempts: 0,
    } });
    const lost = await recoverInterruptedUploads(storage,300000);
    expect(lost.requiresReupload).toBeGreaterThanOrEqual(1);
    expect((await resumeImport(owner,lostId))).toMatchObject({
      status: "FAILED", errorCode: "REUPLOAD_REQUIRED", ingestionJob: null,
    });
  });

});
