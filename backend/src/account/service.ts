import { database } from "../search/db";

export type SettingsPatch = {
  jobTitle?: string | null;
  notifyConfirmed?: boolean;
  notifyRefined?: boolean;
};

export async function getAccountSettings(userId: string) {
  const db = database();
  const [settings, memberships] = await Promise.all([
    db.recruiterSettings.findUnique({ where: { userId } }),
    db.workspaceMembership.findMany({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      include: { organization: true },
    }),
  ]);
  return {
    jobTitle: settings?.jobTitle ?? null,
    notifyConfirmed: settings?.notifyConfirmed ?? true,
    notifyRefined: settings?.notifyRefined ?? true,
    workspaces: memberships.map(member => ({
      id: member.organizationId,
      name: member.organization.name,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      canManage: member.role === "OWNER" || member.role === "ADMIN",
    })),
  };
}

export async function updateAccountSettings(userId: string, changes: SettingsPatch) {
  const db = database();
  await db.recruiterSettings.upsert({
    where: { userId },
    create: { userId, ...changes },
    update: changes,
  });
  return getAccountSettings(userId);
}

/** Exactly one organization can be created by each user. Its first member
 * is server-assigned OWNER; never accept a role from the client. */
export async function createOrganization(userId: string, name: string) {
  const db = database();
  const organization = await db.organization.create({
    data: {
      name, ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
    },
  });
  return organization;
}

/** Only an existing OWNER / ADMIN membership may rename an organization. */
export async function renameOrganization(userId: string, organizationId: string, name: string) {
  const db = database();
  const updated = await db.organization.updateMany({
    where: {
      id: organizationId,
      members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } },
    },
    data: { name },
  });
  if (!updated.count) return false;
  return true;
}

export async function getRecruiterNotifications(userId: string) {
  const db = database();
  const [items, unread] = await Promise.all([
    db.recruiterNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.recruiterNotification.count({ where: { userId, readAt: null } }),
  ]);
  return { items: items.map(item => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    createdAt: item.createdAt.toISOString(),
    readAt: item.readAt?.toISOString() ?? null,
    sessionId: item.sessionId,
  })), unread };
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  return database().recruiterNotification.updateMany({
    where: { userId, id: { in: ids } },
    data: { readAt: new Date() },
  });
}
