import { z } from "@pareto/backend/search";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";
import { JobConflict } from "@pareto/backend/ingestion/queue";
import { resumeReviewProfile, reviewResumeProfile } from "@pareto/backend/ingestion/review";

export const runtime = "nodejs";
const send = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
  if (error instanceof JobConflict) return send({ code: error.code, error: error.message }, error.status);
  if (error instanceof z.ZodError) return send({ code: "INVALID_REVIEW", error: "Invalid correction, profile or version." }, 422);
  logger.error({ event: "ingestion_review_api_failed" }, "Review operation unavailable.");
  return send({ code: "REVIEW_UNAVAILABLE", error: "Review is temporarily unavailable." }, 500);
}
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const user = await recruiter();
  if (!user) return send({ error: "Sign in to view candidate corrections." }, 401);
  try { return send(await resumeReviewProfile(user.id, z.uuid().parse((await params).id))); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request, { params }: Context) {
  const user = await recruiter();
  if (!user) return send({ error: "Sign in to review candidates." }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return send({ code: "JSON_REQUIRED", error: "Send JSON with a review action." }, 415);
  try {
    const text = await request.text();
    if (text.length > 8000) return send({ code: "BODY_TOO_LARGE", error: "Review request is too large." }, 413);
    let input: unknown;
    try { input = JSON.parse(text); }
    catch { return send({ code: "INVALID_JSON", error: "Malformed JSON." }, 400); }
    const id = z.uuid().parse((await params).id);
    return send(await reviewResumeProfile(user.id, id, input));
  } catch (error) { return failure(error); }
}
