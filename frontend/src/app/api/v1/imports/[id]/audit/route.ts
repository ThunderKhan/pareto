import { z } from "@pareto/backend/search";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";
import { JobConflict } from "@pareto/backend/ingestion/queue";
import { resumeAuditHistory } from "@pareto/backend/ingestion/review";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await recruiter();
  if (!user) return Response.json({ error: "Sign in to view extraction audit." },
    { status: 401, headers });
  try {
    const id = z.uuid().parse((await params).id);
    return Response.json(await resumeAuditHistory(user.id, id), { headers });
  } catch (error) {
    if (error instanceof JobConflict)
      return Response.json({ code: error.code, error: error.message }, { status: error.status, headers });
    if (error instanceof z.ZodError)
      return Response.json({ code: "INVALID_ID", error: "Invalid document ID." }, { status: 422, headers });
    logger.error({ event: "ingestion_audit_api_failed" }, "Extraction audit unavailable.");
    return Response.json({ error: "Audit is unavailable." }, { status: 500, headers });
  }
}
