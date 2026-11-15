/** Compatibility facade for existing API routes and regression tests. */
import { AiFailure } from "../ai/contracts/errors";
import { proposeSearchDraft } from "../ai/tasks/search-interpret";
import { proposeRefinementDraft } from "../ai/tasks/search-refine";
import type { JsonProvider } from "../ai/providers/http";
import { SearchError } from "./service";
import type { Rule } from "./criteria";
export type { JsonProvider } from "../ai/providers/http";

function asSearchError(error: unknown): never {
  if (error instanceof AiFailure) {
    if (error.code === "BAD_INPUT") throw new SearchError(422, "This request contains an unsupported condition or is invalid. Edit the requirements and try again.");
    if (error.code === "AUTH_CONFIG" || error.code === "BUDGET_EXCEEDED")
      throw new SearchError(503, "AI interpretation is unavailable. Enter criteria manually or select a reference profile.");
    throw new SearchError(503, "AI could not produce a verified draft. Try rephrasing or enter criteria manually.");
  }
  // Do not echo raw provider errors, payloads or credentials.
  throw new SearchError(503, "AI interpretation could not be completed. Enter criteria manually or try again.");
}

export async function interpret(prompt: string, providers?: JsonProvider[]) {
  try { return await proposeSearchDraft(prompt, providers); }
  catch (error) { return asSearchError(error); }
}

export async function interpretRefinement(prompt: string, criteria: Rule[], providers?: JsonProvider[]) {
  try { return await proposeRefinementDraft(prompt, criteria, providers); }
  catch (error) { return asSearchError(error); }
}
