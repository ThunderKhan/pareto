import { database } from "../../search/db";
import { AiFailure } from "../contracts/errors";

function cap(name: string, fallback: number, maximum: number) {
  const raw = process.env[name];
  const n = raw === undefined ? fallback : Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= maximum ? n : fallback;
}
export const durableQuotaEnabled = () => process.env.AI_DURABLE_QUOTA_ENABLED === "true";

/** Atomically reserve global and owner attempts, including fallback calls.
 * Never refund failed provider attempts. This counts API calls, not USD.
 */
export async function reserveDurableAiAttempt(
  ownerId: string,
  limits = {
    owner: cap("AI_MAX_CALLS_PER_RECRUITER_HOUR", 40, 10000),
    global: cap("AI_MAX_GLOBAL_CALLS_PER_HOUR", 2000, 500000),
  },
): Promise<void> {
  if (!ownerId || ownerId.length > 128 || /\s/.test(ownerId))
    throw new AiFailure("BAD_INPUT", false);
  if (!Number.isInteger(limits.owner) || limits.owner < 1 ||
      !Number.isInteger(limits.global) || limits.global < 1)
    throw new AiFailure("BAD_INPUT", false);
  try {
    await database().$transaction(async tx => {
      // Always lock global before owner to prevent concurrent deadlock.
      for (const [scope, subject, max] of [
        ["global", "__global__", limits.global],
        ["owner", ownerId, limits.owner],
      ] as const) {
        await tx.$executeRaw`
          INSERT INTO "AiRequestQuota" ("scope","subject","windowStart","attempts")
          VALUES (${scope},${subject},date_trunc('hour',CURRENT_TIMESTAMP)::timestamp(3),0)
          ON CONFLICT DO NOTHING
        `;
        const updated = await tx.$executeRaw`
          UPDATE "AiRequestQuota" SET "attempts" = "attempts" + 1
          WHERE "scope" = ${scope} AND "subject" = ${subject}
            AND "windowStart" = date_trunc('hour',CURRENT_TIMESTAMP)::timestamp(3)
            AND "attempts" < ${max}
        `;
        if (updated !== 1) throw new AiFailure("BUDGET_EXCEEDED", false);
      }
    }, { timeout: 5000, maxWait: 2000 });
  } catch (error) {
    if (error instanceof AiFailure) throw error;
    // Database outage must not enable unlimited billable provider calls.
    throw new AiFailure("BUDGET_EXCEEDED", false);
  }
}
