import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { database } from "./db";
import { criteriaSchema } from "./criteria";
import { interpret, interpretRefinement } from "./interpret";
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

  it("runs the organizer search, human edits, two refinements and reference-based follow-up on PostgreSQL", async () => {
    const brief = "Find Senior Java Developers in Hyderabad with 6 to 10 years of experience, Java, Spring Boot, AWS, and a notice period of no more than 30 days.";
    const parsedByModel = [
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      ...["Java", "Spring Boot", "AWS"].map(value => ({ field: "skill", mode: "required", value })),
      { field: "notice", mode: "required", maxDays: 30 },
    ];
    // The interpreter is exercised with controlled Gemini-format output, not a live model.
    const draft = await interpret(brief, [
      async () => ({ raw: { criteria: parsedByModel, warnings: [] }, provider: "Gemini" }),
    ]);
    expect(draft.criteria).toHaveLength(7);
    const edited = draft.criteria.map(rule =>
      rule.field === "notice" ? { ...rule, maxDays: 45 } : rule);
    // Nothing is queried by interpretation alone: confirmation is the DB write boundary.
    const confirmed = await confirmSearch(owner, { requestId: randomUUID(), criteria: edited });
    sessions.add(confirmed.sessionId);
    expect(confirmed).toMatchObject({ version: 1, counts: { ELIGIBLE: 4 } });
    const nearMatch = confirmed.results.find(row => row.candidate.displayName === "Dev Shah");
    expect(nearMatch?.details.find(detail => detail.rule.field === "notice")).toMatchObject({
      outcome: "FAIL", actual: 60,
    });

    const fullTime = await interpretRefinement("Only full-time employees", confirmed.criteria, [
      async () => ({ raw: { operations: [
        { op: "set", rule: { field: "employmentType", mode: "required", value: "Full-time" } },
      ], warnings: [] }, provider: "Groq" }),
    ]);
    expect(fullTime.changed).toBe(true);
    expect(fullTime.criteria).toHaveLength(8);
    expect(fullTime.criteria.find(rule => rule.field === "city")).toMatchObject({ value: "Hyderabad" });
    const second = await confirmSearch(owner, {
      requestId: randomUUID(), sessionId: confirmed.sessionId, expectedVersion: confirmed.version,
      criteria: fullTime.criteria,
    });
    expect(second).toMatchObject({ version: 2, counts: { ELIGIBLE: 3 } });

    const faster = await interpretRefinement("Now join within 30 days", second.criteria, [
      async () => ({ raw: { operations: [
        { op: "set", rule: { field: "notice", mode: "required", maxDays: 30 } },
      ], warnings: [] }, provider: "Gemini" }),
    ]);
    expect(faster.criteria).toHaveLength(8);
    expect(faster.criteria.find(rule => rule.field === "experience")).toMatchObject({
      minMonths: 72, maxMonths: 120,
    });
    const third = await confirmSearch(owner, {
      requestId: randomUUID(), sessionId: confirmed.sessionId, expectedVersion: second.version,
      criteria: faster.criteria,
    });
    expect(third).toMatchObject({ version: 3, counts: { ELIGIBLE: 2 } });
    expect((await searchResults(owner, confirmed.sessionId)).version).toBe(3);

    const [reference] = await candidateList(owner, "Asha Nair");
    const profileDraft = await referenceDraft(owner, reference.id);
    const peers = await confirmSearch(owner, {
      requestId: randomUUID(), criteria: profileDraft.criteria, referenceId: reference.id,
    });
    sessions.add(peers.sessionId);
    expect(peers.total).toBe(47);
    expect(peers.results.some(row => row.candidate.id === reference.id)).toBe(false);
    const withAws = await interpretRefinement("Find peers with AWS required", peers.criteria, [
      async () => ({ raw: { operations: [
        { op: "set", rule: { field: "skill", mode: "required", value: "AWS" } },
      ], warnings: [] }, provider: "Groq" }),
    ]);
    const refinedPeers = await confirmSearch(owner, {
      requestId: randomUUID(), sessionId: peers.sessionId, expectedVersion: peers.version,
      criteria: withAws.criteria,
    });
    expect(refinedPeers.referenceId).toBe(reference.id);
    expect(refinedPeers.counts).toEqual({ ELIGIBLE: 21, NEEDS_REVIEW: 5, INELIGIBLE: 21 });
    expect(refinedPeers.total).toBe(47);
    expect(refinedPeers.results.every(row => row.candidate.id !== reference.id)).toBe(true);
    expect(refinedPeers.criteria.find(rule => rule.field === "skill" && rule.value === "AWS"))
      .toMatchObject({ mode: "required" });
  });

  it("returns an actionable error for undocumented reference profiles without exposing other owners", async () => {
    const id = randomUUID();
    const db = database();
    await db.candidate.create({
      data: { id, ownerId: owner, displayName: "Undocumented Test Candidate", skillsKnown: false },
    });
    try {
      await expect(referenceDraft(owner, id)).rejects.toMatchObject({
        status: 422,
        message: expect.stringContaining("no documented comparison attributes"),
      });
      await expect(referenceDraft(stranger, id)).rejects.toMatchObject({ status: 404 });
    } finally {
      await db.candidate.delete({ where: { id } });
    }
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
