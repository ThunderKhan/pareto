import { afterAll, describe, expect, it } from "vitest";
import { database } from "./db";
import { candidateFor } from "./service";
import { indexCandidate, rankWithSemantic, type Embedder } from "./semantic";
import { EMBEDDING_DIMENSIONS } from "./retrieval";

const integrationUrl = process.env.PARETO_TEST_DATABASE_URL;
const owner = "11111111-1111-4111-8111-111111111111";
const stranger = "22222222-2222-4222-8222-222222222222";
const candidateA = "demo-v1-" + owner + "-000";
const candidateB = "demo-v1-" + owner + "-001";
const vector = (axis: number) => {
  const values = Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  values[axis] = 1;
  return values;
};
describe.skipIf(!integrationUrl)("pgvector owner-scoped retrieval integration", () => {
  if (integrationUrl) process.env.DATABASE_URL = integrationUrl;
  afterAll(async () => {
    await database().$executeRaw`
      DELETE FROM "CandidateEmbedding" WHERE "ownerId" = ${owner}
      AND "candidateId" IN (${candidateA}, ${candidateB})`;
    await database().$disconnect();
  });
  it("enforces ownership, persists idempotent vectors and computes nearest neighbors", async () => {
    const documentEmbed: Embedder = async text => vector(text.includes("Experience in months: 72") ? 0 : 1);
    expect(await indexCandidate(stranger, candidateA, documentEmbed)).toBe("absent");
    expect(await indexCandidate(owner, candidateA, documentEmbed)).toBe("indexed");
    expect(await indexCandidate(owner, candidateA, documentEmbed)).toBe("unchanged");
    expect(await indexCandidate(owner, candidateB, documentEmbed)).toBe("indexed");
    const a = await candidateFor(owner, candidateA);
    const b = await candidateFor(owner, candidateB);
    const queryEmbed: Embedder = async (_text, task) => {
      expect(task).toBe("RETRIEVAL_QUERY");
      return vector(1);
    };
    const rules = [{ field: "industry", value: "Fintech", mode: "preferred" }] as const;
    const originalMode = process.env.PARETO_SEMANTIC_SEARCH;
    process.env.PARETO_SEMANTIC_SEARCH = "1";
    try {
      const found = await rankWithSemantic(owner, [a, b], [...rules], null, queryEmbed);
      expect(found.map(item => item.candidate.id)).toEqual([candidateB, candidateA]);
      expect(found.every(item => "retrieval" in item)).toBe(true);
      const isolated = await rankWithSemantic(stranger, [a, b], [...rules], null, queryEmbed);
      expect(isolated.every(item => !("retrieval" in item))).toBe(true);
    } finally {
      if (originalMode === undefined) delete process.env.PARETO_SEMANTIC_SEARCH;
      else process.env.PARETO_SEMANTIC_SEARCH = originalMode;
    }
  });
});
