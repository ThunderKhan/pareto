"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Rule } from "@pareto/backend/search";
import type { counterfactualFor } from "@pareto/backend/search/server";
import { actualText, EvidenceList, PreviewError, ReloadSearch, exactBoundaryChange, previewError, previewRequest, ruleSummary, statusLabel } from "./search-insights-shared";

type Report = Awaited<ReturnType<typeof counterfactualFor>>;

export default function NearMatchExplanation({ sessionId, version, candidateId, candidateName, onReview }: {
  sessionId: string; version: number; candidateId: string; candidateName: string;
  onReview: (criteria: Rule[], warnings: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function load() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setExpanded(true); setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        counterfactual: sessionId, candidate: candidateId, version: String(version),
      });
      const value = await previewRequest<Report>("?" + params.toString(), undefined, request.signal);
      if (request.signal.aborted) return;
      if (value.sessionId !== sessionId || value.version !== version || value.candidate.id !== candidateId) {
        setReport(null); setError(new PreviewError(409, "The search revision changed.")); return;
      }
      setReport(value);
    } catch (cause) {
      if (!request.signal.aborted) { setReport(null); setError(cause); }
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }
  function toggle() {
    if (expanded) {
      controller.current?.abort(); setExpanded(false); setLoading(false);
    } else if (report) setExpanded(true);
    else void load();
  }
  function review() {
    if (!report || report.sessionId !== sessionId || report.version !== version || report.candidate.id !== candidateId) {
      setReport(null); setError(new PreviewError(409, "The search revision changed."));
      return;
    }
    if (!report.changedRuleCount) return;
    onReview(report.proposedCriteria,
      report.warnings.concat(report.changes.map(change => change.tradeOff)));
    setExpanded(false);
  }

  return <div className="insight-near" data-testid="near-match">
    <button type="button" className="insight-inline-trigger" aria-expanded={expanded}
      aria-label={"Why a near match? " + candidateName} onClick={toggle}>Why a near match? {expanded ? "−" : "+"}</button>
    {expanded && <div className="insight-near-body">
      <h4>What keeps this candidate from matching?</h4>
      <p className="insight-hint">Only stored candidate evidence is used. These are changes to your search, not the candidate’s history or availability.</p>
      {loading && <p role="status">Checking documented gaps…</p>}
      {Boolean(error) && <div role="alert" className="insight-error">
        <p>{previewError(error)}</p>
        {error instanceof PreviewError && error.status === 401 && <Link href="/login">Sign in</Link>}
        <ReloadSearch status={error instanceof PreviewError ? error.status : null}/>
        <button type="button" onClick={() => void load()}>Retry</button>
      </div>}
      {report && !loading && <>
        <p><strong>Known mismatches: {report.knownRequiredFailures}</strong> · Unverified requirements: {report.missingEvidence.length}</p>
        <p className="insight-outcome" aria-label="Eligibility before and after preview">
          Current <strong>{statusLabel[report.before.eligibility]}</strong>
          <span aria-hidden="true">→</span>
          Proposed <strong>{statusLabel[report.after.eligibility]}</strong>
        </p>
        {report.after.eligibility === "NEEDS_REVIEW" &&
          <p className="insight-caution">This candidate still needs verification. Missing evidence has not been resolved by changing the search.</p>}
        {report.before.eligibility === "ELIGIBLE" && <p>Already meets the documented mandatory requirements.</p>}
        {report.changes.length > 0 && <section aria-label="Documented requirement gaps">
          <h5>Documented gaps and proposed changes</h5>
          <ul className="insight-gap-list">{report.changes.map(change => <li key={change.key}>
            <strong>{ruleSummary(change.before)}</strong>
            <div className="insight-gap-facts">
              <span>Candidate record</span>
              <b>{actualText(change.evidence.actual)}{change.evidence.actual != null &&
                (change.evidence.field === "noticePeriodDays" ? " days" :
                 change.evidence.field === "experienceMonths" ? " months" : "")}</b>
              <small>{change.evidence.field} · Structured record</small>
            </div>
            <p>{change.evidence.reason}</p>
            <p><strong>{exactBoundaryChange(change.before, change.after) ?? "Proposed requirement: " + ruleSummary(change.after)}</strong></p>
            <p><strong>Trade-off:</strong> {change.tradeOff}</p>
            {change.kind === "MAKE_PREFERRED" && <p className="insight-caution">This makes a requirement preferred. It does not establish that the candidate has the missing skill or attribute.</p>}
          </li>)}</ul>
        </section>}
        {report.remainingKnownFailures.length > 0 && <section aria-label="Remaining known failures">
          <h5>Remaining documented failures</h5>
          <ul>{report.remainingKnownFailures.map(item => <li key={item.key}>{ruleSummary(item.rule)} · {item.reason}</li>)}</ul>
        </section>}
        {report.missingEvidence.length > 0 && <section aria-label="Needs verification">
          <h5>Needs verification · Unknown / not documented</h5>
          <ul>{report.missingEvidence.map(item => <li key={item.key}>
            <strong>{ruleSummary(item.rule)}</strong>
            <p>{item.message} · {item.reason}</p>
            <small>Candidate record · {item.field}: Not documented. Action: Verify evidence.</small>
          </li>)}</ul>
        </section>}
        {!report.changedRuleCount && <p>Nothing documented to relax; verify missing evidence rather than assuming a match.</p>}
        <details><summary>Full before/after evidence</summary>
          <div className="insight-compare">
            <section><h5>Current criteria</h5><EvidenceList details={report.before.details}/></section>
            <section><h5>Proposed criteria</h5><EvidenceList details={report.after.details}/></section>
          </div>
        </details>
        {report.remainingRequiredCount === 0 && <p className="insight-caution">No mandatory requirements remain.</p>}
        {report.warnings.map(warning => <p className="insight-caution" key={warning}>{warning}</p>)}
        <p className="insight-hint">{report.limitations}</p>
        <p className="insight-hint">This only previews changes to your search; nothing has been applied.</p>
        <div className="insight-actions">
          {report.changedRuleCount > 0 && <button className="insight-action" type="button" onClick={review}>Review criteria changes</button>}
          <button type="button" className="insight-quiet" onClick={toggle}>Dismiss</button>
        </div>
      </>}
    </div>}
  </div>;
}
