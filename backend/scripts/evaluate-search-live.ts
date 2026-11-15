import { readFileSync } from "node:fs";
import { interpret, interpretRefinement } from "../src/search/interpret";
import { applyDelta, criteriaSchema, deltaSchema, type Rule } from "../src/search/criteria";
import { percentile, scoreRules, type RuleQuality } from "../src/ai/evals/scoring";

type SearchCase = { id: string; prompt: string; proposal: { criteria: Rule[] } };
type RefinementCase = {
  id: string; prompt: string; current: Rule[];
  proposal: { operations: unknown[]; warnings: string[] };
};

if (process.env.PARETO_VERIFY_LIVE_MODELS !== "1" || process.env.PARETO_EVAL_LIVE !== "1") {
  throw new Error("Live evaluation is disabled. Set BOTH PARETO_VERIFY_LIVE_MODELS=1 and PARETO_EVAL_LIVE=1.");
}

function bound(name: string, fallback: number, max: number) {
  const input = process.env[name];
  if (!input) return fallback;
  const n = Number(input);
  if (!Number.isInteger(n) || n < 0 || n > max) throw Error("Invalid evaluation sample limit.");
  return n;
}
function corpus<T>(file: string): T[] {
  const text = readFileSync(new URL("../evals/datasets/" + file + ".jsonl", import.meta.url), "utf8");
  return text.split("\n").filter(Boolean).map(line => JSON.parse(line) as T);
}
const searchCases = corpus<SearchCase>("search-intents").slice(0, bound("PARETO_EVAL_SEARCH_CASES", 5, 30));
const refinementCases = corpus<RefinementCase>("refinements").slice(0, bound("PARETO_EVAL_REFINE_CASES", 5, 26));
if (!searchCases.length && !refinementCases.length) throw Error("Select at least one evaluation case.");

type CaseResult = { id: string; task: "interpret" | "refine"; ok: boolean; quality: RuleQuality | null; latencyMs: number; provider: string | null };
const details: CaseResult[] = [];
// Synthetic-only inputs and aggregate outputs. No PII, model responses or prompts are printed.
async function evaluate(
  id: string, task: CaseResult["task"],
  work: () => Promise<{ observed: Rule[]; expected: Rule[]; provider: string }>,
) {
  const start = Date.now();
  try {
    const result = await work();
    details.push({ id, task, ok: true, quality: scoreRules(result.expected, result.observed),
      latencyMs: Date.now() - start, provider: result.provider });
  } catch {
    details.push({ id, task, ok: false, quality: null, latencyMs: Date.now() - start, provider: null });
  }
}
for (const entry of searchCases) {
  await evaluate(entry.id, "interpret", async () => {
    const actual = await interpret(entry.prompt, undefined, "live-eval");
    return { observed: actual.criteria, expected: criteriaSchema.parse(entry.proposal.criteria), provider: actual.provider };
  });
}
for (const entry of refinementCases) {
  await evaluate(entry.id, "refine", async () => {
    const current = criteriaSchema.parse(entry.current);
    const expected = entry.proposal.operations.length
      ? applyDelta(current, deltaSchema.parse(entry.proposal.operations)) : current;
    const actual = await interpretRefinement(entry.prompt, current, undefined, "live-eval");
    return { observed: actual.criteria, expected, provider: actual.provider };
  });
}
const valid = details.filter(row => row.ok && row.quality);
const average = (key: "precision" | "recall" | "f1") =>
  valid.length ? valid.reduce((n, v) => n + (v.quality?.[key] ?? 0), 0) / valid.length : null;
const report = {
  kind: "live-synthetic-ai-evaluation", corpusVersion: "v1", count: details.length,
  succeeded: valid.length, failed: details.length - valid.length,
  meanPrecision: average("precision"), meanRecall: average("recall"), meanF1: average("f1"),
  p50LatencyMs: percentile(details.map(x => x.latencyMs), 0.50),
  p95LatencyMs: percentile(details.map(x => x.latencyMs), 0.95),
  providers: Object.fromEntries(["Gemini", "Groq"].map(name => [name, valid.filter(x => x.provider === name).length])),
  cases: details,
};
// Never write full prompts, hidden instructions, provider responses, keys or CVs to console.
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (report.failed) process.exitCode = 1;
