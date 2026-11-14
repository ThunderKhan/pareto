import { describe, expect, it, vi } from "vitest";
import { criteriaSchema } from "./criteria";
import { interpret, interpretRefinement } from "./interpret";

describe("provider output", () => {
  it("falls back from invalid Gemini output and parses the organizer brief shape", async () => {
    const criteria = [
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      ...["Java", "Spring Boot", "AWS"].map(value => ({ field: "skill", mode: "required", value })),
      { field: "notice", mode: "required", maxDays: 30 },
    ];
    const primary = vi.fn().mockResolvedValue({ raw: { criteria: [{ field: "experience", minMonths: -1 }] }, provider: "Gemini" });
    const fallback = vi.fn().mockResolvedValue({ raw: { criteria }, provider: "Groq" });
    const result = await interpret("Find a senior Java developer in Hyderabad with 6–10 years, Java, Spring Boot, AWS, and joining within 30 days.", [primary, fallback]);
    expect(result).toEqual({ criteria: criteriaSchema.parse(criteria), provider: "Groq", warnings: [] });
    expect(primary).toHaveBeenCalledOnce();
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("surfaces unconfigured providers and keeps ambiguous follow-ups non-destructive", async () => {
    await expect(interpret("Find Java developers", [])).rejects.toMatchObject({ status: 503 });
    const criteria = criteriaSchema.parse([{ field: "skill", mode: "required", value: "Java" }]);
    const reply = await interpretRefinement("Make that more flexible", criteria, [
      async () => ({ raw: { operations: [], warnings: ["Which criterion should change?"] }, provider: "Gemini" }),
    ]);
    expect(reply).toMatchObject({ criteria, changed: false });
  });
});
