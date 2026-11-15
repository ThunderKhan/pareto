/**
 * Sanitized, same-origin resume-import API contract.
 * Browser models intentionally exclude storage keys, raw resume text and provider tokens.
 */
export type ResumeCandidate = { id: string; displayName: string; roleTitle: string | null; city: string | null };
export type JobStatus = "QUEUED" | "RUNNING" | "RETRY_SCHEDULED" | "READY" | "NEEDS_REVIEW" | "FAILED_PERMANENT" | "CANCELLED";
export type ImportJob = {
  id: string; documentId?: string; status: JobStatus; stage: string; attempts: number;
  maxAttempts: number; manualRetries: number; runAfter: string | null; batchId: string | null;
  cancelRequested: boolean; lastErrorCode: string | null;
  startedAt: string | null; finishedAt: string | null; createdAt?: string; updatedAt?: string;
};
export type ResumeDocument = {
  id: string; fileName: string; kind: string; mimeType: string; byteSize: number;
  status: string; attempts: number; provider: string | null; errorCode: string | null;
  textTruncated: boolean; reviewReasons: string[]; createdAt: string; updatedAt: string;
  candidate: ResumeCandidate | null; ingestionJob: ImportJob | null;
  reviewState: string; reviewVersion: number; reviewedAt: string | null;
};
export type Evidence = { fieldKey: string; quote: string; pageNumber: number | null };
export type ImportDetail = ResumeDocument & { evidence: Evidence[] };
export type Attempt = {
  attempt: number; outcome: string | null; errorCode: string | null;
  startedAt: string | null; finishedAt: string | null; durationMs: number | null;
  parseMs: number | null; modelMs: number | null; persistMs: number | null;
  sourceChars: number | null; evidenceCount: number | null; verifiedFields: number | null;
  provider: string | null; extractorVersion: string | null;
};
export type JobDetail = ImportJob & { history: Attempt[] };
export type Batch = {
  id: string; label: string | null; runAfter?: string; createdAt: string; total: number;
  byStatus: Record<string, number>; documents: Array<{ documentId: string; status: string }>;
};
export type ReviewedProfile = {
  displayName: string; roleTitle: string | null; city: string | null;
  experienceMonths: number | null; noticePeriodDays: number | null;
  industry: string | null; education: string | null; employmentType: string | null;
  skills: string[] | null; pastRoles: string[]; certifications: string[];
};
export type ReviewState = {
  documentId: string; documentStatus: string; reviewState: string; reviewVersion: number;
  reviewedAt: string | null; candidateId: string | null; profile: ReviewedProfile | null;
};
export type AuditEvent = {
  id: string; action: string; reviewVersion: number; changedFields: string[];
  before: Record<string, unknown> | null; after: Record<string, unknown> | null;
  reason: string | null; provider: string | null; extractorVersion: string | null;
  attempt: number | null; createdAt: string;
};
export type ImportMetrics = {
  windowDays: number; from: string; measuredAt: string;
  documents: Record<string, number>; jobs: Record<string, number>; reviewStates: Record<string, number>;
  attempts: { total: number; completed: number; retries: number; recovered: number;
    modelAttributed: number; averageDurationMs: number | null; p95DurationMs: number | null;
    averageParseMs: number | null; averageModelMs: number | null;
    averagePersistenceMs: number | null; averageSourceChars: number | null;
    averageEvidenceCount: number | null; averageVerifiedFields: number | null };
  qualityActivity: { modelExtractions: number; reviewRequiredEvents: number;
    correctionEvents: number; approvals: number; rejections: number; changedFields: number };
  caveats: string[];
};

export class ImportAPIError extends Error {
  constructor(readonly status: number, readonly code: string | null, message: string) { super(message); }
}
export async function requestJSON<T>(path: string, body?: object | FormData, signal?: AbortSignal): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch("/api/v1/imports" + path, body ? {
    method: "POST", headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body), cache: "no-store", signal,
  } : { cache: "no-store", signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const value = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const message = typeof value.error === "string" ? value.error : "This import request could not be completed.";
    throw new ImportAPIError(response.status, typeof value.code === "string" ? value.code : null, message);
  }
  return payload as T;
}
export function errorText(error: unknown) {
  if (error instanceof ImportAPIError) {
    if (error.status === 401) return "Your session expired. Sign in again to access private imports.";
    if (error.status === 404) return "This import is unavailable in your account. Refresh your import history.";
    if (error.status === 409) return "The job or review changed. Refresh the latest state before trying again.";
    if (error.status === 413) return "This file or request exceeds the allowed size.";
    if (error.status === 415) return "Unsupported format. Upload PDF, DOCX or UTF-8 TXT.";
    if (error.status === 503) return "Storage or AI processing is unavailable. Your existing imports are unchanged.";
    return error.message;
  }
  return "Network request failed. Refresh your imports before trying again.";
}
export function humanStatus(document: ResumeDocument) {
  const job = document.ingestionJob;
  if (!job) return document.status === "FAILED" ? "Upload failed · " + (document.errorCode ?? "storage or queue unavailable")
    : "Not queued · " + document.status.toLowerCase().replaceAll("_", " ");
  if (job.cancelRequested && job.status === "RUNNING") return "Cancellation requested";
  switch (job.status) {
    case "QUEUED": return "Queued · waiting for worker";
    case "RUNNING": return ({
      PARSING: "Reading document", EXTRACTING: "Extracting attributes", PERSISTING: "Saving evidence",
    } as Record<string,string>)[job.stage] ?? "Processing · " + job.stage.toLowerCase();
    case "RETRY_SCHEDULED": return "Retry scheduled" + (job.runAfter ? " · " + dateText(job.runAfter) : "");
    case "READY": return "Ready";
    case "NEEDS_REVIEW": return "Needs review";
    case "FAILED_PERMANENT": return "Failed permanently";
    case "CANCELLED": return "Cancelled";
  }
}
export function dateText(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Not recorded" : d.toLocaleString();
}
export function metricText(value: number | null | undefined, suffix = "") {
  return value == null ? "Not recorded" : value.toLocaleString() + suffix;
}
export function fileValidation(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const limits: Record<string,number> = { pdf: 4 * 1024 * 1024, docx: 2 * 1024 * 1024, txt: 512 * 1024 };
  if (!ext || !(ext in limits)) return "Only PDF, DOCX or UTF-8 TXT files are supported.";
  if (!file.size) return "Choose a non-empty file.";
  if (file.size > limits[ext]) return ext.toUpperCase() + " must be at most " + (limits[ext] / 1024) + " KiB.";
  return null;
}
