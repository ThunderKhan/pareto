import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("Frontier preview never exposes private candidate data while signed out", async ({ request }) => {
  const response = await request.post("/api/v1/search", {
    data: { action: "frontier", sessionId: "nonexistent-search", expectedVersion: 1 },
  });
  expect(response.status()).toBe(401);
  const body = await response.json() as { error: string };
  expect(body.error).toMatch(/Sign in/i);
});

/** Credentialed browser test runs with a dedicated owner-scoped seeded demo account. */
test("Frontier shows measured strategies and only saves after explicit confirmation", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Live test credentials missing");
    test.skip(true, "Requires dedicated seeded Supabase recruiter credentials.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });

  await page.goto("/dashboard/search");
  await expect(page.getByTestId("pareto-frontier")).toHaveCount(0);
  const criteria = [
    { field: "role", value: "Senior Java Developer", mode: "required" },
    { field: "city", value: "Hyderabad", mode: "required" },
    { field: "experience", minMonths: 72, maxMonths: 120, mode: "required" },
    { field: "notice", maxDays: 30, mode: "required" },
  ];
  const confirmation = await page.context().request.post("/api/v1/search", {
    data: { action: "confirm", requestId: randomUUID(), criteria },
  });
  expect(confirmation.status()).toBe(200);
  const { sessionId, version } = await confirmation.json() as { sessionId: string; version: number };
  await page.goto("/dashboard/search?session=" + encodeURIComponent(sessionId));
  const frontier = page.getByTestId("pareto-frontier");
  await expect(frontier).toBeVisible();
  const explore = frontier.getByRole("button", { name: /Explore hiring strategies/ });
  await explore.click();
  await expect(frontier.getByRole("heading", { name: "Strategies worth considering" })).toBeVisible();
  await expect(frontier.getByText(/non-dominated in the evaluated set/)).toBeVisible();
  const firstCard = frontier.locator(".frontier-card").first();
  await expect(firstCard).toBeVisible();
  await firstCard.getByText("Review candidate impact").click();
  await expect(firstCard).toContainText("measured against current records");
  await firstCard.getByRole("button", { name: /Review this strategy/ }).click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible();

  const before = await page.context().request.get("/api/v1/search?session=" + encodeURIComponent(sessionId));
  expect(before.status()).toBe(200);
  expect((await before.json() as { version: number }).version).toBe(version);
  await page.getByRole("button", { name: "Discard draft" }).click();

  const stale = await page.context().request.post("/api/v1/search", {
    data: { action: "frontier", sessionId, expectedVersion: version + 1 },
  });
  expect(stale.status()).toBe(409);
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
