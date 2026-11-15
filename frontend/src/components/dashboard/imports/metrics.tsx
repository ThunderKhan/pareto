"use client";

import { useCallback, useEffect, useState } from "react";
import { errorText, metricText, requestJSON, type ImportMetrics } from "./api";

export default function ImportMetricsPanel() {
  const [days, setDays] = useState<1|7|30|90>(30);
  const [data, setData] = useState<ImportMetrics | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const value = await requestJSON<ImportMetrics>("/metrics?days=" + days, undefined, signal);
      if (signal?.aborted) return; setData(value); setError(""); }
    catch (cause) { if (!(cause instanceof Error && cause.name === "AbortError")) setError(errorText(cause)); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [days]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  return <details className="import-section import-metrics" data-testid="import-metrics">
    <summary>Processing insights <span className="import-muted">Measured operations, not candidate quality scores</span></summary>
    <div className="import-section__body">
      <div className="import-actions">
        <label>Time window <select value={days} onChange={event => { setBusy(true); setDays(Number(event.target.value) as 1|7|30|90); }}>
          {[1,7,30,90].map(value => <option key={value} value={value}>Last {value} day{value === 1 ? "" : "s"}</option>)}
        </select></label>
        <button type="button" className="import-button import-button--quiet" disabled={busy} onClick={() => { setBusy(true); void load(); }}>Refresh metrics</button>
      </div>
      {busy && <p role="status">Loading measured processing data…</p>}
      {error && <p role="alert" className="import-alert">{error}</p>}
      {data && <>
        <div className="import-kpis" aria-label="Measured processing metrics">
          <div><strong>{data.attempts.completed}</strong><span>Completed attempts</span></div>
          <div><strong>{data.attempts.retries}</strong><span>Retried attempts</span></div>
          <div><strong>{data.qualityActivity.approvals}</strong><span>Human approvals</span></div>
          <div><strong>{data.qualityActivity.correctionEvents}</strong><span>Correction events</span></div>
        </div>
        <div className="import-columns">
          <section><h3>Processing</h3><dl className="import-facts">
            <div><dt>Average attempt</dt><dd>{metricText(data.attempts.averageDurationMs, " ms")}</dd></div>
            <div><dt>95th-percentile attempt</dt><dd>{metricText(data.attempts.p95DurationMs, " ms")}</dd></div>
            <div><dt>Average parsing</dt><dd>{metricText(data.attempts.averageParseMs, " ms")}</dd></div>
            <div><dt>Average extraction</dt><dd>{metricText(data.attempts.averageModelMs, " ms")}</dd></div>
            <div><dt>Average persistence</dt><dd>{metricText(data.attempts.averagePersistenceMs, " ms")}</dd></div>
            <div><dt>Average evidence count</dt><dd>{metricText(data.attempts.averageEvidenceCount)}</dd></div>
          </dl></section>
          <section><h3>Recorded status counts</h3>
            {([["Documents",data.documents],["Jobs",data.jobs],["Human review",data.reviewStates]] as const).map(([label,counts]) =>
              <div key={label}><h4>{label}</h4><p className="import-muted">
                {Object.entries(counts).length ? Object.entries(counts).map(([status,count]) => status.replaceAll("_"," ") + ": " + count).join(" · ") : "No records in this period"}
              </p></div>)}
            <p className="import-muted">Corrections: {data.qualityActivity.correctionEvents} · Rejections: {data.qualityActivity.rejections} · Changed fields: {data.qualityActivity.changedFields}</p>
          </section>
        </div>
        <div className="import-notes">{data.caveats.map(message => <p key={message}>{message}</p>)}</div>
      </>}
    </div>
  </details>;
}
