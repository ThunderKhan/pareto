import { describe, expect, it } from "vitest";
import { criteriaSchema } from "./criteria";
import { compareSearches, diffCriteria } from "./simulator";
import type { CandidateProfile } from "./evaluate";

const person = (id: string, override: Partial<CandidateProfile> = {}): CandidateProfile => ({
  id, displayName: "Synthetic " + id, roleTitle: "Senior Java Developer",
  city: "Hyderabad", experienceMonths: 84, noticePeriodDays: 30,
  skills: ["Java", "AWS"], industry: "Fintech", education: "BCA",
  employmentType: "Full-time", pastRoles: ["Developer"], certifications: [],
  ...override,
});
const rules = (input: unknown) => criteriaSchema.parse(input);

describe("What-If Hiring Simulator (side-effect-free deterministic comparison)", () => {
  it("measures real baseline versus relaxed notice counts, transitions and evidence", () => {
    const original = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const proposal = rules([
      original[0], { field: "notice", mode: "required", maxDays: 45 },
    ]);
    const candidates = [
      person("a", { noticePeriodDays: 30 }),
      person("b", { noticePeriodDays: 45 }),
      person("c", { noticePeriodDays: null }),
      person("d", { noticePeriodDays: 60 }),
      person("e", { roleTitle: "Python Engineer", noticePeriodDays: 15 }),
    ];
    const inputs = structuredClone({ original, proposal, candidates });
    const result = compareSearches(candidates, original, proposal);
    expect(result).toMatchObject({
      status: "PREVIEW_ONLY", totalCandidates: 5, changed: true,
      original: { counts: { ELIGIBLE: 1, NEEDS_REVIEW: 1, INELIGIBLE: 3 } },
      proposed: { counts: { ELIGIBLE: 2, NEEDS_REVIEW: 1, INELIGIBLE: 2 }, remainingRequiredCount: 2 },
      delta: { exactMatches: 1, needsReview: 0, ineligible: -1 },
      groups: { newlyEligible: { count: 1 }, noLongerEligible: { count: 0 },
        stillIneligible: { count: 2 }, stillNeedsReview: { count: 1 } },
    });
    const newcomer = result.groups.newlyEligible.examples[0];
    expect(newcomer).toMatchObject({
      id: "b", before: { eligibility: "INELIGIBLE" }, after: { eligibility: "ELIGIBLE" },
    });
    expect(newcomer.before.details.find(detail => detail.field === "noticePeriodDays")).toMatchObject({
      outcome: "FAIL", actual: 45,
    });
    expect(newcomer.after.details.find(detail => detail.field === "noticePeriodDays")).toMatchObject({
      outcome: "MATCH", actual: 45,
    });
    expect(result.changes).toMatchObject([{ key: "notice", type: "MODIFIED", hardConstraintImpact: "WEAKENED" }]);
    expect(result.transitions.INELIGIBLE.ELIGIBLE).toBe(1);
    expect({ original, proposal, candidates }).toEqual(inputs);
  });

  it("handles tightening and candidates that lose eligibility, not just relaxation", () => {
    const initial = rules([{ field: "notice", mode: "required", maxDays: 30 }]);
    const stricter = rules([{ field: "notice", mode: "required", maxDays: 15 }]);
    const result = compareSearches([person("a", { noticePeriodDays: 30 }),
      person("b", { noticePeriodDays: 15 })], initial, stricter);
    expect(result.delta.exactMatches).toBe(-1);
    expect(result.groups.noLongerEligible).toMatchObject({ count: 1, truncated: false });
    expect(result.groups.noLongerEligible.examples[0]).toMatchObject({
      id: "a", before: { eligibility: "ELIGIBLE" }, after: { eligibility: "INELIGIBLE" },
    });
    expect(result.changes[0].hardConstraintImpact).toBe("STRENGTHENED");
  });

  it("reports added, removed and changed requirements including skill-alias canonicalization", () => {
    const baseline = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "skill", mode: "required", value: "Java" },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const alternative = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "skill", mode: "required", value: "AWS" },
      { field: "notice", mode: "preferred", maxDays: 30 },
      { field: "city", mode: "required", value: "Pune" },
    ]);
    const changes = diffCriteria(baseline, alternative);
    expect(changes.map(x => [x.key, x.type, x.hardConstraintImpact])).toEqual([
      ["city", "ADDED", "STRENGTHENED"],
      ["notice", "MODIFIED", "WEAKENED"],
      ["skill:aws", "ADDED", "STRENGTHENED"],
      ["skill:java", "REMOVED", "WEAKENED"],
    ]);
    const aliases = diffCriteria(rules([{ field: "skill", mode: "required", value: "AWS" }]),
      rules([{ field: "skill", mode: "required", value: "Amazon Web Services" }]));
    expect(aliases).toHaveLength(1);
    expect(aliases[0]).toMatchObject({ key: "skill:aws", type: "MODIFIED", hardConstraintImpact: "CHANGED" });
  });

  it("excludes the reference profile from both sides and never uses its eligibility as impact", () => {
    const original = rules([{ field: "notice", mode: "required", maxDays: 30 }]);
    const proposed = rules([{ field: "notice", mode: "preferred", maxDays: 30 }]);
    const result = compareSearches([
      person("reference", { noticePeriodDays: 60 }),
      person("peer", { noticePeriodDays: 45 }),
    ], original, proposed, "reference");
    expect(result.totalCandidates).toBe(1);
    expect(result.original.counts.ELIGIBLE).toBe(0);
    expect(result.proposed.counts.ELIGIBLE).toBe(1);
    expect(result.groups.newlyEligible.examples.map(x => x.id)).toEqual(["peer"]);
    expect(result.proposed.remainingRequiredCount).toBe(0);
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("no mandatory criteria")]));
  });

  it("returns bounded evidence examples with untruncated totals and stable ordering", () => {
    const original = rules([{ field: "notice", mode: "required", maxDays: 30 }]);
    const proposed = rules([{ field: "notice", mode: "required", maxDays: 45 }]);
    const candidates = Array.from({ length: 27 }, (_, index) =>
      person("candidate-" + String(index).padStart(2, "0"), { noticePeriodDays: 31 }));
    const result = compareSearches(candidates.reverse(), original, proposed);
    expect(result.groups.newlyEligible).toMatchObject({ count: 27, truncated: true });
    expect(result.groups.newlyEligible.examples).toHaveLength(12);
    expect(result.groups.newlyEligible.examples[0].id).toBe("candidate-00");
    expect(result.groups.newlyEligible.examples[11].id).toBe("candidate-11");
    expect(result.delta.exactMatches).toBe(27);
  });

  it("supports unchanged, preference-only and empty-dataset previews without fake improvements", () => {
    const preferred = rules([{ field: "skill", mode: "preferred", value: "Java" }]);
    const unchanged = compareSearches([person("a", { skills: null })], preferred, preferred);
    expect(unchanged).toMatchObject({
      changed: false, changes: [], totalCandidates: 1,
      original: { counts: { ELIGIBLE: 1, NEEDS_REVIEW: 0, INELIGIBLE: 0 } },
      delta: { exactMatches: 0, needsReview: 0, ineligible: 0 },
    });
    expect(unchanged.warnings).toHaveLength(1);
    const empty = compareSearches([], preferred, preferred);
    expect(empty.totalCandidates).toBe(0);
    expect(empty.groups.newlyEligible.count).toBe(0);
  });

  it("rejects invalid criteria and handles unknown evidence honestly", () => {
    const original = rules([{ field: "notice", mode: "required", maxDays: 30 }]);
    expect(() => compareSearches([person("a")], original,
      [{ field: "notice", mode: "required", maxDays: 400 }] as never)).toThrow();
    expect(() => compareSearches([person("a")], original,
      [] as never)).toThrow();
    const result = compareSearches([person("unknown", { noticePeriodDays: null })],
      original, rules([{ field: "notice", mode: "preferred", maxDays: 30 }]));
    expect(result.transitions.NEEDS_REVIEW.ELIGIBLE).toBe(1);
    expect(result.groups.newlyEligible.examples[0]).toMatchObject({
      before: { details: [expect.objectContaining({ outcome: "UNKNOWN", actual: null })] },
    });
  });
});
