"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowClockwise, ArrowRight, FileArrowUp, FolderOpen, ShieldCheck } from "@phosphor-icons/react";
import ResumeImportDetail from "./detail";
import ImportMetricsPanel from "./metrics";
import {
  dateText, errorText, fileValidation, humanStatus, ImportAPIError, requestJSON,
  type Batch, type ImportJob, type ResumeDocument,
} from "./api";
import "./imports.css";
import "./continuity-phase3.css";

type Upload = { id: string; file: File; status: "selected" | "invalid" | "uploading" | "accepted" | "duplicate" | "failed" | "uncertain";
  note: string; documentId?: string };
type UploadResponse = { duplicate: boolean; document: ResumeDocument };
const activeStatuses = new Set(["QUEUED", "RUNNING", "RETRY_SCHEDULED"]);
const canBatch = (doc: ResumeDocument) => doc.ingestionJob?.status === "QUEUED" && !doc.ingestionJob.batchId;
const canCancel = (doc: ResumeDocument) => Boolean(doc.ingestionJob &&
  activeStatuses.has(doc.ingestionJob.status) && !doc.ingestionJob.cancelRequested);
const canRetry = (doc: ResumeDocument) => Boolean(doc.ingestionJob &&
  ["NEEDS_REVIEW", "FAILED_PERMANENT"].includes(doc.ingestionJob.status) && doc.ingestionJob.manualRetries < 2);
const nowish = (value: string) => {
  const ms = Date.parse(value);
  return Number.isFinite(ms) && Date.now() - ms > 120_000;
};

export default function ResumeImports() {
  const [documents, setDocuments] = useState<ResumeDocument[]>([]);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [batchLabel, setBatchLabel] = useState("");
  const [batchDate, setBatchDate] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const filesRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (pending.current) return;
    pending.current = true;
    try {
      const [history, batchList, jobList] = await Promise.all([
        requestJSON<{imports: ResumeDocument[]}>("", undefined, signal),
        requestJSON<{batches: Batch[]}>("/batches", undefined, signal),
        requestJSON<{jobs: ImportJob[]}>("/jobs", undefined, signal),
      ]);
      if (signal?.aborted) return;
      setDocuments(history.imports); setBatches(batchList.batches); setJobs(jobList.jobs);
      const selectable = new Set(history.imports.filter(canBatch).map(d => d.id));
      setChecked(old => new Set([...old].filter(id => selectable.has(id))));
      setError("");
    } catch (cause) {
      if (!(cause instanceof Error && cause.name === "AbortError") && !signal?.aborted) {
        if (cause instanceof ImportAPIError && cause.status === 401) {
          setDocuments([]); setJobs([]); setBatches([]); setSelectedDocument(null);
        }
        setError(errorText(cause));
      }
    } finally {
      pending.current = false;
      if (!signal?.aborted) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(controller.signal);
    }, 5000);
    return () => { controller.abort(); clearInterval(poll); };
  }, [refresh]);

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 50) {
      setError("Select up to 50 resumes at once. Each file is uploaded independently.");
      setUploads([]); return;
    }
    const next = selected.map((file,index) => {
      const problem = fileValidation(file);
      return { id: file.name + ":" + file.lastModified + ":" + index, file,
        status: (problem ? "invalid" : "selected") as Upload["status"], note: problem ?? "" };
    });
    setUploads(next);
    setError(""); setNotice("");
  }

  async function upload() {
    if (uploading) return;
    const queue = uploads.filter(item => item.status === "selected" || item.status === "failed");
    if (!queue.length) return;
    setUploading(true); setError(""); setNotice("");
    let accepted = 0;
    const send = async (entry: Upload) => {
      setUploads(previous => previous.map(row => row.id === entry.id ? { ...row, status: "uploading", note: "Uploading one file; extraction runs asynchronously." } : row));
      const body = new FormData();
      body.append("file", entry.file, entry.file.name);
      try {
        const result = await requestJSON<UploadResponse>("", body);
        accepted++;
        setUploads(previous => previous.map(row => row.id === entry.id ? {
          ...row, status: result.duplicate ? "duplicate" : "accepted",
          documentId: result.document.id,
          note: (result.duplicate ? "Already imported · " : "Upload accepted · ") +
            humanStatus(result.document),
        } : row));
      } catch (cause) {
        const uncertain = !(cause instanceof ImportAPIError);
        setUploads(previous => previous.map(row => row.id === entry.id ? {
          ...row, status: uncertain ? "uncertain" : "failed",
          note: uncertain ? "Upload status uncertain. Refresh import history and reselect the file before sending it again." : errorText(cause),
        } : row));
      }
    };
    // Each accepted file gets its own durable document; maximum two in-flight POST requests.
    for (let index = 0; index < queue.length; index += 2) {
      await Promise.all(queue.slice(index,index + 2).map(send));
      await refresh();
    }
    setUploading(false);
    if (accepted) setNotice(accepted + " upload response" + (accepted === 1 ? "" : "s") +
      " received. Check per-file queue states; extraction may still be running.");
    if (filesRef.current) filesRef.current.value = "";
  }

  async function act(id: string, action: "retry" | "cancel") {
    if (busyId) return;
    if (action === "retry" && pendingRetry !== id) {
      setPendingRetry(id); return;
    }
    setBusyId(id); setError(""); setNotice("");
    try {
      const response = await requestJSON<{status: string} | ImportJob>("/" + id, {action});
      setNotice(action === "retry"
        ? "Manual retry queued. Processing may incur additional AI provider charges."
        : response.status === "CANCELLATION_REQUESTED"
          ? "Cancellation requested. Wait for the worker to confirm cancellation."
          : "Import cancelled. Already incurred processing costs cannot be undone.");
      setPendingRetry(null);
      await refresh();
    } catch (cause) {
      setError(errorText(cause));
      if (cause instanceof ImportAPIError && cause.status === 409) await refresh();
    } finally { setBusyId(null); }
  }

  async function createBatch() {
    if (busyId || checked.size === 0 || checked.size > 50) return;
    const selected = documents.filter(d => checked.has(d.id));
    if (selected.length !== checked.size || selected.some(d => !canBatch(d))) {
      setError("A selected job has started or is already scheduled. Refresh and select queued files."); await refresh(); return;
    }
    const when = batchDate ? new Date(batchDate) : new Date();
    if (!Number.isFinite(when.getTime()) || when.getTime() < Date.now() - 60_000 ||
        when.getTime() > Date.now() + 7 * 86400_000) {
      setError("Schedule the batch now or within the next seven days."); return;
    }
    setBusyId("batch"); setError(""); setNotice("");
    try {
      const result = await requestJSON<{batch: { documentCount: number}}>("/batches", {
        documentIds: [...checked], runAfter: when.toISOString(), ...(batchLabel.trim() ? {label: batchLabel.trim()} : {}),
      });
      setNotice("Scheduled a group of " + result.batch.documentCount + " queued files. Workers will process each file independently.");
      setChecked(new Set()); setBatchLabel(""); setBatchDate("");
      await refresh();
    } catch (cause) {
      setError(errorText(cause));
      if (cause instanceof ImportAPIError && cause.status === 409) {
        setChecked(new Set()); await refresh();
      }
    } finally { setBusyId(null); }
  }

  function toggle(id: string) {
    setChecked(previous => {
      const value = new Set(previous);
      if (value.has(id)) value.delete(id);
      else if (value.size < 50) value.add(id);
      return value;
    });
  }

  // Tasks derive from the latest owner-scoped persisted records, never from timers.
  const processing = documents.filter(doc => doc.ingestionJob &&
    ["QUEUED", "RUNNING", "RETRY_SCHEDULED"].includes(doc.ingestionJob.status));
  const reviewable = documents.filter(doc => doc.ingestionJob &&
    ["READY", "NEEDS_REVIEW"].includes(doc.ingestionJob.status) &&
    doc.reviewState !== "HUMAN_VERIFIED" && doc.errorCode !== "HUMAN_REJECTED");
  const investigate = documents.filter(doc =>
    doc.ingestionJob?.status === "FAILED_PERMANENT" || (!doc.ingestionJob && doc.status === "FAILED"));
  const rejected = documents.filter(doc => doc.errorCode === "HUMAN_REJECTED");
  const counts = jobs.reduce<Record<string,number>>((total,job) => {
    total[job.status] = (total[job.status] ?? 0) + 1;
    return total;
  }, {});
  return <div className="import-workspace" data-testid="resume-imports">
    <section className="import-upload import-section" aria-labelledby="import-upload-title">
      <div className="import-upload__head">
        <div><span className="import-kicker"><ShieldCheck size={15} aria-hidden="true"/> PRIVATE DOCUMENTS</span>
          <h2 id="import-upload-title">Bring candidates into focus.</h2>
          <p>Upload source resumes securely. AI-assisted extraction preserves evidence and flags undocumented fields for human review.</p>
        </div>
        <FileArrowUp size={33} weight="thin" aria-hidden="true"/>
      </div>
      <label className="import-file-control" htmlFor="resume-files">
        <FolderOpen size={22} aria-hidden="true"/>
        <span><strong>Select PDF, DOCX or TXT resumes</strong><small>Multiple files · separate private uploads · no synthetic progress</small></span>
      </label>
      <input id="resume-files" ref={filesRef} type="file" multiple accept=".pdf,.docx,.txt" onChange={onFiles} disabled={uploading}/>
      <p className="import-muted">PDF up to 4 MiB · DOCX up to 2 MiB · UTF-8 TXT up to 512 KiB. At most two files upload at once.</p>
      {uploads.length > 0 && <div className="import-upload-list" aria-label="Selected files">
        {uploads.map(row => <div className="import-upload-file" key={row.id}>
          <div><strong>{row.file.name}</strong><small>{(row.file.size / 1024).toFixed(0)} KiB · {row.status}</small>
            {row.note && <p role={row.status === "failed" ? "alert" : undefined}>{row.note}</p>}
          </div>
          {row.documentId && <button type="button" className="import-link import-link--button"
            onClick={() => setSelectedDocument(row.documentId ?? null)}>Details</button>}
        </div>)}
      </div>}
      <div className="import-actions">
        <button type="button" className="import-button" onClick={() => void upload()}
          disabled={uploading || !uploads.some(row => row.status === "selected" || row.status === "failed")}>
          {uploading ? "Uploading selected files…" : "Upload selected"}
        </button>
        {uploads.length > 0 && <button type="button" className="import-button import-button--quiet"
          disabled={uploading} onClick={() => {setUploads([]); if (filesRef.current) filesRef.current.value = "";}}>Clear selection</button>}
      </div>
    </section>

    {error && <p role="alert" className="import-alert">{error} {error.includes("Sign in") && <Link href="/login?next=/dashboard/candidates/import">Sign in</Link>}</p>}
    {notice && <p role="status" className="import-success">{notice}
      <a href="#import-history" className="import-link">View queue and outcomes</a>
    </p>}
    {!initialLoading && (reviewable.length > 0 || investigate.length > 0 || processing.length > 0 || rejected.length > 0) &&
      <section className="import-section import-continuity" aria-label="Resume import next steps" data-testid="import-next-steps">
        <div className="import-section__title"><div>
          <span className="import-kicker">YOUR WORK QUEUE</span>
          <h2>Continue where you left off.</h2>
          <p className="import-muted">Latest 50 owned imports. Status refreshes while this page is visible.</p>
        </div></div>
        <div className="import-continuity__counts">
          <p><strong>{reviewable.length}</strong> need source review</p>
          <p><strong>{processing.length}</strong> processing or scheduled</p>
          <p><strong>{investigate.length}</strong> need failure inspection</p>
          {rejected.length > 0 && <p><strong>{rejected.length}</strong> rejected by a reviewer</p>}
        </div>
        {reviewable.length > 0 && <div className="import-continuity__section">
          <h3>Needs your decision</h3>
          <ul>{reviewable.slice(0, 5).map(doc => <li key={doc.id}>
            <div><strong>{doc.fileName}</strong>
              <small>{humanStatus(doc)} · source verification required</small></div>
            <button type="button" onClick={() => setSelectedDocument(doc.id)}>Review source</button>
          </li>)}</ul>
          {reviewable.length > 5 && <p className="import-muted">{reviewable.length - 5} more reviewable records appear in Recent imports.</p>}
        </div>}
        {investigate.length > 0 && <div className="import-continuity__section">
          <h3>Investigate failures</h3>
          <ul>{investigate.slice(0, 3).map(doc => <li key={doc.id}>
            <div><strong>{doc.fileName}</strong><small>{humanStatus(doc)}</small></div>
            <button type="button" onClick={() => setSelectedDocument(doc.id)}>Inspect failure</button>
          </li>)}</ul>
        </div>}
        {processing.length > 0 && <p className="import-continuity__processing">
          <span className="import-continuity__dot" aria-hidden="true"/>
          {processing.length} import{processing.length === 1 ? "" : "s"} queued, running or awaiting retry. No artificial progress is shown; view the actual stages below.
        </p>}
        {rejected.length > 0 && <p className="import-muted">{rejected.length} profile{rejected.length === 1 ? " was" : "s were"} rejected by a reviewer. Rejection does not create an outstanding approval task.</p>}
      </section>}
    <section className="import-section" id="import-history" aria-label="Import history">
      <div className="import-section__title"><div><h2>Recent imports</h2>
        <p className="import-muted">Latest 50 owned records. Queue states refresh while this page is visible.</p></div>
        <button className="import-button import-button--quiet" type="button" disabled={initialLoading}
          onClick={() => void refresh()}><ArrowClockwise size={15} aria-hidden="true"/> Refresh</button>
      </div>
      {initialLoading && <p role="status">Loading private import history…</p>}
      {!initialLoading && <>
        <div className="import-kpis" aria-label="Job statuses">
          {(["QUEUED","RUNNING","READY","NEEDS_REVIEW"] as const).map(status => <div key={status}>
            <strong>{counts[status] ?? 0}</strong><span>{status.replaceAll("_"," ").toLowerCase()}</span></div>)}
        </div>
        <p className="import-muted">Measured from the 100 most recent owned jobs. Scheduled retries and permanent failures are shown in file rows.</p>
        {!documents.length ? <div className="import-empty">
          <FolderOpen size={27} aria-hidden="true"/>
          <p>No resumes imported yet. Choose a source file above to begin.</p>
        </div> : <div className="import-table-wrap">
          <table className="import-table" aria-label="Recent resume imports">
            <thead><tr><th scope="col">Batch</th><th scope="col">Source</th><th scope="col">Job status</th><th scope="col">Verification</th><th scope="col">Actions</th></tr></thead>
            <tbody>{documents.map(doc => <tr key={doc.id}>
              <td>{canBatch(doc) ? <input type="checkbox" aria-label={"Select " + doc.fileName + " for batch"}
                checked={checked.has(doc.id)} disabled={busyId !== null || (checked.size >= 50 && !checked.has(doc.id))}
                onChange={() => toggle(doc.id)}/> : <span className="import-muted">{doc.ingestionJob?.batchId ? "Grouped" : "—"}</span>}</td>
              <td><strong>{doc.fileName}</strong><small>{doc.kind} · {dateText(doc.createdAt)}</small>
                {doc.candidate && <Link className="import-link" href={"/dashboard/candidates?candidate=" + encodeURIComponent(doc.candidate.id)}>
                  {doc.candidate.displayName} <ArrowRight size={12} aria-hidden="true"/></Link>}
              </td>
              <td><span className="import-chip" data-status={doc.ingestionJob?.status ?? doc.status}>{humanStatus(doc)}</span>
                {doc.ingestionJob && <small>Attempt {doc.ingestionJob.attempts}/{doc.ingestionJob.maxAttempts}
                  {doc.ingestionJob.status === "RUNNING" && " · stage " + doc.ingestionJob.stage.replaceAll("_", " ").toLowerCase()}
                </small>}
                {doc.ingestionJob?.status === "QUEUED" && nowish(doc.createdAt) &&
                  <small>Processing has not started. Check the background worker.</small>}
                {!doc.ingestionJob && doc.status === "FAILED" && <small>Reupload the same file to repair storage/queue failure.</small>}
              </td>
              <td>{doc.errorCode === "HUMAN_REJECTED" ? "Human rejected" : doc.reviewState === "HUMAN_VERIFIED" ? "Human verified" : doc.reviewState === "NEEDS_REVIEW" ? "Needs review" : "Unreviewed"}</td>
              <td><div className="import-row-actions">
                <button type="button" className="import-link import-link--button" onClick={() => setSelectedDocument(doc.id)}>Details / review</button>
                {canCancel(doc) && <button type="button" className="import-link import-link--button"
                  disabled={busyId !== null} onClick={() => void act(doc.id,"cancel")}>Cancel</button>}
                {canRetry(doc) && <>
                  <button type="button" className="import-link import-link--button" disabled={busyId !== null}
                    onClick={() => void act(doc.id,"retry")}>{pendingRetry === doc.id ? "Confirm retry" : "Retry extraction"}</button>
                  {pendingRetry === doc.id && <div><small>Retry may incur model charges ({doc.ingestionJob?.manualRetries ?? 0}/2 used).</small>
                    <button type="button" className="import-link import-link--button" onClick={() => setPendingRetry(null)}>Dismiss</button>
                  </div>}
                </>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </>}
    </section>
    <section className="import-section" aria-label="Schedule import batch">
      <div className="import-section__title"><div><h2>Schedule a group</h2>
        <p className="import-muted">Select only unbatched, queued files. Each document remains an independent job.</p></div>
        <span className="import-chip">{checked.size} selected</span>
      </div>
      <div className="import-batch-form">
        <label>Optional group label
          <input type="text" maxLength={100} value={batchLabel} onChange={event => setBatchLabel(event.target.value)} placeholder="e.g. Backend hiring sprint"/>
        </label>
        <label>Run from (local time; leave empty for now)
          <input type="datetime-local" value={batchDate} onChange={event => setBatchDate(event.target.value)}/>
        </label>
        <button type="button" className="import-button" disabled={checked.size === 0 || busyId !== null || uploading}
          onClick={() => void createBatch()}>Confirm batch</button>
      </div>
      <details className="import-batches"><summary>Scheduled batches · {batches.length}</summary>
        {batches.length ? <ul>{batches.map(batch => <li key={batch.id}>
          <strong>{batch.label ?? "Untitled batch"}</strong>
          <span className="import-muted">{batch.total} documents · {dateText(batch.createdAt)}</span>
          <p>{Object.entries(batch.byStatus).map(([state,count]) => state.replaceAll("_"," ") + ": " + count).join(" · ")}</p>
          <details><summary>Document outcomes</summary><ul>{batch.documents.map(item => {
            const doc = documents.find(row => row.id === item.documentId);
            return <li key={item.documentId}>{doc?.fileName ?? "Older document"} · {item.status.replaceAll("_"," ")}
              {doc && <button type="button" className="import-link import-link--button"
                onClick={() => setSelectedDocument(doc.id)}>Details</button>}
            </li>;
          })}</ul></details>
        </li>)}</ul> : <p className="import-empty">No batches scheduled yet.</p>}
      </details>
    </section>
    {selectedDocument && <ResumeImportDetail key={selectedDocument} id={selectedDocument}
      onChanged={() => void refresh()} onClose={() => setSelectedDocument(null)}/>}
    <ImportMetricsPanel/>
  </div>;
}
