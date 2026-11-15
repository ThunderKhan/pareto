import { randomUUID, createHash } from "node:crypto";
import { isResumeIngestionEnabled } from "./policy";
import { database } from "../search/db";
import { skillKey } from "../search/criteria";
import { extractResumeProfile, type ResumeExtraction } from "./extract";
import type { JsonProvider } from "../search/interpret";
import { parseResume, validateResume, type CheckedResume, ResumeInputError } from "./parse";
import { supabaseResumeStorage, type ResumeStorage, StorageFailure } from "./storage";

export class IngestionError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const MAX_ATTEMPTS = 3;

const documentSelect = {
  id: true, fileName: true, kind: true, mimeType: true, byteSize: true,
  sha256: true, status: true, attempts: true, provider: true, errorCode: true,
  textTruncated: true, reviewReasons: true, createdAt: true, updatedAt: true,
  candidate: { select: { id: true, displayName: true, roleTitle: true, city: true } },
  reviewState: true, reviewVersion: true, reviewedAt: true,
  ingestionJob: { select: { id: true, status: true, stage: true, attempts: true,
    maxAttempts: true, manualRetries: true, runAfter: true, batchId: true,
    lastErrorCode: true, cancelRequested: true, startedAt: true, finishedAt: true } },
} as const;

export async function resumeImports(ownerId: string) {
  return database().resumeDocument.findMany({
    where: { ownerId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50, select: documentSelect,
  });
}
export async function resumeImport(ownerId: string, id: string) {
  const doc = await database().resumeDocument.findFirst({
    where: { ownerId, id }, select: {
      ...documentSelect,
      evidence: { select: { fieldKey: true, quote: true, pageNumber: true },
        orderBy: { fieldKey: "asc" as const } },
    },
  });
  if (!doc) throw new IngestionError(404, "NOT_FOUND", "Resume import not found.");
  return doc;
}

async function completeExtraction(ownerId: string, id: string, file: CheckedResume, providers?: JsonProvider[]) {
  const db = database();
  let parsed;
  try {
    parsed = await parseResume(file);
  } catch (error) {
    const reason = error instanceof ResumeInputError ? error.code : "PARSE_FAILED";
    // A corrupt file can remain stored privately for review or a later manual
    // replacement. Never expose raw parser errors or untrusted document text.
    await db.resumeDocument.update({ where: { id }, data: {
      status: reason === "NO_READABLE_TEXT" ? "NEEDS_REVIEW" : "FAILED",
      errorCode: reason, reviewReasons: [reason === "NO_READABLE_TEXT"
        ? "This appears to be a scanned PDF and requires OCR."
        : "Document parsing failed. Upload a valid text-based document."],
    } });
    return resumeImport(ownerId, id);
  }
  await db.resumeDocument.update({ where: { id }, data: {
    status: "TEXT_EXTRACTED", extractedText: parsed.text,
    textTruncated: parsed.truncated, errorCode: null,
    reviewReasons: parsed.warnings,
  } });
  let result: ResumeExtraction;
  try { result = await extractResumeProfile(parsed, providers, ownerId); }
  catch {
    result = { profile: null, evidence: [], provider: null, needsReview: true,
      warnings: ["Structured extraction was unavailable; retry after checking the model configuration."] };
  }
  if (!result.profile) {
    await db.resumeDocument.update({ where: { id }, data: {
      status: "NEEDS_REVIEW", provider: result.provider, errorCode: "PROFILE_UNVERIFIED",
      reviewReasons: result.warnings,
    } });
    return resumeImport(ownerId, id);
  }

  const { skills, skillsKnown, ...properties } = result.profile;
  const uniqueSkills = new Map((skills ?? []).map(name => [skillKey(name), name]));
  try {
    await db.$transaction(async tx => {
      if (uniqueSkills.size) {
        await tx.skill.createMany({
          data: [...uniqueSkills].map(([id, displayName]) => ({ id, displayName })),
          skipDuplicates: true,
        });
      }
      const old = await tx.candidate.findUnique({ where: { sourceDocumentId: id }, select: { id: true } });
      const data = { ...properties, skillsKnown, ownerId };
      const candidate = old
        ? await tx.candidate.update({ where: { id: old.id, ownerId },
            data: { ...data, skills: { deleteMany: {} } } })
        : await tx.candidate.create({ data: { ...data, sourceDocumentId: id } });
      if (uniqueSkills.size) {
        await tx.candidateSkill.createMany({
          data: [...uniqueSkills.keys()].map(skillId => ({ skillId, candidateId: candidate.id })),
          skipDuplicates: true,
        });
      }
      await tx.resumeEvidence.deleteMany({ where: { documentId: id } });
      if (result.evidence.length) {
        await tx.resumeEvidence.createMany({
          data: result.evidence.map(item => ({ ...item, documentId: id })),
          skipDuplicates: true,
        });
      }
      await tx.resumeDocument.update({ where: { id }, data: {
        status: result.needsReview ? "NEEDS_REVIEW" : "READY",
        provider: result.provider, errorCode: null,
        reviewReasons: result.warnings,
      } });
    }, { maxWait: 10000, timeout: 30000 });
  } catch {
    await db.resumeDocument.update({ where: { id }, data: {
      status: "FAILED", errorCode: "PERSIST_FAILED",
      reviewReasons: ["Could not save the extracted candidate. Retry this import."],
    } });
  }
  return resumeImport(ownerId, id);
}

export async function uploadResume(
  ownerId: string, fileName: string, mimeType: string, bytes: Buffer,
  storage: ResumeStorage = supabaseResumeStorage(),
  providers?: JsonProvider[],
) {
  if (!isResumeIngestionEnabled()) throw new IngestionError(503, "INGESTION_DISABLED", "Resume ingestion is temporarily paused.");
  const checked = validateResume(fileName, mimeType, bytes);
  const db = database();
  const existing = await db.resumeDocument.findUnique({
    where: { ownerId_sha256: { ownerId, sha256: checked.sha256 } },
    select: { id: true, status: true, attempts: true, errorCode: true, storageKey: true },
  });
  if (existing) {
    // Recover a failed initial Storage upload using the same hash/key. A missing
    // bucket must not permanently poison the owner's deduplication slot.
    if (existing.status === "FAILED" && existing.attempts < MAX_ATTEMPTS &&
        ["STORAGE_FAILED", "REUPLOAD_REQUIRED"].includes(existing.errorCode ?? "")) {
      const claimed = await db.resumeDocument.updateMany({
        where: { id: existing.id, ownerId, status: "FAILED",
          attempts: { lt: MAX_ATTEMPTS } },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });
      if (claimed.count === 1) {
        try {
          await storage.upload(existing.storageKey, checked);
          await db.resumeDocument.update({ where: { id: existing.id },
            data: { status: "STORED", errorCode: null } });
          return { duplicate: false, document: await completeExtraction(ownerId, existing.id, checked, providers) };
        } catch {
          await db.resumeDocument.update({ where: { id: existing.id }, data: {
            status: "FAILED", errorCode: "STORAGE_FAILED",
            reviewReasons: ["Secure file upload failed. Check private Storage and reupload."],
          } });
          return { duplicate: false, document: await resumeImport(ownerId, existing.id) };
        }
      }
    }
    return { duplicate: true, document: await resumeImport(ownerId, existing.id) };
  }
  const id = randomUUID(), extension = checked.kind.toLowerCase();
  const storageKey = ownerId + "/" + id + "." + extension;
  try {
    await db.resumeDocument.create({ data: {
      id, ownerId, fileName: checked.fileName, kind: checked.kind,
      mimeType: checked.mimeType, byteSize: checked.bytes.length,
      sha256: checked.sha256, storageKey, status: "RECEIVED", attempts: 1,
    } });
  } catch (error) {
    // A concurrent duplicate upload can pass the preliminary lookup.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const duplicate = await db.resumeDocument.findUnique({
        where: { ownerId_sha256: { ownerId, sha256: checked.sha256 } }, select: { id: true },
      });
      if (duplicate) return { duplicate: true, document: await resumeImport(ownerId, duplicate.id) };
    }
    throw error;
  }
  try {
    await storage.upload(storageKey, checked);
    await db.resumeDocument.update({ where: { id }, data: { status: "STORED" } });
  } catch {
    await db.resumeDocument.update({ where: { id }, data: {
      status: "FAILED", errorCode: "STORAGE_FAILED",
      reviewReasons: ["Secure file upload failed. Reupload is required."],
    } });
    return { duplicate: false, document: await resumeImport(ownerId, id) };
  }
  return { duplicate: false, document: await completeExtraction(ownerId, id, checked, providers) };
}

export async function retryResume(
  ownerId: string, id: string, storage: ResumeStorage = supabaseResumeStorage(),
  providers?: JsonProvider[],
) {
  if (!isResumeIngestionEnabled()) throw new IngestionError(503, "INGESTION_DISABLED", "Resume ingestion is temporarily paused.");
  const db = database();
  const entry = await db.resumeDocument.findFirst({
    where: { id, ownerId },
    select: { status: true, attempts: true, storageKey: true,
      fileName: true, mimeType: true, sha256: true },
  });
  if (!entry) throw new IngestionError(404, "NOT_FOUND", "Resume import not found.");
  if (entry.attempts >= MAX_ATTEMPTS) {
    throw new IngestionError(409, "RETRY_LIMIT", "This import has reached its retry limit.");
  }
  if (!["FAILED", "NEEDS_REVIEW"].includes(entry.status)) {
    throw new IngestionError(409, "NOT_RETRYABLE", "Only failed or review-needed imports can be retried.");
  }
  // Storage errors cannot be repaired by parsing a nonexistent object.
  // Reupload the same file through POST /imports; the dedup recovery path
  // will reuse its owner-scoped metadata and object key safely.
  if (entry.status === "FAILED" &&
      ["STORAGE_FAILED", "REUPLOAD_REQUIRED"].includes(
        (await db.resumeDocument.findFirst({ where: { ownerId, id },
          select: { errorCode: true } }))?.errorCode ?? "")) {
    throw new IngestionError(409, "REUPLOAD_REQUIRED",
      "Reupload the original document after verifying private Storage.");
  }
  const claimed = await db.resumeDocument.updateMany({
    where: { id, ownerId, status: { in: ["FAILED", "NEEDS_REVIEW"] },
      attempts: { lt: MAX_ATTEMPTS } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, errorCode: null },
  });
  if (claimed.count !== 1) throw new IngestionError(409, "IN_PROGRESS", "This import is already being processed.");
  let file: CheckedResume;
  try {
    const raw = await storage.read(entry.storageKey);
    file = validateResume(entry.fileName, entry.mimeType, raw);
    if (createHash("sha256").update(raw).digest("hex") !== entry.sha256) throw Error("checksum mismatch");
  } catch {
    await db.resumeDocument.update({ where: { id }, data: {
      status: "FAILED", errorCode: "REUPLOAD_REQUIRED",
      reviewReasons: ["The stored file could not be verified. Upload a fresh copy."],
    } });
    return resumeImport(ownerId, id);
  }
  return completeExtraction(ownerId, id, file, providers);
}

export async function resumeDownload(
  ownerId: string, id: string, storage: ResumeStorage = supabaseResumeStorage(),
) {
  const entry = await database().resumeDocument.findFirst({
    where: { id, ownerId }, select: { storageKey: true },
  });
  if (!entry) throw new IngestionError(404, "NOT_FOUND", "Resume import not found.");
  const url = await storage.signedUrl(entry.storageKey);
  return { url, expiresInSeconds: 60 };
}


/**
 * New production ingestion path. HTTP upload stores bytes and queues exactly
 * one durable job; it NEVER makes a model call or parses a resume in the request.
 * The earlier synchronous uploadResume remains only for isolated legacy tests.
 */
export async function queueResumeUpload(
  ownerId: string, fileName: string, mimeType: string, bytes: Buffer,
  storage: ResumeStorage = supabaseResumeStorage(),
) {
  if (!isResumeIngestionEnabled()) throw new IngestionError(503, "INGESTION_DISABLED", "Resume ingestion is temporarily paused.");
  const file = validateResume(fileName, mimeType, bytes);
  const db = database();
  const existing = await db.resumeDocument.findUnique({
    where: { ownerId_sha256: { ownerId, sha256: file.sha256 } },
    select: { id: true, status: true, errorCode: true, storageKey: true, attempts: true },
  });
  const resultFor = async (id: string, duplicate: boolean) =>
    ({ duplicate, document: await resumeImport(ownerId, id) });

  // Repair a previous failed Storage request or job enqueue in-place without
  // creating another candidate/document for the same owner/source hash.
  if (existing) {
    if (existing.status === "FAILED" &&
        ["STORAGE_FAILED", "REUPLOAD_REQUIRED", "JOB_QUEUE_FAILED"].includes(existing.errorCode ?? "") &&
        existing.attempts < 3) {
      const claimed = await db.resumeDocument.updateMany({
        where: { id: existing.id, ownerId, status: "FAILED", attempts: { lt: 3 } },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });
      if (claimed.count) {
        try {
          if (existing.errorCode === "JOB_QUEUE_FAILED") {
            const stored = await storage.read(existing.storageKey);
            if (createHash("sha256").update(stored).digest("hex") !== file.sha256) throw Error("checksum");
          } else {
            await storage.upload(existing.storageKey, file);
          }
          await db.$transaction(async tx => {
            await tx.resumeDocument.update({ where: { id: existing.id },
              data: { status: "STORED", errorCode: null, attempts: 0, reviewReasons: [] } });
            await tx.ingestionJob.upsert({
              where: { documentId: existing.id },
              update: {},
              create: { ownerId, documentId: existing.id },
            });
          });
          return resultFor(existing.id, false);
        } catch {
          await db.resumeDocument.update({ where: { id: existing.id },
            data: { status: "FAILED", errorCode: "JOB_QUEUE_FAILED",
              reviewReasons: ["Secure upload or queueing failed; retry the same document."] } });
          return resultFor(existing.id, false);
        }
      }
    }
    return resultFor(existing.id, true);
  }

  const id = randomUUID(), storageKey = ownerId + "/" + id + "." + file.kind.toLowerCase();
  try {
    await db.resumeDocument.create({ data: {
      id, ownerId, fileName: file.fileName, kind: file.kind, mimeType: file.mimeType,
      byteSize: bytes.length, sha256: file.sha256, storageKey, attempts: 0, status: "RECEIVED",
    } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const duplicate = await db.resumeDocument.findUnique({
        where: { ownerId_sha256: { ownerId, sha256: file.sha256 } }, select: { id: true },
      });
      if (duplicate) return resultFor(duplicate.id, true);
    }
    throw error;
  }
  try {
    await storage.upload(storageKey, file);
  } catch {
    await db.resumeDocument.update({ where: { id },
      data: { status: "FAILED", errorCode: "STORAGE_FAILED",
        reviewReasons: ["Secure Storage upload failed; reupload after correcting configuration."] } });
    return resultFor(id, false);
  }
  try {
    await db.$transaction(async tx => {
      await tx.resumeDocument.update({ where: { id },
        data: { status: "STORED", errorCode: null, reviewReasons: [] } });
      await tx.ingestionJob.create({ data: { ownerId, documentId: id } });
    });
  } catch {
    // File is private but must not be considered queued. A same-file retry
    // verifies its existing checksum and atomically repairs the queue.
    await db.resumeDocument.update({ where: { id },
      data: { status: "FAILED", errorCode: "JOB_QUEUE_FAILED",
        reviewReasons: ["Storage succeeded, but queue creation failed. Reupload this file to recover."] } });
  }
  return resultFor(id, false);
}
