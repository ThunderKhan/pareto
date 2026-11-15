import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { database } from "../search/db";
import { confirmSearch } from "../search/service";
import {
  createOrganization, getAccountSettings, getRecruiterNotifications,
  markNotificationsRead, renameOrganization, updateAccountSettings,
} from "./service";

const integration = process.env.PARETO_TEST_DATABASE_URL;
const ownerId = randomUUID();
const stranger = randomUUID();
const sessions: string[] = [];
const candidateId = randomUUID();

describe.skipIf(!integration)("recruiter account permissions and real events", () => {
  if (integration) process.env.DATABASE_URL = integration;
  afterAll(async () => {
    const db = database();
    await db.searchSession.deleteMany({ where: { ownerId, id: { in: sessions } } });
    await db.candidate.deleteMany({ where: { id: candidateId, ownerId } });
    await db.organization.deleteMany({ where: { ownerId } });
    await db.recruiterSettings.deleteMany({ where: { userId: { in: [ownerId, stranger] } } });
  });

  it("creates an owned organization and never grants a role to a stranger", async () => {
    const before = await getAccountSettings(ownerId);
    expect(before.workspaces).toEqual([]);
    expect(before.notifyConfirmed).toBe(true);

    const organization = await createOrganization(ownerId, "North Star Recruitment");
    const mine = await getAccountSettings(ownerId);
    expect(mine.workspaces).toEqual([expect.objectContaining({
      id: organization.id, name: "North Star Recruitment", role: "OWNER", canManage: true,
    })]);
    expect((await getAccountSettings(stranger)).workspaces).toEqual([]);
    expect(await renameOrganization(stranger, organization.id, "Stolen")).toBe(false);
    expect((await getAccountSettings(ownerId)).workspaces[0].name).toBe("North Star Recruitment");

    expect(await renameOrganization(ownerId, organization.id, "North Star Talent")).toBe(true);
    expect((await getAccountSettings(ownerId)).workspaces[0].name).toBe("North Star Talent");
    await expect(createOrganization(ownerId, "Second Owner Workspace")).rejects.toThrow();
  });

  it("persists recruiter preferences and only delivers permitted in-app notifications", async () => {
    const db = database();
    await db.candidate.create({ data: {
      id: candidateId, ownerId, displayName: "Test Engineer", roleTitle: "Engineer",
    } });
    const original = await updateAccountSettings(ownerId, {
      jobTitle: "Talent Acquisition Lead", notifyConfirmed: false, notifyRefined: false,
    });
    expect(original.jobTitle).toBe("Talent Acquisition Lead");
    const criteria = [{ field: "role" as const, mode: "required" as const, value: "Engineer" }];
    const disabled = await confirmSearch(ownerId, { requestId: randomUUID(), criteria });
    sessions.push(disabled.sessionId);
    expect((await getRecruiterNotifications(ownerId)).items).toHaveLength(0);

    await updateAccountSettings(ownerId, { notifyConfirmed: true });
    const enabled = await confirmSearch(ownerId, { requestId: randomUUID(), criteria });
    sessions.push(enabled.sessionId);
    const received = await getRecruiterNotifications(ownerId);
    expect(received.unread).toBe(1);
    expect(received.items).toEqual([expect.objectContaining({
      kind: "SEARCH_CONFIRMED", sessionId: enabled.sessionId, readAt: null,
    })]);
    await markNotificationsRead(stranger, [received.items[0].id]);
    expect((await getRecruiterNotifications(ownerId)).unread).toBe(1);
    await markNotificationsRead(ownerId, [received.items[0].id]);
    expect((await getRecruiterNotifications(ownerId)).unread).toBe(0);

    const revised = await confirmSearch(ownerId, {
      requestId: randomUUID(), criteria, sessionId: enabled.sessionId, expectedVersion: 1,
    });
    expect(revised.version).toBe(2);
    expect((await getRecruiterNotifications(ownerId)).items).toHaveLength(1);

    await updateAccountSettings(ownerId, { notifyRefined: true });
    await confirmSearch(ownerId, {
      requestId: randomUUID(), criteria, sessionId: enabled.sessionId, expectedVersion: 2,
    });
    const after = await getRecruiterNotifications(ownerId);
    expect(after.items).toHaveLength(2);
    expect(after.items[0]).toMatchObject({ kind: "SEARCH_REFINED", sessionId: enabled.sessionId });
    expect(await getRecruiterNotifications(stranger)).toEqual({ items: [], unread: 0 });
  });
});
