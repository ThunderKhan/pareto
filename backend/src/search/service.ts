import { isDeepStrictEqual } from "node:util";
import { database } from "./db";
import { criteriaSchema, type Rule } from "./criteria";
import { evaluatorVersion, rank, referenceCriteria } from "./evaluate";
import type { Prisma } from "../generated/prisma/client";

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

async function compute(ownerId: string, criteria: Rule[], referenceId: string | null, offset = 0) {
  const rows = await database().candidate.findMany({ where: { ownerId }, include: { skills }, take: 1001 });
  if (rows.length > 1000) throw new SearchError(422, "This workspace exceeds the 1,000-profile search limit.");
  const results = rank(rows.map(profile), criteria, referenceId);
  const counts = { ELIGIBLE: 0, NEEDS_REVIEW: 0, INELIGIBLE: 0 };
  for (const result of results) counts[result.eligibility]++;
  return { counts, results: results.slice(offset, offset + 20), total: results.length, evaluatorVersion };
}

export async function searchResults(ownerId: string, sessionId: string, offset = 0) {
  const state = await activeSearch(ownerId, sessionId);
  return { ...state, ...await compute(ownerId, state.criteria, state.referenceId, offset) };
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
    const result = await compute(ownerId, criteria, referenceId);
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
        return { sessionId: id, version };
      });
      return { ...saved, criteria, referenceId, ...result };
    } catch (error) {
      saved = await existing();
      if (!saved) throw error;
    }
  }
  return { ...saved, criteria, referenceId, ...await compute(ownerId, criteria, referenceId) };
}
