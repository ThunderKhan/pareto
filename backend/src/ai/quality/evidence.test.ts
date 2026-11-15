import { describe, expect, it } from "vitest";
import { locateEvidence, checkExperienceEvidence, checkNoticeEvidence, checkSkillEvidence } from "./evidence";
import { documentedExperienceMonths } from "./dates";

describe("evidence semantics and provenance", () => {
  it("finds precise original offsets, but never invents offsets after whitespace normalization", () => {
    const pages = [{ number: 1, text: "Asha Patel\nJava and AWS" }, { number: 2, text: "Notice period: 30 days" }];
    expect(locateEvidence("Java and AWS", pages)).toMatchObject({ pageNumber: 1, sourceStart: 11, exact: true });
    expect(locateEvidence("Notice   period: 30 days", pages)).toMatchObject({ pageNumber: 2, sourceStart: null, exact: false });
    expect(locateEvidence("Kubernetes", pages)).toBeNull();
  });
  it("rejects Java vs JavaScript and explicit negative or aspirational skill claims", () => {
    expect(checkSkillEvidence("Java", "JavaScript, TypeScript, HTML")).toBe("unknown");
    expect(checkSkillEvidence("Java", "No experience with Java")).toBe("contradicted");
    expect(checkSkillEvidence("Java", "Interested in learning Java")).toBe("unknown");
    expect(checkSkillEvidence("Java", "Skills: Java, Spring Boot, AWS")).toBe("supported");
  });
  it("requires semantic joining context and consistent numbers", () => {
    expect(checkNoticeEvidence(30, "Built a 30 days project")).toBe("unknown");
    expect(checkNoticeEvidence(30, "Notice period: 30 days")).toBe("supported");
    expect(checkNoticeEvidence(21, "Available to join in 3 weeks")).toBe("supported");
    expect(checkNoticeEvidence(0, "Can join immediately")).toBe("supported");
    expect(checkExperienceEvidence(96, "8 years of experience")).toBe("supported");
    expect(checkExperienceEvidence(60, "Project ran for 5 years")).toBe("unknown");
    expect(checkExperienceEvidence(90, "8 years of experience")).toBe("unknown");
  });
  it("unions overlapping employment intervals without double counting", () => {
    const months = documentedExperienceMonths([
      { start: { year: 2020, month: 1 }, end: { year: 2022, month: 1 } },
      { start: { year: 2021, month: 1 }, end: { year: 2023, month: 1 } },
    ], { year: 2026, month: 11 });
    expect(months).toBe(36);
    expect(documentedExperienceMonths([
      { start: { year: 2025, month: 1 }, end: { year: 2024, month: 1 } },
    ], { year: 2026, month: 11 })).toBeNull();
  });
});
