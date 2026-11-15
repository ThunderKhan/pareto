import { z } from "@pareto/backend/search";

export class ApiProblem extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function accountJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function boundedAccountBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new ApiProblem(415, "Send a JSON request.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiProblem(400, "Provide a request body.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4096) {
      await reader.cancel();
      throw new ApiProblem(413, "The request is too large.");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  try { return JSON.parse(body) as unknown; }
  catch { throw new ApiProblem(400, "Send valid JSON."); }
}

export function accountError(error: unknown) {
  if (error instanceof ApiProblem) return accountJson({ error: error.message }, error.status);
  if (error instanceof z.ZodError) {
    return accountJson({ error: error.issues.map(issue => issue.message).join(" ") }, 422);
  }
  // Newly introduced settings / notification models require the 2026-11-15 migration.
  // Prisma P2021/P2022 mean a table/column is missing, not that sign-in failed.
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "P2021" || code === "P2022") {
    console.error("Pareto account schema is outdated. Apply the pending Prisma migrations.");
    return accountJson({
      code: "SCHEMA_NOT_READY",
      error: "Account settings need a database upgrade. Apply the pending Pareto migrations.",
    }, 503);
  }
  // Internal/database errors must never reveal credentials or SQL to a client.
  console.error("Recruiter account request failed");
  return accountJson({ error: "The account service is unavailable. Try again later." }, 500);
}
