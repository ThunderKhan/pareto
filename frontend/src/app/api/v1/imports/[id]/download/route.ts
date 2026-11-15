import { z } from "@pareto/backend/search";
import { resumeDownload, IngestionError } from "@pareto/backend/ingestion/server";
import { StorageFailure } from "@pareto/backend/ingestion/storage";
import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";

export const runtime = "nodejs";
const id = z.string().uuid();
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await recruiter();
  if (!user) return Response.json({ error: "Sign in to view private resumes." }, { status: 401, headers });
  try {
    return Response.json(await resumeDownload(user.id, id.parse((await params).id)), { headers });
  } catch (error) {
    if (error instanceof IngestionError) return Response.json({ code: error.code, error: error.message },
      { status: error.status, headers });
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid resume ID." },
      { status: 422, headers });
    if (error instanceof StorageFailure) return Response.json({ code: error.code, error: error.message },
      { status: 503, headers });
    logger.error({ route: "private-resume-access" }, "Private resume access failed");
    return Response.json({ error: "Private resume unavailable." }, { status: 500, headers });
  }
}
