import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { database } from "../../search/db";
import { reserveDurableAiAttempt } from "./durable-quota";

describe.skipIf(!process.env.PARETO_TEST_DATABASE_URL)("durable PostgreSQL AI attempt quotas", () => {
  it("atomically restricts concurrent calls for one owner across claims", async () => {
    const owner = randomUUID();
    const attempts = await Promise.allSettled(Array.from({ length: 6 }, () =>
      reserveDurableAiAttempt(owner, { owner: 2, global: 100000 })));
    expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(2);
    expect(attempts.filter(x => x.status === "rejected")).toHaveLength(4);
    const rows = await database().$queryRaw<Array<{ attempts: number }>>`
      SELECT "attempts" FROM "AiRequestQuota"
      WHERE "scope" = 'owner' AND "subject" = ${owner}
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].attempts).toBe(2);
  });
  it("enforces the shared global maximum across different owners", async () => {
    const current = await database().$queryRaw<Array<{ attempts: number }>>`
      SELECT "attempts" FROM "AiRequestQuota"
      WHERE "scope" = 'global' AND "subject" = '__global__'
        AND "windowStart" = date_trunc('hour',CURRENT_TIMESTAMP)::timestamp(3)
    `;
    const currentValue = current[0]?.attempts ?? 0;
    const maximum = currentValue + 1;
    await reserveDurableAiAttempt(randomUUID(), { owner: 5, global: maximum });
    await expect(reserveDurableAiAttempt(randomUUID(), { owner: 5, global: maximum }))
      .rejects.toMatchObject({ code: "BUDGET_EXCEEDED", retryable: false });
  });
  it("rejects invalid identities before touching the database", async () => {
    await expect(reserveDurableAiAttempt("has spaces")).rejects.toMatchObject({ code: "BAD_INPUT" });
  });
});
