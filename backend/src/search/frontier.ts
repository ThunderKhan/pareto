import { createHash } from "node:crypto";
import { criteriaSchema, ruleKey, type Rule } from "./criteria";
import { evaluate, evaluatorVersion, type CandidateProfile, type Eligibility } from "./evaluate";

/**
 * Pareto Frontier v1: finite, deterministic, preview-only hiring trade-offs.
 * NO database writes, network calls, model inference, or universal compromise score.
 *
 * Dominance compares rule-level permissiveness (not arbitrary mixed units)
 * and measured exact eligibility on one fixed cohort. Every visible claim is
 * restricted to this bounded set of evaluated strategies.
 */
export const frontierVersion = "frontier-v1";
const MAX_SINGLES = 48;
const MAX_PAIRS = 24;
const MAX_CARDS = 5;
const MAX_EXAMPLES = 12;
type Counts = Record<Eligibility, number>;
type Outcome = "MATCH" | "FAIL" | "UNKNOWN";
export type FrontierChange = {
  key: string;
  kind: "extend_notice" | "lower_experience_min" | "raise_experience_max" | "make_preferred";
  before: Rule;
  after: Rule;
  tradeOff: string;
};
type CachedRow = {
  candidate: CandidateProfile;
  status: Eligibility;
  failed: number;
  unknown: number;
  outcomes: Map<string, Outcome>;
};
export type FrontierStrategy = {
  id: string;
  title: string;
  status: "NON_DOMINATED_IN_EVALUATED_SET";
  changes: FrontierChange[];
  proposedCriteria: Rule[];
  counts: Counts;
  impact: {
    newlyEligibleCount: number;
    noLongerEligibleCount: number;
    netEligibleDelta: number;
    newlyEligibleExamples: Array<{
      id: string;
      displayName: string;
      roleTitle: string | null;
      city: string | null;
      previousStatus: Eligibility;
    }>;
    examplesTruncated: boolean;
  };
  remainingRequiredCount: number;
  warnings: string[];
};
type Scenario = FrontierStrategy;
const newCounts = (): Counts => ({ ELIGIBLE: 0, NEEDS_REVIEW: 0, INELIGIBLE: 0 });
function status(failed: number, unknown: number): Eligibility {
  return failed > 0 ? "INELIGIBLE" : unknown > 0 ? "NEEDS_REVIEW" : "ELIGIBLE";
}
function first<T>(values: T[], limit: number) { return values.slice(0, limit); }
function optionsFor(rule: Rule, requiredCount: number): FrontierChange[] {
  if (rule.mode !== "required") return [];
  const key = ruleKey(rule);
  const choices: FrontierChange[] = [];
  const add = (kind: FrontierChange["kind"], after: Rule, tradeOff: string) => {
    if (JSON.stringify(after) !== JSON.stringify(rule) &&
        !choices.some(option => JSON.stringify(option.after) === JSON.stringify(after))) {
      choices.push({ key, kind, before: rule, after, tradeOff });
    }
  };
  if (rule.field === "notice") {
    for (const step of [15, 30]) {
      const maxDays = Math.min(365, rule.maxDays + step);
      add("extend_notice", { ...rule, maxDays },
        "Allow documented notice periods up to " + maxDays + " days instead of " + rule.maxDays + " days.");
    }
  }
  if (rule.field === "experience") {
    if (rule.minMonths !== undefined && rule.minMonths > 0) {
      for (const step of [12, 24]) {
        const minMonths = Math.max(0, rule.minMonths - step);
        add("lower_experience_min", { ...rule, minMonths },
          "Reduce minimum documented experience from " + rule.minMonths + " to " + minMonths + " months.");
      }
    }
    if (rule.maxMonths !== undefined && rule.maxMonths < 720) {
      for (const step of [12, 24]) {
        const maxMonths = Math.min(720, rule.maxMonths + step);
        add("raise_experience_max", { ...rule, maxMonths },
          "Raise maximum documented experience from " + rule.maxMonths + " to " + maxMonths + " months.");
      }
    }
  }
  // The last mandatory rule may never be silently demoted.
  if (requiredCount > 1) {
    const label = rule.field === "skill" ? (rule.exclude ? "the exclusion of " : "the skill ") + rule.value
      : rule.field === "notice" ? "the joining window"
      : rule.field === "experience" ? "the experience range"
      : rule.field + " requirement";
    add("make_preferred", { ...rule, mode: "preferred" },
      "Treat " + label + " as preferred, not mandatory. Eligibility no longer proves this requirement.");
  }
  return choices;
}
function stricterOrEqual(a: Rule, b: Rule): boolean {
  if (ruleKey(a) !== ruleKey(b) || a.field !== b.field) return false;
  if (a.mode === "required" && b.mode === "preferred") return true;
  if (a.mode === "preferred" && b.mode === "required") return false;
  if (a.mode === "preferred") return true;
  if (a.field === "notice" && b.field === "notice") return a.maxDays <= b.maxDays;
  if (a.field === "experience" && b.field === "experience") {
    return (a.minMonths ?? 0) >= (b.minMonths ?? 0)
      && (a.maxMonths ?? 720) <= (b.maxMonths ?? 720);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}
function dominates(a: Scenario, b: Scenario): boolean {
  if (a.counts.ELIGIBLE < b.counts.ELIGIBLE) return false;
  const proposed = new Map(b.proposedCriteria.map(rule => [ruleKey(rule), rule]));
  let strictlyLessRelaxed = false;
  for (const current of a.proposedCriteria) {
    const target = proposed.get(ruleKey(current));
    if (!target || !stricterOrEqual(current, target)) return false;
    if (!stricterOrEqual(target, current)) strictlyLessRelaxed = true;
  }
  return a.counts.ELIGIBLE > b.counts.ELIGIBLE || strictlyLessRelaxed;
}
function title(change: FrontierChange): string {
  const label = change.before.field === "skill" ? change.before.value
    : change.before.field === "notice" ? "joining window"
    : change.before.field === "experience" ? "experience range"
    : change.before.field + " requirement";
  if (change.kind === "extend_notice") return "Extend joining window";
  if (change.kind === "lower_experience_min") return "Consider a lower experience minimum";
  if (change.kind === "raise_experience_max") return "Consider a higher experience maximum";
  return "Make " + label + " preferred";
}
function analyze(
  cohort: CandidateProfile[], baseline: CachedRow[], criteria: Rule[], initial: Counts,
  changes: FrontierChange[], baseHash: string,
): Scenario | null {
  const replacement = new Map(changes.map(change => [change.key, change.after]));
  const proposedCriteria = criteriaSchema.parse(criteria.map(rule => replacement.get(ruleKey(rule)) ?? rule));
  const remainingRequiredCount = proposedCriteria.filter(rule => rule.mode === "required").length;
  if (!remainingRequiredCount) return null;
  const counts = newCounts();
  const newlyEligibleExamples: FrontierStrategy["impact"]["newlyEligibleExamples"] = [];
  let newlyEligibleCount = 0;
  let noLongerEligibleCount = 0;
  for (let i = 0; i < cohort.length; i++) {
    const candidate = cohort[i];
    const original = baseline[i];
    let failed = original.failed;
    let unknown = original.unknown;
    for (const change of changes) {
      const prior = original.outcomes.get(change.key);
      if (prior === "FAIL") failed--;
      if (prior === "UNKNOWN") unknown--;
      if (change.after.mode === "required") {
        const outcome = evaluate(candidate, [change.after]).details[0].outcome;
        if (outcome === "FAIL") failed++;
        if (outcome === "UNKNOWN") unknown++;
      }
    }
    const next = status(failed, unknown);
    counts[next]++;
    if (original.status !== "ELIGIBLE" && next === "ELIGIBLE") {
      newlyEligibleCount++;
      if (newlyEligibleExamples.length < MAX_EXAMPLES) {
        newlyEligibleExamples.push({
          id: candidate.id, displayName: candidate.displayName,
          roleTitle: candidate.roleTitle, city: candidate.city,
          previousStatus: original.status,
        });
      }
    }
    if (original.status === "ELIGIBLE" && next !== "ELIGIBLE") noLongerEligibleCount++;
  }
  // A legitimate monotone relaxation cannot make an eligible profile ineligible.
  if (noLongerEligibleCount || counts.ELIGIBLE < initial.ELIGIBLE ||
      counts.ELIGIBLE + counts.NEEDS_REVIEW + counts.INELIGIBLE !== cohort.length) {
    throw new Error("Frontier monotonicity / conservation invariant failed.");
  }
  const canonical = changes.map(change => ({
    key: change.key, kind: change.kind, after: change.after,
  })).sort((a, b) => a.key.localeCompare(b.key));
  const id = createHash("sha256").update(
    JSON.stringify({ version: frontierVersion, baseHash, canonical }),
  ).digest("hex").slice(0, 16);
  const caution = changes.filter(change => change.kind === "make_preferred").map(change =>
    "A formerly mandatory requirement is now preferred; eligibility does not verify " + change.key + ".");
  return {
    id, title: changes.length > 1 ? "Combine two requirement adjustments" : title(changes[0]),
    status: "NON_DOMINATED_IN_EVALUATED_SET",
    changes, proposedCriteria, counts,
    impact: {
      newlyEligibleCount, noLongerEligibleCount,
      netEligibleDelta: counts.ELIGIBLE - initial.ELIGIBLE,
      newlyEligibleExamples, examplesTruncated: newlyEligibleCount > MAX_EXAMPLES,
    },
    remainingRequiredCount, warnings: caution,
  };
}
/** Side-effect-free. The caller must ensure candidate ownership and session version. */
export function computeFrontier(
  inputCandidates: CandidateProfile[], inputCriteria: Rule[],
  referenceId: string | null = null, maxStrategies = MAX_CARDS,
) {
  if (!Number.isInteger(maxStrategies) || maxStrategies < 1 || maxStrategies > MAX_CARDS)
    throw new Error("maxStrategies must be an integer from 1 to 5.");
  const criteria = criteriaSchema.parse(inputCriteria);
  // Stable ordering makes candidate examples independent of PostgreSQL row order.
  const cohort = inputCandidates.filter(candidate => candidate.id !== referenceId)
    .slice().sort((a, b) => a.id.localeCompare(b.id));
  if (cohort.length > 1000) throw new Error("Candidate cohort exceeds the 1,000-profile limit.");
  const initial = newCounts();
  const baseline: CachedRow[] = cohort.map(candidate => {
    const current = evaluate(candidate, criteria);
    const required = current.details.filter(detail => detail.rule.mode === "required");
    const failed = required.filter(detail => detail.outcome === "FAIL").length;
    const unknown = required.filter(detail => detail.outcome === "UNKNOWN").length;
    initial[current.eligibility]++;
    return { candidate, status: current.eligibility, failed, unknown,
      outcomes: new Map(required.map(detail => [ruleKey(detail.rule), detail.outcome])) };
  });
  const required = criteria.filter(rule => rule.mode === "required");
  const baseHash = createHash("sha256").update(JSON.stringify(criteria)).digest("hex");
  const empty = {
    status: "PREVIEW_ONLY" as const, algorithmVersion: frontierVersion, evaluatorVersion,
    referenceId, scope: {
      totalCandidates: cohort.length, evaluatedSingle: 0, evaluatedPairs: 0,
      nonDominatedCount: 0, displayedCount: 0, exhaustive: false, maxCandidates: 1000,
    },
    baseline: { counts: initial, requiredCriteriaCount: required.length },
    strategies: [] as FrontierStrategy[], noRequiredConstraints: required.length === 0,
    noMeasuredImprovement: true,
    limitations: [
      "Only a bounded set of alternatives was evaluated; this is not a global optimum.",
      "Counts describe this recruiter's current candidate records, not the labor market.",
      "Changes are previews until the recruiter independently confirms them.",
    ],
  };
  if (!required.length || !cohort.length) return empty;
  const importance = new Map(required.map(rule => {
    const key = ruleKey(rule);
    let solelyBlocked = 0, failed = 0;
    for (const row of baseline) {
      if (row.outcomes.get(key) === "FAIL") {
        failed++;
        if (row.failed === 1 && row.unknown === 0) solelyBlocked++;
      }
    }
    return [key, { solelyBlocked, failed }] as const;
  }));
  const possibilities = required.flatMap(rule => optionsFor(rule, required.length));
  possibilities.sort((a, b) => {
    const left = importance.get(a.key)!, right = importance.get(b.key)!;
    return right.solelyBlocked - left.solelyBlocked || right.failed - left.failed ||
      a.key.localeCompare(b.key) || a.kind.localeCompare(b.kind) ||
      JSON.stringify(a.after).localeCompare(JSON.stringify(b.after));
  });
  const singles = first(possibilities, MAX_SINGLES);
  const evaluated: Scenario[] = [];
  const seen = new Set<string>();
  const push = (changes: FrontierChange[]) => {
    const scenario = analyze(cohort, baseline, criteria, initial, changes, baseHash);
    if (scenario && !seen.has(scenario.id)) {
      seen.add(scenario.id);
      evaluated.push(scenario);
    }
  };
  for (const change of singles) push([change]);
  // Explore first bounded pair per distinct rule: also finds coupled blockers.
  const reps = new Map<string, FrontierChange>();
  for (const option of singles) if (!reps.has(option.key)) reps.set(option.key, option);
  const representative = first([...reps.values()], 8);
  let pairs = 0;
  outer: for (let i = 0; i < representative.length; i++) {
    for (let j = i + 1; j < representative.length; j++) {
      if (pairs >= MAX_PAIRS) break outer;
      push([representative[i], representative[j]]);
      pairs++;
    }
  }
  const positive = evaluated.filter(s => s.impact.newlyEligibleCount > 0);
  const nondominated = positive.filter(s => !positive.some(other =>
    s.id !== other.id && dominates(other, s)));
  nondominated.sort((a, b) =>
    b.impact.newlyEligibleCount - a.impact.newlyEligibleCount ||
    a.changes.length - b.changes.length || a.id.localeCompare(b.id));
  const selected: Scenario[] = [];
  const families = new Set<string>();
  for (const scenario of nondominated) {
    const family = scenario.changes.map(change => change.key).join("|");
    if (!families.has(family)) { selected.push(scenario); families.add(family); }
    if (selected.length >= maxStrategies) break;
  }
  for (const scenario of nondominated) {
    if (selected.length >= maxStrategies) break;
    if (!selected.includes(scenario)) selected.push(scenario);
  }
  return {
    ...empty,
    scope: { ...empty.scope, evaluatedSingle: singles.length, evaluatedPairs: pairs,
      nonDominatedCount: nondominated.length, displayedCount: selected.length },
    strategies: selected, noMeasuredImprovement: positive.length === 0,
  };
}
