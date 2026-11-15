/** Pure, deterministic source-evidence helpers. No model output is trusted by itself. */
import { skillKey } from "../../search/criteria";

export type SourcePage = { number: number | null; text: string };
export type LocatedEvidence = {
  quote: string; pageNumber: number | null;
  sourceStart: number | null; sourceEnd: number | null; exact: boolean;
};

export function locateEvidence(quote: string, pages: readonly SourcePage[]): LocatedEvidence | null {
  if (quote.length < 2 || quote.length > 350) return null;
  let offset = 0;
  for (const page of pages) {
    const exact = page.text.indexOf(quote);
    if (exact >= 0) return {
      quote, pageNumber: page.number, sourceStart: offset + exact,
      sourceEnd: offset + exact + quote.length, exact: true,
    };
    const normalized = (x: string) => x.replace(/\s+/gu, " ").trim();
    const norm = normalized(page.text), needle = normalized(quote);
    const index = norm.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
    if (index >= 0) return {
      quote: norm.slice(index, index + needle.length), pageNumber: page.number,
      sourceStart: null, sourceEnd: null, exact: false,
    };
    offset += page.text.length + 1; // Separate pages with exactly one newline.
  }
  return null;
}

function hasWord(term: string, source: string) {
  const escaped = term.normalize("NFKC").toLowerCase().replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + escaped + "(?=$|[^\\p{L}\\p{N}])", "iu")
    .test(source.normalize("NFKC").toLowerCase());
}

/**
 * A present skill word isn't enough: explicit denial/aspiration must not
 * become a searchable positive fact. "unknown" requires human review.
 */
export function checkSkillEvidence(skill: string, quote: string): "supported" | "contradicted" | "unknown" {
  const aliases: Record<string, string[]> = {
    aws: ["aws", "amazon web services", "amazon aws"],
    javascript: ["javascript", "js"],
    "spring boot": ["spring boot", "springboot"],
    "node.js": ["node.js", "nodejs"],
    postgresql: ["postgresql", "postgres"],
  };
  const terms = aliases[skillKey(skill)] ?? [skillKey(skill)];
  if (!terms.some(term => hasWord(term, quote))) return "unknown";
  const negative = terms.some(term => {
    const escaped = term.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    return new RegExp("\\b(?:no|zero|without|lack(?:s|ing)?|never had)\\s+(?:(?:professional|practical|hands-on)\\s+)?(?:(?:experience|knowledge|skills?|exposure|proficiency)\\s+(?:in|of|with|using)\\s+)?" + escaped + "(?![\\p{L}\\p{N}])", "iu").test(quote)
      || new RegExp("\\b(?:do not know|don't know|not proficient in)\\s+" + escaped + "(?![\\p{L}\\p{N}])", "iu").test(quote);
  });
  if (negative) return "contradicted";
  if (/\b(?:want to learn|learning|plan to learn|interested in learning|aspiring to learn|will learn)\b/i.test(quote))
    return "unknown";
  if (/\b(?:job requirements?|we are hiring|must have|required skills|ideal candidate)\s*:/i.test(quote))
    return "unknown";
  return "supported";
}

/** A model cannot certify numeric meaning from the existence of an arbitrary quote. */
export function checkNoticeEvidence(days: number, quote: string): "supported" | "unknown" {
  if (!Number.isInteger(days) || days < 0 || days > 365) return "unknown";
  if (days === 0 && /\b(?:available|join|joining)\s+(?:to\s+join\s+)?immediately\b/i.test(quote))
    return "supported";
  if (!/\b(?:notice\s+period|available\s+to\s+join|can\s+join|joining\s+time|available\s+in)\b/i.test(quote))
    return "unknown";
  const numbers = [...quote.matchAll(/(\d{1,3})\s*(days?|weeks?)(?!\w)/gi)];
  return numbers.some((m) => Number(m[1]) * (/week/i.test(m[2]) ? 7 : 1) === days)
    ? "supported" : "unknown";
}

export function checkExperienceEvidence(months: number, quote: string): "supported" | "unknown" {
  if (!Number.isInteger(months) || months < 0 || months > 720) return "unknown";
  const v = quote.match(/\b(\d{1,2})(?:\.(\d))?\s*(years?|months?)\s+(?:of\s+)?(?:professional\s+|relevant\s+|total\s+)?experience\b/i)
    ?? quote.match(/\b(?:professional\s+|total\s+)?experience\s*(?:of|:)?\s*(\d{1,2})(?:\.(\d))?\s*(years?|months?)\b/i);
  if (!v) return "unknown";
  const n = Number(v[1] + (v[2] ? "." + v[2] : ""));
  const expected = /year/i.test(v[3]) ? n * 12 : n;
  return Number.isInteger(expected) && expected === months ? "supported" : "unknown";
}
