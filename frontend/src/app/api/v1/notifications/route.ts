import { z } from "@pareto/backend/search";
import { getRecruiterNotifications, markNotificationsRead } from "@pareto/backend/account/server";
import { recruiter } from "@/lib/auth";
import { accountJson, boundedAccountBody, accountError } from "@/lib/account-api";

const readSchema = z.strictObject({ ids: z.array(z.string().min(1).max(120)).min(1).max(30) });

export async function GET() {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to see notifications." }, 401);
  try { return accountJson(await getRecruiterNotifications(user.id)); }
  catch (error) { return accountError(error); }
}

export async function PATCH(request: Request) {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage notifications." }, 401);
  try {
    const { ids } = readSchema.parse(await boundedAccountBody(request));
    await markNotificationsRead(user.id, ids);
    return accountJson(await getRecruiterNotifications(user.id));
  } catch (error) { return accountError(error); }
}
