"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Rule } from "@pareto/backend/search";
import type { searchDiagnostics } from "@pareto/backend/search/server";
import { CountTiles, PreviewError, RuleSummaryList, previewError, previewRequest, ruleSummary } from "./search-insights-shared";

type Report = Awaited<ReturnType<typeof searchDiagnostics>>;
type Suggestion = Report["suggestions"][number];

export default function SearchHealthPanel({ sessionId, version, onReview }: {
  sessionId: string; version: number; onReview: (criteria: Rule[], warnings: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function analyze() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setOpen(true); setLoading(true); setError(null);
    try {
      const value = await previewRequest<Report>("?diagnostics=" + encodeURIComponent(sessionId), undefined, request.signal);
      if (request.signal.aborted) return;
      if (value.sessionId !== sessionId || value.version !== version) {
        setReport(null); setError(new PreviewError(409, "Search revision changed.")); return;
      }
      setReport(value);
    } catch (cause) {
      if (!request.signal.aborted) { setReport(null); setError(cause); }
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }

  function review(suggestion: Suggestion) {
    if (!report || report.sessionId !== sessionId || report.version !== version) {
      setReport(null); setError(new PreviewError(409, "Search revision changed."));
      return;
    }
    onReview(suggestion.proposedCriteria, suggestion.warnings.concat(
      suggestion.changes.map(change => change.tradeOff)));
  }

  return <div className="insight-module" data-testid="search-health">
    <button type="button" className="insight-trigger" aria-expanded={open}
      onClick={() => { if (open) { setOpen(false); controller.current?.abort(); setLoading(false); }
        else if (report) setOpen(true); else void analyze(); }}>
      Analyze search health <span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="insight-body">
      <div className="insight-heading"><div><h3>Search health</h3>
        <p>Measured adjustments based on your confirmed criteria and candidate records.</p></div>
        <button type="button" className="insight-quiet" onClick={() => void analyze()} disabled={loading}>Re-analyze</button>
      </div>
      {loading && <p role="status">Analyzing confirmed search…</p>}
      {Boolean(error) && <div className="insight-error" role="alert">
        <p>{previewError(error)}</p>
        {error instanceof PreviewError && error.status === 401 && <Link href="/login">Sign in</Link>}
        <button type="button" disabled={loading} onClick={() => void analyze()}>Retry</button>
      </div>}
      {report && !loading && <>
        <CountTiles counts={report.baseline.counts} total={report.totalCandidates}/>
        {report.totalCandidates === 0 && <p role="status">No candidate profiles available to analyze.</p>}
        {report.noRequiredConstraints
          ? <p className="insight-caution">Similarity/preferences only — no mandatory criteria to relax. Eligibility is not a hiring recommendation.</p>
          : report.bottlenecks.length > 0 && <section aria-label="Search bottlenecks">
            <h4>What’s restricting this search?</h4>
            <p className="insight-hint">Counts are per rule and can overlap; they must not be added together.</p>
            <div className="insight-bottlenecks">{report.bottlenecks.slice(0, 4).map(item =>
              <article key={item.key}>
                <strong>{ruleSummary(item.rule)}</strong>
                <p>{item.failedCount} documented failures · {item.unknownCount} unknown / not documented</p>
                <small>{item.soleFailureCount} blocked solely by this documented rule · {item.soleUnknownCount} blocked solely by missing evidence</small>
              </article>)}</div>
          </section>}
        <section aria-label="Measured adjustments">
          <h4>Measured adjustments</h4>
          {report.noMeasuredImprovement
            ? <p>No measured gain in the bounded set of alternatives. This does not rule out other possible changes.</p>
            : <div className="insight-suggestions">{report.suggestions.map(suggestion =>
              <article key={suggestion.id} className="insight-suggestion">
                <strong>{suggestion.changes.map(change => change.tradeOff).join(" ")}</strong>
                <p><b>{report.baseline.counts.ELIGIBLE} → {suggestion.counts.ELIGIBLE}</b> exact matches · +{suggestion.additionalEligibleCount} newly eligible</p>
                <ul>{suggestion.changes.map((change, index) => <li key={change.key + index}>
                  {ruleSummary(change.before)} → {ruleSummary(change.after)}. {change.tradeOff}
                </li>)}</ul>
                {suggestion.newlyEligible.length > 0 && <details>
                  <summary>Affected candidate records ({suggestion.newlyEligibleTotal})</summary>
                  <ul>{suggestion.newlyEligible.map(candidate => <li key={candidate.id}>
                    {candidate.displayName} · {candidate.roleTitle ?? "Role not documented"} · Previously {candidate.previousStatus.toLowerCase().replace("_", " ")}
                  </li>)}</ul>
                  {suggestion.newlyEligibleTruncated && <p>Showing {suggestion.newlyEligible.length} of {suggestion.newlyEligibleTotal} affected candidates.</p>}
                </details>}
                {suggestion.remainingRequiredCount === 0 && <p className="insight-caution">No mandatory requirements remain.</p>}
                {suggestion.warnings.map(warning => <p className="insight-caution" key={warning}>{warning}</p>)}
                <button type="button" className="insight-action" onClick={() => review(suggestion)}>Review change</button>
              </article>)}</div>}
        </section>
        <p className="insight-hint">Calculated from current records; suggestions are previews only. Nothing in your saved search has changed.</p>
        <details className="insight-details"><summary>How this works</summary>
          <p>{report.limitations}</p>
          <p>Required rules govern exact eligibility. Missing evidence produces Needs review, not a documented failure. Reference profiles are excluded from counts.</p>
          <p>Bounded alternatives evaluated: {report.evaluatedAlternatives.single} single-rule and {report.evaluatedAlternatives.paired} paired.</p>
          <RuleSummaryList rules={report.baseline.criteria}/>
        </details>
      </>}
    </div>}
  </div>;
}
