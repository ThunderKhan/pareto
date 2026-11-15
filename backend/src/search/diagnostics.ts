import { criteriaSchema, ruleKey, type Rule } from "./criteria";
import { evaluate, evaluatorVersion, type CandidateProfile, type Eligibility } from "./evaluate";

/**
 * A side-effect-free, bounded analysis of the currently CONFIRMED search.
 * Every count is computed using the same deterministic evaluator as the results API.
 * This is not an optimizer and never commits or silently relaxes a requirement.
 */
const MAX_SINGLE_VARIANTS = 60;
const MAX_PAIRED_VARIANTS = 15;
const MAX_RECOMMENDATIONS = 8;
const MAX_NEWLY_ELIGIBLE_EXAMPLES = 12;

type Counts = Record<Eligibility, number>;
type Adjustment = {
  key: string;
  kind: "extend_notice" | "lower_experience_min" | "raise_experience_max" | "make_preferred";
  before: Rule;
  after: Rule;
  tradeOff: string;
  severity: number;
};
type Scored = { candidate: CandidateProfile; eligibility: Eligibility };
export type HealthSuggestion = {
  id: string;
  changes: Omit<Adjustment, "severity">[];
  proposedCriteria: Rule[];
  counts: Counts;
  additionalEligibleCount: number;
  newlyEligibleTotal: number;
  newlyEligible: Array<{
    id: string; displayName: string; roleTitle: string | null; city: string | null;
    previousStatus: Eligibility;
  }>;
  newlyEligibleTruncated: boolean;
  remainingRequiredCount: number;
  warnings: string[];
};

function emptyCounts(): Counts {
  return { ELIGIBLE: 0, NEEDS_REVIEW: 0, INELIGIBLE: 0 };
}

function score(candidates: CandidateProfile[], criteria: Rule[]): { rows: Scored[]; counts: Counts } {
  const counts = emptyCounts();
  const rows = candidates.map(candidate => {
    const eligibility = evaluate(candidate, criteria).eligibility;
    counts[eligibility]++;
    return { candidate, eligibility };
  });
  return { rows, counts };
}

function variants(rule: Rule): Adjustment[] {
  if (rule.mode !== "required") return [];
  const key = ruleKey(rule);
  const choices: Adjustment[] = [];
  const add = (kind: Adjustment["kind"], after: Rule, tradeOff: string, severity: number) => {
    if (JSON.stringify(after) !== JSON.stringify(rule) &&
        !choices.some(choice => JSON.stringify(choice.after) === JSON.stringify(after))) {
      choices.push({ key, kind, before: rule, after, tradeOff, severity });
    }
  };

  if (rule.field === "notice") {
    for (const extension of [15, 30]) {
      const maxDays = Math.min(365, rule.maxDays + extension);
      add("extend_notice", { ...rule, maxDays },
        `Allow documented notice periods up to ${maxDays} days instead of ${rule.maxDays} days.`,
        maxDays - rule.maxDays);
    }
  }
  if (rule.field === "experience") {
    if (rule.minMonths !== undefined && rule.minMonths > 0) {
      const minMonths = Math.max(0, rule.minMonths - 12);
      add("lower_experience_min", { ...rule, minMonths },
        `Reduce minimum documented experience from ${rule.minMonths} to ${minMonths} months.`,
        rule.minMonths - minMonths);
    }
    if (rule.maxMonths !== undefined && rule.maxMonths < 720) {
      const maxMonths = Math.min(720, rule.maxMonths + 12);
      add("raise_experience_max", { ...rule, maxMonths },
        `Raise maximum documented experience from ${rule.maxMonths} to ${maxMonths} months.`,
        maxMonths - rule.maxMonths);
    }
  }
  const requested = rule.field === "skill" ? (rule.exclude ? `the exclusion of ${rule.value}` : `the skill ${rule.value}`)
    : rule.field === "notice" ? `the ${rule.maxDays}-day notice limit`
    : rule.field === "experience" ? "the experience range"
    : `${rule.field} “${rule.value}”`;
  add("make_preferred", { ...rule, mode: "preferred" },
    `Make ${requested} a preference rather than a requirement; profiles may qualify without proving it.`, 100);
  return choices;
}

function replace(criteria: Rule[], adjustments: Adjustment[]) {
  const changes = new Map(adjustments.map(change => [change.key, change.after]));
  return criteriaSchema.parse(criteria.map(rule => changes.get(ruleKey(rule)) ?? rule));
}

function proposal(
  baseline: { rows: Scored[]; counts: Counts }, candidates: CandidateProfile[],
  criteria: Rule[], changes: Adjustment[],
): HealthSuggestion {
  const proposedCriteria = replace(criteria, changes);
  const projected = score(candidates, proposedCriteria);
  const previouslyEligible = new Set(baseline.rows.filter(row => row.eligibility === "ELIGIBLE")
    .map(row => row.candidate.id));
  const previousStatus = new Map(baseline.rows.map(row => [row.candidate.id, row.eligibility]));
  const newlyEligible = projected.rows.filter(row => row.eligibility === "ELIGIBLE" &&
    !previouslyEligible.has(row.candidate.id)).map(row => ({
      id: row.candidate.id,
      displayName: row.candidate.displayName,
      roleTitle: row.candidate.roleTitle,
      city: row.candidate.city,
      previousStatus: previousStatus.get(row.candidate.id)!,
    })).sort((a, b) => a.id.localeCompare(b.id));
  const remainingRequiredCount = proposedCriteria.filter(rule => rule.mode === "required").length;
  return {
    id: changes.map(change => `${change.key}/${change.kind}/${JSON.stringify(change.after)}`).join("|"),
    changes: changes.map(({ severity: _severity, ...change }) => change),
    proposedCriteria, counts: projected.counts,
    additionalEligibleCount: projected.counts.ELIGIBLE - baseline.counts.ELIGIBLE,
    newlyEligibleTotal: newlyEligible.length,
    newlyEligible: newlyEligible.slice(0, MAX_NEWLY_ELIGIBLE_EXAMPLES),
    newlyEligibleTruncated: newlyEligible.length > MAX_NEWLY_ELIGIBLE_EXAMPLES,
    remainingRequiredCount,
    warnings: remainingRequiredCount === 0
      ? ["This alternative has no mandatory requirements. Eligibility means only that no required rule excludes a candidate."]
      : [],
  };
}

export function diagnoseSearch(
  inputCandidates: CandidateProfile[], inputCriteria: Rule[], referenceId: string | null = null,
) {
  const criteria = criteriaSchema.parse(inputCriteria);
  // The reference must never count as a result, newly eligible candidate or bottleneck.
  const candidates = inputCandidates.filter(row => row.id !== referenceId);
  const baseline = score(candidates, criteria);
  const required = criteria.filter(rule => rule.mode === "required");
  const detailed = candidates.map(candidate => evaluate(candidate, criteria));
  const bottlenecks = required.map(rule => {
    const key = ruleKey(rule);
    let failedCount = 0, unknownCount = 0, soleFailureCount = 0, soleUnknownCount = 0;
    for (const row of detailed) {
      const detail = row.details.find(item => ruleKey(item.rule) === key)!;
      if (detail.outcome === "FAIL") failedCount++;
      if (detail.outcome === "UNKNOWN") unknownCount++;
      const othersMatch = row.details.every(item =>
        item.rule.mode !== "required" || ruleKey(item.rule) === key || item.outcome === "MATCH");
      if (othersMatch && detail.outcome === "FAIL") soleFailureCount++;
      if (othersMatch && detail.outcome === "UNKNOWN") soleUnknownCount++;
    }
    return { key, rule, failedCount, unknownCount, soleFailureCount, soleUnknownCount };
  }).sort((a, b) => b.soleFailureCount - a.soleFailureCount ||
    b.failedCount - a.failedCount || b.unknownCount - a.unknownCount || a.key.localeCompare(b.key));

  const weight = new Map(bottlenecks.map((item, i) => [item.key, i]));
  const options = required.flatMap(rule => variants(rule)).sort((a, b) =>
    (weight.get(a.key) ?? 0) - (weight.get(b.key) ?? 0) ||
    a.severity - b.severity || a.key.localeCompare(b.key));
  const singles = options.slice(0, MAX_SINGLE_VARIANTS);
  const evaluated = singles.map(change => ({
    suggestion: proposal(baseline, candidates, criteria, [change]),
    severity: change.severity,
  }));
  let pairedTested = 0;
  // Coupled constraints can each individually produce zero gain. Check a bounded
  // subset of two DIFFERENT requirements; never claim an exhaustive optimization.
  if (!evaluated.some(item => item.suggestion.additionalEligibleCount > 0)) {
    const distinct = new Map<string, Adjustment>();
    // Prefer the smallest measured step for each rule when investigating pairs.
    for (const option of singles) if (!distinct.has(option.key)) distinct.set(option.key, option);
    const representative = [...distinct.values()].slice(0, 7);
    outer: for (let i = 0; i < representative.length; i++) {
      for (let j = i + 1; j < representative.length; j++) {
        if (pairedTested >= MAX_PAIRED_VARIANTS) break outer;
        const changes = [representative[i], representative[j]];
        evaluated.push({
          suggestion: proposal(baseline, candidates, criteria, changes),
          severity: changes.reduce((sum, change) => sum + change.severity, 0),
        });
        pairedTested++;
      }
    }
  }

  const suggestions = evaluated.filter(item => item.suggestion.additionalEligibleCount > 0)
    .sort((a, b) => b.suggestion.additionalEligibleCount - a.suggestion.additionalEligibleCount ||
      a.suggestion.changes.length - b.suggestion.changes.length ||
      a.severity - b.severity || a.suggestion.id.localeCompare(b.suggestion.id))
    .slice(0, MAX_RECOMMENDATIONS).map(item => item.suggestion);
  return {
    status: "PREVIEW_ONLY" as const,
    evaluatorVersion,
    referenceId,
    totalCandidates: candidates.length,
    baseline: { criteria, counts: baseline.counts },
    bottlenecks,
    suggestions,
    evaluatedAlternatives: { single: singles.length, paired: pairedTested },
    noRequiredConstraints: required.length === 0,
    noMeasuredImprovement: suggestions.length === 0,
    limitations: "Suggestions evaluate bounded single-rule relaxations, and limited pairs only if singles have no benefit. All counts use the current owner-scoped candidate records. No search revision or candidate data is changed.",
  };
}
