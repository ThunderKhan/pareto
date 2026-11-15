import { database } from "./db";
import { aiProcessLimiter } from "../ai/providers/budgets";
import { resolveGeminiEmbeddingCredential } from "../ai/providers/byok";
import { recordAiAttempt } from "../ai/observability/durable";
import { durableQuotaEnabled, reserveDurableAiAttempt } from "../ai/providers/durable-quota";
import { BoundedAsyncCache, privateCacheKey } from "./bounded-cache";
import { recordSearchTiming } from "./performance";
import { candidateDocument, documentHash, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, hybridRank, queryDocument } from "./retrieval";
import type { CandidateProfile } from "./evaluate";
import type { Rule } from "./criteria";

type EmbeddingTask = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";
export type Embedder = (text: string, task: EmbeddingTask) => Promise<number[]>;
const MODEL_KEY = EMBEDDING_MODEL + ":" + EMBEDDING_DIMENSIONS;
const queryEmbeddings = new BoundedAsyncCache<number[]>(128, 5 * 60_000);

/** Direct Gemini REST adapter, no extra SDK or third-party vector service.
 * The configured Gemini key is used only server-side. */
export const geminiEmbed = async (text: string, task: EmbeddingTask, keyOverride?: string): Promise<number[]> => {
  if (process.env.AI_ENABLED === "false") throw new Error("AI inference is disabled.");
  const key = keyOverride ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("Gemini embedding key is not configured.");
  if (!text.trim() || text.length > 6000) throw new Error("Embedding input is empty or oversized.");
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + EMBEDDING_MODEL + ":embedContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        model: "models/" + EMBEDDING_MODEL,
        content: { parts: [{ text }] },
        taskType: task,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    },
  );
  if (!response.ok) throw new Error("Embedding provider unavailable (HTTP " + response.status + ").");
  const raw: unknown = await response.json();
  const values = (raw as { embedding?: { values?: unknown } } | null)?.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS ||
      !values.every(value => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("Embedding provider returned an invalid vector.");
  }
  const floats: number[] = values;
  const norm = Math.hypot(...floats);
  if (!Number.isFinite(norm) || norm <= 0) throw new Error("Embedding vector norm was invalid.");
  return floats.map(value => value / norm);
};

/**
 * Model query vectors are reused only for an identical tenant + model + query.
 * No resume text, query text or owner identifier is stored in the cache key.
 * Only successful, bounded responses are cached; concurrent misses coalesce.
 */
async function embeddingForOwner(
  ownerId: string, text: string, task: EmbeddingTask, embed: Embedder,
): Promise<number[]> {
  const call = async () => {
    if (embed !== geminiEmbed) return embed(text, task);
    const release = aiProcessLimiter.acquire(ownerId);
    const started = Date.now();
    try {
      // Check the selected billing source before consuming a quota attempt.
      // A Groq-only BYOK account must not burn Gemini usage on an unavailable key.
      const credential = await resolveGeminiEmbeddingCredential(ownerId);
      if (durableQuotaEnabled()) await reserveDurableAiAttempt(ownerId);
      try {
        const vector = await geminiEmbed(text, task, credential.key);
        await recordAiAttempt({ userId: ownerId,
          taskId: task === "RETRIEVAL_QUERY" ? "embedding.query.v1" : "embedding.document.v1",
          provider: "Gemini", modelId: EMBEDDING_MODEL,
          credentialSource: credential.source, outcome: "ok", latencyMs: Date.now() - started });
        return vector;
      } catch (error) {
        await recordAiAttempt({ userId: ownerId,
          taskId: task === "RETRIEVAL_QUERY" ? "embedding.query.v1" : "embedding.document.v1",
          provider: "Gemini", modelId: EMBEDDING_MODEL,
          credentialSource: credential.source, outcome: "NETWORK", latencyMs: Date.now() - started });
        throw error;
      }
    } finally {
      recordSearchTiming("embedding.provider", Date.now() - started);
      release();
    }
  };
  if (task === "RETRIEVAL_QUERY" && embed === geminiEmbed) {
    const key = privateCacheKey([ownerId, MODEL_KEY, task, text]);
    return queryEmbeddings.getOrLoad(key, call);
  }
  return call();
}

function vectorLiteral(vector: number[]) {
  if (vector.length !== EMBEDDING_DIMENSIONS ||
    !vector.every(value => Number.isFinite(value))) throw new Error("Invalid embedding dimensions.");
  return "[" + vector.join(",") + "]";
}
const skills = { include: { skill: true }, orderBy: { skillId: "asc" } } as const;

function candidateProfile(row: {
  id: string; displayName: string; roleTitle: string | null; city: string | null;
  experienceMonths: number | null; noticePeriodDays: number | null; industry: string | null;
  education: string | null; employmentType: string | null; pastRoles: string[]; certifications: string[];
  skillsKnown: boolean; skills: { skill: { displayName: string } }[];
}): CandidateProfile {
  return { id: row.id, displayName: row.displayName, roleTitle: row.roleTitle, city: row.city,
    experienceMonths: row.experienceMonths, noticePeriodDays: row.noticePeriodDays,
    industry: row.industry, education: row.education, employmentType: row.employmentType,
    pastRoles: row.pastRoles, certifications: row.certifications,
    skills: row.skillsKnown ? row.skills.map(link => link.skill.displayName) : null };
}

export async function indexCandidate(ownerId: string, candidateId: string, embed: Embedder = geminiEmbed) {
  const db = database();
  const row = await db.candidate.findFirst({
    where: { id: candidateId, ownerId }, include: { skills },
  });
  if (!row) return "absent" as const;
  const document = candidateDocument(candidateProfile(row));
  if (!document) return "empty" as const;
  const hash = documentHash(document);
  const existing = await db.$queryRaw<Array<{ contentHash: string; model: string }>>`
    SELECT "contentHash", "model" FROM "CandidateEmbedding"
    WHERE "ownerId" = ${ownerId} AND "candidateId" = ${candidateId}`;
  if (existing[0]?.contentHash === hash && existing[0].model === MODEL_KEY) return "unchanged" as const;
  const vector = vectorLiteral(await embeddingForOwner(ownerId, document, "RETRIEVAL_DOCUMENT", embed));
  // Protect against concurrent candidate edits while the network request was running.
  const latest = await db.candidate.findFirst({
    where: { id: candidateId, ownerId }, include: { skills },
  });
  if (!latest || documentHash(candidateDocument(candidateProfile(latest))) !== hash) return "stale" as const;
  await db.$executeRaw`
    INSERT INTO "CandidateEmbedding" ("candidateId","ownerId","model","contentHash","contentVersion","embedding","updatedAt")
    VALUES (${candidateId},${ownerId},${MODEL_KEY},${hash},${1},${vector},now())
    ON CONFLICT ("candidateId") DO UPDATE SET
      "ownerId" = EXCLUDED."ownerId", "model" = EXCLUDED."model",
      "contentHash" = EXCLUDED."contentHash", "contentVersion" = EXCLUDED."contentVersion",
      "embedding" = EXCLUDED."embedding", "updatedAt" = now()`;
  return "indexed" as const;
}

/** Idempotent CLI backfill, with bounds. Retries reuse a content-hash cache.
 * Never sends full resumes or candidate names to the embedding service. */
export async function indexOwner(ownerId: string, options: { limit?: number; embed?: Embedder } = {}) {
  const db = database();
  const candidates = await db.candidate.findMany({
    where: { ownerId }, select: { id: true }, orderBy: { id: "asc" }, take: 1001,
  });
  if (candidates.length > 1000) throw new Error("Maximum 1,000 candidates per workspace.");
  const limit = options.limit ?? candidates.length;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Invalid indexing limit.");
  const summary = { examined: 0, indexed: 0, unchanged: 0, stale: 0, empty: 0, absent: 0, failed: 0 };
  for (const row of candidates.slice(0, limit)) {
    summary.examined++;
    try {
      const result = await indexCandidate(ownerId, row.id, options.embed);
      summary[result]++;
    } catch {
      // No error bodies: provider errors may contain candidate or credential material.
      summary.failed++;
    }
  }
  return summary;
}

/** Use owner-bound indexed vectors as a retrieval signal, not as candidate evidence.
 * An index without coverage or unavailable provider returns the exact legacy ordering. */
export async function rankWithSemantic(
  ownerId: string, candidates: CandidateProfile[], rules: Rule[], referenceId?: string | null,
  embed: Embedder = geminiEmbed,
) {
  // Opt-in: never block the interactive results path on a network embedding by default.
  // Semantics remain a secondary tie-breaker, never evidence of eligibility.
  if (process.env.AI_ENABLED === "false" || process.env.PARETO_SEMANTIC_SEARCH !== "1") return hybridRank(candidates, rules, new Map(), referenceId);
  const db = database();
  try {
    const rows = await db.$queryRaw<Array<{ candidateId: string; contentHash: string }>>`
      SELECT "candidateId", "contentHash" FROM "CandidateEmbedding"
      WHERE "ownerId" = ${ownerId} AND "model" = ${MODEL_KEY}`;
    const current = new Map(candidates.map(c => [c.id, documentHash(candidateDocument(c))]));
    const fresh = new Set(rows.filter(row => current.get(row.candidateId) === row.contentHash)
      .map(row => row.candidateId));
    if (!fresh.size) return hybridRank(candidates, rules, new Map(), referenceId);
    const reference = candidates.find(c => c.id === referenceId);
    const query = queryDocument(rules, reference);
    if (!query) return hybridRank(candidates, rules, new Map(), referenceId);
    const vector = vectorLiteral(await embeddingForOwner(ownerId, query, "RETRIEVAL_QUERY", embed));
    // SET LOCAL makes pgvector work whether Supabase installed it in public or extensions.
    const nearest = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL search_path TO public, extensions");
      return tx.$queryRaw<Array<{ candidateId: string; similarity: number }>>`
        SELECT e."candidateId", (1 - (e."embedding" <=> ${vector}::vector))::double precision AS similarity
        FROM "CandidateEmbedding" e
        JOIN "Candidate" c ON c."id" = e."candidateId"
        WHERE e."ownerId" = ${ownerId} AND c."ownerId" = ${ownerId}
          AND e."model" = ${MODEL_KEY} AND e."contentVersion" = ${1}
        ORDER BY e."embedding" <=> ${vector}::vector, e."candidateId"
        LIMIT 1000`;
    });
    const scores = new Map(nearest.filter(row => fresh.has(row.candidateId) &&
      Number.isFinite(row.similarity)).map(row => [row.candidateId, row.similarity]));
    return hybridRank(candidates, rules, scores, referenceId, query);
  } catch {
    // Searches must remain operational if the provider, pgvector or pool is unavailable.
    return hybridRank(candidates, rules, new Map(), referenceId);
  }
}
