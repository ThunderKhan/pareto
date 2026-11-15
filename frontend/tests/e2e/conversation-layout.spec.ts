import { expect, test } from "@playwright/test";

/**
 * UI-only regression using an intercepted response: never mutates real searches
 * or requires real model-provider behavior. Auth is still required for the page.
 */
test("search transcript uses compact user bubbles and unboxed assistant errors", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Dedicated recruiter credentials required.");
    test.skip(true, "Needs a dedicated authenticated recruiter account.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });
  await page.goto("/dashboard/search");
  await page.route("**/api/v1/search", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 403, contentType: "application/json",
      body: JSON.stringify({ error: "Cross-origin requests are not allowed." }),
    });
  });

  const input = page.getByLabel("Hiring brief");
  await input.fill("Find me a candidate");
  await input.press("Enter");
  const request = page.getByRole("group", { name: "Your message" });
  await expect(request).toContainText("Find me a candidate");
  const error = page.locator(".pareto-chat__error");
  await expect(error).toContainText("Cross-origin requests are not allowed.");
  await expect(error).toContainText("same public hostname");

  const metric = await page.evaluate(() => {
    const message = document.querySelector(".pareto-chat__request")!;
    const timeline = document.querySelector(".pareto-chat__timeline")!;
    const alert = document.querySelector(".pareto-chat__error")!;
    const css = getComputedStyle(alert);
    return {
      messageWidth: message.getBoundingClientRect().width,
      timelineWidth: timeline.getBoundingClientRect().width,
      background: css.backgroundColor,
      border: css.borderTopWidth,
    };
  });
  expect(metric.messageWidth).toBeLessThan(metric.timelineWidth * .85);
  expect(metric.background).toBe("rgba(0, 0, 0, 0)");
  expect(metric.border).toBe("0px");

  await page.evaluate(() => { document.documentElement.dataset.paretoEffectiveTheme = "dark"; });
  await expect(error).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  await expect(page.getByLabel("Candidate search composer")).toBeVisible();
});
