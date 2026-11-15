import { describe, expect, it } from "vitest";
import { scoreRules, percentile } from "./scoring";

describe("independent deterministic quality scoring", () => {
  it("penalizes a hallucinated requirement and a missing preferred skill", () => {
    const expected = [
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "skill", mode: "preferred", value: "AWS", exclude: false },
    ] as const;
    const observed = [
      { field: "city", mode: "required", value: "hyderabad" },
      { field: "skill", mode: "required", value: "Java", exclude: false },
    ] as const;
    const score = scoreRules(expected, observed);
    expect(score).toMatchObject({
      truePositive: 1, falsePositive: 1, falseNegative: 1,
      precision: 0.5, recall: 0.5, f1: 0.5,
    });
  });
  it("does not conflate Java with JavaScript, or required with preferred", () => {
    const score = scoreRules(
      [{ field: "skill", mode: "required", value: "Java", exclude: false }],
      [{ field: "skill", mode: "required", value: "JavaScript", exclude: false }],
    );
    expect(score.truePositive).toBe(0);
    expect(score.f1).toBe(0);
    expect(scoreRules(
      [{ field: "skill", mode: "preferred", value: "AWS", exclude: false }],
      [{ field: "skill", mode: "required", value: "amazon web services", exclude: false }],
    ).f1).toBe(0);
  });
  it("scores matching empty proposals as exact, not division by zero", () => {
    expect(scoreRules([], [])).toMatchObject({ precision: 1, recall: 1, f1: 1 });
  });
  it("reports a well-defined p95, including one observation", () => {
    expect(percentile([], 0.95)).toBeNull();
    expect(percentile([20, 10, 40, 30], 0.95)).toBe(40);
    expect(percentile([20], 0.95)).toBe(20);
  });
});
