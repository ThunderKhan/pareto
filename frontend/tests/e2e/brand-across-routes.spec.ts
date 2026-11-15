import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Public-brand assertions execute without demo credentials.
 * Signed-in route coverage is opt-in and never uses real candidate mutations.
 */
async function capture(page: Page, info: TestInfo, label: string) {
  // Keep the actual screenshots as files so CI's artifact uploader retains
  // successful runs, not just failed traces or HTML-reporter attachments.
  const path = info.outputPath(label + ".png");
  await page.screenshot({ path });
  await info.attach(label, { path, contentType: "image/png" });
}

test("landing, login and signup use the same paper, ink and STK Earl design system", async ({ page }, info) => {
  await page.goto("/");
  const landing = page.locator(".v2-page");
  await expect(landing).toBeVisible();
  await expect(landing).toHaveCSS("background-color", "rgb(255, 253, 249)");
  const landingFace = await page.locator(".v2-hero h1").evaluate(node => getComputedStyle(node).fontFamily);
  expect(landingFace).toContain("Pareto STK Earl");
  await capture(page, info, "pareto-landing-desktop");

  for (const route of ["/login", "/signup"]) {
    await page.goto(route);
    const shell = page.locator(".auth-shell");
    await expect(shell).toHaveCSS("background-color", "rgb(255, 253, 249)");
    await expect(page.locator(".auth-sheet")).toHaveCSS("background-color", "rgb(255, 253, 249)");
    const headingFace = await page.locator(".auth-intro h1").evaluate(node => getComputedStyle(node).fontFamily);
    expect(headingFace).toContain("Pareto STK Earl");
    await expect(page.locator(".auth-submit")).toHaveCSS("background-color", "rgb(2, 14, 36)");
    await capture(page, info, "pareto-" + route.slice(1) + "-desktop");
  }

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await capture(page, info, "pareto-signup-mobile");
  await page.goto("/");
  await expect(landing).toBeVisible();
  const targetHeight = await page.locator(".v2-hero-actions .v2-btn").first()
    .evaluate(node => node.getBoundingClientRect().height);
  expect(targetHeight).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await capture(page, info, "pareto-landing-mobile");

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/login", "/signup"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        `${route} must not overflow at ${width}px`).toBe(false);
      await capture(page, info, `pareto-${route === "/" ? "landing" : route.slice(1)}-${width}`);
    }
  }
});

test("authenticated dashboard surfaces retain common typography, focus and responsive layout", async ({ page }, info) => {
  const email = process.env.PARETO_E2E_EMAIL, password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Dedicated recruiter credentials are required.");
    test.skip(true, "Requires an isolated recruiter account and live Supabase environment.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });
  const routes = [
    ["/dashboard", ".pareto-overview-history"],
    ["/dashboard/search", ".pareto-chat"],
    ["/dashboard/candidates", ".pareto-candidates"],
    ["/dashboard/candidates/import", ".import-workspace"],
    ["/dashboard/profile", ".pareto-profile-card"],
  ] as const;

  for (const [path, selector] of routes) {
    await page.goto(path);
    await expect(page.locator(selector)).toBeVisible();
    const tokens = await page.locator(".pareto-app").evaluate(node => {
      const style = getComputedStyle(node);
      return { paper: style.getPropertyValue("--ws-paper").trim(), ink: style.getPropertyValue("--ws-ink").trim() };
    });
    expect(tokens.paper.toLowerCase()).toBe("#fffdf9");
    expect(tokens.ink.toLowerCase()).toBe("#020e24");
    await capture(page, info, "pareto-" + path.replaceAll("/", "-").slice(1) + "-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    await capture(page, info, "pareto-" + path.replaceAll("/", "-").slice(1) + "-mobile");
    await page.setViewportSize({ width: 1280, height: 800 });
  }
});
