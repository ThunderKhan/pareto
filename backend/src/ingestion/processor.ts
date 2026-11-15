import { database } from "../search/db";
import { AiFailure } from "../ai/contracts/errors";
import { shouldIndexResumeCandidate } from "./policy";
import { indexCandidate } from "../search/semantic";
import { skillKey } from "../search/criteria";
import type { JsonProvider } from "../search/interpret";
import { extractResumeProfile } from "./extract";
import { parseResume, validateResume, ResumeInputError } from "./parse";
import { supabaseResumeStorage, type ResumeStorage, StorageFailure } from "./storage";
import { changeStage, deferCapacityJob, failJob, finishJob, LeaseLost, type ClaimedJob, type AttemptMetrics } from "./queue";

export type ProcessingDependencies = {
  storage?: ResumeStorage;
  providers?: JsonProvider[];
};
class BadOriginal extends Error {}
/** One claimed attempt. All candidate writes are inside finishJob's fenced
 * transaction, so recovery may execute expensive work twice, but never publish
 * stale profile/evidence results from an obsolete lease.
 */
export async function processClaim(job: ClaimedJob, deps: ProcessingDependencies = {}) {
  const storage = deps.storage ?? supabaseResumeStorage();
  const attemptStartedAt = Date.now();
  const metrics: AttemptMetrics = { extractorVersion: "resume-extract.v1" };
  try {
    const document = await database().resumeDocument.findFirst({
      where: { id: job.documentId, ownerId: job.ownerId },
      select: { id: true, fileName: true, mimeType: true, sha256: true,
        storageKey: true, reviewState: true, reviewVersion: true },
    });
    if (!document) throw new BadOriginal("Document was deleted.");
    if (document.reviewState === "HUMAN_VERIFIED")
      throw new BadOriginal("Human-verified profile cannot be silently overwritten.");
    await changeStage(job, "PARSING");
    const parsingStartedAt = Date.now();
    const bytes = await storage.read(document.storageKey);
    const source = validateResume(document.fileName, document.mimeType, bytes);
    if (source.sha256 !== document.sha256) throw new BadOriginal("Source checksum mismatch.");
    const parsed = await parseResume(source);
    metrics.parseMs = Date.now() - parsingStartedAt;
    metrics.sourceChars = parsed.text.length;
    await changeStage(job, "EXTRACTING");
    const modelStartedAt = Date.now();
    const result = await extractResumeProfile(parsed, deps.providers, job.ownerId);
    metrics.modelMs = result.provider ? Date.now() - modelStartedAt : undefined;
    metrics.provider = result.provider;
    metrics.evidenceCount = result.evidence.length;
    metrics.verifiedFields = result.evidence.length;
    metrics.durationMs = Date.now() - attemptStartedAt;
    await changeStage(job, "PERSISTING");
    if (!result.profile) {
      // Provider failures may be transient, but a candidate cannot be created
      // from unsupported fields. After the bounded retry budget, human review.
      await failJob(job, "PROFILE_UNVERIFIED", true, true, Math.random(), metrics);
      return "RETRY_OR_REVIEW" as const;
    }
    const profile = result.profile; // Captured after null check for async transaction safety.
    const { skills, skillsKnown, ...properties } = profile;
    const canonical = new Map((skills ?? []).map(value => [skillKey(value), value]));
    await finishJob(job, result.needsReview ? "NEEDS_REVIEW" : "READY", {
      status: result.needsReview ? "NEEDS_REVIEW" : "READY",
      provider: result.provider, reviewReasons: result.warnings,
      extractedText: parsed.text, textTruncated: parsed.truncated,
      metrics,
    }, async tx => {
      if (canonical.size) {
        await tx.skill.createMany({ data: [...canonical].map(([id, displayName]) => ({ id, displayName })),
          skipDuplicates: true });
      }
      const prior = await tx.candidate.findUnique({
        where: { sourceDocumentId: job.documentId },
        include: { skills: { include: { skill: true } } },
      });
      if (prior && prior.ownerId !== job.ownerId) throw new BadOriginal("Candidate ownership changed.");
      const info = { ...properties, skillsKnown, ownerId: job.ownerId };
      const candidate = prior
        ? await tx.candidate.update({ where: { id: prior.id, ownerId: job.ownerId },
            data: { ...info, skills: { deleteMany: {} } } })
        : await tx.candidate.create({ data: { ...info, sourceDocumentId: job.documentId } });
      if (canonical.size) await tx.candidateSkill.createMany({
        data: [...canonical.keys()].map(skillId => ({ skillId, candidateId: candidate.id })),
        skipDuplicates: true,
      });
      await tx.resumeEvidence.deleteMany({ where: { documentId: job.documentId } });
      if (result.evidence.length) await tx.resumeEvidence.createMany({
        data: result.evidence.map(item => ({ ...item, documentId: job.documentId })),
        skipDuplicates: true,
      });
      await tx.resumeProfileAudit.create({ data: {
        ownerId: job.ownerId, documentId: job.documentId,
        action: "MODEL_EXTRACTED", reviewVersion: document.reviewVersion,
        before: prior ? {
          displayName: prior.displayName, roleTitle: prior.roleTitle, city: prior.city,
          experienceMonths: prior.experienceMonths, noticePeriodDays: prior.noticePeriodDays,
          industry: prior.industry, education: prior.education,
          employmentType: prior.employmentType, skillsKnown: prior.skillsKnown,
          skills: prior.skills.map(entry => entry.skill.displayName),
          pastRoles: prior.pastRoles, certifications: prior.certifications,
        } : undefined,
        after: profile,
        changedFields: Object.keys(profile),
        provider: result.provider, extractorVersion: "resume-extract.v1",
        jobId: job.id, attempt: job.attempts,
        reason: result.needsReview ? "Automated extraction requires human verification." : null,
      } });
    });
    // Refresh the retrieval cache only after the fenced profile transaction commits.
    // This is best effort: any failure leaves the verified profile intact; backfill repairs gaps.
    if (shouldIndexResumeCandidate()) {
      try {
        const candidate = await database().candidate.findFirst({
          where: { ownerId: job.ownerId, sourceDocumentId: job.documentId }, select: { id: true },
        });
        if (candidate) await indexCandidate(job.ownerId, candidate.id);
      } catch { /* Retrieval cache unavailable; deterministic search is unaffected. */ }
    }
    return result.needsReview ? "NEEDS_REVIEW" as const : "READY" as const;
  } catch (err) {
    if (err instanceof LeaseLost) return "LOST_LEASE" as const;
    metrics.durationMs = Date.now() - attemptStartedAt;
    try {
      if (err instanceof AiFailure &&
          ["BUDGET_EXCEEDED", "RATE_LIMIT", "AUTH_CONFIG"].includes(err.code)) {
        // Provider quota/configuration problems are not resume-quality failures.
        // Durable rate limits and provider calls remain separately accounted for;
        // only the document-processing retry allowance is preserved.
        await deferCapacityJob(job, err.code as "BUDGET_EXCEEDED"|"RATE_LIMIT"|"AUTH_CONFIG",
          undefined, metrics);
        return "DEFERRED" as const;
      } else if (err instanceof ResumeInputError) {
        await failJob(job, err.code, false, err.code === "NO_READABLE_TEXT", Math.random(), metrics);
      } else if (err instanceof BadOriginal) {
        await failJob(job, "SOURCE_INVALID", false, false, Math.random(), metrics);
      } else if (err instanceof StorageFailure) {
        await failJob(job, "STORAGE_UNAVAILABLE", true, false, Math.random(), metrics);
      } else {
        // DB outages and unknown provider failures have bounded reattempts.
        // Never log the thrown Error: provider/parse payloads may contain PII.
        await failJob(job, "PROCESSING_FAILED", true, false, Math.random(), metrics);
      }
      return "RETRY_OR_FAILED" as const;
    } catch (failure) {
      if (failure instanceof LeaseLost) return "LOST_LEASE" as const;
      // Preserve a committed lease; next janitor pass will recover it.
      throw failure;
    }
  }
}
