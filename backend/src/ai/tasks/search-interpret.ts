import { z } from "zod";
import { criteriaSchema, type Rule } from "../../search/criteria";
import { proposeStructured } from "../providers/gateway";
import { resolveAiProviders } from "../providers/byok";
import type { JsonProvider } from "../providers/http";
import { searchInterpretPromptV1 } from "../prompts/search-interpret.v1";
import { isolatedUserData, validateSearchRequest, rejectProtectedRuleValues } from "../safety/policy";
import { AiFailure } from "../contracts/errors";

const responseSchema = z.strictObject({
  criteria: z.array(z.unknown()).max(40),
  warnings: z.array(z.string().trim().max(250)).max(8).default([]),
});
export type InterpretedDraft = { criteria: Rule[]; warnings: string[]; provider: string };

export async function proposeSearchDraft(prompt: string, providers?: JsonProvider[], ownerId?: string): Promise<InterpretedDraft> {
  const safe = validateSearchRequest(prompt);
  return proposeStructured(searchInterpretPromptV1, isolatedUserData({ prompt: safe }), raw => {
    const candidate = responseSchema.parse(raw);
    let criteria: Rule[];
    try {
      criteria = candidate.criteria.length ? criteriaSchema.parse(candidate.criteria) : [];
      rejectProtectedRuleValues(criteria);
    } catch { throw new AiFailure("SEMANTIC_UNVERIFIED", false); }
    return { criteria, warnings: candidate.warnings };
  }, await resolveAiProviders(ownerId, providers), { taskId: "search.interpret.v1", ownerId });
}
