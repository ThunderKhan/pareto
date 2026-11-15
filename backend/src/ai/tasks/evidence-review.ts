import { z } from "zod";
import { AiFailure } from "../contracts/errors";
import type { JsonProvider } from "../providers/http";
import { proposeStructured } from "../providers/gateway";
import { resolveAiProviders } from "../providers/byok";
import { evidenceReviewPromptV1 } from "../prompts/evidence-review.v1";
import { verifyResumeClaim } from "../quality/resume-evidence";

const numericFields = new Set<string>(["experienceMonths", "noticePeriodDays"]);
export const reviewEvidenceInputSchema = z.strictObject({
  field: z.enum(["skill", "experienceMonths", "noticePeriodDays", "city",
    "roleTitle", "education", "certification", "displayName"]),
  value: z.union([z.string().trim().min(1).max(120), z.number().int().min(0).max(720)]),
  excerpt: z.string().min(2).max(1800),
}).superRefine((data, ctx) => {
  if (numericFields.has(data.field) !== (typeof data.value === "number"))
    ctx.addIssue({ code: "custom", path: ["value"], message: "Incorrect field value type." });
  if (data.field === "noticePeriodDays" && typeof data.value === "number" && data.value > 365)
    ctx.addIssue({ code: "custom", path: ["value"], message: "Notice exceeds supported range." });
});
export type ReviewEvidenceInput = z.infer<typeof reviewEvidenceInputSchema>;
const proposalSchema = z.strictObject({
  verdict: z.enum(["supported", "contradicted", "unknown"]),
  quote: z.string().min(2).max(350).nullable(),
  reasonCode: z.enum(["DIRECT_STATEMENT", "NEGATED", "ASPIRATIONAL",
    "OTHER_CONTEXT", "CONTRADICTION", "INSUFFICIENT", "UNSUPPORTED"]),
});
export type EvidenceReviewProposal = {
  verdict: "supported" | "contradicted" | "unknown";
  quote: string | null;
  reasonCode: z.infer<typeof proposalSchema>["reasonCode"];
  provider: string;
  requiresHumanReview: true;
};
/**
 * No document fetch, database access, mutation or eligibility decision.
 * Caller must authorize and select a minimal excerpt from owner-scoped data.
 */
export async function proposeEvidenceReview(
  input: ReviewEvidenceInput,
  providers?: JsonProvider[],
  ownerId?: string,
): Promise<EvidenceReviewProposal> {
  const parsed = reviewEvidenceInputSchema.safeParse(input);
  if (!parsed.success) throw new AiFailure("BAD_INPUT", false);
  const source = parsed.data;
  return proposeStructured(evidenceReviewPromptV1,
    JSON.stringify({ untrustedDocumentData: source }),
    raw => {
      const proposal = proposalSchema.parse(raw);
      if (proposal.quote && !source.excerpt.includes(proposal.quote))
        throw new AiFailure("SEMANTIC_UNVERIFIED", false);
      if (proposal.verdict !== "unknown" && !proposal.quote)
        throw new AiFailure("SEMANTIC_UNVERIFIED", false);
      const grounded = proposal.quote === null ? "unknown" : verifyResumeClaim({
        field: source.field, value: source.value,
        quote: proposal.quote, sourceText: source.excerpt,
      });
      const verdict = grounded === proposal.verdict ? grounded : "unknown";
      return {
        verdict,
        quote: verdict === "unknown" ? null : proposal.quote,
        reasonCode: verdict === "unknown" ? "INSUFFICIENT" as const : proposal.reasonCode,
        requiresHumanReview: true as const,
      };
    }, await resolveAiProviders(ownerId, providers), { taskId: "resume.evidence-review.v1", ownerId });
}
