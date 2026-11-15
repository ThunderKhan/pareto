import { database } from "../search/db";
import { validateResume } from "./parse";
import { supabaseResumeStorage, type ResumeStorage, StorageFailure } from "./storage";

/**
 * Recovery of metadata created just before a process crash in the middle
 * of an HTTP upload. We NEVER invent a stored file: verify the original bytes
 * from the private bucket and SHA first, then atomically enqueue.
 *
 * A five-minute grace period avoids racing normal in-flight uploads.
 */
export async function recoverInterruptedUploads(
  storage: ResumeStorage = supabaseResumeStorage(), ageMs = 300_000, limit = 10,
) {
  if (!Number.isSafeInteger(ageMs) || ageMs < 60_000 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 25)
    throw new Error("Invalid interrupted-upload recovery limits.");
  const db = database(), cutoff = new Date(Date.now() - ageMs);
  const staged = await db.resumeDocument.findMany({
    where: { status: "RECEIVED", updatedAt: { lt: cutoff }, ingestionJob: null },
    select: { id: true, ownerId: true, storageKey: true, fileName: true,
      mimeType: true, sha256: true }, orderBy: { createdAt: "asc" }, take: limit,
  });
  let recovered = 0, requiresReupload = 0;
  for (const doc of staged) {
    let valid = false;
    try {
      const bytes = await storage.read(doc.storageKey);
      const checked = validateResume(doc.fileName, doc.mimeType, bytes);
      valid = checked.sha256 === doc.sha256;
    } catch (error) {
      // Never misclassify a temporary Storage outage or private bucket
      // misconfiguration as a permanently missing source. Retry on next sweep.
      if (error instanceof StorageFailure) continue;
      // Missing object / invalid source under an otherwise available adapter.
    }
    if (!valid) {
      const updated = await db.resumeDocument.updateMany({
        where: { id: doc.id, ownerId: doc.ownerId, status: "RECEIVED",
          updatedAt: { lt: cutoff } },
        data: { status: "FAILED", errorCode: "REUPLOAD_REQUIRED",
          reviewReasons: ["Previous upload was interrupted. Reupload the original file."] },
      });
      requiresReupload += updated.count;
      continue;
    }
    await db.$transaction(async tx => {
      const updated = await tx.resumeDocument.updateMany({
        where: { id: doc.id, ownerId: doc.ownerId, status: "RECEIVED",
          updatedAt: { lt: cutoff } },
        data: { status: "STORED", errorCode: null, reviewReasons: [] },
      });
      if (!updated.count) return;
      await tx.ingestionJob.upsert({
        where: { documentId: doc.id }, update: {},
        create: { ownerId: doc.ownerId, documentId: doc.id },
      });
      recovered++;
    });
  }
  return { recovered, requiresReupload };
}
