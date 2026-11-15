import { z } from "@pareto/backend/search";
import { resumeImport, IngestionError } from "@pareto/backend/ingestion/server";
import { retryQueuedDocument, cancelQueuedDocument, JobConflict } from "@pareto/backend/ingestion/queue";
import { StorageFailure } from "@pareto/backend/ingestion/storage";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";

export const runtime = "nodejs";
export const maxDuration = 60;
const id = z.string().uuid();
const json = (value: unknown, status = 200) => Response.json(value,
  { status, headers: { "Cache-Control": "private, no-store" } });

function errorResponse(error: unknown) {
  if (error instanceof JobConflict) return json({ code: error.code, error: error.message }, error.status);
  if (error instanceof IngestionError) return json({ code: error.code, error: error.message }, error.status);
  if (error instanceof StorageFailure) return json({ code: error.code, error: error.message }, 503);
  if (error instanceof z.ZodError) return json({ error: "Invalid resume import ID." }, 422);
  logger.error({ route: "resume-import-detail" }, "Resume status operation failed");
  return json({ error: "Resume import is temporarily unavailable." }, 500);
}
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await recruiter();
  if (!user) return json({ error: "Sign in to view resume imports." }, 401);
  try { return json(await resumeImport(user.id, id.parse((await params).id))); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await recruiter();
  if (!user) return json({ error: "Sign in to retry resume imports." }, 401);
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return json({ error: "Send JSON with action retry." }, 415);
    }
    const body = await request.text();
    if (body.length > 1000) return json({ error: "Request exceeds allowed size." }, 413);
    let decoded: unknown;
    try { decoded = JSON.parse(body); }
    catch { return json({ error: "Send valid JSON with action retry." }, 400); }
    const payload = z.strictObject({ action: z.enum(["retry", "cancel"]) }).parse(decoded);
    const documentId = id.parse((await params).id);
    return json(payload.action === "retry"
      ? await retryQueuedDocument(user.id, documentId)
      : await cancelQueuedDocument(user.id, documentId));
  } catch (error) { return errorResponse(error); }
}
