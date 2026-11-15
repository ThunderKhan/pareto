import { z } from "@pareto/backend/search";
import { getAccountSettings, updateAccountSettings } from "@pareto/backend/account/server";
import { recruiter } from "@/lib/auth";
import { boundedAccountBody, accountJson, accountError } from "@/lib/account-api";

const changesSchema = z.strictObject({
  jobTitle: z.string().trim().max(120).nullable().optional(),
  notifyConfirmed: z.boolean().optional(),
  notifyRefined: z.boolean().optional(),
}).refine(value => Object.values(value).some(x => x !== undefined), "Specify at least one setting.");

export async function GET() {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage your account." }, 401);
  try { return accountJson(await getAccountSettings(user.id)); }
  catch (error) { return accountError(error); }
}

export async function PATCH(request: Request) {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage your account." }, 401);
  try {
    const changes = changesSchema.parse(await boundedAccountBody(request));
    return accountJson(await updateAccountSettings(user.id, changes));
  } catch (error) { return accountError(error); }
}
