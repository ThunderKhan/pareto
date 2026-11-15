import { z } from "@pareto/backend/search";
import { resumeImports, queueResumeUpload } from "@pareto/backend/ingestion/server";
import { MAX_UPLOAD_BODY_BYTES, ResumeInputError } from "@pareto/backend/ingestion/parse";
import { IngestionError } from "@pareto/backend/ingestion/server";
import { StorageFailure } from "@pareto/backend/ingestion/storage";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";

export const runtime = "nodejs";
export const maxDuration = 60;

function respond(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function failure(error: unknown) {
  if (error instanceof ResumeInputError || error instanceof IngestionError) {
    return respond({ code: error.code, error: error.message }, error.status);
  }
  if (error instanceof StorageFailure) return respond({
    code: error.code, error: error.message,
  }, 503);
  if (error instanceof z.ZodError) return respond({ code: "VALIDATION",
    error: "Invalid import request." }, 422);
  logger.error({ route: "resume-imports" }, "Resume import failed");
  return respond({ code: "IMPORT_FAILED", error: "Resume import is unavailable. Try again." }, 500);
}

async function limitedMultipart(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ResumeInputError(415, "MULTIPART_REQUIRED", "Upload one file using multipart/form-data.");
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_UPLOAD_BODY_BYTES) {
    throw new ResumeInputError(413, "FILE_SIZE", "Resume upload exceeds the supported request size.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ResumeInputError(400, "EMPTY_UPLOAD", "Choose a document to upload.");
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_UPLOAD_BODY_BYTES) {
      await reader.cancel();
      throw new ResumeInputError(413, "FILE_SIZE", "Resume upload exceeds the supported request size.");
    }
    chunks.push(value);
  }
  const bounded = Buffer.concat(chunks, received);
  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": request.headers.get("content-type")! },
      body: new Uint8Array(bounded),
    }).formData();
  } catch {
    throw new ResumeInputError(400, "INVALID_MULTIPART", "The uploaded form is malformed.");
  }
  if ([...form.keys()].some(key => key !== "file") || form.getAll("file").length !== 1) {
    throw new ResumeInputError(422, "ONE_FILE", "Upload exactly one document per request.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ResumeInputError(422, "ONE_FILE", "Choose a valid file.");
  return { name: file.name, type: file.type,
    bytes: Buffer.from(await file.arrayBuffer()) };
}

export async function GET() {
  const user = await recruiter();
  if (!user) return respond({ error: "Sign in to access resume imports." }, 401);
  try { return respond({ imports: await resumeImports(user.id) }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await recruiter();
  if (!user) return respond({ error: "Sign in to upload resumes." }, 401);
  try {
    const file = await limitedMultipart(request);
    const result = await queueResumeUpload(user.id, file.name, file.type, file.bytes);
    return respond(result, result.duplicate ? 200 : 201);
  } catch (error) { return failure(error); }
}
