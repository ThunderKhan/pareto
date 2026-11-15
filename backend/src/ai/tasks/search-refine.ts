import { z } from "zod";
import { applyDelta, criteriaSchema, deltaSchema, ruleKey, type Rule } from "../../search/criteria";
import { proposeStructured } from "../providers/gateway";
import type { JsonProvider } from "../providers/http";
import { searchRefinePromptV1 } from "../prompts/search-refine.v1";
import { isolatedUserData, validateSearchRequest } from "../safety/policy";
import { AiFailure } from "../contracts/errors";

const responseSchema = z.strictObject({
  operations: z.array(z.unknown()).max(40),
  warnings: z.array(z.string().trim().max(250)).max(8).default([]),
});
export type RefinedDraft = { criteria: Rule[]; warnings: string[]; changed: boolean; provider: string };

export async function proposeRefinementDraft(prompt: string, current: Rule[], providers?: JsonProvider[], ownerId?: string): Promise<RefinedDraft> {
  const safe = validateSearchRequest(prompt);
  const prior = criteriaSchema.parse(current);
  const currentByKey = prior.map(rule => ({ key: ruleKey(rule), rule }));
  return proposeStructured(searchRefinePromptV1, isolatedUserData({ prompt: safe, current: currentByKey }), raw => {
    const result = responseSchema.parse(raw);
    if (!result.operations.length) return {
      criteria: prior, changed: false,
      warnings: result.warnings.length ? result.warnings : ["Clarify which criterion should change."],
    };
    try {
      const delta = deltaSchema.parse(result.operations);
      const next = applyDelta(prior, delta);
      const touched = new Set(delta.map(op => op.op === "remove" ? op.key : ruleKey(op.rule)));
      for (const rule of prior) {
        const key = ruleKey(rule);
        if (!touched.has(key) && JSON.stringify(next.find(r => ruleKey(r) === key)) !== JSON.stringify(rule))
          throw new AiFailure("SEMANTIC_UNVERIFIED", false);
      }
      return { criteria: next, changed: JSON.stringify(next) !== JSON.stringify(prior), warnings: result.warnings };
    } catch { throw new AiFailure("SEMANTIC_UNVERIFIED", false); }
  }, providers, { taskId: "search.refine.v1", ownerId });
}
