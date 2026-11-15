import { z } from "@pareto/backend/search";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";
import { jobHistory, JobConflict } from "@pareto/backend/ingestion/queue";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{id:string}> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await recruiter();
  if (!user) return Response.json({ error: "Sign in to view import status." }, { status: 401, headers });
  try {
    const id = z.uuid().parse((await params).id);
    return Response.json({ job: await jobHistory(user.id, id) }, { headers });
  } catch (error) {
    if (error instanceof JobConflict)
      return Response.json({ code: error.code, error: error.message }, { status: error.status, headers });
    if (error instanceof z.ZodError)
      return Response.json({ error: "Invalid import ID." }, { status: 422, headers });
    logger.error({ event: "ingestion_job_detail_failed" }, "Job details unavailable");
    return Response.json({ error: "Import details unavailable." }, { status: 500, headers });
  }
}
