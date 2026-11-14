import { describe, expect, it } from "vitest";
import { applyDelta, criteriaSchema, deltaSchema } from "./criteria";
import { evaluate, rank, referenceCriteria, type CandidateProfile } from "./evaluate";

const profile: CandidateProfile = {
  id: "1", displayName: "Synthetic Candidate", roleTitle: "Senior Java Developer",
  city: "Hyderabad", experienceMonths: 72, noticePeriodDays: 30, industry: "Fintech",
  education: "BCA", employmentType: "Full-time", certifications: ["AWS Solutions Architect"],
  pastRoles: ["Java Developer"], skills: ["Java", "Spring Boot", "AWS"],
};
const rules = criteriaSchema.parse([
  { field: "role", value: "Java developers", mode: "required" },
  { field: "city", value: "Hyderabad", mode: "required" },
  { field: "experience", minMonths: 72, maxMonths: 120, mode: "required" },
  { field: "skill", value: "Java", mode: "required" },
  { field: "skill", value: "Amazon Web Services", mode: "required" },
  { field: "notice", maxDays: 30, mode: "required" },
]);

describe("candidate evaluation", () => {
  it.each([[0, "ELIGIBLE"], [30, "ELIGIBLE"], [31, "INELIGIBLE"], [null, "NEEDS_REVIEW"]])(
    "evaluates notice %s as %s", (noticePeriodDays, eligibility) => {
      expect(evaluate({ ...profile, noticePeriodDays }, rules).eligibility).toBe(eligibility);
    },
  );
  it("uses inclusive experience and skill tokens, with actual evidence", () => {
    expect(evaluate({ ...profile, experienceMonths: 120 }, rules).requiredMet).toBe(6);
    expect(evaluate({ ...profile, experienceMonths: 121 }, rules).eligibility).toBe("INELIGIBLE");
    const result = evaluate({ ...profile, skills: ["JavaScript", "AWS"], noticePeriodDays: null }, rules);
    expect(result.eligibility).toBe("INELIGIBLE");
    expect(result.details[3]).toMatchObject({ outcome: "FAIL", field: "skills", actual: ["JavaScript", "AWS"] });
    expect(result.details[5]).toMatchObject({ outcome: "UNKNOWN", actual: null });
  });
  it("does not turn undocumented prior roles or certifications into proven mismatches", () => {
    const requirements = criteriaSchema.parse([
      { field: "pastRole", value: "Java Developer", mode: "required" },
      { field: "certification", value: "AWS Solutions Architect", mode: "required" },
    ]);
    const undocumented = evaluate({ ...profile, pastRoles: [], certifications: [] }, requirements);
    expect(undocumented.eligibility).toBe("NEEDS_REVIEW");
    expect(undocumented.details.map(detail => detail.outcome)).toEqual(["UNKNOWN", "UNKNOWN"]);
    expect(undocumented.details.every(detail => detail.reason.includes("not documented"))).toBe(true);

    const documentedMismatch = evaluate({
      ...profile, pastRoles: ["Python Developer"], certifications: ["CKA"],
    }, requirements);
    expect(documentedMismatch.eligibility).toBe("INELIGIBLE");
    expect(documentedMismatch.details.map(detail => detail.outcome)).toEqual(["FAIL", "FAIL"]);

    // An explicitly-known empty skill list does prove that a required skill is absent.
    const missingSkill = evaluate({ ...profile, skills: [] }, criteriaSchema.parse([
      { field: "skill", mode: "required", value: "Java" },
    ]));
    expect(missingSkill.eligibility).toBe("INELIGIBLE");
  });
  it("rejects inverted ranges and conflicting aliases", () => {
    expect(criteriaSchema.safeParse([{ field: "experience", mode: "required", minMonths: 120, maxMonths: 72 }]).success).toBe(false);
    expect(criteriaSchema.safeParse([...rules, { field: "skill", value: "AWS", mode: "required", exclude: true }]).success).toBe(false);
  });
  it("preserves unrelated criteria in consecutive deltas", () => {
    const next = applyDelta(rules, deltaSchema.parse([
      { op: "set", rule: { field: "skill", value: "Spring Boot", mode: "required" } },
    ]));
    const narrower = applyDelta(next, deltaSchema.parse([
      { op: "set", rule: { field: "notice", maxDays: 15, mode: "required" } },
    ]));
    expect(narrower).toEqual([...rules.slice(0, 5), { ...rules[5], maxDays: 15 }, next.at(-1)]);
    expect(applyDelta(narrower, [{ op: "remove", key: "city" }])).toHaveLength(6);
    expect(() => applyDelta(rules, [{ op: "remove", key: "industry" }])).toThrow();
  });
  it("excludes the reference and ranks peers by documented matches", () => {
    const reference = referenceCriteria(profile);
    const peers = rank([profile, { ...profile, id: "2", skills: null }, { ...profile, id: "3" }], reference, profile.id);
    expect(peers.map(peer => peer.candidate.id)).toEqual(["3", "2"]);
    expect(peers[0].preferenceMet).toBe(reference.length);
    expect(peers[1].preferenceMet).toBe(reference.length - 3);
  });
});
