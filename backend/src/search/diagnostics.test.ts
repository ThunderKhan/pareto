import { describe, expect, it } from "vitest";
import { criteriaSchema, type Rule } from "./criteria";
import { diagnoseSearch } from "./diagnostics";
import type { CandidateProfile } from "./evaluate";

const candidate = (id: string, changes: Partial<CandidateProfile> = {}): CandidateProfile => ({
  id, displayName: `Synthetic ${id}`, roleTitle: "Senior Java Developer",
  city: "Hyderabad", experienceMonths: 96, noticePeriodDays: 30,
  skills: ["Java", "AWS"], industry: "Fintech", education: "BCA",
  employmentType: "Full-time", pastRoles: ["Backend Developer"],
  certifications: ["Java Associate"], ...changes,
});

const rules = (input: unknown): Rule[] => criteriaSchema.parse(input);

describe("search health diagnostics: deterministic non-mutating previews", () => {
  it("measures exact gains for 30→45 days, unknown facts and genuine sole blockers", () => {
    const criteria = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const rows = [
      candidate("a", { noticePeriodDays: 30 }),
      candidate("b", { noticePeriodDays: 31 }),
      candidate("c", { noticePeriodDays: 45 }),
      candidate("d", { noticePeriodDays: 60 }),
      candidate("e", { noticePeriodDays: null }),
      candidate("f", { roleTitle: "Python Engineer", noticePeriodDays: 15 }),
    ];
    const before = structuredClone({ criteria, rows });
    const result = diagnoseSearch(rows, criteria);
    expect(result.status).toBe("PREVIEW_ONLY");
    expect(result.totalCandidates).toBe(6);
    expect(result.baseline.counts).toEqual({ ELIGIBLE: 1, NEEDS_REVIEW: 1, INELIGIBLE: 4 });
    expect(result.bottlenecks.find(item => item.key === "notice")).toMatchObject({
      failedCount: 3, unknownCount: 1, soleFailureCount: 3, soleUnknownCount: 1,
    });
    const suggestion = result.suggestions.find(item => item.changes.some(change =>
      change.kind === "extend_notice" && change.after.field === "notice" && change.after.maxDays === 45));
    expect(suggestion).toBeDefined();
    expect(suggestion?.counts).toEqual({ ELIGIBLE: 3, NEEDS_REVIEW: 1, INELIGIBLE: 2 });
    expect(suggestion?.newlyEligible.map(row => row.id)).toEqual(["b", "c"]);
    expect(suggestion?.newlyEligibleTotal).toBe(2);
    expect(suggestion?.remainingRequiredCount).toBe(2);
    expect(suggestion?.proposedCriteria[0]).toEqual(criteria[0]);
    expect({ criteria, rows }).toEqual(before);
  });

  it("tests bounded pairs when two simultaneous blockers defeat every single change", () => {
    const criteria = rules([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
    ]);
    const result = diagnoseSearch([
      candidate("qualified"),
      candidate("blocked-twice", { roleTitle: "Python Developer", city: "Pune" }),
    ], criteria);
    expect(result.baseline.counts.ELIGIBLE).toBe(1);
    expect(result.evaluatedAlternatives).toMatchObject({ single: 2, paired: 1 });
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      additionalEligibleCount: 1, remainingRequiredCount: 0,
      warnings: [expect.stringContaining("no mandatory requirements")],
    });
    expect(result.suggestions[0].changes.map(change => change.key).sort()).toEqual(["city", "role"]);
    expect(result.suggestions[0].newlyEligible.map(row => row.id)).toEqual(["blocked-twice"]);
  });

  it("keeps Java distinct from JavaScript and missing skill evidence distinct from negative evidence", () => {
    const result = diagnoseSearch([
      candidate("java", { skills: ["Java"] }),
      candidate("javascript", { skills: ["JavaScript"] }),
      candidate("unknown", { skills: null }),
    ], rules([{ field: "skill", mode: "required", value: "Java" }]));
    expect(result.baseline.counts).toEqual({ ELIGIBLE: 1, NEEDS_REVIEW: 1, INELIGIBLE: 1 });
    const alternative = result.suggestions[0];
    expect(alternative.remainingRequiredCount).toBe(0);
    expect(alternative.warnings).toHaveLength(1);
    expect(alternative.newlyEligible).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "javascript", previousStatus: "INELIGIBLE" }),
      expect.objectContaining({ id: "unknown", previousStatus: "NEEDS_REVIEW" }),
    ]));
  });

  it("relaxes inclusive experience bounds safely and does not generate invalid range values", () => {
    const result = diagnoseSearch([
      candidate("within", { experienceMonths: 72 }),
      candidate("below", { experienceMonths: 71 }),
      candidate("above", { experienceMonths: 121 }),
    ], rules([{ field: "experience", mode: "required", minMonths: 72, maxMonths: 120 }]));
    expect(result.baseline.counts.ELIGIBLE).toBe(1);
    expect(result.suggestions.some(s => s.changes.some(c =>
      c.kind === "lower_experience_min" && c.after.field === "experience" && c.after.minMonths === 60))).toBe(true);
    expect(result.suggestions.some(s => s.changes.some(c =>
      c.kind === "raise_experience_max" && c.after.field === "experience" && c.after.maxMonths === 132))).toBe(true);
    for (const suggestion of result.suggestions) expect(criteriaSchema.safeParse(suggestion.proposedCriteria).success).toBe(true);
    expect(diagnoseSearch([candidate("x")], rules([
      { field: "notice", mode: "required", maxDays: 365 },
      { field: "experience", mode: "required", minMonths: 0, maxMonths: 720 },
    ])).suggestions.every(s => !s.changes.some(c => c.kind !== "make_preferred"))).toBe(true);
  });

  it("excludes reference profiles and handles preference-only and empty corpora honestly", () => {
    const people = [candidate("reference"), candidate("peer", { noticePeriodDays: 45 })];
    const criteria = rules([{ field: "notice", mode: "required", maxDays: 30 }]);
    const result = diagnoseSearch(people, criteria, "reference");
    expect(result.totalCandidates).toBe(1);
    expect(result.baseline.counts.ELIGIBLE).toBe(0);
    expect(result.suggestions.every(s =>
      s.newlyEligible.every(row => row.id !== "reference"))).toBe(true);
    expect(result.suggestions.some(s => s.newlyEligible.some(row => row.id === "peer"))).toBe(true);

    const onlyPreferences = diagnoseSearch(people, rules([
      { field: "skill", mode: "preferred", value: "AWS" },
    ]), "reference");
    expect(onlyPreferences).toMatchObject({
      noRequiredConstraints: true, noMeasuredImprovement: true,
      totalCandidates: 1, suggestions: [],
      baseline: { counts: { ELIGIBLE: 1, NEEDS_REVIEW: 0, INELIGIBLE: 0 } },
    });
    expect(diagnoseSearch([], criteria)).toMatchObject({
      totalCandidates: 0, suggestions: [], noMeasuredImprovement: true,
    });
  });

  it("caps newly eligible examples without falsifying their total count", () => {
    const people = Array.from({ length: 25 }, (_, index) => candidate(
      `candidate-${String(index).padStart(2, "0")}`, { noticePeriodDays: 31 },
    ));
    const result = diagnoseSearch(people, rules([{ field: "notice", mode: "required", maxDays: 30 }]));
    const notice = result.suggestions.find(s => s.changes.some(c => c.kind === "extend_notice"));
    expect(notice).toMatchObject({ newlyEligibleTotal: 25, additionalEligibleCount: 25, newlyEligibleTruncated: true });
    expect(notice?.newlyEligible).toHaveLength(12);
    expect(notice?.newlyEligible[0].id).toBe("candidate-00");
    expect(notice?.newlyEligible.at(-1)?.id).toBe("candidate-11");
  });
});
