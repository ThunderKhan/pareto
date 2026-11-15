import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AiFailure } from "../contracts/errors";
import { proposeSearchDraft } from "../tasks/search-interpret";
import { proposeRefinementDraft } from "../tasks/search-refine";

type Fixture = {
  id: string;
  name: string;
  attack: string;
  response: unknown;
};
const cases = readFileSync(new URL("../../../evals/datasets/adversarial.jsonl", import.meta.url), "utf8")
  .split("\n").filter(Boolean).map(line => JSON.parse(line) as Fixture);
const initial = [
  { field: "city" as const, mode: "required" as const, value: "Hyderabad" },
  { field: "skill" as const, mode: "required" as const, value: "Java", exclude: false },
];

describe("synthetic untrusted model-output rejection corpus", () => {
  it("uses at least 30 labeled, unique attacker-controlled response fixtures", () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cases.map(x => x.id)).size).toBe(cases.length);
    expect(new Set(cases.map(x => x.name)).size).toBe(cases.length);
  });
  for (const sample of cases) {
    it(sample.id + " " + sample.name + " is rejected by the server contract", async () => {
      const model = async () => ({ raw: sample.response, provider: "Gemini" });
      // The attack is text, not a system/tool instruction. The response is
      // deliberately adversarial and mocked to exercise the SERVER boundary.
      try {
        const result = await proposeSearchDraft("Find Java developers. " + sample.attack,
          [model], sample.id);
        throw Error("Unsafe synthetic response accepted: " + JSON.stringify(result));
      } catch (error) {
        expect(error).toBeInstanceOf(AiFailure);
        expect(["BAD_INPUT", "OUTPUT_INVALID", "SEMANTIC_UNVERIFIED"])
          .toContain((error as AiFailure).code);
      }
    });
  }
  it("does not let refinement set a protected-attribute requirement", async () => {
    const unsafe = async () => ({
      provider: "Gemini",
      raw: { operations: [{ op: "set", rule: { field: "role", mode: "required",
        value: "female only software engineer" } }], warnings: [] },
    });
    await expect(proposeRefinementDraft("Also require a software engineer",
      initial, [unsafe], "adv-refine-owner")).rejects.toMatchObject({
        code: "SEMANTIC_UNVERIFIED",
      });
  });
  it("never accepts a fabricated cross-tenant deletion operation", async () => {
    const unsafe = async () => ({
      provider: "Gemini", raw: { operations: [{ op: "deleteCandidate", id: "other-owner" }], warnings: [] },
    });
    await expect(proposeRefinementDraft("Also require Docker", initial, [unsafe],
      "adv-refine-owner")).rejects.toMatchObject({
        code: "SEMANTIC_UNVERIFIED",
      });
  });
});
