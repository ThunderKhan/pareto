import { expect, test } from "@playwright/test";

const sizes = [
  { label: "narrow-mobile", width: 320, height: 700 },
  { label: "mobile", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 1000 },
  { label: "wide-desktop", width: 1920, height: 1080 },
] as const;

test("landing routes and anchor navigation lead to real destinations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /find the right talent.*know why/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Log in" }).first()).toHaveAttribute("href", "/login");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#evidence$/);
  await expect(page.getByRole("region", { name: "Interactive synthetic candidate matching example" })).toHaveCount(1);
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Get started with Pareto" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to Pareto" })).toBeVisible();
});

test("preview recomputes every outcome from declared sample records", async ({ page }) => {
  await page.goto("/#preview");
  const panel = page.getByRole("region", { name: "Interactive synthetic candidate matching example" });
  const candidateA = panel.locator(".demo-result").filter({ hasText: "Candidate A" });
  const candidateB = panel.locator(".demo-result").filter({ hasText: "Candidate B" });
  const candidateC = panel.locator(".demo-result").filter({ hasText: "Candidate C" });
  await expect(panel.getByTestId("eligible-count")).toContainText("1");
  await expect(candidateA).toHaveAttribute("data-status", "match");
  await expect(candidateB).toHaveAttribute("data-status", "fail");
  await expect(candidateC).toHaveAttribute("data-status", "unknown");
  await candidateB.getByText("View criterion breakdown").click();
  await expect(candidateB.locator(".demo-result__details li").filter({ hasText: "Joining window" })).toBeVisible();
  await expect(candidateB.getByText("Misses · 60 days")).toBeVisible();
  await panel.getByRole("button", { name: "60 days" }).click();
  await expect(panel.getByTestId("eligible-count")).toContainText("2");
  await expect(candidateB).toHaveAttribute("data-status", "match");
  await expect(candidateB.getByText("Meets · 60 days")).toBeVisible();
  await expect(candidateC).toHaveAttribute("data-status", "unknown");
  await panel.getByRole("button", { name: "30 days" }).click();
  await expect(panel.getByTestId("eligible-count")).toContainText("1");
  await expect(candidateB).toHaveAttribute("data-status", "fail");
});

test("mobile menu supports keyboard, escape and outside-dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await toggle.click();
  // Click outside the sticky header/nav at a fixed, visible viewport point.
  await page.mouse.click(380, 820);
  await expect(menu).toHaveCount(0);
  await toggle.click();
  await menu.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#evidence$/);
  await expect(menu).toHaveCount(0);
});

test("workflow tabs remain functional on mobile and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#evidence");
  const workflow = page.getByRole("group", { name: "Workflow stages" });
  await expect(workflow.getByRole("button")).toHaveCount(6);
  const explain = workflow.getByRole("button", { name: /05 \/ explain/i });
  await explain.focus();
  await page.keyboard.press("Enter");
  await expect(explain).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "See reasons, not just ranks." })).toBeVisible();
});

test("reduced motion eliminates pinned dead scroll and preserves content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const story = page.locator(".narrative");
  const geometry = await story.evaluate((element) => {
    const styles = getComputedStyle(element);
    const sticky = element.querySelector(".narrative__sticky")!;
    return { height: element.getBoundingClientRect().height, position: getComputedStyle(sticky).position, animation: getComputedStyle(element.querySelector("h2")!).animationName, styleHeight: styles.height };
  });
  expect(geometry.position).not.toBe("sticky");
  expect(geometry.height).toBeLessThan(1900);
  expect(geometry.animation).toBe("none");
  await expect(page.locator(".approach-section h2")).toBeVisible();
  await expect(page.locator(".preview-section h2")).toBeVisible();
  await story.getByRole("button", { name: /06 \/ refine/i }).click();
  await expect(story.getByRole("heading", { name: "Change the request, not the workflow." })).toBeVisible();
});

for (const size of sizes) {
  test(`responsive journey and overflow at ${size.label}`, async ({ page }, testInfo) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/");
    await expect(page.locator(".landing-hero h1")).toBeVisible();
    await expect(page.locator(".approach-section h2")).toBeVisible();
    await expect(page.locator(".preview-section h2")).toBeVisible();
    const anchors = ["approach", "evidence", "preview", "principles"] as const;
    await page.screenshot({ path: testInfo.outputPath(`${size.label}-hero.png`) });
    for (const anchor of anchors) {
      await page.locator(`#${anchor}`).scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`${size.label}-${anchor}.png`) });
      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(overflow.doc, `Horizontal overflow at ${size.label}/${anchor}`).toBeLessThanOrEqual(overflow.viewport + 1);
    }
    if (size.width >= 768) {
      const geometry = await page.locator(".narrative").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { start: window.scrollY + rect.top, span: Math.max(0, rect.height - window.innerHeight) };
      });
      for (const fraction of [0.14, 0.51, 0.87]) {
        await page.evaluate((target) => window.scrollTo({ top: target, behavior: "instant" }), geometry.start + geometry.span * fraction);
        await page.waitForTimeout(80);
        await page.screenshot({ path: testInfo.outputPath(`${size.label}-story-${Math.round(fraction * 100)}.png`) });
      }
    }
    expect(runtimeErrors).toEqual([]);
  });
}
