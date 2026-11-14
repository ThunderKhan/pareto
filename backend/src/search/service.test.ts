import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { database } from "./db";
import { criteriaSchema } from "./criteria";
import { activeSearch, candidateFor, candidateList, confirmSearch, referenceDraft, searchResults } from "./service";

const integrationUrl = process.env.PARETO_TEST_DATABASE_URL;
const owner = "11111111-1111-4111-8111-111111111111";
const stranger = "22222222-2222-4222-8222-222222222222";

describe.skipIf(!integrationUrl)("PostgreSQL search with seeded owner", () => {
  if (integrationUrl) process.env.DATABASE_URL = integrationUrl;
  const sessions = new Set<string>();
  afterAll(async () => {
    const db = database();
    await db.searchSession.deleteMany({ where: { ownerId: owner, id: { in: [...sessions] } } });
    await db.$disconnect();
  });

  it("retrieves actual candidates and isolates candidate and session access", async () => {
    const lookup = await candidateList(owner, "Asha Nair");
    expect(lookup).toHaveLength(1);
    const referenceId = lookup[0].id;
    expect(await candidateList(stranger, "Asha Nair")).toEqual([]);
    await expect(candidateFor(stranger, referenceId)).rejects.toMatchObject({ status: 404 });
    await expect(referenceDraft(stranger, referenceId)).rejects.toMatchObject({ status: 404 });

    const criteria = criteriaSchema.parse([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const initial = { requestId: randomUUID(), criteria };
    const confirmed = await confirmSearch(owner, initial);
    sessions.add(confirmed.sessionId);
    expect(confirmed.counts).toEqual({ ELIGIBLE: 3, NEEDS_REVIEW: 1, INELIGIBLE: 44 });
    expect((await confirmSearch(owner, initial)).sessionId).toBe(confirmed.sessionId);
    await expect(activeSearch(stranger, confirmed.sessionId)).rejects.toMatchObject({ status: 404 });

    const edited = { sessionId: confirmed.sessionId, expectedVersion: 1,
      criteria: criteria.map(rule => rule.field === "notice" ? { ...rule, maxDays: 45 } : rule) };
    const [first, second] = await Promise.allSettled([
      confirmSearch(owner, { ...edited, requestId: randomUUID() }),
      confirmSearch(owner, { ...edited, requestId: randomUUID() }),
    ]);
    expect([first, second].filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect([first, second].find(result => result.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    expect(await searchResults(owner, confirmed.sessionId)).toMatchObject({ version: 2, counts: { ELIGIBLE: 4 } });

    const draft = await referenceDraft(owner, referenceId);
    const peers = await confirmSearch(owner, { requestId: randomUUID(), criteria: draft.criteria, referenceId });
    sessions.add(peers.sessionId);
    expect(peers.total).toBe(47);
    expect(peers.results.every(row => row.candidate.id !== referenceId)).toBe(true);
  });
});
