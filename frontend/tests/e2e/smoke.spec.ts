import { expect, test } from "@playwright/test";

test("public landing, navigation and health", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Find your next match." })).toBeVisible();
  await expect(page.locator(".v2-hero-actions .v2-btn--primary")).toHaveText("Get started free");
  await expect(page.locator(".v2-hero-actions .v2-btn--primary")).toHaveAttribute("href", "/signup");
  await expect(page.locator(".v2-hero-actions .v2-btn--secondary")).toHaveAttribute("href", "#how-it-works");
  await expect(page.locator(".v2-hero-actions svg, .v2-header-actions a svg")).toHaveCount(0);
  await expect(page.locator(".v2-login")).toHaveText("Login");
  await expect(page.locator(".v2-login")).toHaveAttribute("href", "/login");
  await expect(page.locator(".v2-header-cta")).toHaveText("Get started free");
  await expect(page.locator(".v2-header-cta")).toHaveAttribute("href", "/signup");
  await expect(page.locator(".v2-hero-actions").getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#how-it-works");
  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ status: "ok", phase: "scaffold" });
});

test("public workflow shortlist and similarity remain after evidence panel removal", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#preview")).toHaveCount(0);
  await expect(page.locator(".v2-steps, .v2-candidates")).toHaveCount(0);
  const results = page.locator("#how-it-works-step-3");
  await expect(results.locator(".v2-mini-result")).toHaveCount(3);
  await expect(results).toContainText("Eligible");
  await expect(results).toContainText("Excluded");
  await expect(results).toContainText("Needs review");
  await page.getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Explore matching" }).click();
  await expect(page).toHaveURL(/#similar$/);
  await expect(page.locator("#similar")).toContainText("COMPARABLE PROFILES");
});


test("signup and login pages exist and explain unconfigured auth", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Get started with Pareto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  const setupNotice = page.getByRole("status").filter({ hasText: "Supabase sign-in is not configured" });
  if (await setupNotice.count()) {
    await expect(setupNotice).toContainText("frontend/.env.local");
    await expect(setupNotice).toContainText("NEXT_PUBLIC_SUPABASE_");
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
  }
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
