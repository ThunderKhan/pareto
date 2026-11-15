import { isDeepStrictEqual } from "node:util";
import { criteriaSchema, ruleKey, type Rule } from "./criteria";
import { evaluate, evaluatorVersion, type CandidateProfile, type Eligibility } from "./evaluate";

/** Pure side-effect-free comparison of two criteria sets against one candidate snapshot. */
const MAX_EXAMPLES = 12;
type Counts = Record<Eligibility, number>;
type Evaluation = ReturnType<typeof evaluate>;
export type CriterionChange = {
  key: string;
  type: "ADDED" | "REMOVED" | "MODIFIED";
  before: Rule | null;
  after: Rule | null;
  hardConstraintImpact: "WEAKENED" | "STRENGTHENED" | "CHANGED" | "NONE";
};
function counts(): Counts {
  return { ELIGIBLE: 0, NEEDS_REVIEW: 0, INELIGIBLE: 0 };
}
function hardImpact(before: Rule | null, after: Rule | null): CriterionChange["hardConstraintImpact"] {
  if (!before && after) return after.mode === "required" ? "STRENGTHENED" : "NONE";
  if (before && !after) return before.mode === "required" ? "WEAKENED" : "NONE";
  if (!before || !after) return "NONE";
  if (before.mode === "required" && after.mode === "preferred") return "WEAKENED";
  if (before.mode === "preferred" && after.mode === "required") return "STRENGTHENED";
  if (before.mode === "preferred") return "NONE";
  if (before.field === "notice" && after.field === "notice") {
    return after.maxDays > before.maxDays ? "WEAKENED" :
      after.maxDays < before.maxDays ? "STRENGTHENED" : "NONE";
  }
  if (before.field === "experience" && after.field === "experience") {
    const weaker = (after.minMonths ?? 0) < (before.minMonths ?? 0) ||
      (after.maxMonths ?? 720) > (before.maxMonths ?? 720);
    const stronger = (after.minMonths ?? 0) > (before.minMonths ?? 0) ||
      (after.maxMonths ?? 720) < (before.maxMonths ?? 720);
    return weaker && stronger ? "CHANGED" : weaker ? "WEAKENED" :
      stronger ? "STRENGTHENED" : "NONE";
  }
  // An arbitrary role or skill change is not intrinsically a relaxation.
  return "CHANGED";
}
export function diffCriteria(original: Rule[], proposed: Rule[]): CriterionChange[] {
  const a = new Map(original.map(rule => [ruleKey(rule), rule]));
  const b = new Map(proposed.map(rule => [ruleKey(rule), rule]));
  return [...new Set([...a.keys(), ...b.keys()])].sort().flatMap(key => {
    const before = a.get(key) ?? null, after = b.get(key) ?? null;
    if (before && after && isDeepStrictEqual(before, after)) return [];
    return [{ key, type: !before ? "ADDED" as const : !after ? "REMOVED" as const : "MODIFIED" as const,
      before, after, hardConstraintImpact: hardImpact(before, after) }];
  });
}
type Impact = {
  id: string; displayName: string; roleTitle: string | null; city: string | null;
  before: Omit<Evaluation, "candidate">;
  after: Omit<Evaluation, "candidate">;
};
function impact(before: Evaluation, after: Evaluation): Impact {
  const { candidate: _originalCandidate, ...previous } = before;
  const { candidate, ...projected } = after;
  return { id: candidate.id, displayName: candidate.displayName,
    roleTitle: candidate.roleTitle, city: candidate.city,
    before: previous, after: projected };
}
function group(rows: Impact[]) {
  rows.sort((a, b) => a.id.localeCompare(b.id));
  return { count: rows.length, examples: rows.slice(0, MAX_EXAMPLES),
    truncated: rows.length > MAX_EXAMPLES };
}

/** Does not mutate input candidate records, criteria, or any database state. */
export function compareSearches(
  inputCandidates: CandidateProfile[], originalInput: Rule[], proposedInput: Rule[],
  referenceId: string | null = null,
) {
  const originalCriteria = criteriaSchema.parse(originalInput);
  const proposedCriteria = criteriaSchema.parse(proposedInput);
  const candidates = inputCandidates.filter(candidate => candidate.id !== referenceId);
  const originalCounts = counts(), proposedCounts = counts();
  const transitions: Record<Eligibility, Counts> = {
    ELIGIBLE: counts(), NEEDS_REVIEW: counts(), INELIGIBLE: counts(),
  };
  const newlyEligible: Impact[] = [], noLongerEligible: Impact[] = [];
  const stillIneligible: Impact[] = [], stillNeedsReview: Impact[] = [];
  for (const candidate of candidates) {
    const before = evaluate(candidate, originalCriteria);
    const after = evaluate(candidate, proposedCriteria);
    originalCounts[before.eligibility]++;
    proposedCounts[after.eligibility]++;
    transitions[before.eligibility][after.eligibility]++;
    if (before.eligibility !== "ELIGIBLE" && after.eligibility === "ELIGIBLE") {
      newlyEligible.push(impact(before, after));
    } else if (before.eligibility === "ELIGIBLE" && after.eligibility !== "ELIGIBLE") {
      noLongerEligible.push(impact(before, after));
    } else if (after.eligibility === "INELIGIBLE") {
      stillIneligible.push(impact(before, after));
    } else if (after.eligibility === "NEEDS_REVIEW") {
      stillNeedsReview.push(impact(before, after));
    }
  }
  const changes = diffCriteria(originalCriteria, proposedCriteria);
  const remainingRequiredCount = proposedCriteria.filter(rule => rule.mode === "required").length;
  const warnings: string[] = [];
  if (!remainingRequiredCount) {
    warnings.push("This proposal has no mandatory criteria. Eligibility does not imply hiring suitability.");
  }
  if (changes.some(change => change.hardConstraintImpact === "WEAKENED")) {
    warnings.push("At least one mandatory requirement is weakened. Review each change before confirmation.");
  }
  return {
    status: "PREVIEW_ONLY" as const, evaluatorVersion, referenceId,
    totalCandidates: candidates.length, changed: changes.length > 0, changes,
    original: { criteria: originalCriteria, counts: originalCounts },
    proposed: { criteria: proposedCriteria, counts: proposedCounts, remainingRequiredCount },
    delta: {
      exactMatches: proposedCounts.ELIGIBLE - originalCounts.ELIGIBLE,
      needsReview: proposedCounts.NEEDS_REVIEW - originalCounts.NEEDS_REVIEW,
      ineligible: proposedCounts.INELIGIBLE - originalCounts.INELIGIBLE,
    },
    transitions,
    groups: {
      newlyEligible: group(newlyEligible),
      noLongerEligible: group(noLongerEligible),
      stillIneligible: group(stillIneligible),
      stillNeedsReview: group(stillNeedsReview),
    },
    warnings,
    limitations: "Both searches use the same current owner-scoped candidate snapshot and deterministic evaluator. Per-group examples are capped at 12; exact totals are not. The simulation does not update confirmed criteria or candidate data.",
  };
}
