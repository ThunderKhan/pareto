import { aiUsageSummary } from "@pareto/backend/ai/usage/server";
import { recruiter } from "@/lib/auth";
import { accountJson } from "@/lib/account-api";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to view AI usage." }, 401);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => key !== "days") ||
    (params.has("days") && !["1","7","30","90"].includes(params.get("days") ?? "")))
    return accountJson({ error: "days must be 1, 7, 30 or 90." }, 422);
  try {
    return accountJson(await aiUsageSummary(user.id, Number(params.get("days") ?? "7") as 1|7|30|90));
  } catch {
    return accountJson({ error: "Usage metrics are temporarily unavailable." }, 503);
  }
}
