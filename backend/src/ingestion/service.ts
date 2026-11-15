import { randomUUID, createHash } from "node:crypto";
import { database } from "../search/db";
import { skillKey } from "../search/criteria";
import { extractResumeProfile, type ResumeExtraction } from "./extract";
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

async function completeExtraction(ownerId: string, id: string, file: CheckedResume) {
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
  try { result = await extractResumeProfile(parsed); }
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
  const uniqueSkills = [...new Set((skills ?? []).map(skillKey))];
  try {
    await db.$transaction(async tx => {
      if (uniqueSkills.length) {
        await tx.skill.createMany({
          data: uniqueSkills.map(value => ({ id: value, displayName: value })),
          skipDuplicates: true,
        });
      }
      const old = await tx.candidate.findUnique({ where: { sourceDocumentId: id }, select: { id: true } });
      const data = { ...properties, skillsKnown, ownerId };
      const candidate = old
        ? await tx.candidate.update({ where: { id: old.id, ownerId },
            data: { ...data, skills: { deleteMany: {} } } })
        : await tx.candidate.create({ data: { ...data, sourceDocumentId: id } });
      if (uniqueSkills.length) {
        await tx.candidateSkill.createMany({
          data: uniqueSkills.map(skillId => ({ skillId, candidateId: candidate.id })),
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
) {
  const checked = validateResume(fileName, mimeType, bytes);
  const db = database();
  const existing = await db.resumeDocument.findUnique({
    where: { ownerId_sha256: { ownerId, sha256: checked.sha256 } }, select: { id: true },
  });
  if (existing) return { duplicate: true, document: await resumeImport(ownerId, existing.id) };
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
  return { duplicate: false, document: await completeExtraction(ownerId, id, checked) };
}

export async function retryResume(
  ownerId: string, id: string, storage: ResumeStorage = supabaseResumeStorage(),
) {
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
  if (entry.status === "FAILED" && entry.storageKey === "") {
    throw new IngestionError(409, "REUPLOAD_REQUIRED", "Upload this document again.");
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
  return completeExtraction(ownerId, id, file);
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
