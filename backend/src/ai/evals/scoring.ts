import { normalize, ruleKey, skillKey, type Rule } from "../../search/criteria";

export type RuleQuality = {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
};

function identity(rule: Rule): string {
  const prefix = ruleKey(rule) + "|" + rule.mode + "|";
  switch (rule.field) {
    case "skill":
      return prefix + skillKey(rule.value) + "|" + (rule.exclude ? "exclude" : "include");
    case "experience":
      return prefix + String(rule.minMonths ?? "-") + ":" + String(rule.maxMonths ?? "-");
    case "notice":
      return prefix + String(rule.maxDays);
    default:
      return prefix + normalize(rule.value);
  }
}

export function scoreRules(expected: readonly Rule[], observed: readonly Rule[]): RuleQuality {
  const a = new Set(expected.map(identity)), b = new Set(observed.map(identity));
  const tp = [...b].filter(value => a.has(value)).length;
  const fp = b.size - tp, fn = a.size - tp;
  const precision = tp + fp ? tp / (tp + fp) : a.size === 0 ? 1 : 0;
  const recall = tp + fn ? tp / (tp + fn) : b.size === 0 ? 1 : 0;
  return {
    truePositive: tp, falsePositive: fp, falseNegative: fn,
    precision, recall,
    f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0,
  };
}

export function percentile(values: readonly number[], p: number): number | null {
  if (!values.length || p < 0 || p > 1) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * p) - 1] ?? sorted[0];
}
