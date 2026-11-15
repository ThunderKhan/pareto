"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  dateText, errorText, metricText, requestJSON, ImportAPIError,
  type ImportDetail, type JobDetail, type ReviewState, type ReviewedProfile, type AuditEvent,
} from "./api";

const blank: ReviewedProfile = {
  displayName: "", roleTitle: null, city: null, experienceMonths: null,
  noticePeriodDays: null, industry: null, education: null,
  employmentType: null, skills: null, pastRoles: [], certifications: [],
};
const terminal = new Set(["READY", "NEEDS_REVIEW", "FAILED_PERMANENT"]);
const textFields = [
  ["displayName", "Full name"], ["roleTitle", "Current role"], ["city", "City"],
  ["industry", "Industry"], ["education", "Education"], ["employmentType", "Employment type"],
] as const;
type ReviewAction = "approve" | "correct" | "reject";

export default function ResumeImportDetail({ id, onChanged, onClose }: {
  id: string; onChanged: () => void; onClose: () => void;
}) {
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [draft, setDraft] = useState<ReviewedProfile>({ ...blank });
  const [attested, setAttested] = useState(false);
  const [action, setAction] = useState<ReviewAction>("correct");
  const [reason, setReason] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const [info, state, history, auditLog] = await Promise.all([
        requestJSON<ImportDetail>("/" + id, undefined, signal),
        requestJSON<ReviewState>("/" + id + "/profile", undefined, signal),
        requestJSON<{job: JobDetail}>("/" + id + "/job", undefined, signal).catch(cause => {
          if (cause instanceof ImportAPIError && cause.status === 404) return { job: null };
          throw cause;
        }),
        requestJSON<{events: AuditEvent[]}>("/" + id + "/audit", undefined, signal),
      ]);
      if (signal?.aborted) return;
      setDetail(info); setReview(state); setJob(history.job); setAudit(auditLog.events);
      setDraft(state.profile ? { ...state.profile,
        skills: state.profile.skills ? [...state.profile.skills] : null,
        pastRoles: [...state.profile.pastRoles], certifications: [...state.profile.certifications] } : { ...blank });
      setAttested(false); setReason(""); setConfirmReject(false);
      setConflict(false);
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === "AbortError") && !signal?.aborted) {
        if (cause instanceof ImportAPIError && cause.status === 401) {
          setDetail(null); setJob(null); setReview(null); setAudit([]);
        }
        setError(errorText(cause));
      }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // A queued document is durable: refresh processing details only while it is still active.
  useEffect(() => {
    if (loading || !job || terminal.has(job.status) || job.status === "CANCELLED") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || busy) return;
      void requestJSON<{job: JobDetail}>("/" + id + "/job").then(value => {
        setJob(value.job);
        if (terminal.has(value.job.status)) {
          void load();
          onChanged();
        }
      }).catch(() => { /* Manual Refresh remains available. */ });
    }, 5000);
    return () => clearInterval(timer);
  }, [id, job, loading, busy, load, onChanged]);

  function update<K extends keyof ReviewedProfile>(key: K, value: ReviewedProfile[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setConfirmReject(false);
    setMessage("");
  }

  function validateProfile() {
    if (!draft.displayName.trim() || draft.displayName.trim().length > 120) return "Enter a documented name (1–120 characters).";
    for (const value of Object.values(draft)) {
      if (typeof value === "string" && (/\p{Cc}/u.test(value) || value.length > 120)) return "Profile fields must be 120 characters or fewer without control characters.";
    }
    for (const value of [draft.experienceMonths, draft.noticePeriodDays]) {
      if (value !== null && (!Number.isInteger(value) || value < 0)) return "Enter valid nonnegative whole numbers for experience and notice.";
    }
    if (draft.experienceMonths !== null && draft.experienceMonths > 720) return "Experience must be at most 720 months.";
    if (draft.noticePeriodDays !== null && draft.noticePeriodDays > 365) return "Notice period must be at most 365 days.";
    if (draft.skills?.length && draft.skills.length > 25) return "You can record up to 25 skills.";
    if (draft.pastRoles.length > 10 || draft.certifications.length > 10) return "Up to 10 previous roles or certifications are supported.";
    for (const item of [...(draft.skills ?? []), ...draft.pastRoles, ...draft.certifications]) {
      if (!item.trim() || item.length > 120 || /\p{Cc}/u.test(item)) return "List entries must be nonempty, at most 120 characters and free of control characters.";
    }
    return null;
  }

  async function submit(choice: ReviewAction) {
    if (busy || !review || !attested || conflict || !job || !terminal.has(job.status)) return;
    if (choice === "reject" && !confirmReject) { setConfirmReject(true); return; }
    if (choice !== "approve" && (reason.trim().length < 8 || reason.trim().length > 250)) {
      setError("Provide a reason of 8–250 characters."); return;
    }
    if (choice === "correct") {
      const invalid = validateProfile();
      if (invalid) { setError(invalid); return; }
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await requestJSON<ReviewState>("/" + id + "/profile", {
        action: choice, expectedVersion: review.reviewVersion, confirmedAgainstSource: true,
        ...(choice === "correct" ? { reason: reason.trim(), profile: draft } :
          choice === "reject" ? { reason: reason.trim() } : {}),
      });
      setMessage(choice === "reject" ? "Profile withdrawn from candidate search. Audit retained." :
        choice === "approve" ? "Source-checked extraction approved." : "Corrections saved and marked human verified.");
      await load();
      onChanged();
    } catch (cause) {
      if (cause instanceof ImportAPIError && cause.status === 409) setConflict(true);
      setError(errorText(cause));
    } finally { setBusy(false); }
  }

  async function viewOriginal() {
    setBusy(true); setError("");
    try {
      const signed = await requestJSON<{url: string; expiresInSeconds: number}>("/" + id + "/download");
      const target = new URL(signed.url);
      if (target.protocol !== "https:") throw new Error("Private source link is unavailable.");
      // URL is used immediately on explicit click; never cached or persisted.
      window.location.assign(target.href);
    } catch (cause) { setError(errorText(cause)); setBusy(false); }
  }

  const canReview = Boolean(review && job && terminal.has(job.status));
  const changed = Boolean(review && JSON.stringify(review.profile) !== JSON.stringify(draft));
  return <aside className="import-detail" aria-label="Import details" data-testid="resume-import-detail">
    <header className="import-detail__head">
      <div><p className="pareto-page-eyebrow">PRIVATE SOURCE RECORD</p>
        <h2>{detail?.fileName ?? "Import details"}</h2>
        <p className="import-muted">Source evidence and reviewer actions are limited to your account.</p>
      </div>
      <div className="import-actions">
        <button type="button" className="import-button import-button--quiet" disabled={loading || busy} onClick={() => void load()}>Refresh details</button>
        <button type="button" className="import-button import-button--quiet" onClick={onClose}>Close</button>
      </div>
    </header>
    {loading && <p role="status">Loading private import details…</p>}
    {error && <p role="alert" className="import-alert">{error} {conflict && "Your edits were not saved. Reload and compare with the current version."}</p>}
    {conflict && <button type="button" className="import-button" onClick={() => void load()}>Reload current review version</button>}
    {message && <p role="status" className="import-success">{message}</p>}
    {detail && review && <>
      <div className="import-detail__overview">
        <span className="import-chip">{job?.status.replaceAll("_"," ") ?? detail.status.replaceAll("_"," ")}</span>
        <span className="import-chip">{review.reviewState.replaceAll("_"," ")}</span>
        <span className="import-muted">Updated {dateText(detail.updatedAt)}</span>
        {detail.candidate && <Link className="import-link" href={"/dashboard/candidates?candidate=" + encodeURIComponent(detail.candidate.id)}>Open candidate</Link>}
        <button type="button" className="import-link import-link--button" disabled={busy} onClick={() => void viewOriginal()}>View private original (60-second link)</button>
      </div>
      {detail.reviewReasons.length > 0 && <div className="import-notes">{detail.reviewReasons.map(item => <p key={item}>{item}</p>)}</div>}
      {detail.errorCode && <p className="import-muted">Processing code: {detail.errorCode}</p>}
      {detail.textTruncated && <p className="import-caution">Only a bounded portion of the source was extracted. Verify the original before relying on these fields.</p>}

      <section className="import-section import-section--flat" aria-label="Source evidence">
        <h3>Source evidence</h3>
        <p className="import-muted">Verbatim extracted quotes only. Missing values are unknown—not evidence of a mismatch. Manually changed fields lose their obsolete model quotes.</p>
        {detail.evidence.length ? <ul className="import-evidence">{detail.evidence.map((entry,index) =>
          <li key={entry.fieldKey + index}><strong>{entry.fieldKey}</strong>
            <blockquote>{entry.quote}</blockquote>
            <small>{entry.pageNumber === null ? "Source excerpt · page not available" : "Source page " + entry.pageNumber}</small>
          </li>)}</ul> : <p className="import-empty">No source excerpts are documented for this import.</p>}
      </section>

      <section className="import-section import-section--flat" aria-label="Candidate review">
        <div className="import-section__title"><div><h3>Human source review</h3>
          <p className="import-muted">Version {review.reviewVersion}. Approval means you checked this document; it is not third-party credential verification.</p>
        </div></div>
        {!canReview && <p className="import-caution">Review actions are disabled while processing is active or the job is cancelled.</p>}
        {!review.profile && <p className="import-caution">No extracted candidate exists. You can create a source-checked profile with Corrections once processing has reached a reviewable terminal state.</p>}
        <fieldset className="import-review-form" disabled={busy || !canReview || conflict}>
          <legend>Complete candidate profile</legend>
          <div className="import-review-grid">
            {textFields.map(([key,label]) => <label key={key}>{label}
              <input type="text" maxLength={120} required={key === "displayName"} value={draft[key] ?? ""}
                onChange={event => update(key,event.target.value || (key === "displayName" ? "" : null))}/>
            </label>)}
            <label>Experience (months; blank = unknown)
              <input type="number" min={0} max={720} step={1} value={draft.experienceMonths ?? ""}
                onChange={event => update("experienceMonths", event.target.value === "" ? null : event.target.valueAsNumber)}/>
            </label>
            <label>Notice period (days; blank = unknown)
              <input type="number" min={0} max={365} step={1} value={draft.noticePeriodDays ?? ""}
                onChange={event => update("noticePeriodDays", event.target.value === "" ? null : event.target.valueAsNumber)}/>
            </label>
            <label>Skills evidence
              <select value={draft.skills === null ? "unknown" : "documented"}
                onChange={event => update("skills", event.target.value === "unknown" ? null : [])}>
                <option value="unknown">Not documented (unknown)</option>
                <option value="documented">Reviewed list (may be empty)</option>
              </select>
            </label>
            {draft.skills !== null && <label>Skills (comma-separated; up to 25)
              <input value={draft.skills.join(", ")} onChange={event => update("skills",
                event.target.value.split(",").map(s => s.trim()).filter(Boolean))}/>
            </label>}
            <label>Previous roles (comma-separated)
              <input value={draft.pastRoles.join(", ")} onChange={event => update("pastRoles",
                event.target.value.split(",").map(s => s.trim()).filter(Boolean))}/>
            </label>
            <label>Certifications (comma-separated)
              <input value={draft.certifications.join(", ")} onChange={event => update("certifications",
                event.target.value.split(",").map(s => s.trim()).filter(Boolean))}/>
            </label>
          </div>
          <div className="import-review-actions">
            <label>Review action
              <select value={action} onChange={event => { setAction(event.target.value as ReviewAction); setConfirmReject(false); }}>
                <option value="correct">Save corrections</option>
                <option value="approve" disabled={!review.profile}>Approve current extraction</option>
                <option value="reject">Reject extracted profile</option>
              </select>
            </label>
            {action !== "approve" && <label>Reason (8–250 characters)
              <textarea rows={2} minLength={8} maxLength={250} required value={reason}
                onChange={event => setReason(event.target.value)} placeholder="Describe the source evidence or issue"/>
            </label>}
            <label className="import-attest">
              <input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)}/>
              I checked the original source document.
            </label>
            {action === "reject" && <p className="import-caution">Rejecting removes the candidate from searches. The private document and audit trail remain. A later source-checked correction can restore a profile.</p>}
            <div className="import-actions">
              <button type="button" className="import-button" disabled={!attested || busy || conflict ||
                (action === "approve" && !review.profile) || (action === "correct" && !changed) ||
                (action !== "approve" && (reason.trim().length < 8 || reason.trim().length > 250))}
                onClick={() => void submit(action)}>
                {busy ? "Saving review…" : action === "correct" ? "Save source-checked corrections" :
                  action === "approve" ? "Approve extraction" : confirmReject ? "Confirm rejection" : "Review rejection"}
              </button>
              {confirmReject && <button type="button" className="import-button import-button--quiet"
                onClick={() => setConfirmReject(false)}>Keep profile</button>}
            </div>
          </div>
        </fieldset>
      </section>
      <section className="import-section import-section--flat" aria-label="Processing attempts">
        <h3>Processing attempts</h3>
        {job ? <>
          <p className="import-muted">{job.status.replaceAll("_", " ")} · {job.stage} · {job.attempts}/{job.maxAttempts} attempts · {job.manualRetries}/2 manual retries used</p>
          {job.history.length ? <ol className="import-attempts">{job.history.map((entry,i) =>
            <li key={entry.attempt + ":" + i}>
              <strong>Attempt {entry.attempt} · {entry.outcome ?? "In progress"}</strong>
              <p className="import-muted">{dateText(entry.startedAt)} · {entry.errorCode ?? "No failure recorded"}</p>
              <dl className="import-facts">
                <div><dt>Total time</dt><dd>{metricText(entry.durationMs, " ms")}</dd></div>
                <div><dt>Parse</dt><dd>{metricText(entry.parseMs, " ms")}</dd></div>
                <div><dt>Model</dt><dd>{metricText(entry.modelMs, " ms")}</dd></div>
                <div><dt>Persist</dt><dd>{metricText(entry.persistMs, " ms")}</dd></div>
                <div><dt>Source chars</dt><dd>{metricText(entry.sourceChars)}</dd></div>
                <div><dt>Evidence</dt><dd>{metricText(entry.evidenceCount)}</dd></div>
                <div><dt>Verified fields</dt><dd>{metricText(entry.verifiedFields)}</dd></div>
                <div><dt>Provider / extractor</dt><dd>{entry.provider ?? "Not recorded"} / {entry.extractorVersion ?? "Not recorded"}</dd></div>
              </dl>
            </li>)}</ol> : <p className="import-empty">No processing attempts recorded yet.</p>}
        </> : <p className="import-empty">No durable job exists for this document.</p>}
      </section>
      <section className="import-section import-section--flat" aria-label="Review audit">
        <h3>Extraction and review audit</h3>
        <p className="import-muted">Read-only versioned record of extraction and human actions. No source content is sent to analytics.</p>
        {audit.length ? <ol className="import-audit">{audit.map(event =>
          <li key={event.id}><strong>{event.action.replaceAll("_"," ")} · version {event.reviewVersion}</strong>
            <span className="import-muted">{dateText(event.createdAt)}</span>
            <p>Changed fields: {event.changedFields.length ? event.changedFields.join(", ") : "none"}</p>
            {event.reason && <p>Reason: {event.reason}</p>}
            {(event.before || event.after) && <details><summary>View before/after values</summary>
              <div className="import-columns">
                <div><h4>Before</h4><pre>{JSON.stringify(event.before ?? {}, null, 2)}</pre></div>
                <div><h4>After</h4><pre>{JSON.stringify(event.after ?? {}, null, 2)}</pre></div>
              </div></details>}
          </li>)}</ol> : <p className="import-empty">No extraction or review events recorded yet.</p>}
      </section>
    </>}
  </aside>;
}
