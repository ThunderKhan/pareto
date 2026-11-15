import { AiFailure } from "../contracts/errors";
const protectedFilter = /\b(?:male\s+only|female\s+only|men\s+only|women\s+only|only\s+(?:men|women|males|females)|(?:under|over|younger\s+than|older\s+than)\s+\d{1,2}\s+years?\s+old|(?:age|gender|sex|religion|caste|race|ethnicity|disability|pregnancy|marital status)\s*(?:is|must|should|=|:))\b/i;
/** Defense in depth only: the server must independently enforce authorization and schema. */
export function validateSearchRequest(text: string) {
  if (typeof text !== "string" || text.trim().length < 3 || text.length > 2000)
    throw new AiFailure("BAD_INPUT", false);
  // Explicit protected-trait filtering is unsupported. A heuristic is never an injection-proof boundary.
  if (protectedFilter.test(text)) throw new AiFailure("BAD_INPUT", false);
  return text.trim();
}
export function isolatedUserData(value: unknown) {
  // The model never receives a tool declaration, private credentials, database access or URLs to fetch.
  return JSON.stringify({ untrustedRecruiterData: value });
}
