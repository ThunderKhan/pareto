import { describe, expect, it } from "vitest";
import { verifyResumeClaim } from "./resume-evidence";

describe("resume evidence quote does not imply semantic truth", () => {
  it("supports an explicit contextual joining time, not a project duration", () => {
    expect(verifyResumeClaim({ field: "noticePeriodDays", value: 30, quote: "30 days", sourceText: "Notice: 30 days" })).toBe("supported");
    expect(verifyResumeClaim({ field: "noticePeriodDays", value: 30, quote: "30 days", sourceText: "Project completed in 30 days" })).toBe("unknown");
    expect(verifyResumeClaim({ field: "noticePeriodDays", value: 30, quote: "30 days", sourceText: "Notice: 60 days; project: 30 days" })).toBe("unknown");
    expect(verifyResumeClaim({ field: "noticePeriodDays", value: 21, quote: "3 weeks", sourceText: "Can join in 3 weeks" })).toBe("supported");
  });
  it("does not accept negative or aspirational skills", () => {
    expect(verifyResumeClaim({ field: "skill", value: "Java", quote: "No Java experience", sourceText: "No Java experience" })).toBe("contradicted");
    expect(verifyResumeClaim({ field: "skill", value: "Java", quote: "JavaScript", sourceText: "JavaScript" })).toBe("unknown");
    expect(verifyResumeClaim({ field: "skill", value: "Java", quote: "Planning to learn Java", sourceText: "Planning to learn Java" })).toBe("unknown");
    expect(verifyResumeClaim({ field: "skill", value: "Java", quote: "Skills: Java", sourceText: "Skills: Java" })).toBe("supported");
  });
  it("requires an explicit experience total, not numerical coincidence", () => {
    expect(verifyResumeClaim({ field: "experienceMonths", value: 72, quote: "6 years experience", sourceText: "6 years experience" })).toBe("supported");
    expect(verifyResumeClaim({ field: "experienceMonths", value: 72, quote: "6 years", sourceText: "Project lasted 6 years" })).toBe("unknown");
  });
  it("refuses desired job locations and aspirational qualifications as verified facts", () => {
    expect(verifyResumeClaim({
      field: "city", value: "Hyderabad", quote: "Hyderabad",
      sourceText: "Preferred work location: Hyderabad",
    })).toBe("unknown");
    expect(verifyResumeClaim({
      field: "city", value: "Hyderabad", quote: "Hyderabad",
      sourceText: "Current location: Hyderabad",
    })).toBe("supported");
    expect(verifyResumeClaim({
      field: "roleTitle", value: "Senior Java Developer",
      quote: "Senior Java Developer", sourceText: "Seeking a Senior Java Developer role",
    })).toBe("unknown");
    expect(verifyResumeClaim({
      field: "certification", value: "AWS Solutions Architect",
      quote: "AWS Solutions Architect", sourceText: "Preparing for AWS Solutions Architect",
    })).toBe("unknown");
    expect(verifyResumeClaim({
      field: "certification", value: "AWS Solutions Architect",
      quote: "AWS Solutions Architect", sourceText: "AWS Solutions Architect certified in 2024",
    })).toBe("supported");
    expect(verifyResumeClaim({
      field: "education", value: "B.Tech", quote: "B.Tech",
      sourceText: "Planning to pursue B.Tech next year",
    })).toBe("unknown");
  });

});
