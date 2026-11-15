import { z } from "@pareto/backend/search";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";
import { JobConflict, listBatches, scheduleBatch } from "@pareto/backend/ingestion/queue";

export const runtime = "nodejs";
const respond = (body: unknown, status = 200) => Response.json(body,
  { status, headers: { "Cache-Control": "private, no-store" } });
function failed(error: unknown) {
  if (error instanceof JobConflict) return respond({ code: error.code, error: error.message }, error.status);
  if (error instanceof z.ZodError) return respond({ code: "INVALID_BATCH", error: "Invalid batch request." }, 422);
  logger.error({ event: "ingestion_batch_api_failed" }, "Batch request failed");
  return respond({ code: "BATCH_UNAVAILABLE", error: "Batch scheduler is temporarily unavailable." }, 500);
}
const bodySchema = z.strictObject({
  documentIds: z.array(z.uuid()).min(1).max(50),
  runAfter: z.string().max(50).optional(),
  label: z.string().trim().max(100).optional(),
});
export async function GET() {
  const user = await recruiter();
  if (!user) return respond({ error: "Sign in to view batches." }, 401);
  try { return respond({ batches: await listBatches(user.id) }); }
  catch (error) { return failed(error); }
}
export async function POST(request: Request) {
  const user = await recruiter();
  if (!user) return respond({ error: "Sign in to schedule resume batches." }, 401);
  try {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return respond({ error: "Send JSON." }, 415);
    const body = await request.text();
    if (body.length > 6500) return respond({ error: "Batch request is too large." }, 413);
    let json: unknown;
    try { json = JSON.parse(body); }
    catch { return respond({ error: "Malformed JSON." }, 400); }
    const args = bodySchema.parse(json);
    return respond({ batch: await scheduleBatch(user.id, args.documentIds,
      args.runAfter ? new Date(args.runAfter) : new Date(), args.label) }, 201);
  } catch (error) { return failed(error); }
}
