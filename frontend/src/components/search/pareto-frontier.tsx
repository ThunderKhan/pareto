"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Rule } from "@pareto/backend/search";
import type { searchFrontier } from "@pareto/backend/search/server";
import { CountTiles, PreviewError, ReloadSearch, previewError, previewRequest, ruleSummary } from "./search-insights-shared";

type Report = Awaited<ReturnType<typeof searchFrontier>>;
type Strategy = Report["strategies"][number];

function ChangeSummary({ strategy }: { strategy: Strategy }) {
  return <ul className="frontier-changes">{strategy.changes.map(change =>
    <li key={change.key + change.kind}>
      <div><strong>{ruleSummary(change.before)}</strong>
        <span aria-hidden="true"> → </span>
        <strong>{ruleSummary(change.after)}</strong></div>
      <p>{change.tradeOff}</p>
    </li>)}</ul>;
}

/** The only action is to review a proposed draft; it never saves a search. */
export default function ParetoFrontier({ sessionId, version, onReview }: {
  sessionId: string; version: number;
  onReview: (criteria: Rule[], warnings: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function explore() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setOpen(true);
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const value = await previewRequest<Report>("", {
        action: "frontier", sessionId, expectedVersion: version, maxStrategies: 5,
      }, request.signal);
      if (request.signal.aborted) return;
      if (value.sessionId !== sessionId || value.version !== version) {
        setError(new PreviewError(409, "This search changed during analysis."));
        return;
      }
      setReport(value);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause);
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }

  function review(strategy: Strategy) {
    if (!report || report.sessionId !== sessionId || report.version !== version) {
      setReport(null);
      setError(new PreviewError(409, "The confirmed search changed."));
      return;
    }
    onReview(strategy.proposedCriteria, [
      ...strategy.changes.map(change => change.tradeOff), ...strategy.warnings,
      "This strategy was previewed against current records; the confirmed search remains unchanged until you confirm.",
    ]);
  }

  return <section className="frontier-module" aria-label="Pareto Frontier" data-testid="pareto-frontier">
    <header className="frontier-intro">
      <div>
        <span className="frontier-eyebrow">THE PARETO FRONTIER · HIRING INTELLIGENCE</span>
        <h3>Pareto Frontier</h3>
        <p>Explore measured trade-offs behind your hiring requirements. Keep control of what changes.</p>
      </div>
      <button type="button" className="frontier-cta" disabled={loading} aria-expanded={open}
        onClick={() => {
          if (!open) void explore();
          else { controller.current?.abort(); setOpen(false); setLoading(false); }
        }}>
        {loading ? "Comparing strategies…" : open ? "Close exploration" : "Explore hiring strategies"}
      </button>
    </header>
    {open && <div className="frontier-body">
      {loading && <p role="status" className="frontier-status">
        Comparing bounded alternatives against the candidate records in this workspace…
      </p>}
      {Boolean(error) && <div className="insight-error" role="alert">
        <p>{previewError(error)}</p>
        {error instanceof PreviewError && error.status === 401 && <Link href="/login">Sign in</Link>}
        <ReloadSearch status={error instanceof PreviewError ? error.status : null}/>
        <button type="button" onClick={() => void explore()} disabled={loading}>Retry</button>
      </div>}
      {report && !loading && <>
        <div className="frontier-baseline">
          <div><span className="frontier-eyebrow">CONFIRMED · BASELINE</span>
            <h4>Your current candidate pool</h4>
            <p>These counts use your current confirmed requirements, without any relaxation.</p>
          </div>
          <CountTiles counts={report.baseline.counts} total={report.scope.totalCandidates}/>
        </div>
        {report.scope.totalCandidates === 0
          ? <p role="status">No candidate profiles are available to analyze. Import candidates before exploring strategies.</p>
          : report.noRequiredConstraints
            ? <p role="status">This search has no mandatory requirements to relax. You can refine the criteria instead.</p>
            : report.noMeasuredImprovement
              ? <p role="status">No improvement was found among the {report.scope.evaluatedSingle} single-rule and {report.scope.evaluatedPairs} paired alternatives tested. This does not mean other strategies or candidates do not exist.</p>
              : <section className="frontier-options" aria-label="Measured alternative hiring strategies">
                <div className="frontier-options-head">
                  <div><span className="frontier-eyebrow">POSSIBLE PATHS</span>
                    <h4>Strategies worth considering</h4></div>
                  <p>{report.scope.nonDominatedCount} non-dominated in the evaluated set · showing {report.scope.displayedCount}</p>
                </div>
                <div className="frontier-grid">{report.strategies.map((strategy, i) =>
                  <article className="frontier-card" key={strategy.id}>
                    <div className="frontier-card-top">
                      <span className="frontier-index">STRATEGY {String(i + 1).padStart(2, "0")}</span>
                      <span className="frontier-preview-tag">PREVIEW ONLY</span>
                    </div>
                    <h5>{strategy.title}</h5>
                    <div className="frontier-impact">
                      <div><small>Exact matches</small><strong>{report.baseline.counts.ELIGIBLE} → {strategy.counts.ELIGIBLE}</strong></div>
                      <div><small>Newly eligible</small><strong>+{strategy.impact.newlyEligibleCount}</strong></div>
                    </div>
                    <p className="frontier-impact-note">
                      {strategy.counts.NEEDS_REVIEW} need review · {strategy.impact.noLongerEligibleCount} no longer eligible · {strategy.changes.length} required {strategy.changes.length === 1 ? "rule" : "rules"} adjusted
                    </p>
                    <ChangeSummary strategy={strategy}/>
                    {strategy.warnings.map(warning =>
                      <p className="frontier-warning" key={warning}>{warning}</p>)}
                    <details className="frontier-evidence">
                      <summary>Review candidate impact</summary>
                      <p>{strategy.impact.newlyEligibleCount} newly eligible candidates, measured against current records.</p>
                      {strategy.impact.newlyEligibleExamples.length > 0 && <ul>{
                        strategy.impact.newlyEligibleExamples.map(candidate => <li key={candidate.id}>
                          <strong>{candidate.displayName}</strong>
                          <span>{candidate.roleTitle ?? "Role not documented"} · {candidate.city ?? "City not documented"} · previously {candidate.previousStatus === "NEEDS_REVIEW" ? "needs review" : "ineligible"}</span>
                        </li>)}</ul>}
                      {strategy.impact.examplesTruncated && <p>
                        Showing the first {strategy.impact.newlyEligibleExamples.length} of {strategy.impact.newlyEligibleCount}.
                      </p>}
                    </details>
                    <button type="button" className="frontier-review" onClick={() => review(strategy)}>
                      Review this strategy <span aria-hidden="true">↗</span>
                    </button>
                  </article>)}</div>
              </section>}
        <div className="frontier-footnote">
          <strong>How this works</strong>
          <p>Pareto compares a bounded set of changes to mandatory requirements using your own candidate records. Alternatives are non-dominated only within those evaluated scenarios, not a global hiring optimum. Missing qualifications are not treated as verified. Reviewing a strategy opens the editable search draft; nothing is saved automatically.</p>
          <p>{report.scope.evaluatedSingle} single-rule and {report.scope.evaluatedPairs} paired scenarios evaluated · {report.algorithmVersion} · {report.evaluatorVersion} evaluator</p>
        </div>
        <button type="button" className="insight-quiet" onClick={() => void explore()} disabled={loading}>
          Recalculate with current records
        </button>
      </>}
    </div>}
  </section>;
}
