import { expect, test } from "@playwright/test";

test("homepage uses loaded, self-hosted typography rather than CSS-only font names", async ({ page }, testInfo) => {
  const failedFonts: string[] = [];
  const fontResponses: string[] = [];
  page.on("requestfailed", (request) => {
    if (/\\.woff2?(?:\\?|$)/.test(request.url())) failedFonts.push(request.url());
  });
  page.on("response", (response) => {
    if (/\\.woff2?(?:\\?|$)/.test(response.url())) {
      if (response.ok()) fontResponses.push(response.url());
      else failedFonts.push(response.url() + " status=" + response.status());
    }
  });
  await page.goto("/");
  const metrics = await page.evaluate(async () => {
    await document.fonts.ready;
    const get = (selector: string) => {
      const node = document.querySelector(selector);
      if (!node) throw new Error("Missing typography target " + selector);
      const computed = getComputedStyle(node);
      return {
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        fontSynthesis: computed.fontSynthesis,
      };
    };
    return {
      hero: get(".v2-hero h1"),
      italicEmphasis: get(".v2-hero h1 em"),
      section: get(".v2-problem .v2-section-intro h2"),
      body: get(".v2-hero-copy > p"),
      nav: get(".v2-desktop-nav"),
      action: get(".v2-hero-actions .v2-btn"),
      candidate: get(".v2-window-heading h3"),
      faces: [...document.fonts].map(({family, style, weight, status}) => ({family, style, weight, status})),
      mediaFonts: performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => /\\.woff2?(?:\\?|$)/.test(url)),
    };
  });
  expect(metrics.hero.fontFamily).toMatch(/__Bitter_/);
  expect(metrics.section.fontFamily).toMatch(/__Bitter_/);
  expect(metrics.body.fontFamily).toMatch(/__Inter_/);
  expect(metrics.nav.fontFamily).toMatch(/__Inter_/);
  expect(metrics.action.fontFamily).toMatch(/__Inter_/);
  expect(metrics.candidate.fontFamily).toMatch(/__Inter_/);
  expect(metrics.italicEmphasis.fontStyle).toBe("normal");
  expect(metrics.hero.fontSynthesis).toBe("none");
  expect(metrics.faces.some((face) => face.family.includes("__Bitter_") && !face.family.includes("Fallback") && face.status === "loaded")).toBe(true);
  expect(metrics.faces.some((face) => face.family.includes("__Inter_") && !face.family.includes("Fallback") && face.status === "loaded")).toBe(true);
  expect(metrics.mediaFonts.length).toBeGreaterThanOrEqual(2);
  expect(fontResponses.length).toBeGreaterThanOrEqual(2);
  expect(failedFonts).toEqual([]);
  expect(metrics.mediaFonts.some((url) => /stkearl/i.test(url))).toBe(false);
  await testInfo.attach("computed-typography.json", { body: JSON.stringify(metrics, null, 2), contentType: "application/json" });
});

test("hero, navigation and public auth destinations are connected", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /find the right people.*understand every match/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start searching" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#how-it-works");
  await expect(page.getByRole("link", { name: "Log in" }).first()).toHaveAttribute("href", "/login");
  await expect(page.locator(".v2-hero-stage .v2-criteria-item")).toHaveCount(5);
  await expect(page.locator(".v2-hero-stage .v2-criteria-item svg")).toHaveCount(5);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: /from a hiring brief to.*a reasoned shortlist/i })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Get started with Pareto" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to Pareto" })).toBeVisible();
});

test("a single workflow product window changes with accessible tabs", async ({ page }, testInfo) => {
  await page.goto("/#how-it-works");
  const tabs = page.getByRole("tablist", { name: "Recruitment search workflow" });
  await expect(tabs.getByRole("tab")).toHaveCount(3);
  await expect(tabs.getByRole("tab", { name: /describe/i })).toHaveAttribute("aria-selected", "true");
  await page.locator(".v2-process-window").screenshot({ path: testInfo.outputPath("workflow-describe.png") });
  const review = tabs.getByRole("tab", { name: /review & confirm/i });
  await review.click();
  await expect(review).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".v2-process-window")).toContainText("Proposed criteria");
  await page.locator(".v2-process-window").screenshot({ path: testInfo.outputPath("workflow-review.png") });
  await page.locator(".v2-process-window").getByRole("button", { name: "View illustrated results" }).click();
  await expect(tabs.getByRole("tab", { name: /discover & explain/i })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".v2-process-window")).toContainText("Illustrative shortlist");
  await review.click();
  await review.focus();
  await page.keyboard.press("ArrowRight");
  const explain = tabs.getByRole("tab", { name: /discover & explain/i });
  await expect(explain).toBeFocused();
  await expect(explain).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".v2-process-window")).toContainText("Illustrative shortlist");
  await page.locator(".v2-process-window").screenshot({ path: testInfo.outputPath("workflow-results.png") });
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: /describe/i })).toHaveAttribute("aria-selected", "true");
});

test("synthetic preview recalculates and discloses exact criteria", async ({ page }, testInfo) => {
  await page.goto("/#preview");
  const panel = page.getByRole("region", { name: "Interactive synthetic candidate matching example" });
  const one = panel.locator(".v2-candidate").filter({ hasText: "Candidate A" });
  const two = panel.locator(".v2-candidate").filter({ hasText: "Candidate B" });
  const three = panel.locator(".v2-candidate").filter({ hasText: "Candidate C" });
  await expect(panel.getByTestId("eligible-count")).toHaveText("1");
  await expect(one).toHaveAttribute("data-status", "match");
  await expect(two).toHaveAttribute("data-status", "fail");
  await expect(three).toHaveAttribute("data-status", "unknown");
  await two.getByText("Inspect Candidate B criteria").click();
  await expect(two.getByText("Misses · 60 days")).toBeVisible();
  await panel.screenshot({ path: testInfo.outputPath("preview-30-days.png") });
  await panel.getByRole("button", { name: "60 days" }).click();
  await expect(panel.getByTestId("eligible-count")).toHaveText("2");
  await expect(two).toHaveAttribute("data-status", "match");
  await expect(two.getByText("Meets · 60 days")).toBeVisible();
  await expect(three).toHaveAttribute("data-status", "unknown");
  await panel.screenshot({ path: testInfo.outputPath("preview-60-days.png") });
  await panel.getByRole("button", { name: "30 days" }).click();
  await expect(panel.getByTestId("eligible-count")).toHaveText("1");
});

test("reference cards and FAQ tell the truth about the synthetic illustration", async ({ page }, testInfo) => {
  await page.goto("/#similar");
  const section = page.locator("#similar");
  await expect(section.getByRole("heading", { name: /found someone promising.*find others like them/i })).toBeVisible();
  await expect(section).toContainText("Unknown · needs review");
  await section.screenshot({ path: testInfo.outputPath("reference-comparison.png") });
  await page.goto("/#trust");
  const unknown = page.locator("#trust").getByText("Does an unknown notice period count as a match?");
  await unknown.click();
  await expect(page.locator("#trust")).toContainText("Unknown values are marked Needs review");
  await page.locator("#get-started").screenshot({ path: testInfo.outputPath("final-cta.png") });
});

test("mobile walkthrough art never obscures headings or body text", async ({ page }) => {
  for (const width of [320, 390, 599, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#how-it-works");
    const icon = page.locator(".v2-process-copy .v2-process-icon");
    await expect(icon).toBeHidden();
    const heading = page.locator(".v2-process-copy h3");
    const copy = page.locator(".v2-process-copy > p");
    const geometry = await page.evaluate(([headingSelector, copySelector]) => {
      const h = document.querySelector(headingSelector)!.getBoundingClientRect();
      const p = document.querySelector(copySelector)!.getBoundingClientRect();
      return {headingRight:h.right,copyRight:p.right,width:window.innerWidth};
    }, [".v2-process-copy h3", ".v2-process-copy > p"]);
    expect(geometry.headingRight).toBeLessThanOrEqual(geometry.width);
    expect(geometry.copyRight).toBeLessThanOrEqual(geometry.width);
  }
});

test("mobile navigation is usable by keyboard and dismisses appropriately", async ({ page }) => {
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
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.mouse.click(380, 820);
  await expect(menu).toHaveCount(0);
  await toggle.click();
  await menu.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(menu).toHaveCount(0);
});

test("reduced motion keeps all content and disables stage entrance", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const animation = await page.locator(".v2-hero-stage > .v2-workspace").evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
  await expect(page.getByRole("heading", { name: /human-confirmed.*evidence-backed/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /search with clarity/i })).toBeVisible();
});

for (const size of [
  { name: "320", width: 320, height: 700 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 1080 },
]) {
  test("responsive visual journey at " + size.name + "px", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/");
    const anchors = ["hero", "problem", "how-it-works", "preview", "similar", "trust", "get-started"];
    for (const anchor of anchors) {
      const node = anchor === "hero" ? page.locator(".v2-hero") : page.locator("#" + anchor);
      const top = anchor === "hero" ? 0 : await node.evaluate((el) => window.scrollY + el.getBoundingClientRect().top - 85);
      await page.evaluate((value) => window.scrollTo({ top: Math.max(0, value), behavior: "instant" }), top);
      await page.screenshot({ path: testInfo.outputPath(size.name + "-" + anchor + ".png") });
      const x = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(x.content, size.name + "px overflow at " + anchor).toBeLessThanOrEqual(x.viewport + 1);
    }
    if (size.width === 1440 || size.width === 390) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: testInfo.outputPath(size.name + "-full-page.png"), fullPage: true });
    }
    // Intermediate scroll positions: no long pinned sequences or dead scroll.
    for (const section of ["problem", "how-it-works", "preview"]) {
      const y = await page.locator("#" + section).evaluate((el) => window.scrollY + el.getBoundingClientRect().top + el.getBoundingClientRect().height * .5);
      await page.evaluate((value) => window.scrollTo({ top: value, behavior: "instant" }), y);
      await page.screenshot({ path: testInfo.outputPath(size.name + "-mid-" + section + ".png") });
    }
    expect(errors).toEqual([]);
  });
}
