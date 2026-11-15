"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { criteriaSchema, type Rule } from "@pareto/backend/search";
import type { simulateSearch } from "@pareto/backend/search/server";
import CriteriaEditor from "./criteria-editor";
import { CountTiles, EvidenceList, PreviewError, RuleSummaryList, previewError, previewRequest, ruleSummary, statusLabel } from "./search-insights-shared";

type Report = Awaited<ReturnType<typeof simulateSearch>>;
type ImpactGroup = Report["groups"]["newlyEligible"];
const impactGroups: { key: keyof Report["groups"]; title: string }[] = [
  { key: "newlyEligible", title: "Newly eligible" },
  { key: "noLongerEligible", title: "No longer eligible" },
  { key: "stillIneligible", title: "Still ineligible" },
  { key: "stillNeedsReview", title: "Still needs review" },
];

function CandidateImpacts({ group, title }: { group: ImpactGroup; title: string }) {
  return <details className="insight-impact-group" open={title === "Newly eligible" || title === "No longer eligible"}>
    <summary>{title} · {group.count}</summary>
    {group.count === 0 ? <p>{title === "Newly eligible"
      ? "No new exact matches under this scenario."
      : title === "No longer eligible" ? "No previously eligible candidates lose eligibility."
      : "No candidates in this group."}</p> : <>
      <ul>{group.examples.map(person => <li key={person.id}>
        <strong>{person.displayName}</strong> · {person.roleTitle ?? "Role not documented"} · {person.city ?? "City not documented"}
        <p>{statusLabel[person.before.eligibility]} → {statusLabel[person.after.eligibility]}</p>
        <details><summary>Compare criterion-level evidence</summary>
          <div className="insight-compare">
            <div><h5>Current requirements</h5><EvidenceList details={person.before.details}/></div>
            <div><h5>What-if requirements</h5><EvidenceList details={person.after.details}/></div>
          </div>
        </details>
      </li>)}</ul>
      {group.truncated && <p>Showing first {group.examples.length} of {group.count} candidate records.</p>}
    </>}
  </details>;
}

export default function WhatIfPanel({ sessionId, version, criteria, onReview }: {
  sessionId: string; version: number; criteria: Rule[];
  onReview: (criteria: Rule[], warnings: string[]) => void;
}) {
  const [scenario, setScenario] = useState<Rule[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  function begin() {
    setScenario(criteria.map(rule => ({ ...rule })));
    setReport(null); setError(null);
  }
  function discard() {
    controller.current?.abort();
    setScenario(null); setReport(null); setError(null); setWorking(false);
  }
  function edit(value: Rule[]) {
    controller.current?.abort();
    setScenario(value); setReport(null); setError(null); setWorking(false);
  }
  async function simulate() {
    if (!scenario || working) return;
    if (JSON.stringify(scenario) === JSON.stringify(criteria)) {
      setError("Adjust at least one criterion to compare outcomes."); return;
    }
    const parsed = criteriaSchema.safeParse(scenario);
    if (!parsed.success) {
      setError(parsed.error.issues.map(issue => issue.message).join(" ")); return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setWorking(true); setError(null); setReport(null);
    try {
      const value = await previewRequest<Report>("", {
        action: "simulate", sessionId, expectedVersion: version, criteria: parsed.data,
      }, request.signal);
      if (request.signal.aborted) return;
      if (value.sessionId !== sessionId || value.version !== version) {
        setError(new PreviewError(409, "The search revision changed.")); return;
      }
      if (!value.changed) {
        setError("No change to simulate."); return;
      }
      setReport(value);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause);
    } finally {
      if (!request.signal.aborted) setWorking(false);
    }
  }

  function review() {
    if (!scenario || !report || report.sessionId !== sessionId || report.version !== version
      || JSON.stringify(scenario) !== JSON.stringify(report.proposed.criteria)) {
      setReport(null);
      setError(new PreviewError(409, "The preview no longer matches your draft."));
      return;
    }
    onReview(report.proposed.criteria, report.warnings);
    discard();
  }

  return <div className="insight-module" data-testid="what-if">
    {scenario === null ? <button type="button" className="insight-trigger" aria-expanded="false" onClick={begin}>
      Try a what-if scenario <span aria-hidden="true">+</span>
    </button> : <div className="insight-body">
      <div className="insight-heading"><div>
        <h3>What-if simulator</h3>
        <p>Change a separate copy of your requirements. Simulations never save a revision.</p>
      </div><button type="button" className="insight-quiet" onClick={discard}>Discard scenario</button></div>
      <div className="insight-compare">
        <section className="insight-pane" aria-label="Current search">
          <h4>Current search · revision {version}</h4>
          <RuleSummaryList rules={criteria}/>
          {report && <CountTiles counts={report.original.counts} total={report.totalCandidates}/>}
        </section>
        <section className="insight-pane" aria-label="What-if search preview">
          <h4>What-if search · preview</h4>
          <p>Edit the proposed criteria below. Nothing is saved until you independently confirm.</p>
          <CriteriaEditor rules={scenario} disabled={working} onChange={edit}/>
          {report && <CountTiles counts={report.proposed.counts} total={report.totalCandidates}/>}
        </section>
      </div>
      <div className="insight-actions">
        <button type="button" className="insight-action" onClick={() => void simulate()}
          disabled={working || !criteriaSchema.safeParse(scenario).success || JSON.stringify(scenario) === JSON.stringify(criteria)}>
          {working ? "Calculating…" : report ? "Run simulation again" : "Run simulation"}
        </button>
        <button type="button" className="insight-quiet" onClick={discard}>Discard scenario</button>
      </div>
      {working && <p role="status">Calculating what-if results…</p>}
      {typeof error === "string" && <p role="alert" className="insight-error">{error}</p>}
      {error !== null && typeof error !== "string" && <div role="alert" className="insight-error">
        <p>{previewError(error)}</p>
        {error instanceof PreviewError && error.status === 401 && <Link href="/login">Sign in</Link>}
        <button type="button" onClick={() => void simulate()}>Retry</button>
      </div>}
      {report && <>
        <section className="insight-delta" aria-label="Measured changes">
          <h4>Measured impact</h4>
          <p>Exact matches: <strong>{report.original.counts.ELIGIBLE} → {report.proposed.counts.ELIGIBLE}</strong> · Net {report.delta.exactMatches > 0 ? "+" : ""}{report.delta.exactMatches}</p>
          <p>Needs review: {report.original.counts.NEEDS_REVIEW} → {report.proposed.counts.NEEDS_REVIEW} · Net {report.delta.needsReview > 0 ? "+" : ""}{report.delta.needsReview}</p>
          {report.totalCandidates === 0 && <p>No candidate records are available to evaluate.</p>}
          {report.referenceId && <p>The reference profile is excluded from every count and impact group.</p>}
          <h4>Changed requirements</h4>
          <ul>{report.changes.map(change => <li key={change.key}>
            <strong>{change.type} · {change.hardConstraintImpact}</strong>
            <p>{change.before ? ruleSummary(change.before) : "Absent"} → {change.after ? ruleSummary(change.after) : "Removed"}</p>
          </li>)}</ul>
          {report.proposed.remainingRequiredCount === 0 && <p className="insight-caution">No mandatory criteria remain; eligibility does not imply hiring suitability.</p>}
          {report.warnings.map(warning => <p key={warning} className="insight-caution">{warning}</p>)}
        </section>
        <section aria-label="Candidate eligibility changes">
          <h4>Candidate transitions</h4>
          {impactGroups.map(item => <CandidateImpacts key={item.key}
            title={item.title} group={report.groups[item.key]}/>)}
        </section>
        <p className="insight-hint">{report.limitations}</p>
        <div className="insight-actions">
          <button type="button" className="insight-action" onClick={review}>Apply for review</button>
          <button type="button" className="insight-quiet" onClick={discard}>Discard scenario</button>
        </div>
        <p className="insight-hint">Apply for review only opens the regular criteria editor; it does not confirm or save this scenario.</p>
      </>}
    </div>}
  </div>;
}
