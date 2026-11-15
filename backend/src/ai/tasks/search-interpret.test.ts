import { describe, expect, it, vi } from "vitest";
import { proposeSearchDraft } from "./search-interpret";
import { proposeRefinementDraft } from "./search-refine";
import { searchInterpretPromptV1 } from "../prompts/search-interpret.v1";
import { searchRefinePromptV1 } from "../prompts/search-refine.v1";

describe("AI drafts cannot authorize search or invent unsupported fields", () => {
  it("rejects explicit protected-trait filters before a provider call", async () => {
    const provider = vi.fn();
    await expect(proposeSearchDraft("Find female only developers", [provider]))
      .rejects.toMatchObject({ code: "BAD_INPUT" });
    expect(provider).not.toHaveBeenCalled();
  });
  it("rejects hallucinated schema keys and accepts only supported organizer rules", async () => {
    const invalid = vi.fn().mockResolvedValue({
      raw: { criteria: [{ field: "age", mode: "required", minAge: 18 }], warnings: [] }, provider: "Gemini",
    });
    await expect(proposeSearchDraft("Find Java developers", [invalid]))
      .rejects.toMatchObject({ code: "OUTPUT_INVALID" });
    const valid = vi.fn().mockResolvedValue({
      raw: { criteria: [
        { field: "skill", mode: "required", value: "Java" },
        { field: "skill", mode: "preferred", value: "AWS" },
      ], warnings: [] }, provider: "Gemini",
    });
    const result = await proposeSearchDraft("Find Java developers, AWS a bonus", [valid]);
    expect(result.criteria).toHaveLength(2);
    expect(result.criteria[1].mode).toBe("preferred");
    expect(valid.mock.calls[0][1]).toContain("untrustedRecruiterData");
  });
  it("refinement preserves every unrelated prior requirement", async () => {
    const current = [
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "skill", mode: "required", value: "Java", exclude: false },
      { field: "notice", mode: "required", maxDays: 60 },
    ] as const;
    const model = vi.fn().mockResolvedValue({
      raw: { operations: [
        { op: "set", rule: { field: "notice", mode: "required", maxDays: 30 } },
        { op: "set", rule: { field: "skill", mode: "required", value: "Spring Boot" } },
      ], warnings: [] }, provider: "Gemini",
    });
    const proposal = await proposeRefinementDraft("Also require Spring Boot and joining in 30 days", [...current], [model]);
    expect(proposal.criteria).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "city", value: "Hyderabad" }),
      expect.objectContaining({ field: "skill", value: "Java" }),
      expect.objectContaining({ field: "notice", maxDays: 30 }),
      expect.objectContaining({ field: "skill", value: "Spring Boot" }),
    ]));
    expect(proposal.changed).toBe(true);
  });
  it("does not drop current rules on ambiguous instruction", async () => {
    const initial = [{ field: "skill" as const, mode: "required" as const, value: "Java", exclude: false }];
    const model = vi.fn().mockResolvedValue({ raw: { operations: [], warnings: [] }, provider: "Gemini" });
    const result = await proposeRefinementDraft("Make this better", initial, [model]);
    expect(result.criteria).toEqual(initial);
    expect(result.changed).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("versioned prompts specify unknowns, authority and skill distinctions", () => {
    expect(searchInterpretPromptV1).toContain("JavaScript");
    expect(searchInterpretPromptV1).toContain("UNTRUSTED");
    expect(searchInterpretPromptV1).toContain("No invented facts");
    expect(searchRefinePromptV1).toContain("All unspecified existing rules MUST remain unchanged");
  });
});
