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
});
