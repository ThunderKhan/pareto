import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { proposeSearchDraft } from "../tasks/search-interpret";
import { proposeRefinementDraft } from "../tasks/search-refine";
import { criteriaSchema, type Rule } from "../../search/criteria";

type SearchCase = { id: string; prompt: string; proposal: { criteria: unknown[]; warnings: string[] } };
type RefinementCase = { id: string; prompt: string; current: Rule[]; proposal: { operations: unknown[]; warnings: string[] } };
function load<T>(name: string): T[] {
  return readFileSync(new URL(`../../../evals/datasets/\${name}.jsonl`, import.meta.url), "utf8")
    .split("\n").filter(Boolean).map(line => JSON.parse(line) as T);
}
describe("synthetic, OFFLINE model proposal contract corpus", () => {
  const requests = load<SearchCase>("search-intents");
  const refinements = load<RefinementCase>("refinements");
  it("contains the reviewed minimum of diverse synthetic cases", () => {
    expect(requests.length).toBeGreaterThanOrEqual(30);
    expect(refinements.length).toBeGreaterThanOrEqual(25);
    expect(new Set(requests.map(c => c.id)).size).toBe(requests.length);
    expect(new Set(refinements.map(c => c.id)).size).toBe(refinements.length);
  });
  for (const sample of requests) {
    it(`validates \${sample.id}`, async () => {
      const model = async () => ({ raw: sample.proposal, provider: "Gemini" });
      const draft = await proposeSearchDraft(sample.prompt, [model], sample.id);
      expect(draft.criteria).toEqual(criteriaSchema.parse(sample.proposal.criteria));
    });
  }
  for (const sample of refinements) {
    it(`preserves unmodified rules in \${sample.id}`, async () => {
      const model = async () => ({ raw: sample.proposal, provider: "Gemini" });
      const draft = await proposeRefinementDraft(sample.prompt, sample.current, [model], sample.id);
      expect(draft.criteria.length).toBeGreaterThan(0);
      if (!sample.proposal.operations.length) {
        expect(draft.changed).toBe(false);
        expect(draft.criteria).toEqual(criteriaSchema.parse(sample.current));
      } else expect(draft.changed).toBe(true);
    });
  }
});
