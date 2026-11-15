import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";
import { listJobs } from "@pareto/backend/ingestion/queue";

export const runtime = "nodejs";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await recruiter();
  if (!user) return Response.json({ error: "Sign in to view import jobs." }, { status: 401, headers });
  try { return Response.json({ jobs: await listJobs(user.id) }, { headers }); }
  catch {
    logger.error({ event: "ingestion_job_list_failed" }, "Import job listing unavailable");
    return Response.json({ error: "Import jobs unavailable." }, { status: 500, headers });
  }
}
