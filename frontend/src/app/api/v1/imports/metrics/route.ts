import { recruiter } from "@/lib/auth";
import { logger } from "@pareto/backend";
import { ingestionMetrics } from "@pareto/backend/ingestion/metrics";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await recruiter();
  if (!user) return Response.json({ error: "Sign in to see import metrics." },
    { status: 401, headers });
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some(key => key !== "days") ||
      (query.has("days") && !["1","7","30","90"].includes(query.get("days") ?? "")))
    return Response.json({ error: "days must be 1, 7, 30 or 90." }, { status: 422, headers });
  try {
    return Response.json(await ingestionMetrics(user.id, Number(query.get("days") ?? "30")), { headers });
  } catch {
    logger.error({ event: "ingestion_metrics_api_failed" }, "Import metrics unavailable.");
    return Response.json({ error: "Import metrics are unavailable." }, { status: 500, headers });
  }
}
