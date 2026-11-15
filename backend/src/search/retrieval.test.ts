import { describe, expect, it } from "vitest";
import type { CandidateProfile } from "./evaluate";
import { candidateDocument, documentHash, hybridRank, lexicalScore, queryDocument, retrievalMetrics } from "./retrieval";

const example = (id: string, skill: string): CandidateProfile => ({
  id, displayName: id, roleTitle: "Backend Engineer", city: "Pune",
  experienceMonths: 72, noticePeriodDays: null, industry: "Fintech",
  education: null, employmentType: null, pastRoles: [], certifications: [], skills: [skill],
});
describe("semantic retrieval invariants", () => {
  it("excludes names and undocumented facts from embeddings", () => {
    const a = example("a", "Spring Boot");
    const b = { ...a, displayName: "Different Name" };
    expect(candidateDocument(a)).toBe(candidateDocument(b));
    expect(documentHash(candidateDocument(a))).toBe(documentHash(candidateDocument(b)));
    expect(candidateDocument(a)).not.toContain("Different Name");
    expect(candidateDocument({ ...a, skills: null, noticePeriodDays: null })).not.toContain("Skills:");
    expect(candidateDocument({ ...a, skills: null, noticePeriodDays: null })).not.toContain("Notice period");
    expect(documentHash(candidateDocument({ ...a, skills: ["Java"] }))).not.toBe(documentHash(candidateDocument(a)));
  });

  it("omits excluded skills from vector query text while retaining them in deterministic rules", () => {
    const query = queryDocument([
      { field: "role", value: "Backend Engineer", mode: "required" },
      { field: "skill", value: "JavaScript", mode: "required", exclude: true },
      { field: "skill", value: "Spring Boot", mode: "preferred", exclude: false },
    ]);
    expect(query).toContain("Spring Boot");
    expect(query).not.toContain("JavaScript");
    expect(lexicalScore(query, candidateDocument(example("x", "Spring Boot")))).toBeGreaterThan(0);
  });

  it("uses semantic evidence to order only a deterministic tie", () => {
    const candidates = [example("a", "Spring Boot"), example("b", "Django")];
    const rules = [{ field: "industry", mode: "preferred", value: "Fintech" }] as const;
    const results = hybridRank(candidates, [...rules], new Map([["a", -0.2], ["b", 0.95]]));
    expect(results.map(item => item.candidate.id)).toEqual(["b", "a"]);
    expect((results[0] as { retrieval: { semanticSimilarity: number | null } }).retrieval.semanticSimilarity).toBe(0.95);
    expect(results[0].preferenceMet).toBe(1);
  });

  it("never elevates a hard-filter failure or unknown required evidence", () => {
    const complete = example("eligible", "Java");
    const failed = example("failed", "Django");
    const unknown = { ...example("unknown", "Java"), skills: null };
    const required = [{ field: "skill", mode: "required", value: "Java", exclude: false }] as const;
    const results = hybridRank([failed, unknown, complete], [...required],
      new Map([["failed", 0.99], ["unknown", 0.95], ["eligible", 0.1]]));
    expect(results.map(item => item.candidate.id)).toEqual(["eligible", "unknown", "failed"]);
    expect(results.map(item => item.eligibility)).toEqual(["ELIGIBLE", "NEEDS_REVIEW", "INELIGIBLE"]);
  });

  it("preserves legacy ranking exactly without embeddings", () => {
    const results = hybridRank([example("b", "Java"), example("a", "Java")],
      [{ field: "city", value: "Pune", mode: "required" }], new Map());
    expect(results.map(item => item.candidate.id)).toEqual(["a", "b"]);
    expect(results.every(item => !("retrieval" in item))).toBe(true);
  });
});

describe("judged retrieval metrics", () => {
  it("computes recall@k, reciprocal rank and nDCG from relevance labels", () => {
    const value = retrievalMetrics([
      { relevantIds: ["x", "y"], rankedIds: ["wrong", "x", "y"] },
    ], 2);
    expect(value.recallAtK).toBe(0.5);
    expect(value.mrrAtK).toBe(0.5);
    expect(value.ndcgAtK).toBeGreaterThan(0);
    expect(value.ndcgAtK).toBeLessThan(1);
    expect(() => retrievalMetrics([{ relevantIds: [], rankedIds: [] }])).toThrow();
  });
});
