import { describe, expect, it } from "vitest";
import { criteriaSchema, type Rule } from "./criteria";
import { evaluate, type CandidateProfile, type Eligibility } from "./evaluate";
import { computeFrontier } from "./frontier";

function candidate(id: string, overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id, displayName: "Person " + id, roleTitle: "Senior Java Developer", city: "Hyderabad",
    experienceMonths: 100, noticePeriodDays: 30, skills: ["Java", "AWS"],
    industry: "Software", education: "BCA", employmentType: "Full-time",
    pastRoles: [], certifications: [], ...overrides,
  };
}
const rules = criteriaSchema.parse([
  { field: "role", mode: "required", value: "Senior Java Developer" },
  { field: "city", mode: "required", value: "Hyderabad" },
  { field: "experience", mode: "required", minMonths: 96 },
  { field: "notice", mode: "required", maxDays: 30 },
]);
const people = [
  candidate("a"),
  candidate("b", { noticePeriodDays: 45 }),
  candidate("c", { noticePeriodDays: 60 }),
  candidate("d", { noticePeriodDays: null }),
  candidate("e", { city: "Delhi" }),
];

function countsFor(candidates: CandidateProfile[], criteria: Rule[], referenceId: string | null = null) {
  const counts: Record<Eligibility, number> = { ELIGIBLE: 0, NEEDS_REVIEW: 0, INELIGIBLE: 0 };
  for (const record of candidates.filter(person => person.id !== referenceId)) {
    counts[evaluate(record, criteria).eligibility]++;
  }
  return counts;
}

describe("Pareto Frontier: bounded, mathematically honest preview", () => {
  it("counts actual evidence and matches authoritative evaluator for every displayed scenario", () => {
    const report = computeFrontier(people, rules);
    expect(report.status).toBe("PREVIEW_ONLY");
    expect(report.baseline.counts).toEqual({ ELIGIBLE: 1, NEEDS_REVIEW: 1, INELIGIBLE: 3 });
    expect(report.scope.totalCandidates).toBe(5);
    expect(report.scope.exhaustive).toBe(false);
    expect(report.strategies.length).toBeGreaterThan(0);
    for (const s of report.strategies) {
      expect(s.counts).toEqual(countsFor(people, s.proposedCriteria));
      expect(s.impact.netEligibleDelta).toBe(s.counts.ELIGIBLE - 1);
      expect(s.impact.newlyEligibleCount).toBe(s.counts.ELIGIBLE - 1);
      expect(s.impact.noLongerEligibleCount).toBe(0);
      expect(s.remainingRequiredCount).toBeGreaterThan(0);
      expect(criteriaSchema.parse(s.proposedCriteria)).toEqual(s.proposedCriteria);
    }
  });

  it("is deterministic, reorder-invariant, bounded, and leaves source records unchanged", () => {
    const originals = JSON.stringify({ people, rules });
    const one = computeFrontier(people, rules, null, 3);
    const two = computeFrontier([...people].reverse(), rules, null, 3);
    expect(one).toEqual(two);
    expect(one.strategies.length).toBeLessThanOrEqual(3);
    expect(one.scope.evaluatedSingle).toBeLessThanOrEqual(48);
    expect(one.scope.evaluatedPairs).toBeLessThanOrEqual(24);
    expect(JSON.stringify({ people, rules })).toBe(originals);
  });

  it("removes reference profile from every comparison and example", () => {
    const report = computeFrontier(people, rules, "a");
    expect(report.scope.totalCandidates).toBe(4);
    expect(report.baseline.counts.ELIGIBLE).toBe(0);
    for (const strategy of report.strategies) {
      expect(strategy.counts).toEqual(countsFor(people, strategy.proposedCriteria, "a"));
      expect(strategy.impact.newlyEligibleExamples.some(c => c.id === "a")).toBe(false);
    }
  });

  it("excludes redundant over-relaxations when a smaller notice concession gives equal coverage", () => {
    const report = computeFrontier([candidate("a"), candidate("b", { noticePeriodDays: 45 })], rules);
    expect(report.strategies.some(s => s.changes.some(change =>
      change.kind === "extend_notice" && change.after.field === "notice" && change.after.maxDays === 45))).toBe(true);
    expect(report.strategies.some(s => s.changes.some(change =>
      change.kind === "extend_notice" && change.after.field === "notice" && change.after.maxDays === 60))).toBe(false);
  });

  it("finds coupled blockers when singles cannot admit a candidate", () => {
    const criteria = criteriaSchema.parse([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const profiles = [candidate("a"), candidate("b", { city: "Delhi", noticePeriodDays: 45 })];
    const report = computeFrontier(profiles, criteria);
    expect(report.baseline.counts.ELIGIBLE).toBe(1);
    expect(report.scope.evaluatedPairs).toBeGreaterThan(0);
    expect(report.strategies.some(s => s.changes.length === 2 && s.counts.ELIGIBLE === 2)).toBe(true);
  });

  it("returns a truthful no-required-criteria report and zero-corpus response", () => {
    const preferred = criteriaSchema.parse([{ field: "skill", mode: "preferred", value: "Java", exclude: false }]);
    expect(computeFrontier(people, preferred)).toMatchObject({
      noRequiredConstraints: true, noMeasuredImprovement: true, strategies: [],
    });
    expect(computeFrontier([], rules)).toMatchObject({
      noMeasuredImprovement: true, scope: { totalCandidates: 0 }, strategies: [],
    });
  });

  it("does not convert unknown evidence to a known fact", () => {
    const report = computeFrontier(people, rules);
    for (const strategy of report.strategies) {
      expect(strategy.counts).toEqual(countsFor(people, strategy.proposedCriteria));
      if (strategy.changes.some(c => c.kind === "make_preferred" && c.before.field === "notice")) {
        expect(strategy.warnings.length).toBeGreaterThan(0);
      }
    }
  });

  it("does not silently drop all mandatory requirements", () => {
    const single = criteriaSchema.parse([{ field: "notice", mode: "required", maxDays: 30 }]);
    const report = computeFrontier(people, single);
    expect(report.strategies.every(s => s.remainingRequiredCount >= 1)).toBe(true);
  });

  it("cross-checks cached deltas against brute-force evaluation on randomized synthetic profiles", () => {
    const records = Array.from({ length: 200 }, (_, i) => candidate(String(i).padStart(3, "0"), {
      city: i % 7 === 0 ? null : i % 5 === 0 ? "Delhi" : "Hyderabad",
      experienceMonths: i % 9 === 0 ? null : 60 + i % 100,
      noticePeriodDays: i % 11 === 0 ? null : (i % 7) * 15,
      skills: i % 13 === 0 ? null : i % 3 ? ["Java"] : ["Java", "AWS"],
    }));
    const criteria = criteriaSchema.parse([...rules,
      { field: "skill", mode: "required", value: "AWS", exclude: false }]);
    const report = computeFrontier(records, criteria);
    expect(report.scope.totalCandidates).toBe(200);
    expect(report.baseline.counts).toEqual(countsFor(records, criteria));
    for (const strategy of report.strategies) {
      expect(strategy.counts).toEqual(countsFor(records, strategy.proposedCriteria));
      expect(strategy.impact.noLongerEligibleCount).toBe(0);
    }
  });

  it("rejects an invalid maxStrategies budget", () => {
    expect(() => computeFrontier(people, rules, null, 0)).toThrow();
    expect(() => computeFrontier(people, rules, null, 6)).toThrow();
  });
});
