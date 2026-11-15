import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") {
      throw new Error("Authenticated session redirect and workspace motion tests require dedicated E2E credentials.");
    }
    test.skip(true, "Dedicated Supabase recruiter credentials are not configured.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });
}

test("signed-out root stays on public landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Find your next match." })).toBeVisible();
});

test("signed-in root routes server-side to dashboard without displaying the landing page", async ({ page }) => {
  await signIn(page);
  const navigation = await page.goto("/");
  expect(navigation?.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".pareto-app")).toBeVisible();
  await expect(page.locator(".v2-page")).toHaveCount(0);

  // Both refresh and a repeat root visit must respect the existing cookie session.
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("sidebar animates without losing navigation names; header has only actions", async ({ page }) => {
  await signIn(page);
  const app = page.locator(".pareto-app");
  const sidebar = page.locator(".pareto-sidebar");
  const toggle = page.getByRole("button", { name: "Collapse sidebar" });

  await expect(page.locator(".pareto-topbar__crumb, .pareto-topbar__slash")).toHaveCount(0);
  await expect(page.locator(".pareto-topbar__right").getByRole("link", { name: "New search" })).toBeVisible();
  await expect(page.locator(".pareto-topbar__right").getByLabel(/Notifications/)).toBeVisible();
  await expect(page.locator(".pareto-topbar")).toHaveCSS("border-bottom-width", "0px");

  await expect(app).not.toHaveClass(/pareto-app--collapsed/);
  await expect(sidebar).toHaveCSS("width", "264px");
  await toggle.click();
  await expect(app).toHaveClass(/pareto-app--collapsed/);
  await expect(sidebar).toHaveCSS("width", "78px");
  await expect(page.getByRole("link", { name: "Candidates" })).toBeVisible();
  const transition = await app.evaluate(el => getComputedStyle(el).transitionProperty);
  expect(transition).toContain("grid-template-columns");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(sidebar).toHaveCSS("width", "264px");
  await expect(page.getByRole("link", { name: "AI candidate search" })).toBeVisible();

  // On mobile, the navigation button is essential even when breadcrumbs are gone.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await expect(page.locator(".pareto-topbar__right").getByRole("link", { name: "New search" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("reference picker and criteria drawer animate in and out; reduced motion is immediate", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/search");

  const reference = page.getByRole("button", { name: "Reference", exact: true });
  await reference.click();
  const picker = page.getByRole("dialog", { name: "Find a reference candidate" });
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS("animation-name", "pareto-picker-in");
  await picker.getByRole("button", { name: "Close reference picker" }).click();
  await expect(picker).toHaveClass(/pareto-reference-picker--closing/);
  await expect(picker).toHaveCount(0);

  await page.getByRole("button", { name: "Enter criteria manually" }).click();
  const draft = page.getByRole("dialog", { name: "Review draft criteria" });
  await expect(draft).toBeVisible();
  await expect(draft).toHaveCSS("animation-name", "pareto-drawer-in");
  await draft.getByRole("button", { name: "Discard draft" }).click();
  await expect(page.locator(".pareto-draft-layer")).toHaveClass(/pareto-draft-layer--closing/);
  await expect(draft).toHaveCount(0);
  await expect(page.locator(".pareto-chat__results")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await reference.click();
  await expect(picker).toBeVisible();
  await expect(picker).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await page.getByRole("button", { name: "Enter criteria manually" }).click();
  await expect(draft).toBeVisible();
  await expect(draft).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  await expect(draft).toHaveCount(0);
});
