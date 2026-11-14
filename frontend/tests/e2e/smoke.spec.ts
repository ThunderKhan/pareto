import { expect, test } from "@playwright/test";

test("public landing, navigation and health", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /find the right talent.*know why/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Log in" }).first()).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Explore the illustrative search preview" })).toHaveAttribute("href", "#preview");
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ status: "ok", phase: "scaffold" });
});

test("synthetic what-if preview computes from stated records", async ({ page }) => {
  await page.goto("/#preview");
  // The region is labelled on a div; locate it by its explicit accessible label.
  const panel = page.locator('[aria-label="Interactive synthetic candidate matching example"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator(".preview-panel__summary strong")).toContainText("1");
  const candidateB = panel.locator(".demo-result").filter({ hasText: "Candidate B" });
  await expect(candidateB).toContainText("Does not match");
  await panel.getByRole("button", { name: "60 days" }).click();
  await expect(panel.locator(".preview-panel__summary strong")).toContainText("2");
  await expect(candidateB).toContainText("Eligible");
  await expect(panel.locator(".demo-result").filter({ hasText: "Candidate C" })).toContainText("Needs review");
  await panel.getByRole("button", { name: "30 days" }).click();
  await expect(candidateB).toContainText("Does not match");
});

test("signup and login pages exist and explain unconfigured auth", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Get started with Pareto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to Pareto" })).toBeVisible();
});

test("mobile navigation and reduced-motion layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});

test("signed-out visitors cannot search or read candidate data", async ({ page, request }) => {
  await page.goto("/dashboard/search");
  await expect(page).toHaveURL(/\/login/);
  expect((await request.get("/api/v1/search?q=Asha")).status()).toBe(401);
  expect((await request.post("/api/v1/search", { data: { action: "interpret", prompt: "Find Java developers" } })).status()).toBe(401);
});
