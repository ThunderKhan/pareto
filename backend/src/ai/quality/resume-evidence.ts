import { checkExperienceEvidence, checkSkillEvidence } from "./evidence";

type Claim = { field: string; value: string | number; quote: string; sourceText: string };
type Verdict = "supported" | "unknown" | "contradicted";

/** Only include a small source neighborhood around the quoted span. */
function localContext(quote: string, source: string): string {
  const compact = (v: string) => v.replace(/\s+/g, " ").trim();
  const text = compact(source), needle = compact(quote);
  const i = text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (i < 0) return quote;
  return text.slice(Math.max(0, i - 48), Math.min(text.length, i + needle.length + 32));
}

function noticeDaysInContext(value: number, text: string): boolean {
  if (!Number.isInteger(value) || value < 0 || value > 365) return false;
  if (value === 0 && /\b(?:join|joining|available)\s+(?:to\s+join\s+)?immediately\b/i.test(text))
    return true;
  // Associate the numeric duration with an actual *notice/joining* phrase,
  // not with an unrelated course or project elsewhere on the resume.
  const regex = /\b(?:notice(?:\s+period)?|can\s+join|available\s+to\s+join|available\s+in|joining\s+time)\s*(?::|=|\s+(?:in|within|after|of|is))?\s*(\d{1,3})\s*(days?|weeks?)\b/gi;
  return [...text.matchAll(regex)].some(m =>
    Number(m[1]) * (/week/i.test(m[2]) ? 7 : 1) === value);
}

/**
 * Only supporting evidence for the specific field counts. Ambiguous numeric
 * inference is review-only even when the quote itself is present.
 */
export function verifyResumeClaim(claim: Claim): Verdict {
  const context = localContext(claim.quote, claim.sourceText);
  if (claim.field === "skill") return checkSkillEvidence(String(claim.value), context);
  if (claim.field === "noticePeriodDays")
    return noticeDaysInContext(Number(claim.value), context) ? "supported" : "unknown";
  if (claim.field === "experienceMonths")
    return checkExperienceEvidence(Number(claim.value), context);
  // Resume text may mention a desired job/location or an unearned credential.
  // A matching substring in those contexts is not an established candidate fact.
  if (claim.field === "city" && /\b(?:preferred|desired|target|prospective|relocat(?:e|ion)|willing to move|seeking (?:work|jobs?|roles?) in)\b/i.test(context))
    return "unknown";
  if (claim.field === "roleTitle" && /\b(?:seeking|aspiring|desired|target|interested in (?:a|an)|looking for (?:a|an)|job advert|we are hiring|ideal candidate)\b/i.test(context))
    return "unknown";
  if ((claim.field === "education" || claim.field === "certification") &&
      /\b(?:planning to|plan to|preparing for|studying for|working toward|in progress|expected to|aspiring to|not yet|pursuing)\b/i.test(context))
    return "unknown";
  if (claim.field === "displayName" &&
      /\b(?:references?|referee|supervisor|manager contact|reported to|recommended by)\s*:/i.test(context))
    return "unknown";
  return "supported";
}
