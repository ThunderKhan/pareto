import { createHash } from "node:crypto";
import type { Rule } from "./criteria";
import type { CandidateProfile } from "./evaluate";
import { rank } from "./evaluate";

/** Versioned representation: only documented professional attributes, never names,
 * raw resumes, email addresses or protected personal attributes. */
export const DOCUMENT_VERSION = 1;
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_MODEL = "gemini-embedding-001";

export function candidateDocument(candidate: CandidateProfile): string {
  const fields: Array<[string, string | number | null]> = [
    ["Current role", candidate.roleTitle], ["Location", candidate.city],
    ["Experience in months", candidate.experienceMonths],
    ["Notice period in days", candidate.noticePeriodDays],
    ["Industry", candidate.industry], ["Education", candidate.education],
    ["Employment type", candidate.employmentType],
  ];
  const lines = fields.filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => key + ": " + String(value));
  if (candidate.skills?.length) lines.push("Skills: " + [...candidate.skills].sort().join(", "));
  if (candidate.pastRoles.length) lines.push("Previous roles: " + [...candidate.pastRoles].sort().join(", "));
  if (candidate.certifications.length) lines.push("Certifications: " + [...candidate.certifications].sort().join(", "));
  return lines.join("\n").slice(0, 6000);
}

export function queryDocument(rules: Rule[], reference?: CandidateProfile): string {
  const parts = rules.flatMap(rule => {
    if (rule.field === "skill" && rule.exclude) return []; // Exclusions stay deterministic.
    const prefix = rule.mode === "required" ? "Required" : "Preferred";
    if (rule.field === "experience") return [prefix + " experience: " +
      String(rule.minMonths ?? 0) + " to " + String(rule.maxMonths ?? 720) + " months"];
    if (rule.field === "notice") return [prefix + " notice period at most " + rule.maxDays + " days"];
    return [prefix + " " + rule.field + ": " + rule.value];
  });
  if (reference) parts.push("Similar professional background: " + candidateDocument(reference));
  return parts.join("\n").slice(0, 6000);
}

export function documentHash(text: string): string {
  return createHash("sha256").update(String(DOCUMENT_VERSION) + "\n" + text).digest("hex");
}

function tokens(text: string) {
  return new Set((text.toLowerCase().match(/[a-z0-9.+#-]+/g) ?? []).filter(word => word.length > 1));
}
export function lexicalScore(query: string, document: string): number {
  const q = tokens(query);
  const d = tokens(document);
  if (!q.size || !d.size) return 0;
  return [...q].filter(word => d.has(word)).length / q.size;
}

/** Eligibility and exact rule evidence always dominate retrieval rank. Embeddings
 * ONLY break ties within equal eligibility, requiredMet and preferenceMet strata.
 * Missing embeddings use lexical rank, never a fabricated semantic score. */
export function hybridRank(
  candidates: CandidateProfile[], rules: Rule[],
  similarities: ReadonlyMap<string, number>, referenceId?: string | null,
  query = queryDocument(rules),
) {
  const baseline = rank(candidates, rules, referenceId);
  if (!similarities.size) return baseline;
  const lex = new Map(baseline.map(result => [
    result.candidate.id, lexicalScore(query, candidateDocument(result.candidate)),
  ]));
  const lexSorted = [...baseline].sort((a, b) =>
    (lex.get(b.candidate.id) ?? 0) - (lex.get(a.candidate.id) ?? 0) ||
    a.candidate.id.localeCompare(b.candidate.id));
  const semanticSorted = [...baseline].filter(item => similarities.has(item.candidate.id))
    .sort((a, b) => (similarities.get(b.candidate.id) ?? 0) -
      (similarities.get(a.candidate.id) ?? 0) || a.candidate.id.localeCompare(b.candidate.id));
  const lexRank = new Map(lexSorted.map((row, i) => [row.candidate.id, i + 1]));
  const semRank = new Map(semanticSorted.map((row, i) => [row.candidate.id, i + 1]));
  const scored = baseline.map(result => {
    const id = result.candidate.id;
    const l = lexRank.get(id) ?? baseline.length;
    const s = semRank.get(id) ?? l;
    const hybridScore = 0.5 / (60 + l) + 0.5 / (60 + s);
    return { ...result, retrieval: {
      lexicalScore: lex.get(id) ?? 0,
      semanticSimilarity: similarities.get(id) ?? null,
      hybridScore,
    } };
  });
  const order = { ELIGIBLE: 0, NEEDS_REVIEW: 1, INELIGIBLE: 2 };
  return scored.sort((a, b) =>
    order[a.eligibility] - order[b.eligibility] ||
    b.requiredMet - a.requiredMet ||
    b.preferenceMet - a.preferenceMet ||
    b.retrieval.hybridScore - a.retrieval.hybridScore ||
    a.candidate.id.localeCompare(b.candidate.id));
}

export type RetrievalJudgment = { relevantIds: string[]; rankedIds: string[] };
export function retrievalMetrics(queries: RetrievalJudgment[], k = 10) {
  if (!Number.isInteger(k) || k < 1) throw new Error("k must be a positive integer");
  if (!queries.length) throw new Error("At least one judged query is required");
  let recall = 0; let mrr = 0; let ndcg = 0;
  for (const { relevantIds, rankedIds } of queries) {
    const relevant = new Set(relevantIds);
    if (!relevant.size) throw new Error("Each query requires at least one relevant candidate");
    const ranked = [...new Set(rankedIds)].slice(0, k);
    const hits = ranked.filter(id => relevant.has(id));
    recall += hits.length / relevant.size;
    const first = ranked.findIndex(id => relevant.has(id));
    mrr += first < 0 ? 0 : 1 / (first + 1);
    const dcg = ranked.reduce((sum, id, i) => sum +
      (relevant.has(id) ? 1 / Math.log2(i + 2) : 0), 0);
    const ideal = Array.from({ length: Math.min(relevant.size, k) },
      (_, i) => 1 / Math.log2(i + 2)).reduce((sum, value) => sum + value, 0);
    ndcg += dcg / ideal;
  }
  return { queries: queries.length, k, recallAtK: recall / queries.length,
    mrrAtK: mrr / queries.length, ndcgAtK: ndcg / queries.length };
}
