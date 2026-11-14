import { normalize, skillKey, type Rule } from "./criteria";

export const evaluatorVersion = "1";
export type CandidateProfile = {
  id: string;
  displayName: string;
  roleTitle: string | null;
  city: string | null;
  experienceMonths: number | null;
  noticePeriodDays: number | null;
  industry: string | null;
  education: string | null;
  employmentType: string | null;
  pastRoles: string[];
  certifications: string[];
  skills: string[] | null;
};

type Outcome = "MATCH" | "FAIL" | "UNKNOWN";
export type Eligibility = "ELIGIBLE" | "NEEDS_REVIEW" | "INELIGIBLE";

function check(rule: Rule, candidate: CandidateProfile) {
  function evidence<K extends keyof CandidateProfile>(field: K, requested: string, matches: (actual: NonNullable<CandidateProfile[K]>) => boolean) {
    const actual = candidate[field];
    // Legacy fixtures store empty history/certification arrays even when no evidence was collected.
    // Unlike explicitly-known empty skills, these arrays cannot prove a negative.
    const undocumented = actual === null ||
      ((field === "pastRoles" || field === "certifications") && Array.isArray(actual) && actual.length === 0);
    const outcome: Outcome = undocumented ? "UNKNOWN" :
      matches(actual as NonNullable<CandidateProfile[K]>) ? "MATCH" : "FAIL";
    const shown = Array.isArray(actual) ? actual.join(", ") || "None documented" : String(actual);
    return {
      rule, requested, actual, field, outcome,
      reason: undocumented ? "This field is not documented in the profile." : `Stored: ${shown}. Requested: ${requested}.`,
    };
  }
  switch (rule.field) {
    case "experience": return evidence("experienceMonths",
      `${rule.minMonths === undefined ? "" : `at least ${rule.minMonths}`}${rule.minMonths !== undefined && rule.maxMonths !== undefined ? ", " : ""}${rule.maxMonths === undefined ? "" : `at most ${rule.maxMonths}`} months`,
      (value: number) => value >= (rule.minMonths ?? 0) && value <= (rule.maxMonths ?? Infinity));
    case "notice": return evidence("noticePeriodDays", `within ${rule.maxDays} days`, (value: number) => value <= rule.maxDays);
    case "skill": return evidence("skills", `${rule.exclude ? "exclude " : ""}${rule.value}`, (values: string[]) =>
      values.some(value => skillKey(value) === skillKey(rule.value)) !== Boolean(rule.exclude));
    case "pastRole": return evidence("pastRoles", rule.value, (values: string[]) => values.some(value => normalize(value) === normalize(rule.value)));
    case "certification": return evidence("certifications", rule.value, (values: string[]) => values.some(value => normalize(value) === normalize(rule.value)));
    case "role": return evidence("roleTitle", rule.value, (value: string) => {
      const tokens = (title: string) => normalize(title).replace(/\bdevelopers\b/g, "developer").split(/\s+/);
      const title = tokens(value);
      return tokens(rule.value).every(token => title.includes(token));
    });
    default: return evidence(rule.field, rule.value, (value: string) => normalize(value) === normalize(rule.value));
  }
}

export function evaluate(candidate: CandidateProfile, rules: Rule[]) {
  const details = rules.map(rule => check(rule, candidate));
  const required = details.filter(detail => detail.rule.mode === "required");
  const preferred = details.filter(detail => detail.rule.mode === "preferred");
  const eligibility: Eligibility = required.some(detail => detail.outcome === "FAIL") ? "INELIGIBLE"
    : required.some(detail => detail.outcome === "UNKNOWN") ? "NEEDS_REVIEW" : "ELIGIBLE";
  return {
    candidate, details, eligibility,
    requiredMet: required.filter(detail => detail.outcome === "MATCH").length,
    requiredTotal: required.length,
    preferenceMet: preferred.filter(detail => detail.outcome === "MATCH").length,
    preferenceTotal: preferred.length,
  };
}

export function rank(candidates: CandidateProfile[], rules: Rule[], referenceId?: string | null) {
  const order: Record<Eligibility, number> = { ELIGIBLE: 0, NEEDS_REVIEW: 1, INELIGIBLE: 2 };
  return candidates.filter(candidate => candidate.id !== referenceId).map(candidate => evaluate(candidate, rules))
    .sort((a, b) => order[a.eligibility] - order[b.eligibility]
      || b.requiredMet - a.requiredMet || b.preferenceMet - a.preferenceMet
      || (a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0));
}

export function referenceCriteria(profile: CandidateProfile): Rule[] {
  const rules: Rule[] = [];
  const mode = "preferred";
  for (const [field, value] of [
    ["role", profile.roleTitle], ["city", profile.city], ["industry", profile.industry],
    ["education", profile.education], ["employmentType", profile.employmentType],
  ] as const) if (value) rules.push({ field, value, mode });
  if (profile.experienceMonths !== null) rules.push({
    field: "experience", mode, minMonths: Math.max(0, profile.experienceMonths - 12),
    maxMonths: Math.min(720, profile.experienceMonths + 12),
  });
  for (const value of profile.pastRoles.slice(0, 6)) rules.push({ field: "pastRole", value, mode });
  for (const value of profile.certifications.slice(0, 6)) rules.push({ field: "certification", value, mode });
  for (const value of profile.skills?.slice(0, 20) ?? []) rules.push({ field: "skill", value, mode, exclude: false });
  return rules;
}
