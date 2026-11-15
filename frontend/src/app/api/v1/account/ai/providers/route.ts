import { z } from "@pareto/backend/search";
import { getAiConnections, removeAiCredential, selectAiMode, storeAiCredential,
  verifySavedAiCredential } from "@pareto/backend/ai/byok/server";
import { recruiter } from "@/lib/auth";
import { accountError, accountJson, boundedAccountBody } from "@/lib/account-api";
import { rejectCrossOriginMutation } from "@/lib/request-origin";

export const runtime = "nodejs";
const provider = z.enum(["Gemini","Groq"]);
const putSchema = z.strictObject({ provider, key: z.string().min(12).max(256) });
const providerSchema = z.strictObject({ provider });
const modeSchema = z.strictObject({ mode: z.enum(["PLATFORM","BYOK"]) });
function fail(error: unknown) {
  // Do not serialize thrown errors, submitted keys, provider bodies or SQL.
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "BAD_INPUT")
      return accountJson({ code: "INVALID_CREDENTIAL", error: "Unsupported key format." }, 422);
    if (error.code === "AUTH_CONFIG")
      return accountJson({ code: "PROVIDER_AUTH", error: "Provider credentials or secure key configuration are unavailable." }, 503);
    if (error.code === "RATE_LIMIT")
      return accountJson({ code: "PROVIDER_RATE_LIMIT", error: "The provider is currently rate limiting credential checks." }, 429);
    if (error.code === "NETWORK" || error.code === "PROVIDER_5XX")
      return accountJson({ code: "PROVIDER_UNAVAILABLE", error: "Cannot verify the provider at this time." }, 503);
  }
  return accountError(error);
}
export async function GET() {
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage AI connections." }, 401);
  try { return accountJson(await getAiConnections(user.id)); }
  catch (error) { return fail(error); }
}
export async function PUT(request: Request) {
  const denied = rejectCrossOriginMutation(request);
  if (denied) return denied;
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage AI connections." }, 401);
  try {
    const { provider, key } = putSchema.parse(await boundedAccountBody(request));
    return accountJson(await storeAiCredential(user.id, provider, key));
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  const denied = rejectCrossOriginMutation(request);
  if (denied) return denied;
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to check AI connections." }, 401);
  try {
    const { provider } = providerSchema.parse(await boundedAccountBody(request));
    return accountJson(await verifySavedAiCredential(user.id, provider));
  } catch (error) { return fail(error); }
}
export async function PATCH(request: Request) {
  const denied = rejectCrossOriginMutation(request);
  if (denied) return denied;
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to manage AI connections." }, 401);
  try {
    const { mode } = modeSchema.parse(await boundedAccountBody(request));
    return accountJson(await selectAiMode(user.id, mode));
  } catch (error) { return fail(error); }
}
export async function DELETE(request: Request) {
  const denied = rejectCrossOriginMutation(request);
  if (denied) return denied;
  const user = await recruiter();
  if (!user) return accountJson({ error: "Sign in to remove AI connections." }, 401);
  try {
    const { provider } = providerSchema.parse(await boundedAccountBody(request));
    return accountJson(await removeAiCredential(user.id, provider));
  } catch (error) { return fail(error); }
}
