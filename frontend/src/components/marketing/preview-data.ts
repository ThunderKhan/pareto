/**
 * Deterministic, synthetic marketing preview. This is intentionally independent
 * of the candidate search API and is never presented as a live recruiter result.
 */
export type CheckState = "match" | "fail" | "unknown";
export type PreviewCandidate = {
  id: string;
  name: string;
  title: string;
  city: string | null;
  years: number | null;
  notice: number | null;
  skills: readonly string[];
};

export const previewCandidates: readonly PreviewCandidate[] = [
  { id: "A", name: "Candidate A", title: "Senior backend engineer", city: "Hyderabad", years: 7, notice: 15, skills: ["Java", "Spring Boot", "AWS"] },
  { id: "B", name: "Candidate B", title: "Platform engineer", city: "Hyderabad", years: 8, notice: 60, skills: ["Java", "Spring Boot", "AWS"] },
  { id: "C", name: "Candidate C", title: "Backend engineer", city: "Hyderabad", years: 7, notice: null, skills: ["Java", "Spring Boot", "AWS"] },
];

const required = {
  city: "Hyderabad",
  minYears: 6,
  maxYears: 10,
  skills: ["Java", "Spring Boot", "AWS"],
} as const;

export type CriterionCheck = {
  label: string;
  expected: string;
  actual: string;
  state: CheckState;
};

export type CandidateAssessment = {
  candidate: PreviewCandidate;
  status: CheckState;
  checks: CriterionCheck[];
  reason: string;
};

/** Unknown evidence stays unknown unless another known hard criterion fails. */
export function assessCandidate(candidate: PreviewCandidate, maximumNoticeDays: number): CandidateAssessment {
  const location: CriterionCheck = {
    label: "Location",
    expected: required.city,
    actual: candidate.city ?? "Not supplied",
    state: candidate.city === null ? "unknown" : candidate.city.toLowerCase() === required.city.toLowerCase() ? "match" : "fail",
  };
  const experience: CriterionCheck = {
    label: "Experience",
    expected: `${required.minYears}–${required.maxYears} years`,
    actual: candidate.years === null ? "Not supplied" : `${candidate.years} years`,
    state: candidate.years === null ? "unknown" : candidate.years >= required.minYears && candidate.years <= required.maxYears ? "match" : "fail",
  };
  const skills = required.skills.map((skill): CriterionCheck => ({
    label: skill,
    expected: "Required skill",
    actual: candidate.skills.some((item) => item.toLowerCase() === skill.toLowerCase()) ? "Present" : "Not listed",
    state: candidate.skills.some((item) => item.toLowerCase() === skill.toLowerCase()) ? "match" : "fail",
  }));
  const joining: CriterionCheck = {
    label: "Joining window",
    expected: `Within ${maximumNoticeDays} days`,
    actual: candidate.notice === null ? "Not supplied" : `${candidate.notice} days`,
    state: candidate.notice === null ? "unknown" : candidate.notice <= maximumNoticeDays ? "match" : "fail",
  };
  const checks = [location, experience, ...skills, joining];
  const failed = checks.find((check) => check.state === "fail");
  const unknown = checks.find((check) => check.state === "unknown");
  return {
    candidate,
    checks,
    status: failed ? "fail" : unknown ? "unknown" : "match",
    reason: failed
      ? `${failed.label}: ${failed.actual} (requires ${failed.expected})`
      : unknown
        ? `${unknown.label}: evidence not supplied`
        : "All required criteria are supported by the sample record",
  };
}

export function assessPreview(maximumNoticeDays: number): CandidateAssessment[] {
  return previewCandidates.map((candidate) => assessCandidate(candidate, maximumNoticeDays));
}

export function summarizePreview(assessments: CandidateAssessment[]) {
  return {
    eligible: assessments.filter((item) => item.status === "match").length,
    excluded: assessments.filter((item) => item.status === "fail").length,
    needsReview: assessments.filter((item) => item.status === "unknown").length,
    total: assessments.length,
  };
}
