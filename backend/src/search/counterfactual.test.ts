import { describe, expect, it } from "vitest";
import { criteriaSchema } from "./criteria";
import { explainNearMatch } from "./counterfactual";
import { evaluate, type CandidateProfile } from "./evaluate";

const candidate = (overrides: Partial<CandidateProfile> = {}): CandidateProfile => ({
  id: "example", displayName: "Test Candidate", roleTitle: "Senior Java Developer",
  city: "Hyderabad", experienceMonths: 84, noticePeriodDays: 30,
  industry: "Fintech", education: "BCA", employmentType: "Full-time",
  pastRoles: ["Backend Developer"], certifications: ["AWS Developer"],
  skills: ["Java", "Spring Boot", "AWS"], ...overrides,
});
const rules = (input: unknown) => criteriaSchema.parse(input);

describe("counterfactual near-match explanations", () => {
  it("moves an inclusive notice threshold only as far as the documented value", () => {
    const original = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "notice", mode: "required", maxDays: 30 },
      { field: "skill", mode: "preferred", value: "AWS" },
    ]);
    const profile = candidate({ noticePeriodDays: 31 });
    const snapshot = structuredClone({ original, profile });
    const report = explainNearMatch(profile, original);
    expect(report).toMatchObject({
      status: "PREVIEW_ONLY", knownRequiredFailures: 1, changedRuleCount: 1,
      before: { eligibility: "INELIGIBLE" }, after: { eligibility: "ELIGIBLE" },
    });
    expect(report.changes[0]).toMatchObject({
      key: "notice", kind: "EXPAND_NOTICE",
      before: { maxDays: 30 }, after: { maxDays: 31 },
      evidence: { source: "structured_candidate_record", field: "noticePeriodDays",
        actual: 31, outcome: "FAIL" },
    });
    expect(report.proposedCriteria[0]).toEqual(original[0]);
    expect(report.proposedCriteria[2]).toEqual(original[2]);
    expect(evaluate(profile, report.proposedCriteria).eligibility).toBe("ELIGIBLE");
    expect({ original, profile }).toEqual(snapshot);
  });

  it("adjusts only the violated experience bound and preserves the other bound", () => {
    const original = rules([{ field: "experience", mode: "required", minMonths: 72, maxMonths: 120 }]);
    const tooJunior = explainNearMatch(candidate({ experienceMonths: 71 }), original);
    expect(tooJunior.changes).toMatchObject([{
      kind: "EXPAND_EXPERIENCE", before: { minMonths: 72, maxMonths: 120 },
      after: { minMonths: 71, maxMonths: 120 },
    }]);
    expect(tooJunior.after.eligibility).toBe("ELIGIBLE");
    const tooSenior = explainNearMatch(candidate({ experienceMonths: 121 }), original);
    expect(tooSenior.changes).toMatchObject([{
      kind: "EXPAND_EXPERIENCE", before: { minMonths: 72, maxMonths: 120 },
      after: { minMonths: 72, maxMonths: 121 },
    }]);
    expect(tooSenior.after.eligibility).toBe("ELIGIBLE");
    const atEdge = explainNearMatch(candidate({ experienceMonths: 120 }), original);
    expect(atEdge.changes).toEqual([]);
  });

  it("never invents a skill or treats JavaScript as Java; categorical fallback is explicit", () => {
    const original = rules([
      { field: "skill", mode: "required", value: "Java" },
      { field: "city", mode: "required", value: "Hyderabad" },
    ]);
    const person = candidate({ skills: ["JavaScript"], city: "Pune" });
    const result = explainNearMatch(person, original);
    expect(result.knownRequiredFailures).toBe(2);
    expect(result.changes).toHaveLength(2);
    expect(result.changes.every(change => change.kind === "MAKE_PREFERRED")).toBe(true);
    expect(result.changes.map(change => change.key).sort()).toEqual(["city", "skill:java"]);
    expect(result.after.eligibility).toBe("ELIGIBLE");
    expect(result.remainingRequiredCount).toBe(0);
    expect(result.warnings).toEqual([expect.stringContaining("no mandatory requirements")]);
    expect(result.after.details.find(detail => detail.rule.field === "skill")).toMatchObject({
      outcome: "FAIL", actual: ["JavaScript"], rule: { mode: "preferred" },
    });
    expect(result.changes.every(change => change.tradeOff.includes("preferred rather than required"))).toBe(true);
  });

  it("never treats missing evidence as a known failure or fabricates a number", () => {
    const original = rules([
      { field: "notice", mode: "required", maxDays: 30 },
      { field: "skill", mode: "required", value: "Java" },
    ]);
    const person = candidate({ noticePeriodDays: null, skills: ["JavaScript"] });
    const result = explainNearMatch(person, original);
    expect(result.before.eligibility).toBe("INELIGIBLE");
    expect(result.changes.map(item => item.key)).toEqual(["skill:java"]);
    expect(result.missingEvidence).toMatchObject([{
      key: "notice", actual: null, source: "structured_candidate_record",
      action: "VERIFY_EVIDENCE",
    }]);
    expect(result.after.eligibility).toBe("NEEDS_REVIEW");
    expect(result.changes.find(item => item.key === "notice")).toBeUndefined();
    expect(result.warnings).toContainEqual(expect.stringContaining("Missing evidence"));
    expect(result.after.details.find(d => d.rule.field === "notice")).toMatchObject({
      outcome: "UNKNOWN", actual: null, rule: { mode: "required" },
    });
  });

  it("shows verify-only guidance when every required blocker is unknown", () => {
    const original = rules([
      { field: "notice", mode: "required", maxDays: 30 },
      { field: "certification", mode: "required", value: "AWS Developer" },
    ]);
    const result = explainNearMatch(candidate({
      noticePeriodDays: null, certifications: [],
    }), original);
    expect(result).toMatchObject({
      knownRequiredFailures: 0, changedRuleCount: 0,
      before: { eligibility: "NEEDS_REVIEW" }, after: { eligibility: "NEEDS_REVIEW" },
    });
    expect(result.proposedCriteria).toEqual(original);
    expect(result.missingEvidence).toHaveLength(2);
    expect(result.missingEvidence.every(item => item.action === "VERIFY_EVIDENCE")).toBe(true);
  });

  it("does not propose relaxation for already eligible and preference-only searches", () => {
    const good = explainNearMatch(candidate(), rules([
      { field: "notice", mode: "required", maxDays: 30 },
    ]));
    expect(good.changedRuleCount).toBe(0);
    expect(good.before.eligibility).toBe("ELIGIBLE");
    expect(good.after.eligibility).toBe("ELIGIBLE");
    const preferencesOnly = explainNearMatch(candidate({ noticePeriodDays: 60 }),
      rules([{ field: "notice", mode: "preferred", maxDays: 30 }]));
    expect(preferencesOnly.changes).toEqual([]);
    expect(preferencesOnly.remainingRequiredCount).toBe(0);
    expect(preferencesOnly.warnings).toHaveLength(1);
  });

  it("does not exceed schema ceilings when candidate values are out of range", () => {
    const original = rules([
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const result = explainNearMatch(candidate({
      experienceMonths: 800, noticePeriodDays: 400,
    }), original);
    expect(result.changes.map(change => change.kind)).toEqual(["MAKE_PREFERRED", "MAKE_PREFERRED"]);
    expect(criteriaSchema.safeParse(result.proposedCriteria).success).toBe(true);
    expect(result.changes.every(change => change.after.mode === "preferred")).toBe(true);
  });

  it("resolves multiple independent known failures and keeps all matched required rules", () => {
    const original = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "experience", mode: "required", minMonths: 72 },
      { field: "notice", mode: "required", maxDays: 30 },
      { field: "skill", mode: "required", value: "AWS" },
    ]);
    const result = explainNearMatch(candidate({
      city: "Pune", experienceMonths: 71, noticePeriodDays: 45,
    }), original);
    expect(result.knownRequiredFailures).toBe(3);
    expect(result.changes.map(change => change.key)).toEqual(["city", "experience", "notice"]);
    expect(result.proposedCriteria.find(rule => rule.field === "role")).toEqual(original[0]);
    expect(result.proposedCriteria.find(rule => rule.field === "skill")).toEqual(original[4]);
    expect(result.after.eligibility).toBe("ELIGIBLE");
    expect(result.remainingKnownFailures).toHaveLength(0);
    expect(result.remainingRequiredCount).toBe(4);
  });

  it("treats undocumented prior roles and certifications as verification, not negatives", () => {
    const original = rules([
      { field: "pastRole", mode: "required", value: "Backend Developer" },
      { field: "certification", mode: "required", value: "AWS Developer" },
    ]);
    const result = explainNearMatch(candidate({ pastRoles: [], certifications: [] }), original);
    expect(result.changedRuleCount).toBe(0);
    expect(result.missingEvidence.map(item => item.key).sort()).toEqual([
      "certification:aws developer", "pastRole:backend developer",
    ]);
    expect(result.after.eligibility).toBe("NEEDS_REVIEW");
  });
});
