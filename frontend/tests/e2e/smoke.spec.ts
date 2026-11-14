import { expect, test } from "@playwright/test";

test("foundation homepage and health endpoint", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "pareto." })).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ status: "ok", phase: "scaffold" });
});
