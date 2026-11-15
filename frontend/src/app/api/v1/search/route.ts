import { z } from "@pareto/backend/search";
import { criteriaSchema, promptSchema } from "@pareto/backend/search";
import { logger } from "@pareto/backend";
import {
  SearchError, activeSearch, candidateFor, candidateList, confirmSearch, recentSearches, referenceDraft, searchResults, counterfactualFor,
} from "@pareto/backend/search/server";
import { interpret, interpretRefinement } from "@pareto/backend/search/interpret";
import { recruiter } from "@/lib/auth";

const id = z.string().min(1).max(120);
const revision = z.number().int().positive();
const input = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("interpret"), prompt: promptSchema }),
  z.strictObject({ action: z.literal("reference"), candidateId: id }),
  z.strictObject({ action: z.literal("refine"), sessionId: id, expectedVersion: revision, prompt: promptSchema }),
  z.strictObject({ action: z.literal("confirm"), criteria: criteriaSchema, requestId: z.uuid(),
    referenceId: id.optional(), sessionId: id.optional(), expectedVersion: revision.optional() }),
]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authorized(operation: (ownerId: string) => Promise<unknown>) {
  const requestId = crypto.randomUUID();
  try {
    const user = await recruiter();
    if (!user) return json({ error: "Sign in to access your candidate workspace.", requestId }, 401);
    return json(await operation(user.id));
  } catch (error) {
    if (error instanceof SearchError) return json({ error: error.message, requestId }, error.status);
    if (error instanceof z.ZodError) {
      return json({ error: error.issues.map(issue => issue.message).join(" "), requestId }, 422);
    }
    logger.error({ requestId, route: "candidate-search" }, "Candidate search request failed");
    return json({ error: "The workspace could not complete this request. Try again.", requestId }, 500);
  }
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return authorized(ownerId => {
    if (params.has("counterfactual")) return counterfactualFor(ownerId,
      id.parse(params.get("counterfactual")),
      z.coerce.number().int().positive().parse(params.get("version")),
      id.parse(params.get("candidate")));
    if (params.has("history")) return recentSearches(ownerId);
    if (params.has("session")) return searchResults(ownerId, id.parse(params.get("session")),
      z.coerce.number().int().min(0).max(1000).parse(params.get("offset") ?? 0));
    if (params.has("candidate")) return candidateFor(ownerId, id.parse(params.get("candidate")));
    return candidateList(ownerId, z.string().trim().max(100).parse(params.get("q") ?? ""));
  });
}

export function POST(request: Request) {
  return authorized(async ownerId => {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new SearchError(415, "Send a JSON request.");
    // Read a bounded body even when Content-Length is missing.
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let body = "";
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 32000) {
          await reader.cancel();
          throw new SearchError(413, "The request is too large.");
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    }
    let raw: unknown;
    try { raw = JSON.parse(body); }
    catch { throw new SearchError(400, "Send a valid JSON request."); }
    const data = input.parse(raw);
    switch (data.action) {
      case "interpret": return interpret(data.prompt);
      case "reference": return referenceDraft(ownerId, data.candidateId);
      case "confirm":
        if (Boolean(data.sessionId) !== Boolean(data.expectedVersion) || (data.sessionId && data.referenceId)) {
          throw new SearchError(422, "Revision confirmation requires a session ID and its expected version.");
        }
        return confirmSearch(ownerId, data);
      case "refine": {
        const state = await activeSearch(ownerId, data.sessionId);
        if (state.version !== data.expectedVersion) throw new SearchError(409, "This search changed. Reload the latest revision.");
        return interpretRefinement(data.prompt, state.criteria);
      }
    }
  });
}
