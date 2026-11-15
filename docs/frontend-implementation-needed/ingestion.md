# Resume Ingestion — Frontend Implementation Needed

**Product:** Pareto · **PRD:** DATA-FR-01/02 · **Backend branch:** feat/private-resume-ingestion  
**Status:** Backend only. The UI is NOT implemented.  
**Suggested location:** Protected recruiter `/dashboard/candidates` → a clear **Import resumes** entry point, with a page or panel at `/dashboard/candidates/import` if needed. Do not replace the existing candidate library or search workspace.

## User goal

A recruiter uploads PDF, DOCX and TXT resumes to create **real searchable candidate records**. They can see which files were accepted, which require verification, where extracted values came from, and whether an upload was a duplicate. They must not be given fake completion percentages, invented extracted attributes or blanket “AI verified” claims.

### Visual direction

Follow the existing Pareto dashboard's ivory/navy/cobalt palette, serif headings, restrained borders, compact chips and responsive components. No flashy artificial AI animation. Suggested hierarchy:

1. **Import resumes** heading and short explanation: “Documents are private. We extract documented candidate information and flag uncertain fields for review.”
2. **Uploader**: native file-picker with drag/drop enhancement; accepted `.pdf,.docx,.txt`. Show per-type limits: PDF 4 MiB, DOCX 2 MiB, TXT 512 KiB. One file per API request; optional multi-select should **queue separate requests sequentially with visible individual statuses**, never bypass server constraints.
3. **Real progress states**: selecting → uploading → parsing → AI extraction → persisted/review/failed. Since the server processes in a single request, don't invent numeric progress without actual progress events. Use an indeterminate loading indicator.
4. **Import history** table/cards with filename, upload date, type, status, attempts, associated candidate, duplicate indicator and “Details”.
5. **Import details** drawer: structured candidate name/role/city, grounded field excerpts and source page numbers (PDF only), review reasons and verification warnings. Show missing fields as “Not documented”; no guesses. Provide a **View original** action that fetches a short-lived signed link.
6. **Needs review** state: show which fields were rejected or unverified, a clear “Retry extraction” option if supported. **Manual editing/approval is not an API capability yet**; do not build a nonfunctional Save/Approve button.
7. **Navigation to candidate** after READY or a partially valid NEEDS_REVIEW profile exists. The existing candidate detail interface should render structured facts without treating incomplete values as hard negatives.

### Illustrative layout (do NOT hardcode these statuses or counts)

```text
CANDIDATES / IMPORT RESUMES

Import candidate profiles
Private documents · AI-assisted field extraction · human verification

[ Drop or choose PDF, DOCX, TXT ]           [Choose files]
PDF ≤4 MiB · DOCX ≤2 MiB · TXT ≤512 KiB

Recent imports
┌───────────────────┬──────────────┬───────────────────┐
│ candidate-a.pdf   │ Ready        │ View candidate    │
│ candidate-b.docx  │ Needs review │ Review evidence   │
│ candidate-c.txt   │ Failed       │ Retry extraction  │
└───────────────────┴──────────────┴───────────────────┘

Evidence for candidate-b.docx
  Role: Backend Developer  | Source quote: "Backend Developer"
  Notice period: Not documented (UNKNOWN)
  [View original PDF/DOCX/TXT] [Retry extraction]
```

## API integration

All requests are authenticated, same-origin, session-cookie based, private/no-store. **Never put Supabase service/secret keys in browser code.**

| Request | Usage |
| --- | --- |
| `POST /api/v1/imports` | `FormData` with exactly one `file` (`File` object). Successful new upload returns 201 `{duplicate:false, document}`; duplicate returns 200 `{duplicate:true, document}`. A new upload can legitimately have status NEEDS_REVIEW or FAILED; read the returned status, not just HTTP status. |
| `GET /api/v1/imports` | `{imports: [...]}` up to 50 most recent owned documents. |
| `GET /api/v1/imports/:id` | Full safe metadata for the selected import and `evidence` entries, without raw extracted text. |
| `POST /api/v1/imports/:id` | JSON body `{"action":"retry"}`; only for review/failed imports and at most three attempts. Show server error status if not retryable. |
| `GET /api/v1/imports/:id/download` | `{url,expiresInSeconds:60}`. Obtain only on explicit user click; launch promptly and do not cache or store the token. |

A document metadata object includes `id`, `fileName`, `kind`, `mimeType`, `byteSize`, `sha256`, `status`, `attempts`, `provider`, `errorCode`, `textTruncated`, `reviewReasons`, `createdAt`, `updatedAt` and `candidate` (`{id,displayName,roleTitle,city}` or null). Details additionally return evidence records `{fieldKey,quote,pageNumber}`. Do not treat the SHA-256 as an auth credential or display it needlessly.

**Statuses:**
- `RECEIVED`, `STORED`, `PROCESSING`, `TEXT_EXTRACTED`: processing state; show a spinner or refresh action, not a false finished state.
- `READY`: searchable candidate saved; show **Open candidate**.
- `NEEDS_REVIEW`: some fields are unsupported, model unavailable, or text/AI incomplete. A partially extracted candidate may exist; show its actual fields and warnings.
- `FAILED`: safe error, retry if permitted; explain when the original is unreadable or must be reuploaded.
- Duplicate response: show **Already imported** and link to existing import, do not create duplicate UI rows.

## Interaction requirements

1. Authenticate before showing any private import content. 401 must route to existing login.
2. File selection should validate type/size locally for early feedback, while **always relying on server validation** as the authority.
3. For multi-select, send one file at a time and maintain independent statuses; allow cancel *before* sending but don't claim network cancellation automatically reverses an already stored import.
4. After each response, refresh the import history and candidate list. A READY candidate should appear in existing search without reopening the document.
5. Details should show verbatim evidence only (never fabricate page numbers for DOCX/TXT, which use `null`).
6. Missing skills, experience and notice remain unknown—not failed qualifications. A review warning is not a reason to automatically reject the person.
7. Retry is a real POST and may incur additional model cost. Disable duplicate clicks and show attempts remaining; handle 409/503.
8. Signed document access is short-lived, private and only available to the same recruiter. Do not embed unsigned public Storage URLs in markup.
9. If user changes workspace or signs out, clear cached import details and any signed URLs.
10. Respect keyboard access, screen-reader updates, responsive widths, reduced motion and error recovery.

## Error and empty states

| Case | Presentation |
| --- | --- |
| No uploads | “No resumes imported yet.” with an actual uploader, not fake samples. |
| 401 | Sign-in required; do not show any cached private records. |
| 404 | Import not accessible; show safe navigation back to own history. |
| 409 | Already processing / cannot retry / retry limit reached; do not lie about success. |
| 413/415/422 | Show exact server-safe type, size or format guidance. |
| 503 | Private storage or provider unavailable; explain this is configuration/service issue. |
| Scanned PDF | Text extraction unavailable, OCR required (outside current backend). |
| Unverified name | Needs review, **no candidate created**; no fake candidate card. |
| Network timeout | Show “Upload status uncertain; refresh imports before reuploading”; idempotent SHA prevents duplicate processing. |
| Duplicate hash | Show linked existing import and existing status. |

## Frontend acceptance checklist

- [ ] Authenticated page/panel accessible through Candidates navigation, matching Pareto's design.
- [ ] Uploads each real file using multipart `file`, no exposed server secrets.
- [ ] Supports PDF/DOCX/TXT limits; rejects invalid sizes client-side and displays server errors.
- [ ] Shows real status, per-file error, duplicate state, and retry without fake progress.
- [ ] Private import history and details never expose raw extracted text, Storage paths or secret keys.
- [ ] Shows original source quote and PDF page number when provided; no page guess for DOCX/TXT.
- [ ] Properly distinguishes documented attributes from unknown/unverified fields.
- [ ] Opens newly created candidate in the existing library; candidate is searchable via existing Pareto search.
- [ ] Obtains private 60-second signed URL on user action and does not cache it.
- [ ] A missing model provider yields a visible NEEDS_REVIEW state, not a fabricated successful parse.
- [ ] Errors/retries, keyboard, mobile, screen readers and regression tests pass.
- [ ] Do not add unimplemented bulk worker/approve/edit buttons disguised as working features.

**Technical reference:** [Resume ingestion backend contract](../RESUME-INGESTION.md). The user will explicitly authorize any live Supabase bucket creation/migrations; never perform them from frontend code.
