import { isDeepStrictEqual } from "node:util";
import { database } from "./db";
import { criteriaSchema, type Rule } from "./criteria";
import { evaluatorVersion, referenceCriteria } from "./evaluate";
import type { Prisma } from "../generated/prisma/client";
import { explainNearMatch } from "./counterfactual";
import { diagnoseSearch } from "./diagnostics";
import { compareSearches } from "./simulator";
import { computeFrontier } from "./frontier";
import { rankWithSemantic } from "./semantic";
import { VersionedSnapshotCache } from "./snapshot-cache";
import { recordSearchTiming } from "./performance";

const skills = { include: { skill: true }, orderBy: { skillId: "asc" } } as const;
type Candidate = Prisma.CandidateGetPayload<{ include: { skills: typeof skills } }>;

function profile({ ownerId: _ownerId, skillsKnown, skills, createdAt: _createdAt, ...candidate }: Candidate) {
  return { ...candidate, skills: skillsKnown ? skills.map(link => link.skill.displayName) : null };
}

export class SearchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function candidateFor(ownerId: string, id: string) {
  const candidate = await database().candidate.findFirst({ where: { id, ownerId }, include: { skills } });
  if (!candidate) throw new SearchError(404, "Candidate not found.");
  return profile(candidate);
}

export async function candidateList(ownerId: string, query: string) {
  return database().candidate.findMany({
    where: { ownerId, displayName: { contains: query, mode: "insensitive" } },
    select: { id: true, displayName: true, roleTitle: true, city: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }], take: 50,
  });
}

export async function referenceDraft(ownerId: string, id: string) {
  const candidate = await candidateFor(ownerId, id);
  const rules = referenceCriteria(candidate);
  // An entirely undocumented profile cannot produce a meaningful similarity search.
  // Return an actionable client error rather than an opaque schema validation failure.
  if (!rules.length) {
    throw new SearchError(422, "This reference profile has no documented comparison attributes. Choose another candidate or enter criteria manually.");
  }
  return { candidate, criteria: criteriaSchema.parse(rules) };
}

/** Recent confirmed search sessions, scoped to their recruiter. */
export async function recentSearches(ownerId: string) {
  const sessions = await database().searchSession.findMany({
    where: { ownerId }, take: 12,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { revisions: { take: 1, orderBy: { version: "desc" } } },
  });
  return sessions.filter(session => session.revisions.length).map(session => {
    const rules = criteriaSchema.parse(session.revisions[0].criteria);
    const role = rules.find(rule => rule.field === "role");
    const city = rules.find(rule => rule.field === "city");
    const title = [role?.field === "role" ? role.value :
      session.referenceCandidateId ? "Similar candidates" : "Candidate search",
      city?.field === "city" ? city.value : ""].filter(Boolean).join(" · ");
    return { id: session.id, title, version: session.latestVersion, createdAt: session.createdAt.toISOString() };
  });
}

export async function activeSearch(ownerId: string, id: string) {
  const session = await database().searchSession.findFirst({
    where: { id, ownerId }, include: { revisions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!session?.revisions[0]) throw new SearchError(404, "Search not found.");
  return {
    sessionId: session.id, version: session.latestVersion, referenceId: session.referenceCandidateId,
    criteria: criteriaSchema.parse(session.revisions[0].criteria),
  };
}

type Ranked = Awaited<ReturnType<typeof rankWithSemantic>>;
type Snapshot = {
  counts: { ELIGIBLE: number; NEEDS_REVIEW: number; INELIGIBLE: number };
  results: Ranked; total: number; evaluatorVersion: string;
};
// Bounded by entry count and maximum 1,000 candidates per owner. No shared tenant cache.
const snapshots = new VersionedSnapshotCache<Snapshot>(24, 45_000);
function rankingVersion(): string {
  return evaluatorVersion + ":" + (
    process.env.PARETO_SEMANTIC_SEARCH === "1" && process.env.AI_ENABLED !== "false"
      ? "semantic-v1" : "deterministic-v1");
}
function page(snapshot: Snapshot, offset = 0) {
  return { ...snapshot, results: snapshot.results.slice(offset, offset + 20) };
}
/** The epoch is bumped in the database by Candidate, CandidateSkill, Skill and
 * CandidateEmbedding triggers across ALL API/worker replicas. Missing migrations
 * or a disabled flag fail open to an uncached calculation, never stale data.
 */
async function datasetEpoch(ownerId: string): Promise<string | null> {
  if (process.env.PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED !== "true") return null;
  try {
    const rows = await database().$queryRaw<Array<{ version: string }>>`SELECT "version"::text AS "version" FROM "CandidateSearchEpoch" WHERE "ownerId" = ${ownerId}`;
    return rows[0]?.version ?? "0";
  } catch { return null; }
}
async function computeSnapshot(ownerId: string, criteria: Rule[], referenceId: string | null): Promise<Snapshot> {
  const started = Date.now();
  const dbStarted = Date.now();
  const rows = await database().candidate.findMany({ where: { ownerId }, include: { skills }, take: 1001 });
  recordSearchTiming("search.candidates", Date.now() - dbStarted);
  if (rows.length > 1000) throw new SearchError(422, "This workspace exceeds the 1,000-profile search limit.");
  const rankStarted = Date.now();
  const results = await rankWithSemantic(ownerId, rows.map(profile), criteria, referenceId);
  recordSearchTiming("search.rank", Date.now() - rankStarted);
  const counts = { ELIGIBLE: 0, NEEDS_REVIEW: 0, INELIGIBLE: 0 };
  for (const result of results) counts[result.eligibility]++;
  recordSearchTiming("search.total", Date.now() - started);
  return { counts, results, total: results.length, evaluatorVersion };
}
async function cachedSearchResults(ownerId: string, sessionId: string, version: number,
  criteria: Rule[], referenceId: string | null, offset = 0) {
  const started = Date.now();
  const epoch = await datasetEpoch(ownerId);
  if (epoch !== null) {
    const hit = snapshots.get(ownerId, sessionId, version, epoch, rankingVersion());
    if (hit) {
      recordSearchTiming("search.cache-lookup", Date.now() - started);
      return page(hit, offset);
    }
  }
  recordSearchTiming("search.cache-lookup", Date.now() - started);
  const snapshot = await computeSnapshot(ownerId, criteria, referenceId);
  // A concurrent candidate or embedding change may invalidate this computation.
  if (epoch !== null && await datasetEpoch(ownerId) === epoch)
    snapshots.set(ownerId, sessionId, version, epoch, rankingVersion(), snapshot);
  return page(snapshot, offset);
}
export async function searchResults(ownerId: string, sessionId: string, offset = 0) {
  const state = await activeSearch(ownerId, sessionId);
  return { ...state, ...await cachedSearchResults(ownerId, state.sessionId, state.version,
    state.criteria, state.referenceId, offset) };
}

type Confirmation = { requestId: string; criteria: Rule[]; referenceId?: string; sessionId?: string; expectedVersion?: number };

export async function confirmSearch(ownerId: string, input: Confirmation) {
  const { requestId, sessionId } = input;
  const criteria = criteriaSchema.parse(input.criteria);
  const prior = sessionId ? await activeSearch(ownerId, sessionId) : null;
  const referenceId = prior ? prior.referenceId : input.referenceId ?? null;
  if (referenceId) await candidateFor(ownerId, referenceId);
  const db = database();

  async function existing() {
    const revision = await db.searchRevision.findFirst({
      where: { requestId, session: { ownerId } }, include: { session: true },
    });
    if (!revision) return null;
    if ((sessionId && revision.sessionId !== sessionId)
      || revision.session.referenceCandidateId !== referenceId
      || !isDeepStrictEqual(criteriaSchema.parse(revision.criteria), criteria)) {
      throw new SearchError(409, "This confirmation request ID has already been used.");
    }
    return { sessionId: revision.sessionId, version: revision.version };
  }

  let saved = await existing();
  if (!saved) {
    if (prior && prior.version !== input.expectedVersion) throw new SearchError(409, "This search changed. Reload the latest revision.");
    const version = (prior?.version ?? 0) + 1;
    // Evaluate before writing so an unavailable dataset cannot create a confirmed revision.
    const calculatedEpoch = await datasetEpoch(ownerId);
    const snapshot = await computeSnapshot(ownerId, criteria, referenceId);
    try {
      saved = await db.$transaction(async tx => {
        let id = sessionId;
        if (id) {
          const updated = await tx.searchSession.updateMany({
            where: { id, ownerId, latestVersion: input.expectedVersion }, data: { latestVersion: version },
          });
          if (!updated.count) throw new SearchError(409, "This search changed. Reload the latest revision.");
        } else {
          id = (await tx.searchSession.create({ data: { ownerId, referenceCandidateId: referenceId, latestVersion: version } })).id;
        }
        await tx.searchRevision.create({ data: { sessionId: id, version, criteria, requestId, evaluatorVersion } });
        // Notification delivery is a real in-app event, committed atomically
        // with the confirmed search and subject to the recruiter's preferences.
        const settings = await tx.recruiterSettings.findUnique({ where: { userId: ownerId } });
        const kind = version === 1 ? "SEARCH_CONFIRMED" : "SEARCH_REFINED";
        const enabled = version === 1 ? settings?.notifyConfirmed !== false : settings?.notifyRefined !== false;
        if (enabled) {
          await tx.recruiterNotification.create({
            data: {
              userId: ownerId, sessionId: id, version, kind,
              title: version === 1 ? "Candidate search confirmed" : "Search refined to revision " + version,
            },
          });
        }
        return { sessionId: id, version };
      });
      if (calculatedEpoch !== null && await datasetEpoch(ownerId) === calculatedEpoch)
        snapshots.set(ownerId, saved.sessionId, saved.version, calculatedEpoch, rankingVersion(), snapshot);
      return { ...saved, criteria, referenceId, ...page(snapshot) };
    } catch (error) {
      saved = await existing();
      if (!saved) throw error;
    }
  }
  return { ...saved, criteria, referenceId, ...await cachedSearchResults(ownerId, saved.sessionId,
    saved.version, criteria, referenceId) };
}


/**
 * Evidence-backed near-match analysis for one candidate and one owned
 * CONFIRMED search. No writes; the only source of facts is the candidate row.
 */
export async function counterfactualFor(
  ownerId: string, sessionId: string, expectedVersion: number, candidateId: string,
) {
  const state = await activeSearch(ownerId, sessionId);
  if (state.version !== expectedVersion) throw new SearchError(409, "This search changed. Reload the latest revision.");
  if (state.referenceId === candidateId) {
    throw new SearchError(422, "The reference candidate cannot be evaluated as their own near match.");
  }
  const candidate = await candidateFor(ownerId, candidateId);
  const report = explainNearMatch(candidate, state.criteria);
  // A concurrent revision must not surface a preview tied to a stale version.
  const latest = await activeSearch(ownerId, sessionId);
  if (latest.version !== expectedVersion) {
    throw new SearchError(409, "This search changed during analysis. Reload the latest revision.");
  }
  return { sessionId: state.sessionId, version: state.version, referenceId: state.referenceId, ...report };
}

/** Analyze current confirmed owner-scoped criteria without modifying the search. */
export async function searchDiagnostics(ownerId: string, sessionId: string) {
  const state = await activeSearch(ownerId, sessionId);
  const rows = await database().candidate.findMany({ where: { ownerId }, include: { skills }, take: 1001 });
  if (rows.length > 1000) throw new SearchError(422, "This workspace exceeds the 1,000-profile search limit.");
  const diagnostic = diagnoseSearch(rows.map(profile), state.criteria, state.referenceId);
  const latest = await activeSearch(ownerId, sessionId);
  if (latest.version !== state.version) {
    throw new SearchError(409, "This search changed during analysis. Reload the latest revision.");
  }
  return { sessionId: state.sessionId, version: state.version, ...diagnostic };
}

/** Compare confirmed rules to hypothetical criteria using one owner-scoped candidate read. */
export async function simulateSearch(
  ownerId: string, sessionId: string, expectedVersion: number, proposedCriteria: Rule[],
) {
  const state = await activeSearch(ownerId, sessionId);
  if (state.version !== expectedVersion) throw new SearchError(409, "This search changed. Reload the latest revision.");
  const criteria = criteriaSchema.parse(proposedCriteria);
  const rows = await database().candidate.findMany({ where: { ownerId }, include: { skills }, take: 1001 });
  if (rows.length > 1000) throw new SearchError(422, "This workspace exceeds the 1,000-profile search limit.");
  const comparison = compareSearches(rows.map(profile), state.criteria, criteria, state.referenceId);
  const latest = await activeSearch(ownerId, sessionId);
  if (latest.version !== expectedVersion) {
    throw new SearchError(409, "This search changed during simulation. Reload the latest revision.");
  }
  return { sessionId, version: state.version, ...comparison };
}

/** Preview bounded, owner-scoped hiring trade-offs; never creates search revisions. */
export async function searchFrontier(
  ownerId: string, sessionId: string, expectedVersion: number, maxStrategies = 5,
) {
  const state = await activeSearch(ownerId, sessionId);
  if (state.version !== expectedVersion) throw new SearchError(409, "This search changed. Reload the latest revision.");
  const rows = await database().candidate.findMany({
    where: { ownerId }, include: { skills }, take: 1001,
  });
  if (rows.length > 1000) throw new SearchError(422, "This workspace exceeds the 1,000-profile search limit.");
  const report = computeFrontier(rows.map(profile), state.criteria, state.referenceId, maxStrategies);
  const latest = await activeSearch(ownerId, sessionId);
  if (latest.version !== state.version) {
    throw new SearchError(409, "This search changed during analysis. Reload the latest revision.");
  }
  return { sessionId: state.sessionId, version: state.version,
    computedAt: new Date().toISOString(), ...report };
}
