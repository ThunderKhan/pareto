import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

/** Real browser verification; CI skips only when its dedicated Supabase demo credentials are absent. */
test("confirmed search previews are measured, review-only and discardable", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Live authentication credentials are missing.");
    test.skip(true, "Requires dedicated confirmed Supabase demo recruiter and seeded owner-scoped PostgreSQL.");
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });

  await page.goto("/dashboard/search");
  await expect(page.getByTestId("search-health")).toHaveCount(0);
  await expect(page.getByTestId("what-if")).toHaveCount(0);
  await expect(page.getByTestId("near-match")).toHaveCount(0);

  const criteria = [
    { field: "role", value: "Senior Java Developer", mode: "required" },
    { field: "city", value: "Hyderabad", mode: "required" },
    { field: "experience", minMonths: 72, maxMonths: 120, mode: "required" },
    { field: "notice", maxDays: 30, mode: "required" },
  ];
  const saved = await page.context().request.post("/api/v1/search", {
    data: { action: "confirm", requestId: randomUUID(), criteria },
  });
  expect(saved.status()).toBe(200);
  const { sessionId, version } = await saved.json() as { sessionId: string; version: number };
  expect(version).toBe(1);

  let analysisRequests = 0;
  page.on("request", request => {
    if (/\/api\/v1\/search\?(?:diagnostics|counterfactual)=/.test(request.url())) analysisRequests++;
  });
  await page.goto("/dashboard/search?session=" + encodeURIComponent(sessionId));
  const results = page.getByRole("region", { name: "Confirmed results" });
  await expect(results).toContainText("3 eligible");
  expect(analysisRequests).toBe(0); // No eager analysis of private records.

  await results.getByTestId("secondary-search-tools").locator("summary").click();
  const health = results.getByTestId("search-health");
  await health.getByRole("button", { name: /Analyze search health/ }).click();
  await expect(health.getByRole("heading", { name: "Search health" })).toBeVisible();
  await expect(health.getByLabel("Measured candidate counts")).toContainText("3");
  await expect(health.getByRole("heading", { name: "Measured adjustments" })).toBeVisible();
  await expect(health.getByRole("button", { name: "Review change" }).first()).toBeVisible();
  await health.getByRole("button", { name: "Review change" }).first().click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible();
  await page.getByRole("button", { name: "Discard draft" }).click();

  const scenario = results.getByTestId("what-if");
  await scenario.getByRole("button", { name: /Try a what-if scenario/ }).click();
  await scenario.getByLabel("Maximum (days)").fill("45");
  await scenario.getByRole("button", { name: "Run simulation" }).click();
  await expect(scenario.getByText(/3 → 4/)).toBeVisible();
  const matrix = scenario.getByRole("table", { name: "Complete candidate status transitions" });
  await expect(matrix).toBeVisible();
  await expect(matrix.getByRole("row")).toHaveCount(4);
  await expect(scenario.getByText(/Newly eligible: 1 · No longer eligible: 0/)).toBeVisible();
  await expect(scenario).toContainText("Meera Iyer");
  await scenario.getByRole("button", { name: "Apply for review" }).click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible();
  await page.getByRole("button", { name: "Discard draft" }).click();

  const dev = results.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Dev Shah", exact: true }),
  });
  await expect(dev).toBeVisible();
  await expect(dev.locator(".pareto-result__evidence-preview")).toContainText("Notice period");
  await expect(dev.locator(".pareto-result__status")).toContainText(/Ineligible|Needs review/);
  const near = dev.getByTestId("near-match");
  await near.getByRole("button", { name: /Why a near match/ }).click();
  await expect(near.getByText(/60 days/).first()).toBeVisible();
  await expect(near).toContainText("Preview");
  await near.getByRole("button", { name: "Review criteria changes" }).click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible();
  await page.getByRole("button", { name: "Discard draft" }).click();

  // All reviews were drafts. No hypothetical change was persisted.
  const persisted = await page.context().request.get("/api/v1/search?session=" + encodeURIComponent(sessionId));
  expect(persisted.status()).toBe(200);
  const latest = await persisted.json() as { version: number; counts: { ELIGIBLE: number } };
  expect(latest.version).toBe(1);
  expect(latest.counts.ELIGIBLE).toBe(3);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
