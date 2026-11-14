import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("homepage uses loaded, self-hosted typography rather than CSS-only font names", async ({ page }, testInfo) => {
  const failedFonts: string[] = [];
  const fontResponses: string[] = [];
  page.on("requestfailed", (request) => {
    if (/\.woff2?(?:\?|$)/.test(request.url())) failedFonts.push(request.url());
  });
  page.on("response", (response) => {
    if (/\.woff2?(?:\?|$)/.test(response.url())) {
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
      mediaFonts: performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => /\.woff2?(?:\?|$)/.test(url)),
    };
  });
  expect(metrics.hero.fontFamily).toContain("Pareto STK Earl");
  expect(metrics.section.fontFamily).toContain("Pareto STK Earl");
  expect(metrics.body.fontFamily).toMatch(/^Inter(?:,|$)/);
  expect(metrics.nav.fontFamily).toMatch(/^Inter(?:,|$)/);
  expect(metrics.action.fontFamily).toMatch(/^Inter(?:,|$)/);
  expect(metrics.candidate.fontFamily).toMatch(/^Inter(?:,|$)/);
  expect(metrics.italicEmphasis.fontStyle).toBe("normal");
  expect(metrics.hero.fontSynthesis).toBe("none");
  expect(metrics.faces.some((face) => face.family === "Pareto STK Earl" && face.weight === "400" && face.status === "loaded")).toBe(true);
  expect(metrics.faces.some((face) => face.family === "Inter" && !face.family.includes("Fallback") && face.status === "loaded")).toBe(true);
  expect(metrics.mediaFonts.length).toBeGreaterThanOrEqual(2);
  expect(fontResponses.length).toBeGreaterThanOrEqual(2);
  expect(failedFonts).toEqual([]);
  expect(metrics.mediaFonts.some((url) => /stk-earl-regular\.woff2/i.test(url))).toBe(true);
  expect(fontResponses.some((url) => /stk-earl-regular\.woff2/i.test(url))).toBe(true);
  await writeFile(testInfo.outputPath("computed-typography.json"), JSON.stringify({ ...metrics, fontResponses, failedFonts }, null, 2));
});

test("hero, navigation and public auth destinations are connected", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /find the right people.*understand every match/i })).toBeVisible();
  const heroButtons = page.locator(".v2-hero-actions a");
  await expect(heroButtons).toHaveCount(2);
  await expect(heroButtons.nth(0)).toHaveText("See how it works");
  await expect(heroButtons.nth(0)).toHaveAttribute("href", "#how-it-works");
  await expect(heroButtons.nth(1)).toHaveText("Get started free");
  await expect(heroButtons.nth(1)).toHaveAttribute("href", "/signup");
  await expect(page.locator(".v2-hero-actions svg, .v2-header-actions a svg, .v2-close a svg")).toHaveCount(0);
  await expect(page.locator(".v2-hero .v2-eyebrow")).toHaveCount(0);
  await expect(page.locator(".v2-hero-proof-item")).toHaveText(["Natural-language search", "Evidence-backed matching"]);
  await expect(page.locator(".v2-hero h1 em")).toHaveCSS("color", "rgb(2, 14, 36)");
  await expect(page.locator(".v2-hero-accent")).toHaveText("every match.");
  await expect(page.locator(".v2-hero-accent")).toHaveCSS("color", "rgb(70, 123, 235)");
  await expect(page.locator(".v2-hero-proof-item svg").first()).toHaveCSS("color", "rgb(70, 123, 235)");
  await expect(page.locator(".v2-hero-proof")).toHaveCSS("border-top-color", "rgb(219, 231, 251)");
  await expect(page.locator(".v2-hero-stage .v2-rail-item--selected")).toHaveCSS("background-color", "rgb(238, 244, 255)");
  await expect(page.locator(".v2-hero-stage .v2-rail-item--selected svg")).toHaveCSS("color", "rgb(70, 123, 235)");
  await expect(page.locator(".v2-hero-stage .v2-query mark").first()).toHaveCSS("background-color", "rgb(231, 239, 255)");
  await expect(page.locator(".v2-hero-stage .v2-criteria")).toHaveCSS("border-top-color", "rgb(219, 230, 249)");
  await expect(page.locator(".v2-login")).toHaveText("Login");
  await expect(page.locator(".v2-login")).toHaveAttribute("href", "/login");
  await expect(page.locator(".v2-header-cta")).toHaveText("Get started free");
  await expect(page.locator(".v2-header-cta")).toHaveAttribute("href", "/signup");
  await expect(page.locator(".v2-hero-stage .v2-criteria-item")).toHaveCount(5);
  await expect(page.locator(".v2-hero-stage .v2-criteria-item svg")).toHaveCount(5);
  // No redundant marketing chrome around the product illustration.
  await expect(page.locator(".v2-stage-top, .v2-stage-bottom, .v2-panel-caption")).toHaveCount(0);
  await expect(page.getByText("An illustrative opaque score without the underlying requirements.")).toHaveCount(0);
  await expect(page.getByText("Illustrative interface")).toHaveCount(0);
  await expect(page.getByText("Synthetic demonstration")).toHaveCount(0);
  await expect(page.locator(".v2-example-tag")).toHaveText("EXAMPLE PROFILES");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: /from a hiring brief to.*a reasoned shortlist/i })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Get started with Pareto" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to Pareto" })).toBeVisible();
});

test("three complete workflow stories alternate text and product UI without tabs", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#how-it-works");

  const section = page.locator("#how-it-works");
  const rows = section.locator(".v2-story-row");
  await expect(rows).toHaveCount(3);
  await expect(section.locator(".v2-story-step")).toHaveCount(0);
  await expect(section.getByRole("tablist")).toHaveCount(0);
  await expect(section.locator(".v2-steps, .v2-step-controls")).toHaveCount(0);
  await expect(section.getByRole("heading", { name: /from a hiring brief to.*a reasoned shortlist/i })).toBeVisible();
  await expect(section.locator(".v2-how-accent")).toHaveText("a reasoned shortlist.");
  await expect(section.locator(".v2-how-accent")).toHaveCSS("color", "rgb(70, 123, 235)");

  for (const [index, title, detail] of [
    [0, "Tell Pareto who you need.", "Understanding the brief"],
    [1, "Check the interpretation.", "Proposed criteria"],
    [2, "Understand each result.", "Shortlist"],
  ] as const) {
    const row = rows.nth(index);
    await expect(row.getByRole("heading", { name: title })).toBeVisible();
    await expect(row.locator(".v2-story-media")).toContainText(detail);
    await expect(row.locator(".v2-workspace")).toHaveCount(1);
    const geometry = await row.evaluate((node) => {
      const copy = node.querySelector(".v2-story-copy")!.getBoundingClientRect();
      const ui = node.querySelector(".v2-story-media")!.getBoundingClientRect();
      return { copyX: copy.x, uiX: ui.x, gap: Math.abs(copy.x - ui.x) };
    });
    expect(geometry.gap).toBeGreaterThan(100);
    if (index === 1) expect(geometry.uiX).toBeLessThan(geometry.copyX);
    else expect(geometry.copyX).toBeLessThan(geometry.uiX);
    await row.screenshot({ path: testInfo.outputPath("workflow-story-" + (index + 1) + "-desktop.png") });
  }

  await rows.nth(1).getByRole("button", { name: "View results" }).click();
  await expect(rows.nth(2).getByRole("heading", { name: "Understand each result." })).toBeInViewport();
  await expect(rows.nth(2).locator(".v2-story-media")).toContainText("Shortlist");
});


test("candidate matching preview recalculates and discloses exact criteria", async ({ page }, testInfo) => {
  await page.goto("/#preview");
  const panel = page.getByRole("region", { name: "Interactive candidate matching example" });
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

test("reference cards and FAQ explain matching with fictional profiles", async ({ page }, testInfo) => {
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

test("workflow stories stack copy before UI without clipping on mobile and tablet", async ({ page }, testInfo) => {
  for (const width of [320, 390, 599, 767, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#how-it-works");
    const rows = page.locator("#how-it-works .v2-story-row");
    await expect(rows).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const row = rows.nth(index);
      const measurements = await row.evaluate((node) => {
        const copy = node.querySelector(".v2-story-copy")!.getBoundingClientRect();
        const ui = node.querySelector(".v2-story-media")!.getBoundingClientRect();
        const heading = node.querySelector("h3")!.getBoundingClientRect();
        return { copyTop: copy.top, uiTop: ui.top, headingRight: heading.right, viewport: window.innerWidth,
          copyRight: copy.right, uiRight: ui.right, rowWidth: node.getBoundingClientRect().width };
      });
      expect(measurements.uiTop).toBeGreaterThan(measurements.copyTop);
      expect(measurements.headingRight).toBeLessThanOrEqual(measurements.viewport + 1);
      expect(measurements.copyRight).toBeLessThanOrEqual(measurements.viewport + 1);
      expect(measurements.uiRight).toBeLessThanOrEqual(measurements.viewport + 1);
      expect(measurements.rowWidth).toBeLessThanOrEqual(measurements.viewport);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390) {
      await rows.nth(0).screenshot({ path: testInfo.outputPath("workflow-story-1-mobile.png") });
      await rows.nth(1).screenshot({ path: testInfo.outputPath("workflow-story-2-mobile.png") });
      await rows.nth(2).screenshot({ path: testInfo.outputPath("workflow-story-3-mobile.png") });
    }
  }
});


test("review confirmation remains inside its visual frame at narrow widths", async ({ page }) => {
  for (const width of [320, 390, 599, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#how-it-works-step-2");
    const review = page.locator("#how-it-works-step-2");
    const bounds = await review.evaluate((root) => {
      const work = root.querySelector(".v2-workspace")!.getBoundingClientRect();
      const criteria = root.querySelector(".v2-criteria")!.getBoundingClientRect();
      const button = root.querySelector(".v2-mock-action")!.getBoundingClientRect();
      return {frameTop:work.top,frameBottom:work.bottom,criteriaBottom:criteria.bottom,buttonBottom:button.bottom,
        frameWidth:work.width,documentWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
    });
    expect(bounds.buttonBottom).toBeLessThanOrEqual(bounds.criteriaBottom + 1);
    expect(bounds.criteriaBottom).toBeLessThanOrEqual(bounds.frameBottom + 1);
    expect(bounds.frameWidth).toBeLessThanOrEqual(bounds.viewport);
    expect(bounds.documentWidth).toBeLessThanOrEqual(width);
  }
});

test("OpenTag-inspired hero buttons match measured mobile and desktop styles", async ({ page }) => {
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const metrics = await page.locator(".v2-hero-actions").evaluate((actions) => {
      const [secondary, primary] = Array.from(actions.querySelectorAll("a"));
      const a = getComputedStyle(secondary), b = getComputedStyle(primary);
      return {
        direction: getComputedStyle(actions).flexDirection,
        gap: getComputedStyle(actions).gap,
        secondary: {background:a.backgroundColor, radius:a.borderRadius, height:Math.round(secondary.getBoundingClientRect().height), fontSize:a.fontSize},
        primary: {background:b.backgroundColor, radius:b.borderRadius, height:Math.round(primary.getBoundingClientRect().height), fontSize:b.fontSize},
      };
    });
    expect(metrics.gap).toBe("8px");
    expect(metrics.direction).toBe(width < 640 ? "column" : "row");
    expect(metrics.secondary.background).toBe("rgba(16, 16, 16, 0.08)");
    expect(metrics.primary.background).toBe("rgb(2, 14, 36)");
    for (const button of [metrics.secondary, metrics.primary]) {
      expect(button.radius).toBe(width < 640 ? "10px" : "12px");
      expect(button.height).toBe(width < 640 ? 40 : 42);
      expect(button.fontSize).toBe(width < 640 ? "15px" : "16px");
    }
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
    const typography = await page.evaluate(async () => {
      await document.fonts.ready;
      const style = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error("Missing typography element " + selector);
        const value = getComputedStyle(el);
        return {
          fontFamily: value.fontFamily,
          fontSize: value.fontSize,
          fontWeight: value.fontWeight,
          lineHeight: value.lineHeight,
          letterSpacing: value.letterSpacing,
          fontStyle: value.fontStyle,
          rect: { width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) },
        };
      };
      return {
        viewport: window.innerWidth,
        hero: style(".v2-hero h1"),
        displayEmphasis: style(".v2-hero h1 em"),
        section: style(".v2-problem .v2-section-intro h2"),
        lead: style(".v2-hero-copy > p"),
        navigation: style(".v2-header-cta"),
        product: style(".v2-window-heading h3"),
        fonts: [...document.fonts].filter((font) => font.status === "loaded").map((font) => ({family: font.family, weight: font.weight, style: font.style})),
      };
    });
    expect(typography.hero.fontFamily).toContain("Pareto STK Earl");
    expect(typography.lead.fontFamily).toMatch(/^Inter(?:,|$)/);
    await writeFile(testInfo.outputPath(size.name + "-computed-typography.json"), JSON.stringify(typography, null, 2));
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
