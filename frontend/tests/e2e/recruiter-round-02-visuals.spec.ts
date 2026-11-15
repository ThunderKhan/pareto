import { expect, test } from "@playwright/test";

/**
 * Authenticated visual regressions for Round 02 #01–#05.
 * Does not mutate candidate searches, notification preferences or user theme.
 * Runs when a dedicated Supabase E2E recruiter is configured.
 */
test("Parito composition, aligned notifications, graphite theme and chat avatar", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Live E2E credentials are required.");
    test.skip(true, "Needs a dedicated authenticated Supabase test recruiter.");
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });

  await page.goto("/dashboard/profile");
  const avatar = page.locator(".pareto-profile-intro .pareto-avatar--large");
  await expect(avatar).toBeVisible();
  const artwork = avatar.locator("img");
  await expect(artwork).toHaveAttribute("src", "/mascot/pareto-mascot.svg");
  const geometry = await avatar.evaluate(frame => {
    const img = frame.querySelector("img");
    if (!img) return null;
    const outer = frame.getBoundingClientRect();
    const inner = img.getBoundingClientRect();
    return {
      left: inner.left - outer.left,
      top: inner.top - outer.top,
      right: outer.right - inner.right,
      bottom: outer.bottom - inner.bottom,
      objectFit: getComputedStyle(img).objectFit,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.objectFit).toBe("contain");
  expect(Math.min(geometry!.left, geometry!.right, geometry!.top, geometry!.bottom)).toBeGreaterThanOrEqual(0);

  const checkboxRows = page.locator(".pareto-setting-checkbox");
  await expect(checkboxRows).toHaveCount(2);
  for (const label of await checkboxRows.all()) {
    const offset = await label.evaluate(row => {
      const input = row.querySelector("input");
      const caption = row.querySelector("span");
      if (!input || !caption) return Number.POSITIVE_INFINITY;
      const a = input.getBoundingClientRect(), b = caption.getBoundingClientRect();
      return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
    });
    expect(offset).toBeLessThanOrEqual(3);
  }

  // Test the actual dark CSS without changing the recruiter's stored preference.
  await page.evaluate(() => { document.documentElement.dataset.paretoEffectiveTheme = "dark"; });
  await expect(page.locator(".pareto-app")).toHaveCSS("background-color", "rgb(11, 12, 15)");
  await expect(page.locator(".pareto-sidebar")).toHaveCSS("background-color", "rgb(20, 22, 27)");
  await expect(page.locator(".pareto-profile-card")).toHaveCSS("background-color", "rgb(23, 25, 30)");
  await page.evaluate(() => { document.documentElement.dataset.paretoEffectiveTheme = "light"; });
  await expect(page.locator(".pareto-app")).not.toHaveCSS("background-color", "rgb(11, 12, 15)");

  await page.goto("/dashboard/search");
  const hero = page.locator(".pareto-chat--fresh .pareto-search-orb .pareto-avatar--hero");
  await expect(hero.locator("img")).toHaveAttribute("src", "/mascot/pareto-mascot.svg");

  await page.getByRole("button", { name: "Enter criteria manually" }).click();
  const review = page.getByRole("dialog", { name: "Review draft criteria" });
  await expect(review.getByRole("heading", { name: "Review draft criteria" })).toBeVisible();
  await expect(page.locator(".pareto-chat__draft")).toHaveCount(0);
  await expect(review.getByRole("button", { name: "Discard draft" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(review).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await review.getByRole("button", { name: "Discard draft" }).click();
  await expect(review).toHaveCount(0);

  // Assistant content still carries Parito when a previously confirmed session exists.
  const response = await page.context().request.get("/api/v1/search?history=1");
  expect(response.status()).toBe(200);
  const history = await response.json() as { id: string }[];
  if (history.length) {
    await page.goto("/dashboard/search?session=" + encodeURIComponent(history[0].id));
    await expect(page.locator(".pareto-chat__assistant-turn .pareto-avatar--chat img"))
      .toHaveAttribute("src", "/mascot/pareto-mascot.svg");
  }
});
