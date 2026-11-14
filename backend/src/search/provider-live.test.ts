import { describe, expect, it } from "vitest";
import { criteriaSchema } from "./criteria";
import { interpret, interpretRefinement } from "./interpret";

// This test calls real Gemini/Groq. It runs only with the explicit secure
// PARETO_VERIFY_LIVE_MODELS gate; never log tokens or provider responses.
describe.skipIf(process.env.PARETO_VERIFY_LIVE_MODELS !== "1")("real provider contract", () => {
  it("verifies each configured provider independently for extraction and refinement", async () => {
    const saved = {
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL,
    };
    const configured = [
      { name: "Gemini", key: saved.GOOGLE_GENERATIVE_AI_API_KEY, model: saved.GEMINI_MODEL },
      { name: "Groq", key: saved.GROQ_API_KEY, model: saved.GROQ_MODEL },
    ].filter(({ key, model }) => Boolean(key && model));
    expect(configured.length, "Configure at least one complete API key + model pair").toBeGreaterThan(0);

    try {
      for (const provider of configured) {
        // Isolate the provider under test so fallback cannot hide failures.
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = provider.name === "Gemini" ? saved.GOOGLE_GENERATIVE_AI_API_KEY : "";
        process.env.GEMINI_MODEL = provider.name === "Gemini" ? saved.GEMINI_MODEL : "";
        process.env.GROQ_API_KEY = provider.name === "Groq" ? saved.GROQ_API_KEY : "";
        process.env.GROQ_MODEL = provider.name === "Groq" ? saved.GROQ_MODEL : "";

        const extracted = await interpret(
          "Find Senior Java Developers in Hyderabad with Java, Spring Boot and AWS, joining within 30 days.",
        );
        expect(extracted.provider).toBe(provider.name);
        expect(extracted.criteria.some(rule => rule.field === "role")).toBe(true);
        expect(extracted.criteria.some(rule => rule.field === "city" && rule.value.toLowerCase() === "hyderabad")).toBe(true);
        for (const skill of ["java", "spring boot", "aws"]) {
          expect(extracted.criteria.some(rule =>
            rule.field === "skill" && rule.value.toLowerCase() === skill && rule.mode === "required",
          )).toBe(true);
        }
        expect(extracted.criteria.some(rule => rule.field === "notice" && rule.maxDays === 30)).toBe(true);

        const baseline = criteriaSchema.parse([
          { field: "city", mode: "required", value: "Hyderabad" },
          { field: "skill", mode: "required", value: "Java" },
          { field: "notice", mode: "required", maxDays: 45 },
        ]);
        const refined = await interpretRefinement(
          "Keep the location and Java requirement; now also require Spring Boot and joining within 30 days.",
          baseline,
        );
        expect(refined.provider).toBe(provider.name);
        expect(refined.changed).toBe(true);
        expect(refined.criteria).toEqual(expect.arrayContaining([
          expect.objectContaining({ field: "city", value: "Hyderabad", mode: "required" }),
          expect.objectContaining({ field: "skill", value: "Java", mode: "required" }),
          expect.objectContaining({ field: "skill", value: "Spring Boot", mode: "required" }),
          expect.objectContaining({ field: "notice", maxDays: 30, mode: "required" }),
        ]));
      }
    } finally {
      for (const [name, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  }, 120_000);
});
