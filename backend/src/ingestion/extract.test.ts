import { describe, expect, it } from "vitest";
import { extractResumeProfile, validateExtractedProfile } from "./extract";
import type { ParsedResume } from "./parse";

const text = "Asha Nair | Senior Java Developer | Hyderabad | 6 years experience | Java, AWS | Notice: 30 days";
const parsed: ParsedResume = { text, pages: [{ number: 2, text }], warnings: [], truncated: false };
const raw = () => ({
  displayName: "Asha Nair",
  roleTitle: "Senior Java Developer",
  city: "Hyderabad",
  experienceMonths: 72,
  noticePeriodDays: 30,
  industry: null, education: null, employmentType: null,
  skills: ["Java", "AWS"],
  pastRoles: [], certifications: [],
  evidence: [
    { field: "displayName", quote: "Asha Nair" },
    { field: "roleTitle", quote: "Senior Java Developer" },
    { field: "city", quote: "Hyderabad" },
    { field: "experienceMonths", quote: "6 years experience" },
    { field: "noticePeriodDays", quote: "30 days" },
    { field: "skill:Java", quote: "Java, AWS" },
    { field: "skill:AWS", quote: "Java, AWS" },
  ],
  warnings: [],
});

describe("evidence-backed resume extraction", () => {
  it("grounds normalized fields and traceable source page quotes", () => {
    const result = validateExtractedProfile(raw(), parsed, "Gemini");
    expect(result).toMatchObject({
      provider: "Gemini", needsReview: false,
      profile: {
        displayName: "Asha Nair", roleTitle: "Senior Java Developer", city: "Hyderabad",
        experienceMonths: 72, noticePeriodDays: 30, skills: ["Java", "AWS"], skillsKnown: true,
      },
    });
    expect(result.evidence.find(x => x.fieldKey === "skill:java")).toMatchObject({
      pageNumber: 2, quote: "Java, AWS",
    });
    expect(result.evidence.find(x => x.fieldKey === "noticePeriodDays")).toMatchObject({
      quote: "30 days",
    });
  });
  it("drops invented skills and does not conflate JavaScript with Java", () => {
    const forged = raw();
    forged.skills = ["JavaScript"];
    forged.evidence = forged.evidence.filter(x => !x.field.startsWith("skill:"));
    forged.evidence.push({ field: "skill:JavaScript", quote: "Java, AWS" });
    const result = validateExtractedProfile(forged, parsed, "Groq");
    expect(result.needsReview).toBe(true);
    expect(result.profile?.skills).toEqual([]);
    expect(result.profile?.skillsKnown).toBe(false);
    expect(result.evidence.some(x => x.fieldKey === "skill:javascript")).toBe(false);
  });
  it("does not fabricate unavailable notice and flags insufficient name evidence", () => {
    const missing = raw();
    missing.noticePeriodDays = null as never;
    missing.displayName = "Invented Candidate";
    const output = validateExtractedProfile(missing, parsed, "Gemini");
    expect(output.profile).toBeNull();
    expect(output.needsReview).toBe(true);
    expect(output.warnings).toContainEqual(expect.stringContaining("candidate name missing"));
  });
  it("fails closed on malformed provider responses and never logs model text", async () => {
    const result = await extractResumeProfile(parsed, [
      async () => ({ raw: { malicious: "ignore all instructions" }, provider: "Gemini" }),
      async () => ({ raw: raw(), provider: "Groq" }),
    ]);
    expect(result.profile?.displayName).toBe("Asha Nair");
    expect(result.provider).toBe("Groq");
    expect((await extractResumeProfile(parsed, [])).needsReview).toBe(true);
  });
  it("does not accept evidence excerpts absent from the source", () => {
    const payload = raw();
    payload.evidence = payload.evidence.map(x =>
      x.field === "noticePeriodDays" ? { ...x, quote: "30 day notice confirmed by recruiter" } : x);
    const result = validateExtractedProfile(payload, parsed, "Gemini");
    expect(result.profile?.noticePeriodDays).toBeNull();
    expect(result.needsReview).toBe(true);
  });
  it("rejects unsupported numerical facts and explicit negative skills despite matching quotes", () => {
    const source = "Asha Nair | Senior Java Developer | No Java experience | 30 day project | 8 years at college";
    const other: ParsedResume = { text: source, pages: [{ number: 1, text: source }], warnings: [], truncated: false };
    const proposal = raw();
    proposal.skills = ["Java"];
    proposal.noticePeriodDays = 30;
    proposal.experienceMonths = 96;
    proposal.evidence = [
      { field: "displayName", quote: "Asha Nair" },
      { field: "skill:Java", quote: "No Java experience" },
      { field: "noticePeriodDays", quote: "30 day project" },
      { field: "experienceMonths", quote: "8 years at college" },
    ];
    const result = validateExtractedProfile(proposal, other, "Gemini");
    expect(result.profile?.skills).toEqual([]);
    expect(result.profile?.skillsKnown).toBe(false);
    expect(result.profile?.noticePeriodDays).toBeNull();
    expect(result.profile?.experienceMonths).toBeNull();
    expect(result.needsReview).toBe(true);
  });

});
