import { criteriaSchema, ruleKey, type Rule } from "./criteria";
import { evaluate, evaluatorVersion, type CandidateProfile } from "./evaluate";

type Evaluation = ReturnType<typeof evaluate>;
type Evidence = Evaluation["details"][number];

export type CounterfactualChange = {
  key: string;
  kind: "EXPAND_NOTICE" | "EXPAND_EXPERIENCE" | "MAKE_PREFERRED";
  before: Rule;
  after: Rule;
  tradeOff: string;
  evidence: {
    source: "structured_candidate_record";
    field: Evidence["field"];
    actual: Evidence["actual"];
    outcome: "FAIL";
    reason: string;
  };
};

/**
 * Returns the smallest *field-local* threshold change possible for a documented
 * numeric failure. Other known failures require explicitly making the rule
 * preferred; never invent a candidate attribute or a synonym.
 */
function forFailure(detail: Evidence): CounterfactualChange {
  const { rule, field, actual, reason } = detail;
  const evidence: CounterfactualChange["evidence"] = {
    source: "structured_candidate_record", field, actual, outcome: "FAIL", reason,
  };
  const key = ruleKey(rule);

  if (rule.field === "notice" && typeof actual === "number" &&
      Number.isInteger(actual) && actual >= 0 && actual <= 365 && actual > rule.maxDays) {
    const after: Rule = { ...rule, maxDays: actual };
    return {
      key, kind: "EXPAND_NOTICE", before: rule, after, evidence,
      tradeOff: `Allow documented notice periods up to ${actual} days instead of ${rule.maxDays} days.`,
    };
  }
  if (rule.field === "experience" && typeof actual === "number" &&
      Number.isInteger(actual) && actual >= 0 && actual <= 720) {
    if (rule.minMonths !== undefined && actual < rule.minMonths) {
      return {
        key, kind: "EXPAND_EXPERIENCE", before: rule,
        after: { ...rule, minMonths: actual }, evidence,
        tradeOff: `Lower the minimum experience from ${rule.minMonths} to ${actual} months.`,
      };
    }
    if (rule.maxMonths !== undefined && actual > rule.maxMonths) {
      return {
        key, kind: "EXPAND_EXPERIENCE", before: rule,
        after: { ...rule, maxMonths: actual }, evidence,
        tradeOff: `Raise the maximum experience from ${rule.maxMonths} to ${actual} months.`,
      };
    }
  }

  // Categorical alternatives have no defensible numeric or semantic distance.
  // A candidate's missing Java expertise, for example, cannot be "fixed" by
  // claiming JavaScript is equivalent. Disclose the full eligibility trade-off.
  const after: Rule = { ...rule, mode: "preferred" };
  const subject = rule.field === "skill"
    ? (rule.exclude ? `the exclusion of ${rule.value}` : `the ${rule.value} skill`)
    : rule.field === "notice" ? `the ${rule.maxDays}-day notice limit`
    : rule.field === "experience" ? "the experience range"
    : `${rule.field} “${rule.value}”`;
  return {
    key, kind: "MAKE_PREFERRED", before: rule, after, evidence,
    tradeOff: `Make ${subject} preferred rather than required. The candidate still does not have a documented match for this criterion.`,
  };
}

/**
 * Exact deterministic counterfactual for ONE candidate relative to ONE already
 * confirmed criteria set. It edits every failing required rule, leaves all
 * satisfied/unknown rules untouched, and re-runs the same evaluator to verify
 * the result. Unknown evidence is a verification task, never a fabricated fact.
 *
 * Minimality: no rules with MATCH/UNKNOWN are relaxed; each known required
 * failure needs a corresponding change to remove that specific blocker. For
 * numeric failures, the threshold is set to the candidate's exact stored value.
 * Not an optimization over recruiter priorities or candidate quality.
 */
export function explainNearMatch(candidate: CandidateProfile, inputCriteria: Rule[]) {
  const criteria = criteriaSchema.parse(inputCriteria);
  const before = evaluate(candidate, criteria);
  const failing = before.details.filter(detail =>
    detail.rule.mode === "required" && detail.outcome === "FAIL");
  const unknown = before.details.filter(detail =>
    detail.rule.mode === "required" && detail.outcome === "UNKNOWN");
  const changes = failing.map(forFailure);
  const replacements = new Map(changes.map(change => [change.key, change.after]));
  const proposedCriteria = criteriaSchema.parse(
    criteria.map(rule => replacements.get(ruleKey(rule)) ?? rule));
  const after = evaluate(candidate, proposedCriteria);
  // A future evaluator change must never lead to a misleading claim.
  const remainingKnownFailures = after.details.filter(detail =>
    detail.rule.mode === "required" && detail.outcome === "FAIL");
  const missingEvidence = unknown.map(detail => ({
    key: ruleKey(detail.rule), rule: detail.rule,
    source: "structured_candidate_record" as const,
    field: detail.field, actual: detail.actual, reason: detail.reason,
    action: "VERIFY_EVIDENCE" as const,
    message: "This requirement is not documented. Verify the candidate's evidence before treating it as satisfied.",
  }));
  const remainingRequiredCount = proposedCriteria.filter(rule => rule.mode === "required").length;
  const warnings: string[] = [];
  if (!remainingRequiredCount) warnings.push(
    "The proposed criteria have no mandatory requirements. Eligibility does not establish candidate suitability.");
  if (missingEvidence.length) warnings.push(
    "Missing evidence remains unverified. Relaxing documented failures does not prove the candidate meets unknown requirements.");
  if (remainingKnownFailures.length) warnings.push(
    "Some required failures remain after the proposed changes. Do not present this candidate as eligible.");

  return {
    status: "PREVIEW_ONLY" as const,
    evaluatorVersion, candidate: {
      id: candidate.id, displayName: candidate.displayName,
      roleTitle: candidate.roleTitle, city: candidate.city,
    },
    originalCriteria: criteria, proposedCriteria,
    before: { eligibility: before.eligibility, details: before.details,
      requiredMet: before.requiredMet, requiredTotal: before.requiredTotal,
      preferenceMet: before.preferenceMet, preferenceTotal: before.preferenceTotal },
    after: { eligibility: after.eligibility, details: after.details,
      requiredMet: after.requiredMet, requiredTotal: after.requiredTotal,
      preferenceMet: after.preferenceMet, preferenceTotal: after.preferenceTotal },
    knownRequiredFailures: failing.length,
    changedRuleCount: changes.length,
    changes,
    missingEvidence,
    remainingKnownFailures: remainingKnownFailures.map(detail => ({
      key: ruleKey(detail.rule), rule: detail.rule, field: detail.field,
      actual: detail.actual, reason: detail.reason,
    })),
    remainingRequiredCount,
    warnings,
    limitations: "A deterministic, candidate-specific rule preview based on stored structured facts. Numeric thresholds are changed only to the candidate's documented value; categorical failures become optional and remain disclosed. No resume excerpts exist in the current schema. No database write or automatic hiring recommendation occurs.",
  };
}
