import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { database } from "./db";
import { criteriaSchema } from "./criteria";
import { interpret, interpretRefinement } from "./interpret";
import { activeSearch, candidateFor, candidateList, confirmSearch, recentSearches, referenceDraft, searchResults, counterfactualFor, searchDiagnostics, simulateSearch, searchFrontier } from "./service";

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

  it("grounds Dev Shah's near match in the seed, without mutating revisions or notifications", async () => {
    const criteria = criteriaSchema.parse([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      { field: "skill", mode: "required", value: "Java" },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const confirmed = await confirmSearch(owner, { criteria, requestId: randomUUID() });
    sessions.add(confirmed.sessionId);
    const [dev] = await candidateList(owner, "Dev Shah");
    const [unknown] = await candidateList(owner, "Riya Sen");
    const db = database();
    const revisions = await db.searchRevision.count({ where: { sessionId: confirmed.sessionId } });
    const notifications = await db.recruiterNotification.count({ where: { sessionId: confirmed.sessionId } });

    const report = await counterfactualFor(owner, confirmed.sessionId, 1, dev.id);
    expect(report).toMatchObject({
      sessionId: confirmed.sessionId, version: 1, status: "PREVIEW_ONLY",
      referenceId: null, candidate: { id: dev.id, displayName: "Dev Shah" },
      before: { eligibility: "INELIGIBLE" }, after: { eligibility: "ELIGIBLE" },
      knownRequiredFailures: 1, changedRuleCount: 1,
      changes: [{
        key: "notice", kind: "EXPAND_NOTICE", before: { maxDays: 30 },
        after: { maxDays: 60 },
        evidence: { source: "structured_candidate_record", actual: 60, outcome: "FAIL" },
      }],
    });
    expect(report.proposedCriteria.filter(rule => rule.field !== "notice"))
      .toEqual(criteria.filter(rule => rule.field !== "notice"));
    expect(report.after.details.find(detail => detail.rule.field === "notice")).toMatchObject({
      outcome: "MATCH", actual: 60,
    });
    const verify = await counterfactualFor(owner, confirmed.sessionId, 1, unknown.id);
    expect(verify).toMatchObject({
      knownRequiredFailures: 0, changedRuleCount: 0,
      before: { eligibility: "NEEDS_REVIEW" }, after: { eligibility: "NEEDS_REVIEW" },
      missingEvidence: [{ key: "notice", actual: null, action: "VERIFY_EVIDENCE" }],
    });
    expect(await db.searchRevision.count({ where: { sessionId: confirmed.sessionId } })).toBe(revisions);
    expect(await db.recruiterNotification.count({ where: { sessionId: confirmed.sessionId } })).toBe(notifications);
    expect(await activeSearch(owner, confirmed.sessionId)).toMatchObject({ version: 1, criteria });
    expect((await searchResults(owner, confirmed.sessionId)).counts).toEqual(confirmed.counts);
    await expect(counterfactualFor(stranger, confirmed.sessionId, 1, dev.id))
      .rejects.toMatchObject({ status: 404 });
    await expect(counterfactualFor(owner, confirmed.sessionId, 2, dev.id))
      .rejects.toMatchObject({ status: 409 });
    await expect(counterfactualFor(owner, confirmed.sessionId, 1, "not-a-candidate"))
      .rejects.toMatchObject({ status: 404 });
    await expect(counterfactualFor(owner, "not-a-session", 1, dev.id))
      .rejects.toMatchObject({ status: 404 });

    const [asha] = await candidateList(owner, "Asha Nair");
    const reference = await referenceDraft(owner, asha.id);
    const referenceSearch = await confirmSearch(owner, {
      requestId: randomUUID(), criteria: reference.criteria, referenceId: asha.id,
    });
    sessions.add(referenceSearch.sessionId);
    await expect(counterfactualFor(owner, referenceSearch.sessionId, 1, asha.id))
      .rejects.toMatchObject({ status: 422 });
  });

  it("diagnoses confirmed restrictions with measured counts and no revision mutations", async () => {
    const criteria = criteriaSchema.parse([
      { field: "role", value: "Senior Java Developer", mode: "required" },
      { field: "city", value: "Hyderabad", mode: "required" },
      { field: "experience", minMonths: 72, maxMonths: 120, mode: "required" },
      { field: "notice", maxDays: 30, mode: "required" },
    ]);
    const saved = await confirmSearch(owner, { requestId: randomUUID(), criteria });
    sessions.add(saved.sessionId);
    expect(saved.counts).toMatchObject({ ELIGIBLE: 3, NEEDS_REVIEW: 1 });
    const report = await searchDiagnostics(owner, saved.sessionId);
    expect(report).toMatchObject({
      status: "PREVIEW_ONLY",
      sessionId: saved.sessionId, version: 1, totalCandidates: 48,
      baseline: { counts: saved.counts, criteria },
      evaluatorVersion: saved.evaluatorVersion,
    });
    const notice = report.bottlenecks.find(item => item.key === "notice");
    expect(notice).toMatchObject({ unknownCount: 6 });
    const relaxed = report.suggestions.find(suggestion =>
      suggestion.changes.some(change =>
        change.kind === "extend_notice" && change.after.field === "notice" && change.after.maxDays === 45));
    expect(relaxed).toBeDefined();
    expect(relaxed?.additionalEligibleCount).toBe(1);
    expect(relaxed?.counts.ELIGIBLE).toBe(4);
    expect(relaxed?.newlyEligible.map(candidate => candidate.displayName)).toContain("Meera Iyer");
    expect(await activeSearch(owner, saved.sessionId)).toMatchObject({ version: 1, criteria });
    expect((await searchResults(owner, saved.sessionId)).counts).toEqual(saved.counts);
    await expect(searchDiagnostics(stranger, saved.sessionId)).rejects.toMatchObject({ status: 404 });
    await expect(searchDiagnostics(owner, "not-a-session")).rejects.toMatchObject({ status: 404 });
  });

  it("compares confirmed criteria on real seeded PostgreSQL without saving any hypothetical revision or notification", async () => {
    const original = criteriaSchema.parse([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const confirmed = await confirmSearch(owner, { requestId: randomUUID(), criteria: original });
    sessions.add(confirmed.sessionId);
    expect(confirmed.counts.ELIGIBLE).toBe(3);
    const proposed = original.map(rule => rule.field === "notice" ? { ...rule, maxDays: 45 } : rule);
    const db = database();
    const beforeRevisions = await db.searchRevision.count({ where: { sessionId: confirmed.sessionId } });
    const beforeNotifications = await db.recruiterNotification.count({
      where: { sessionId: confirmed.sessionId },
    });

    const comparison = await simulateSearch(owner, confirmed.sessionId, confirmed.version, proposed);
    expect(comparison).toMatchObject({
      sessionId: confirmed.sessionId, version: 1, status: "PREVIEW_ONLY", totalCandidates: 48,
      original: { counts: confirmed.counts, criteria: original },
      proposed: { counts: { ELIGIBLE: 4 } },
      delta: { exactMatches: 1 },
      groups: { newlyEligible: { count: 1 } },
    });
    expect(comparison.groups.newlyEligible.examples[0]).toMatchObject({
      displayName: "Meera Iyer", before: { eligibility: "INELIGIBLE" },
      after: { eligibility: "ELIGIBLE" },
    });
    expect(comparison.groups.newlyEligible.examples[0].before.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "noticePeriodDays", outcome: "FAIL", actual: 31 }),
    ]));
    expect(comparison.groups.newlyEligible.examples[0].after.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "noticePeriodDays", outcome: "MATCH", actual: 31 }),
    ]));
    expect(await db.searchRevision.count({ where: { sessionId: confirmed.sessionId } })).toBe(beforeRevisions);
    expect(await db.recruiterNotification.count({ where: { sessionId: confirmed.sessionId } })).toBe(beforeNotifications);
    expect(await activeSearch(owner, confirmed.sessionId)).toMatchObject({ version: 1, criteria: original });
    expect((await searchResults(owner, confirmed.sessionId)).counts).toEqual(confirmed.counts);
    await expect(simulateSearch(stranger, confirmed.sessionId, 1, proposed)).rejects.toMatchObject({ status: 404 });
    await expect(simulateSearch(owner, confirmed.sessionId, 2, proposed)).rejects.toMatchObject({ status: 409 });
    await expect(simulateSearch(owner, "absent-session", 1, proposed)).rejects.toMatchObject({ status: 404 });
  });

  it("keeps 48 stable synthetic candidates and 129 skill links after repeat seeding", async () => {
    const rows = await database().candidate.findMany({
      where: { ownerId: owner, id: { startsWith: `demo-v1-${owner}-` } },
      select: { id: true, skills: { select: { skillId: true } } },
    });
    expect(rows).toHaveLength(48);
    expect(new Set(rows.map(row => row.id)).size).toBe(48);
    expect(rows.reduce((sum, row) => sum + row.skills.length, 0)).toBe(129);
    expect(rows.some(row => row.id === `demo-v1-${owner}-000`)).toBe(true);
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
    expect((await recentSearches(owner)).some(item => item.id === confirmed.sessionId && item.version === 1)).toBe(true);
    expect(await recentSearches(stranger)).toEqual([]);
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

  it("previews Pareto Frontier from a real owned search without persisting any mutations", async () => {
    const criteria = criteriaSchema.parse([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "city", mode: "required", value: "Hyderabad" },
      { field: "experience", mode: "required", minMonths: 72, maxMonths: 120 },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const saved = await confirmSearch(owner, { requestId: randomUUID(), criteria });
    sessions.add(saved.sessionId);
    const db = database();
    const revisions = await db.searchRevision.count({ where: { sessionId: saved.sessionId } });
    const notifications = await db.recruiterNotification.count({ where: { sessionId: saved.sessionId } });
    const preview = await searchFrontier(owner, saved.sessionId, 1);
    expect(preview).toMatchObject({
      status: "PREVIEW_ONLY", sessionId: saved.sessionId, version: 1,
      algorithmVersion: "frontier-v1", baseline: { counts: saved.counts },
      scope: { totalCandidates: 48, exhaustive: false, maxCandidates: 1000 },
    });
    expect(preview.strategies.length).toBeGreaterThan(0);
    expect(preview.strategies.every(strategy => strategy.impact.noLongerEligibleCount === 0)).toBe(true);
    expect(preview.strategies.some(strategy =>
      strategy.changes.some(change => change.kind === "extend_notice" &&
        change.after.field === "notice" && change.after.maxDays > 30))).toBe(true);
    for (const strategy of preview.strategies) {
      expect(strategy.counts.ELIGIBLE).toBeGreaterThan(saved.counts.ELIGIBLE);
      expect(criteriaSchema.parse(strategy.proposedCriteria)).toEqual(strategy.proposedCriteria);
    }
    expect(await db.searchRevision.count({ where: { sessionId: saved.sessionId } })).toBe(revisions);
    expect(await db.recruiterNotification.count({ where: { sessionId: saved.sessionId } })).toBe(notifications);
    await expect(searchFrontier(stranger, saved.sessionId, 1)).rejects.toMatchObject({ status: 404 });
    await expect(searchFrontier(owner, saved.sessionId, 2)).rejects.toMatchObject({ status: 409 });

    const strategy = preview.strategies[0];
    const confirmed = await confirmSearch(owner, {
      requestId: randomUUID(), sessionId: saved.sessionId,
      expectedVersion: 1, criteria: strategy.proposedCriteria,
    });
    expect(confirmed.version).toBe(2);
    expect(confirmed.counts).toEqual(strategy.counts);
    await expect(searchFrontier(owner, saved.sessionId, 1)).rejects.toMatchObject({ status: 409 });
  });

  it("excludes reference candidate from Pareto Frontier counts", async () => {
    const [reference] = await candidateList(owner, "Asha Nair");
    const criteria = criteriaSchema.parse([
      { field: "role", mode: "required", value: "Senior Java Developer" },
      { field: "notice", mode: "required", maxDays: 30 },
    ]);
    const saved = await confirmSearch(owner, {
      requestId: randomUUID(), criteria, referenceId: reference.id,
    });
    sessions.add(saved.sessionId);
    const preview = await searchFrontier(owner, saved.sessionId, 1);
    expect(preview.referenceId).toBe(reference.id);
    expect(preview.scope.totalCandidates).toBe(47);
    for (const strategy of preview.strategies) {
      expect(strategy.counts.ELIGIBLE + strategy.counts.NEEDS_REVIEW + strategy.counts.INELIGIBLE).toBe(47);
      expect(strategy.impact.newlyEligibleExamples.every(person => person.id !== reference.id)).toBe(true);
    }
  });

  it("invalidates a confirmed search snapshot on cross-request candidate mutations", async () => {
    const flag = process.env.PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED;
    const db = database();
    const candidateId = randomUUID();
    try {
      process.env.PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED = "true";
      const saved = await confirmSearch(owner, {
        requestId: randomUUID(),
        criteria: [{ field: "role", mode: "required", value: "Backend Engineer" }],
      });
      sessions.add(saved.sessionId);
      const original = await searchResults(owner, saved.sessionId);
      const originalCount = original.total;
      const again = await searchResults(owner, saved.sessionId);
      expect(again.total).toBe(originalCount);
      const readEpoch = async () => {
        const rows = await db.$queryRawUnsafe<Array<{ version: bigint }>>(
          'SELECT "version" FROM "CandidateSearchEpoch" WHERE "ownerId" = $1', owner,
        );
        return rows[0]?.version ?? 0n;
      };
      const before = await readEpoch();
      await db.candidate.create({ data: {
        id: candidateId, ownerId: owner, displayName: "Temporary Epoch Candidate",
        roleTitle: "Backend Engineer",
      } });
      const added = await readEpoch();
      expect(added).toBeGreaterThan(before);
      const changed = await searchResults(owner, saved.sessionId);
      expect(changed.total).toBe(originalCount + 1);
      expect(changed.counts.ELIGIBLE).toBe(original.counts.ELIGIBLE + 1);
      await db.candidate.update({ where: { id: candidateId }, data: { roleTitle: "Unrelated Role" } });
      const updated = await readEpoch();
      expect(updated).toBeGreaterThan(added);
      const reevaluated = await searchResults(owner, saved.sessionId);
      expect(reevaluated.total).toBe(originalCount + 1);
      expect(reevaluated.counts.ELIGIBLE).toBe(original.counts.ELIGIBLE);
    } finally {
      await db.candidate.deleteMany({ where: { id: candidateId, ownerId: owner } });
      if (flag === undefined) delete process.env.PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED;
      else process.env.PARETO_SEARCH_SNAPSHOT_CACHE_ENABLED = flag;
    }
  });
});
