import { expect, test } from "@playwright/test";

test("signup uses the Pareto split layout and keeps real, accessible form fields", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1, name: "Create an account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pareto home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("complementary", { name: "Pareto recruitment intelligence" })).toBeVisible();
  await expect(page.locator(".auth-art__fallback")).toBeAttached();
  await expect(page.getByRole("heading", { name: /Look beyond.*the résumé/i })).toBeVisible();

  await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeVisible();
  await expect(page.getByLabel("First name")).toHaveAttribute("autocomplete", "given-name");
  await expect(page.getByLabel("Last name")).toHaveAttribute("autocomplete", "family-name");
  await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("button", { name: /apple/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /windows/i })).toHaveCount(0);

  const notice = page.getByRole("status").filter({ hasText: "Supabase sign-in is not configured" });
  if (await notice.count()) {
    await expect(notice).toContainText("frontend/.env.local");
    await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Create account" })).toBeDisabled();
  }
});

test("login reuses the split layout, supports Google, and preserves account recovery", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByLabel("First name")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
});

test("auth screens stay readable on narrow viewports and disable shader for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/signup");
    await expect(page.locator(".auth-art__shader-wrap")).toHaveCount(0);
    const dims = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dims.document, `auth page overflow at ${width}px`).toBeLessThanOrEqual(dims.viewport + 1);
    if (width < 960) await expect(page.locator(".auth-art")).toBeHidden();
    else await expect(page.locator(".auth-art")).toBeVisible();
  }
});

test("auth pages have a static fallback without motion even if the GPU shader does not render", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.locator(".auth-art__fallback")).toBeAttached();
  const bg = await page.locator(".auth-art__fallback").evaluate(node => getComputedStyle(node).backgroundImage);
  expect(bg).toContain("gradient");
});
