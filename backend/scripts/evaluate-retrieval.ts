import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { database } from "../src/search/db";
import { criteriaSchema } from "../src/search/criteria";
import { rank } from "../src/search/evaluate";
import { rankWithSemantic } from "../src/search/semantic";
import { retrievalMetrics, type RetrievalJudgment } from "../src/search/retrieval";
import type { CandidateProfile } from "../src/search/evaluate";

config({ path: "../.env", quiet: true });
config({ path: ".env", quiet: true });
type Gold = {
  id: string; description: string; criteria: unknown;
  relevantKeys: number[]; referenceKey?: number;
};
const gold = JSON.parse(readFileSync(
  new URL("../evals/fixtures/retrieval-gold.json", import.meta.url), "utf8",
)) as Gold[];
const ownerId = process.env.PARETO_EVAL_OWNER_ID || process.env.DEMO_OWNER_ID || "";
const fixtureId = (n: number) => "demo-v1-" + ownerId + "-" + String(n).padStart(3, "0");

async function main() {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ownerId))
    throw new Error("Set PARETO_EVAL_OWNER_ID to the seeded recruiter's UUID.");
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    throw new Error("Live evaluation requires GOOGLE_GENERATIVE_AI_API_KEY.");
  const rows = await database().candidate.findMany({
    where: { ownerId, id: { startsWith: "demo-v1-" + ownerId + "-" } },
    include: { skills: { include: { skill: true } } }, take: 1001,
  });
  if (rows.length !== 48) throw new Error("Expected the complete 48-profile synthetic evaluation corpus.");
  const candidates: CandidateProfile[] = rows.map(row => ({
    id: row.id, displayName: row.displayName, roleTitle: row.roleTitle,
    city: row.city, experienceMonths: row.experienceMonths,
    noticePeriodDays: row.noticePeriodDays, industry: row.industry,
    education: row.education, employmentType: row.employmentType,
    pastRoles: row.pastRoles, certifications: row.certifications,
    skills: row.skillsKnown ? row.skills.map(link => link.skill.displayName) : null,
  }));
  const lexical: RetrievalJudgment[] = [];
  const hybrid: RetrievalJudgment[] = [];
  let covered = 0;
  for (const item of gold) {
    const rules = criteriaSchema.parse(item.criteria);
    const referenceId = item.referenceKey === undefined ? null : fixtureId(item.referenceKey);
    const before = rank(candidates, rules, referenceId);
    const after = await rankWithSemantic(ownerId, candidates, rules, referenceId);
    if (after.some(result => {
      const detail = (result as unknown as { retrieval?: { semanticSimilarity: number | null } }).retrieval;
      return detail?.semanticSimilarity !== undefined && detail?.semanticSimilarity !== null;
    })) covered++;
    const relevantIds = item.relevantKeys.map(fixtureId);
    lexical.push({ relevantIds, rankedIds: before.map(row => row.candidate.id) });
    hybrid.push({ relevantIds, rankedIds: after.map(row => row.candidate.id) });
  }
  if (!covered) throw new Error("No live semantic scores were available. Backfill embeddings and verify the Gemini API.");
  const baseline = retrievalMetrics(lexical, 10);
  const semantic = retrievalMetrics(hybrid, 10);
  const difference = {
    recallAtK: semantic.recallAtK - baseline.recallAtK,
    mrrAtK: semantic.mrrAtK - baseline.mrrAtK,
    ndcgAtK: semantic.ndcgAtK - baseline.ndcgAtK,
  };
  console.log(JSON.stringify({ benchmark: "synthetic-retrieval-v1", corpusSize: candidates.length,
    judgedQueries: gold.length, queriesWithSemanticScores: covered, baseline, hybrid: semantic,
    delta: difference, limitations: "Tiny synthetic labels; not a real-world relevance or fairness claim." }, null, 2));
}
main().catch(() => {
  console.error("Retrieval evaluation failed (owner, dataset, index, database or provider unavailable).");
  process.exitCode = 1;
}).finally(async () => { await database().$disconnect(); });
