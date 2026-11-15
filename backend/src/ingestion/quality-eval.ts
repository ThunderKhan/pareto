import { skillKey } from "../search/criteria";
import type { ReviewedProfile } from "./review";

export type QualityCase = {
  id: string; category: string;
  expected: Partial<ReviewedProfile>;
  observed: Partial<ReviewedProfile>;
};
export type QualityCounts = {
  correct: number; unsupported: number; missed: number; evaluated: number;
  exact: number; unknownCorrect: number;
};
const FIELDS = ["displayName","roleTitle","city","experienceMonths","noticePeriodDays",
  "industry","education","employmentType","skills","pastRoles","certifications"] as const;

function canonical(field: string, raw: unknown) {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(x => field === "skills" ? skillKey(String(x))
      : String(x).normalize("NFKC").trim().toLocaleLowerCase()))].sort();
  }
  return typeof raw === "string" ? raw.normalize("NFKC").trim().toLocaleLowerCase() : raw;
}
/** Deterministic comparison against labelled synthetic or human-reviewed truth.
 * This does not call an LLM. Absent keys are excluded, not counted as correct.
 * Wrong non-null claims count BOTH as unsupported and missed.
 */
export function evaluateQuality(cases: QualityCase[]) {
  const result: QualityCounts = { correct: 0, unsupported: 0, missed: 0,
    evaluated: 0, exact: 0, unknownCorrect: 0 };
  const byCategory: Record<string, QualityCounts> = {};
  for (const item of cases) {
    const stats = byCategory[item.category] ??= {
      correct: 0, unsupported: 0, missed: 0, evaluated: 0, exact: 0, unknownCorrect: 0,
    };
    let all = true;
    for (const key of FIELDS) {
      if (!Object.hasOwn(item.expected, key)) continue;
      const expected = canonical(key, item.expected[key]);
      const actual = canonical(key, item.observed[key]);
      const equal = JSON.stringify(expected) === JSON.stringify(actual);
      stats.evaluated++; result.evaluated++;
      if (equal) {
        if (expected === null) { stats.unknownCorrect++; result.unknownCorrect++; }
        else { stats.correct++; result.correct++; }
      } else {
        all = false;
        if (actual !== null) { stats.unsupported++; result.unsupported++; }
        if (expected !== null) { stats.missed++; result.missed++; }
      }
    }
    if (all) { stats.exact++; result.exact++; }
  }
  const rate = (numerator: number, denominator: number) =>
    denominator ? Math.round(numerator / denominator * 10000) / 10000 : null;
  const precision = rate(result.correct, result.correct + result.unsupported);
  const recall = rate(result.correct, result.correct + result.missed);
  return {
    datasetSize: cases.length, counts: result, byCategory,
    precision, recall,
    f1: precision !== null && recall !== null && precision + recall
      ? rate(2 * precision * recall, precision + recall) : null,
    exactCaseRate: rate(result.exact, cases.length),
    warning: "Evaluation results apply only to labelled samples. Synthetic fixture results do not measure live Gemini/Groq accuracy or production hiring quality.",
  };
}
