import { z } from "zod";
import { AiFailure } from "../ai/contracts/errors";
import { skillKey } from "../search/criteria";
import { verifyResumeClaim } from "../ai/quality/resume-evidence";
import { proposeResumeFacts } from "../ai/tasks/resume-extract";
import { configuredProviders, type JsonProvider } from "../search/interpret";
import type { ParsedResume } from "./parse";

const label = z.string().trim().min(1).max(120);
const maybe = label.nullable();
const modelProfile = z.strictObject({
  displayName: maybe,
  roleTitle: maybe,
  city: maybe,
  experienceMonths: z.number().int().min(0).max(720).nullable(),
  noticePeriodDays: z.number().int().min(0).max(365).nullable(),
  industry: maybe, education: maybe, employmentType: maybe,
  skills: z.array(label).max(25).nullable(),
  pastRoles: z.array(label).max(10),
  certifications: z.array(label).max(10),
  evidence: z.array(z.strictObject({
    field: z.string().min(1).max(120),
    quote: z.string().trim().min(2).max(350),
  })).max(75),
  warnings: z.array(z.string().max(160)).max(12).default([]),
});
type ModelProfile = z.infer<typeof modelProfile>;

export type VerifiedEvidence = {
  fieldKey: string; quote: string; pageNumber: number | null;
  sourceStart: number | null; sourceEnd: number | null;
};
export type NormalizedResumeProfile = Omit<ModelProfile, "evidence" | "warnings" | "displayName"> & {
  displayName: string; // Only returned after matching a verbatim source quote.
  skillsKnown: boolean;
};
export type ResumeExtraction = {
  profile: NormalizedResumeProfile | null;
  evidence: VerifiedEvidence[];
  warnings: string[];
  provider: string | null;
  needsReview: boolean;
};



function locate(quote: string, parsed: ParsedResume): Omit<VerifiedEvidence, "fieldKey"> | null {
  const compact = (v: string) => v.replace(/\s+/gu, " ").trim();
  const query = compact(quote);
  if (query.length < 2 || query.length > 350) return null;
  let offset = 0;
  for (const page of parsed.pages) {
    // Exact offsets are trustworthy only for an unmodified substring.
    const rawIndex = page.text.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase());
    if (rawIndex >= 0) return {
      quote: page.text.slice(rawIndex, rawIndex + quote.length),
      pageNumber: page.number,
      sourceStart: offset + rawIndex, sourceEnd: offset + rawIndex + quote.length,
    };
    const text = compact(page.text);
    const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (index >= 0) return {
      quote: text.slice(index, index + query.length), pageNumber: page.number,
      sourceStart: null, sourceEnd: null,
    };
    offset += page.text.length + 1;
  }
  return null;
}
function hasTerm(needle: string, text: string) {
  const escaped = needle.normalize("NFKC").trim().toLowerCase()
    .replace(/[\^$.*+?()[\]{}|\\]/g, "\\$&");
  return new RegExp("(^|[^\\p{L}\\p{N}])" + escaped +
    "(?=$|[^\\p{L}\\p{N}])", "iu").test(text.normalize("NFKC").toLowerCase());
}
function grounded(field: string, value: string, quote: string): boolean {
  if (field === "skill") {
    const skill = skillKey(value);
    const aliases = skill === "aws" ? ["aws", "amazon web services", "amazon aws"] :
      skill === "javascript" ? ["javascript", "js"] :
      skill === "node.js" ? ["node.js", "nodejs"] :
      skill === "postgresql" ? ["postgresql", "postgres"] :
      skill === "spring boot" ? ["spring boot", "springboot"] : [skill];
    return aliases.some(alias => hasTerm(alias, quote));
  }
  if (["displayName", "roleTitle", "city", "industry", "education",
       "employmentType", "pastRole", "certification"].includes(field)) {
    return quote.toLocaleLowerCase().includes(value.toLocaleLowerCase());
  }
  // Numerics may come from dates or years; the verbatim passage is stored for review.
  return true;
}

export function validateExtractedProfile(raw: unknown, parsed: ParsedResume, provider: string): ResumeExtraction {
  const output = modelProfile.parse(raw);
  const warnings = [...parsed.warnings, ...output.warnings.slice(0, 5)];
  const evidence: VerifiedEvidence[] = [];
  const claim = (key: string, field: string, value: string | number) => {
    for (const entry of output.evidence.filter(e => e.field === key)) {
      const location = locate(entry.quote, parsed);
      const page = parsed.pages.find(page => page.number === location?.pageNumber);
      if (location && grounded(field, String(value), entry.quote)
          && verifyResumeClaim({ field, value, quote: entry.quote,
            sourceText: page?.text ?? entry.quote }) === "supported") {
        evidence.push({ ...location, fieldKey: key });
        return true;
      }
    }
    warnings.push("Unverified attribute omitted: " + key.slice(0, 95));
    return false;
  };
  const scalars = ["displayName", "roleTitle", "city", "experienceMonths",
    "noticePeriodDays", "industry", "education", "employmentType"] as const;
  const verified: Record<(typeof scalars)[number], string | number | null> = {
    displayName: null, roleTitle: null, city: null, experienceMonths: null,
    noticePeriodDays: null, industry: null, education: null, employmentType: null,
  };
  for (const key of scalars) {
    const value = output[key];
    if (value !== null && claim(key, key, value)) verified[key] = value;
  }
  const list = (items: string[], field: "skill" | "pastRole" | "certification") => {
    const results = new Map<string, string>();
    for (const value of items) {
      const canonical = field === "skill" ? skillKey(value) : value.toLocaleLowerCase();
      if (results.has(canonical)) continue;
      const originalKey = field + ":" + value;
      if (claim(originalKey, field, value)) {
        evidence[evidence.length - 1].fieldKey = field + ":" + canonical;
        results.set(canonical, value); // Preserve human-facing spelling; keys remain canonical.
      }
    }
    return [...results.values()];
  };
  const skills = output.skills === null ? null : list(output.skills, "skill");
  const pastRoles = list(output.pastRoles, "pastRole");
  const certifications = list(output.certifications, "certification");
  if (!verified.displayName || typeof verified.displayName !== "string") {
    warnings.push("Verified candidate name missing. No searchable profile was created.");
    return { profile: null, evidence, provider, warnings: [...new Set(warnings)], needsReview: true };
  }
  const profile: NormalizedResumeProfile = {
    displayName: verified.displayName,
    roleTitle: verified.roleTitle as string | null,
    city: verified.city as string | null,
    experienceMonths: verified.experienceMonths as number | null,
    noticePeriodDays: verified.noticePeriodDays as number | null,
    industry: verified.industry as string | null,
    education: verified.education as string | null,
    employmentType: verified.employmentType as string | null,
    skills, skillsKnown: skills !== null && skills.length > 0,
    pastRoles, certifications,
  };
  if (parsed.truncated) warnings.push("Text was truncated; some facts may be missing.");
  return { profile, evidence, provider, warnings: [...new Set(warnings)].slice(0, 25),
    needsReview: warnings.length > 0 || parsed.truncated };
}

export async function extractResumeProfile(
  parsed: ParsedResume,
  providers: JsonProvider[] = configuredProviders(),
  ownerId?: string,
): Promise<ResumeExtraction> {
  if (!providers.length) {
    // Worker-owned jobs must wait for configuration instead of exhausting
    // their finite processing retry budget. Legacy offline callers still get
    // the review result they expect.
    if (ownerId) throw new AiFailure("AUTH_CONFIG", false);
    return {
      profile: null, evidence: [], provider: null, needsReview: true,
      warnings: ["AI provider not configured. Extracted text is stored; retry when configured."],
    };
  }
  try {
    const result = await proposeResumeFacts(parsed.text, raw => {
      // Strict Zod schema and original-source semantic validation run inside
      // the provider gateway. Invalid output may safely fall back to Groq.
      return validateExtractedProfile(raw, parsed, "Pending");
    }, providers, ownerId);
    if (parsed.text.length > 16000) {
      result.needsReview = true;
      result.warnings.push("Only the first 16,000 characters were submitted for extraction.");
    }
    return result;
  } catch (error) {
    // These are operational capacity/configuration failures, not bad resumes.
    // The worker defers the job without consuming its processing retry budget.
    if (error instanceof AiFailure &&
        ["BUDGET_EXCEEDED", "RATE_LIMIT", "AUTH_CONFIG"].includes(error.code)) throw error;
    // Never log raw resume, prompt, provider response, credentials or model text.
    return { profile: null, evidence: [], provider: null, needsReview: true,
      warnings: ["AI extraction was unavailable or failed validation. Retry later."] };
  }
}
