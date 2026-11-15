"use client";

import type { Rule } from "@pareto/backend/search";
import { ruleKey } from "@pareto/backend/search";
import { labels } from "./criteria-editor";

export type Eligibility = "ELIGIBLE" | "NEEDS_REVIEW" | "INELIGIBLE";
export type Counts = Record<Eligibility, number>;
export const statusLabel: Record<Eligibility, string> = {
  ELIGIBLE: "Eligible", NEEDS_REVIEW: "Needs review", INELIGIBLE: "Ineligible",
};

export class PreviewError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function previewRequest<T>(
  query: string, body?: object, signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/v1/search" + query, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  } : { cache: "no-store", signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const serverMessage = payload && typeof payload === "object" && "error" in payload
      && typeof payload.error === "string" ? payload.error : "The preview request failed.";
    throw new PreviewError(response.status, serverMessage);
  }
  return payload as T;
}

export function previewError(error: unknown): string {
  if (error instanceof PreviewError) {
    if (error.status === 401) return "Sign in to inspect this search.";
    if (error.status === 404) return "This confirmed search or candidate is unavailable. Open a recent search to continue.";
    if (error.status === 409) return "This search was updated in another tab. Reload the latest revision before reviewing changes.";
    if (error.status === 413) return "This scenario is too large. Reduce the number of rules and retry.";
    if (error.status === 422) return error.message;
    return error.status >= 500 ? "The analysis service is unavailable. Your saved search is unchanged; retry later." : error.message;
  }
  return "The request could not be completed. Check your connection and retry.";
}

/** Route-local reload preserves session query and fetches its latest confirmed revision. */
export function ReloadSearch({ status }: { status: number | null }) {
  if (status !== 409) return null;
  return <button type="button" className="insight-reload"
    onClick={() => window.location.reload()}>Reload latest search</button>;
}

export function ruleSummary(rule: Rule) {
  const field = labels[rule.field];
  let detail: string;
  switch (rule.field) {
    case "notice": detail = "within " + rule.maxDays + " days"; break;
    case "experience":
      detail = [rule.minMonths === undefined ? "" : "minimum " + rule.minMonths,
        rule.maxMonths === undefined ? "" : "maximum " + rule.maxMonths].filter(Boolean).join(", ") + " months";
      break;
    case "skill": detail = (rule.exclude ? "exclude " : "") + rule.value; break;
    default: detail = rule.value;
  }
  return field + " · " + detail + " (" + (rule.mode === "required" ? "Required" : "Preferred") + ")";
}

/** A change to the recruiter's numeric boundary, never a changed candidate fact. */
export function exactBoundaryChange(before: Rule, after: Rule): string | null {
  if (before.field === "notice" && after.field === "notice") {
    return "Joining window: " + before.maxDays + " → " + after.maxDays + " days";
  }
  if (before.field === "experience" && after.field === "experience") {
    if (before.minMonths !== after.minMonths) {
      return "Minimum experience: " + (before.minMonths ?? "none") +
        " → " + (after.minMonths ?? "none") + " months";
    }
    if (before.maxMonths !== after.maxMonths) {
      return "Maximum experience: " + (before.maxMonths ?? "none") +
        " → " + (after.maxMonths ?? "none") + " months";
    }
  }
  return null;
}

export function actualText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not documented";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(actualText).join(", ");
  return "Structured candidate record";
}

export function RuleSummaryList({ rules }: { rules: Rule[] }) {
  return <ul className="insight-rules">{rules.map(rule =>
    <li key={ruleKey(rule)}>{ruleSummary(rule)}</li>)}</ul>;
}

export function CountTiles({ counts, total }: { counts: Counts; total?: number }) {
  return <div className="insight-counts" aria-label="Measured candidate counts">
    <div><strong>{counts.ELIGIBLE}</strong><span>Exact matches</span></div>
    <div><strong>{counts.NEEDS_REVIEW}</strong><span>Needs review</span></div>
    <div><strong>{total ?? counts.ELIGIBLE + counts.NEEDS_REVIEW + counts.INELIGIBLE}</strong><span>Candidates evaluated</span></div>
  </div>;
}

type Evidence = { rule: Rule; requested: string; actual: unknown; field: string;
  outcome: "MATCH" | "FAIL" | "UNKNOWN"; reason: string };
export function EvidenceList({ details }: { details: Evidence[] }) {
  return <ul className="insight-evidence">{details.map((detail, index) =>
    <li key={ruleKey(detail.rule) + index}>
      <strong>{labels[detail.rule.field]} · {detail.outcome === "UNKNOWN" ? "Unknown / not documented" : detail.outcome}</strong>
      <p>{detail.reason}</p>
      <small>Candidate record · {detail.field}: {actualText(detail.actual)}</small>
    </li>)}</ul>;
}
