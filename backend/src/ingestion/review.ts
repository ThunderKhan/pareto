import { z } from "zod";
import { database } from "../search/db";
import { skillKey } from "../search/criteria";
import { JobConflict } from "./queue";

const label = z.string().trim().min(1).max(120)
  .refine(value => !/[\u0000-\u001F\u007F]/u.test(value), "No control characters.");
const optional = label.nullable();
const profileSchema = z.strictObject({
  displayName: label,
  roleTitle: optional,
  city: optional,
  experienceMonths: z.number().int().min(0).max(720).nullable(),
  noticePeriodDays: z.number().int().min(0).max(365).nullable(),
  industry: optional,
  education: optional,
  employmentType: optional,
  skills: z.array(label).max(25).nullable(),
  pastRoles: z.array(label).max(10),
  certifications: z.array(label).max(10),
});
export type ReviewedProfile = z.infer<typeof profileSchema>;
const expectedVersion = z.number().int().min(0);
export const reviewCommand = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("correct"), expectedVersion,
    confirmedAgainstSource: z.literal(true),
    reason: z.string().trim().min(8).max(250),
    profile: profileSchema,
  }),
  z.strictObject({
    action: z.literal("approve"), expectedVersion,
    confirmedAgainstSource: z.literal(true),
  }),
  z.strictObject({
    action: z.literal("reject"), expectedVersion,
    confirmedAgainstSource: z.literal(true),
    reason: z.string().trim().min(8).max(250),
  }),
]);
export type ReviewCommand = z.infer<typeof reviewCommand>;
export const PROFILE_FIELDS = [
  "displayName", "roleTitle", "city", "experienceMonths", "noticePeriodDays",
  "industry", "education", "employmentType", "skills", "pastRoles", "certifications",
] as const;
type CandidateWithSkills = {
  displayName: string; roleTitle: string | null; city: string | null;
  experienceMonths: number | null; noticePeriodDays: number | null;
  industry: string | null; education: string | null; employmentType: string | null;
  pastRoles: string[]; certifications: string[]; skillsKnown: boolean;
  skills: { skill: { displayName: string } }[];
};

function profileOf(candidate: CandidateWithSkills | null): ReviewedProfile | null {
  if (!candidate) return null;
  return {
    displayName: candidate.displayName,
    roleTitle: candidate.roleTitle,
    city: candidate.city,
    experienceMonths: candidate.experienceMonths,
    noticePeriodDays: candidate.noticePeriodDays,
    industry: candidate.industry,
    education: candidate.education,
    employmentType: candidate.employmentType,
    skills: candidate.skillsKnown ? candidate.skills.map(s => s.skill.displayName).sort() : null,
    pastRoles: candidate.pastRoles,
    certifications: candidate.certifications,
  };
}
export function changedProfileFields(before: ReviewedProfile | null, after: ReviewedProfile | null) {
  const normalized = (field: string, value: unknown) => {
    if (field === "skills" && Array.isArray(value))
      return [...new Set(value.map(s => skillKey(String(s))))].sort();
    return value ?? null;
  };
  return PROFILE_FIELDS.filter(key => JSON.stringify(normalized(key,before?.[key]))
    !== JSON.stringify(normalized(key,after?.[key])));
}
const detailSelect = {
  id: true, status: true, reviewState: true, reviewVersion: true,
  reviewedAt: true, reviewedBy: true, errorCode: true,
  candidate: { include: { skills: { include: { skill: true } } } },
  ingestionJob: { select: { id: true, status: true, attempts: true } },
} as const;

export async function resumeReviewProfile(ownerId: string, documentId: string) {
  const doc = await database().resumeDocument.findFirst({
    where: { id: documentId, ownerId }, select: detailSelect,
  });
  if (!doc) throw new JobConflict(404, "NOT_FOUND", "Resume unavailable.");
  return { documentId, documentStatus: doc.status, reviewState: doc.reviewState,
    reviewVersion: doc.reviewVersion, reviewedAt: doc.reviewedAt,
    candidateId: doc.candidate?.id ?? null,
    profile: profileOf(doc.candidate) };
}

/**
 * A real user must attest that they checked the ORIGINAL SOURCE.
 * Version CAS + terminal job lock + data and audit all share one transaction.
 * Changed model evidence is removed rather than falsely cited after correction.
 */
export async function reviewResumeProfile(ownerId: string, documentId: string, input: unknown) {
  const command = reviewCommand.parse(input);
  const db = database();
  await db.$transaction(async tx => {
    const job = await tx.ingestionJob.findFirst({
      where: { documentId, ownerId }, select: { id: true, status: true },
    });
    if (!job) throw new JobConflict(404, "NOT_FOUND", "Resume unavailable.");
    const terminal = ["READY", "NEEDS_REVIEW", "FAILED_PERMANENT"];
    if (!terminal.includes(job.status))
      throw new JobConflict(409, "JOB_ACTIVE", "Wait until processing has finished.");
    const locked = await tx.ingestionJob.updateMany({
      where: { id: job.id, ownerId, status: { in: ["READY", "NEEDS_REVIEW", "FAILED_PERMANENT"] } },
      data: { status: command.action === "reject" ? "NEEDS_REVIEW" : "READY",
        stage: "COMPLETE", lastErrorCode: null },
    });
    if (locked.count !== 1) throw new JobConflict(409, "JOB_CHANGED", "Reload import state.");
    const doc = await tx.resumeDocument.findFirst({
      where: { id: documentId, ownerId }, select: detailSelect,
    });
    if (!doc) throw new JobConflict(404, "NOT_FOUND", "Resume unavailable.");
    if (!["READY", "NEEDS_REVIEW", "FAILED"].includes(doc.status) ||
        doc.reviewVersion !== command.expectedVersion)
      throw new JobConflict(409, "REVIEW_CONFLICT", "Profile changed; reload before reviewing.");
    if (command.action === "approve" && !doc.candidate)
      throw new JobConflict(409, "PROFILE_REQUIRED", "Correct the candidate before approving.");
    const before = profileOf(doc.candidate);
    const after = command.action === "correct" ? command.profile :
      command.action === "approve" ? before : null;
    const changedFields = changedProfileFields(before, after);
    if (command.action === "correct" && !changedFields.length)
      throw new JobConflict(422, "NO_CHANGES", "No corrections were made. Choose Approve instead.");
    const updated = await tx.resumeDocument.updateMany({
      where: { id: documentId, ownerId, reviewVersion: command.expectedVersion,
        status: { in: ["READY", "NEEDS_REVIEW", "FAILED"] } },
      data: { reviewVersion: { increment: 1 }, reviewedAt: new Date(), reviewedBy: ownerId,
        reviewState: command.action === "reject" ? "NEEDS_REVIEW" : "HUMAN_VERIFIED",
        status: command.action === "reject" ? "NEEDS_REVIEW" : "READY",
        errorCode: command.action === "reject" ? "HUMAN_REJECTED" : null,
        reviewReasons: command.action === "reject" ? ["Recruiter rejected the extracted profile."] : [] },
    });
    if (updated.count !== 1) throw new JobConflict(409, "REVIEW_CONFLICT", "Profile changed; reload.");
    if (command.action === "reject") {
      if (doc.candidate) await tx.candidate.delete({
        where: { id: doc.candidate.id, ownerId },
      });
    } else if (command.action === "correct") {
      const values = command.profile;
      const { skills, ...fields } = values;
      const skillNames = new Map((skills ?? []).map(value => [skillKey(value), value]));
      if (skillNames.size) await tx.skill.createMany({
        data: [...skillNames].map(([id, displayName]) => ({ id, displayName })),
        skipDuplicates: true,
      });
      const data = { ...fields, skillsKnown: skills !== null, ownerId };
      const candidate = doc.candidate
        ? await tx.candidate.update({
            where: { id: doc.candidate.id, ownerId },
            data: { ...data, skills: { deleteMany: {} } },
          })
        : await tx.candidate.create({ data: { ...data, sourceDocumentId: documentId } });
      if (skillNames.size) await tx.candidateSkill.createMany({
        data: [...skillNames.keys()].map(skillId => ({ candidateId: candidate.id, skillId })),
        skipDuplicates: true,
      });
      const removeEvidence = changedFields.flatMap(key =>
        key === "skills" ? ["skill:"] :
        key === "pastRoles" ? ["pastRole:"] :
        key === "certifications" ? ["certification:"] : [key]);
      if (removeEvidence.length) {
        await tx.resumeEvidence.deleteMany({
          where: { documentId, OR: removeEvidence.map(key =>
            key.endsWith(":") ? { fieldKey: { startsWith: key } } : { fieldKey: key }) },
        });
      }
    }
    await tx.resumeProfileAudit.create({
      data: {
        documentId, ownerId, actorId: ownerId, reviewVersion: command.expectedVersion + 1,
        action: command.action === "correct" ? "HUMAN_CORRECTED" :
          command.action === "reject" ? "HUMAN_REJECTED" : "HUMAN_APPROVED",
        changedFields: [...changedFields],
        before: before ?? undefined,
        after: after ?? undefined,
        reason: "reason" in command ? command.reason : "Human reviewed original source",
      },
    });
  }, { timeout: 20000, maxWait: 10000 });
  return resumeReviewProfile(ownerId, documentId);
}

export async function resumeAuditHistory(ownerId: string, documentId: string) {
  const doc = await database().resumeDocument.findFirst({
    where: { ownerId, id: documentId }, select: { id: true },
  });
  if (!doc) throw new JobConflict(404, "NOT_FOUND", "Resume unavailable.");
  const events = await database().resumeProfileAudit.findMany({
    where: { ownerId, documentId }, take: 100, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, action: true, reviewVersion: true, changedFields: true,
      before: true, after: true, reason: true, provider: true, extractorVersion: true,
      attempt: true, createdAt: true },
  });
  return { documentId, events };
}
