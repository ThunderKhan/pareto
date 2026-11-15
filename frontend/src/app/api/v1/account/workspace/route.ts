import { z } from "@pareto/backend/search";
import { createOrganization, getAccountSettings, renameOrganization } from "@pareto/backend/account/server";
import { recruiter } from "@/lib/auth";
import { ApiProblem, boundedAccountBody, accountJson, accountError } from "@/lib/account-api";

const createSchema = z.strictObject({ name: z.string().trim().min(2).max(120) });
const renameSchema = z.strictObject({
  organizationId: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(120),
});

export async function POST(request: Request) {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to create a workspace." }, 401);
  try {
    const { name } = createSchema.parse(await boundedAccountBody(request));
    const current = await getAccountSettings(user.id);
    if (current.workspaces.some(workspace => workspace.role === "OWNER")) {
      return accountJson({ error: "Your company workspace already exists." }, 409);
    }
    try {
      await createOrganization(user.id, name);
    } catch (error) {
      // Owner uniqueness remains enforced by PostgreSQL even during races.
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return accountJson({ error: "Your company workspace already exists." }, 409);
      }
      throw error;
    }
    return accountJson(await getAccountSettings(user.id), 201);
  } catch (error) { return accountError(error); }
}

export async function PATCH(request: Request) {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage your workspace." }, 401);
  try {
    const { organizationId, name } = renameSchema.parse(await boundedAccountBody(request));
    const changed = await renameOrganization(user.id, organizationId, name);
    if (!changed) throw new ApiProblem(403, "You are not permitted to change this workspace.");
    return accountJson(await getAccountSettings(user.id));
  } catch (error) { return accountError(error); }
}
