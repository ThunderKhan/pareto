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
  await expect(page.getByRole("heading", { level: 1, name: "Find your next match." })).toBeVisible();
  const heroButtons = page.locator(".v2-hero-actions a");
  await expect(heroButtons).toHaveCount(2);
  await expect(heroButtons.nth(0)).toHaveText("See how it works");
  await expect(heroButtons.nth(0)).toHaveAttribute("href", "#how-it-works");
  await expect(heroButtons.nth(1)).toHaveText("Get started free");
  await expect(heroButtons.nth(1)).toHaveAttribute("href", "/signup");
  await expect(page.locator(".v2-hero-actions svg, .v2-header-actions a svg, .v2-close a svg")).toHaveCount(0);
  await expect(page.locator(".v2-hero .v2-eyebrow")).toHaveCount(0);
  await expect(page.locator(".v2-hero-proof")).toHaveCount(0);
  await expect(page.locator(".v2-hero h1 em")).toHaveCSS("color", "rgb(2, 14, 36)");
  await expect(page.locator(".v2-hero-accent")).toHaveText("match.");
  await expect(page.locator(".v2-hero-accent")).toHaveCSS("color", "rgb(70, 123, 235)");
  await expect(page.locator(".v2-hero-copy > p")).toHaveText("Describe the role. Discover candidates with reasons, not guesses.");
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
  await expect(page.locator("#preview, .v2-example-tag")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: /from a hiring brief to.*a reasoned shortlist/i })).toBeVisible();
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Get started with Pareto" })).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in to Pareto" })).toBeVisible();
});

test("hero mascot tracks pointer, walks on hover and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const mascot = page.locator(".v2-hero-mascot");
  const eyes = mascot.locator(".v2-hero-mascot__pupils");
  const leftLeg = mascot.locator(".v2-hero-mascot__leg--left");
  await expect(mascot).toBeVisible();
  await expect(eyes).toHaveAttribute("transform", "translate(0 0)");
  await page.mouse.move(30, 160);
  await expect.poll(() => eyes.getAttribute("transform")).not.toBe("translate(0 0)");
  await expect(leftLeg).toHaveCSS("animation-name", "none");
  await mascot.hover();
  await expect(leftLeg).toHaveCSS("animation-name", "v2-hero-left-step");
  await page.mouse.move(4, 4);
  await expect(leftLeg).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mascot.hover();
  await expect(leftLeg).toHaveCSS("animation-name", "none");
  await expect(eyes).toHaveAttribute("transform", "translate(0 0)");
});

test("OpenTag-inspired public header uses the Pareto mascot and real navigation", async ({ page, request }) => {
  const [mark, favicon] = await Promise.all([
    request.get("/brand/pareto-mark.svg"),
    request.get("/icon.svg"),
  ]);
  expect(mark.ok()).toBe(true);
  expect(favicon.ok()).toBe(true);
  expect(await favicon.text()).toBe(await mark.text());

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const header = page.locator(".v2-header");
  const nav = header.getByRole("navigation", { name: "Main navigation" });
  const logo = header.getByRole("link", { name: "Pareto home" });
  await expect(logo).toHaveAttribute("href", "/");
  const image = logo.locator(".v2-brand-mark");
  await expect(image).toHaveAttribute("src", "/brand/pareto-mark.svg");
  await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(nav.locator("a")).toHaveText(["Home", "The problem", "How it works", "Explore matching", "Why Pareto", "FAQs"]);
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "#faq");
  await expect(header.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  await expect(header.getByRole("link", { name: "Get started free" })).toHaveAttribute("href", "/signup");
  const alignment = await header.evaluate(el => {
    const brand = el.querySelector(".v2-logo")!.getBoundingClientRect();
    const nav = el.querySelector(".v2-desktop-nav")!.getBoundingClientRect();
    const actions = el.querySelector(".v2-header-actions")!.getBoundingClientRect();
    return { brandRight: brand.right, navLeft: nav.left, navRight: nav.right, actionsLeft: actions.left };
  });
  expect(alignment.navLeft).toBeGreaterThan(alignment.brandRight + 20);
  expect(alignment.actionsLeft).toBeGreaterThan(alignment.navRight);
});

test("public header adapts without horizontal overflow and mobile menu retains all destinations", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1024, 1199, 1200, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      desktop: getComputedStyle(document.querySelector(".v2-desktop-nav")!).display,
      toggle: getComputedStyle(document.querySelector(".v2-menu-toggle")!).display,
    }));
    expect(metrics.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.desktop === "none", `desktop nav state at ${width}px`).toBe(width < 1200);
    expect(metrics.toggle === "none", `mobile toggle state at ${width}px`).toBe(width >= 1200);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByRole("button", { name: "Open navigation" });
  await toggle.click();
  const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobile.getByRole("link")).toHaveText(["Home", "The problem", "How it works", "Explore matching", "Why Pareto", "FAQs", "Login", "Get started free"]);
  await mobile.getByRole("link", { name: "FAQs" }).click();
  await expect(page).toHaveURL(/#faq$/);
  await expect(mobile).toHaveCount(0);
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


test("removed interactive evidence section leaves no dead links or duplicated results", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#preview, .v2-preview-frame, .v2-candidate, .v2-segmented")).toHaveCount(0);
  await expect(page.getByText("INTERACTIVE EVIDENCE")).toHaveCount(0);
  await expect(page.getByText("Change one requirement.")).toHaveCount(0);
  await expect(page.locator('a[href="#preview"]')).toHaveCount(0);
  const matchingLink = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Explore matching" });
  await expect(matchingLink).toHaveAttribute("href", "#similar");
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Candidate similarity" })).toHaveAttribute("href", "#similar");
  await matchingLink.click();
  await expect(page).toHaveURL(/#similar$/);
  await expect(page.locator("#similar")).toContainText("COMPARABLE PROFILES");
  // The separate How It Works shortlist stays available.
  await expect(page.locator("#how-it-works-step-3 .v2-mini-result")).toHaveCount(3);
});


test("OpenTag-inspired trust timeline changes its sticky demo with accessible controls", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#trust");
  const section = page.locator("#trust");
  const steps = section.locator(".v2-trust-step-button");
  await expect(section.getByRole("heading", { name: "Why Pareto works" })).toBeVisible();
  await expect(steps).toHaveCount(4);
  await expect(section.locator(".v2-trust-grid, .v2-trust-item")).toHaveCount(0);
  await expect(section.locator(".v2-trust-step-icon")).toHaveCount(4);
  await expect(section.locator(".v2-trust-demo-sticky")).toHaveCSS("position", "sticky");
  await expect(steps.nth(0)).toHaveAttribute("aria-current", "step");
  await expect(section.locator("#v2-trust-demo")).toContainText("Describe your ideal candidate.");
  await steps.nth(1).click();
  await expect(steps.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(section.locator("#v2-trust-demo")).toContainText("Review the interpretation.");
  await steps.nth(2).click();
  await expect(steps.nth(2)).toHaveAttribute("aria-current", "step");
  await expect(section.locator("#v2-trust-demo")).toContainText("A shortlist with reasons.");
  await steps.nth(3).click();
  await expect(steps.nth(3)).toHaveAttribute("aria-current", "step");
  await expect(section.locator("#v2-trust-demo")).toContainText("Search in your workspace.");
  await expect(section.locator("#v2-trust-demo .v2-trust-access-link")).toHaveAttribute("href", "/login");
  await section.locator(".v2-trust-timeline").screenshot({ path: testInfo.outputPath("trust-timeline-desktop.png") });
});

test("timeline advances its active content when the page is scrolled", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#trust");
  const steps = page.locator("#trust .v2-trust-step-button");
  await expect(steps).toHaveCount(4);
  await steps.nth(2).evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(steps.nth(2)).toHaveAttribute("aria-current", "step");
  await expect(steps.nth(2)).toHaveCSS("opacity", "1");
  await expect(page.locator("#v2-trust-demo")).toContainText("A shortlist with reasons.");
  await steps.nth(3).evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(steps.nth(3)).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#v2-trust-demo")).toContainText("Search in your workspace.");
});

test("timeline icon assets load and mobile carousel works without viewport overflow", async ({ page }, testInfo) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const missing: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/icons/") && !response.ok()) missing.push(response.url());
    });
    await page.goto("/#trust");
    const section = page.locator("#trust");
    await expect(section.locator(".v2-trust-timeline")).toBeHidden();
    await expect(section.locator(".v2-trust-mobile-card")).toHaveCount(4);
    await expect(section.locator(".v2-trust-mobile-card img")).toHaveCount(4);
    await expect(section.getByRole("heading", { name: "Why Pareto works" })).toBeVisible();
    await expect(section.getByRole("button", { name: "Show Review before searching" })).toBeVisible();
    await section.getByRole("button", { name: "Show Review before searching" }).click();
    await expect(section.getByRole("button", { name: "Show Review before searching" })).toHaveAttribute("aria-current", "true");
    await expect.poll(() => section.locator(".v2-trust-mobile-track").evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    expect(missing).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390) await section.screenshot({ path: testInfo.outputPath("trust-timeline-mobile.png") });
  }
});

test("reference cards and FAQ explain matching with fictional profiles", async ({ page }, testInfo) => {
  await page.goto("/#similar");
  const section = page.locator("#similar");
  await expect(section.getByRole("heading", { name: /found someone promising.*find others like them/i })).toBeVisible();
  await expect(section).toContainText("Unknown · needs review");
  await section.screenshot({ path: testInfo.outputPath("reference-comparison.png") });
  await page.goto("/#faq");
  const unknown = page.locator("#faq").getByRole("button", { name: "Does an unknown notice period count as a match?" });
  await unknown.click();
  await expect(unknown).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#faq").getByRole("region", { name: "Does an unknown notice period count as a match?" })).toContainText("Unknown values are marked Needs review");
  await page.locator("#get-started").screenshot({ path: testInfo.outputPath("final-cta.png") });
});

test("final CTA shows the original Pareto mascot and two working destinations", async ({ page }) => {
  await page.goto("/#get-started");
  const section = page.locator("#get-started");
  await expect(section.getByRole("heading", { name: "Turn hiring briefs into matches" })).toBeVisible();
  await expect(section.locator(".v2-close-art, .v2-eyebrow")).toHaveCount(0);
  const mascot = section.getByRole("img", { name: "Pareto mascot waving and holding a candidate profile" });
  await expect(mascot).toHaveAttribute("src", "/mascot/pareto-mascot.svg");
  await expect(mascot).toBeVisible();
  await expect.poll(() => mascot.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const actions = section.locator(".v2-close-actions a");
  await expect(actions).toHaveCount(2);
  await expect(actions.nth(0)).toHaveText("See how it works");
  await expect(actions.nth(0)).toHaveAttribute("href", "#how-it-works");
  await expect(actions.nth(1)).toHaveText("Start searching");
  await expect(actions.nth(1)).toHaveAttribute("href", "/signup");
});

test("OpenTag-inspired Pareto footer has real grouped links and no invented pages", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("#site-footer");
  const nav = footer.getByRole("navigation", { name: "Footer navigation" });
  await expect(footer.getByRole("link", { name: "Pareto home" })).toHaveAttribute("href", "/");
  await expect(footer.locator(".v2-footer-group h3")).toHaveText(["Product", "Explore", "Workspace", "Resources"]);
  await expect(footer.locator(".v2-footer-meta")).toHaveCount(0);
  await expect(footer.locator(".v2-footer-copyright")).toContainText("© 2026 Pareto · std::zero");
  await expect(nav.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how-it-works");
  await expect(nav.getByRole("link", { name: "Candidate similarity" })).toHaveAttribute("href", "#similar");
  await expect(nav.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "#faq");
  await expect(nav.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
  await expect(nav.getByRole("link", { name: "Recruiter search" })).toHaveAttribute("href", "/dashboard/search");
  await expect(nav.getByRole("link", { name: "Architecture" })).toHaveAttribute("href", "https://github.com/ThunderKhan/pareto/blob/main/docs/ARCHITECTURE.md");
  await expect(nav.getByRole("link", { name: "Demo guide" })).toHaveAttribute("href", "https://github.com/ThunderKhan/pareto/blob/main/docs/DEMO-SCRIPT.md");
  await expect(footer.locator(".v2-footer-wordmark")).toHaveText("pareto.");
  const atmosphere = await footer.evaluate((el) => {
    const gradient = getComputedStyle(el, "::before");
    return { background: gradient.backgroundImage, filter: gradient.filter };
  });
  expect(atmosphere.background).toContain("radial-gradient");
  expect(atmosphere.filter).toContain("blur");
  const hrefs = await nav.locator("a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  expect(hrefs).toHaveLength(11);
  expect(hrefs.every((href) => href?.startsWith("#") || href?.startsWith("/") || href?.startsWith("https://github.com/ThunderKhan/pareto"))).toBe(true);
  await nav.getByRole("link", { name: "FAQs" }).click();
  await expect(page).toHaveURL(/#faq$/);
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => {
      const footer = document.getElementById("site-footer")!;
      const brand = footer.querySelector(".v2-footer-brand")!.getBoundingClientRect();
      const copyright = footer.querySelector(".v2-footer-copyright")!.getBoundingClientRect();
      const wordmark = footer.querySelector(".v2-footer-wordmark")!.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const links = footer.querySelector(".v2-footer-navigation")!.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        brandBottom: brand.bottom,
        copyrightTop: copyright.top,
        wordmarkWidth: wordmark.width,
        footerWidth: footerRect.width,
        footerBottom: footerRect.bottom,
        wordmarkBottom: wordmark.bottom,
        linksLeft: links.left,
        brandLeft: brand.left,
      };
    });
    expect(dimensions.scrollWidth, `footer overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.copyrightTop).toBeLessThan(dimensions.brandBottom);
    // Full descenders must fit inside the footer instead of being cropped.
    expect(dimensions.wordmarkBottom).toBeLessThanOrEqual(dimensions.footerBottom + 2);
    if (width >= 1440) {
      expect(dimensions.linksLeft).toBeGreaterThan(dimensions.brandLeft + 200);
      expect(dimensions.wordmarkWidth).toBeGreaterThan(dimensions.footerWidth * .65);
    }
  }
});

test("giant Pareto footer wordmark is legible and each glyph lifts independently", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#site-footer");
  const footer = page.locator("#site-footer");
  const wordmark = footer.locator(".v2-footer-wordmark");
  const letters = wordmark.locator(".v2-footer-letter");
  await expect(letters).toHaveCount(7);
  await expect(wordmark).toHaveText("pareto.");
  await expect(letters.nth(0)).toHaveText("p");
  await expect(letters.nth(6)).toHaveText(".");
  await expect(letters.nth(6)).toHaveCSS("color", "rgba(49, 108, 224, 0.75)");
  // Fix the scroll position before measuring: Playwright's hover may scroll a
  // partly hidden giant wordmark, which previously moved *both* rectangles.
  await letters.nth(0).scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const baseline = await letters.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  await letters.nth(0).hover();
  await expect.poll(async () => letters.nth(0).evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(baseline[0] - 8);
  const otherTop = await letters.nth(1).evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(otherTop - baseline[1])).toBeLessThan(3);
  await page.mouse.move(2, 2);

  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await wordmark.evaluate((node) => {
      const mark = node.getBoundingClientRect();
      const footer = document.getElementById("site-footer")!.getBoundingClientRect();
      return {markLeft:mark.left, markRight:mark.right, markBottom:mark.bottom,
        footerLeft:footer.left, footerRight:footer.right, footerBottom:footer.bottom};
    });
    expect(bounds.markLeft, `left crop at ${width}px`).toBeGreaterThanOrEqual(bounds.footerLeft - 2);
    expect(bounds.markRight, `right crop at ${width}px`).toBeLessThanOrEqual(bounds.footerRight + 2);
    expect(bounds.markBottom, `bottom crop at ${width}px`).toBeLessThanOrEqual(bounds.footerBottom + 2);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const first = wordmark.locator(".v2-footer-letter").first();
  await first.hover();
  await expect(first).toHaveCSS("transform", "none");
});

test("OpenTag-style FAQ has exact typography, no divider lines and animated independently accessible answers", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#faq");
  const faq = page.locator("#faq");
  const heading = faq.getByRole("heading", { name: "Frequently asked questions" });
  const buttons = faq.locator(".v2-faq-question");
  await expect(heading).toBeVisible();
  await expect(faq.getByText("QUESTIONS, ANSWERED")).toHaveCount(0);
  await expect(faq.getByText(/Nothing hidden in/)).toHaveCount(0);
  await expect(buttons).toHaveCount(4);
  const headlineSize = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(headlineSize).toBeGreaterThan(71);
  expect(headlineSize).toBeLessThanOrEqual(72);
  await expect(heading).toHaveCSS("font-weight", "500");
  await expect(buttons.first()).toHaveCSS("font-size", "22px");
  await expect(buttons.first()).toHaveCSS("font-weight", "500");
  await expect(buttons.first()).toHaveCSS("line-height", "33px");
  const visuals = await faq.evaluate((root) => {
    const question = root.querySelector(".v2-faq-question")!;
    const item = root.querySelector(".v2-faq-item")!;
    const answer = root.querySelector(".v2-faq-answer")!;
    const header = root.querySelector("h2")!;
    return {
      questionBorder: getComputedStyle(question).borderTopWidth,
      itemBorder: getComputedStyle(item).borderTopWidth,
      height: Math.round(header.getBoundingClientRect().height),
      columns: getComputedStyle(root).display,
      transition: getComputedStyle(answer).transitionProperty,
      timing: getComputedStyle(answer).transitionDuration,
      gap: getComputedStyle(root.querySelector(".v2-faq-list")!).gap,
    };
  });
  expect(visuals.height).toBeLessThan(90); // Desktop headline stays on one line.
  expect(visuals.questionBorder).toBe("0px");
  expect(visuals.itemBorder).toBe("0px");
  expect(visuals.columns).toBe("block");
  expect(visuals.transition).toContain("grid-template-rows");
  expect(visuals.timing).toContain("0.3s");
  expect(visuals.gap).toBe("13px");
  await faq.screenshot({ path: testInfo.outputPath("faq-desktop-closed.png") });

  const first = buttons.first();
  const second = buttons.nth(1);
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(faq.getByRole("region", { name: "Does an unknown notice period count as a match?" })).toBeVisible();
  await expect(first.locator(".v2-faq-plus-vertical")).toHaveCSS("transform", "matrix(1, 0, 0, 0, 0, 0)");
  await second.click();
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await faq.screenshot({ path: testInfo.outputPath("faq-desktop-open.png") });
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(faq.getByRole("region", { name: "Does an unknown notice period count as a match?" })).toBeHidden();
});

test("FAQ remains readable at narrow widths and obeys reduced motion", async ({ page }, testInfo) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/#faq");
    const faq = page.locator("#faq");
    const first = faq.locator(".v2-faq-question").first();
    await expect(first).toHaveCSS("font-size", width < 640 ? "15px" : "16px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390) await faq.screenshot({ path: testInfo.outputPath("faq-mobile-closed.png") });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#faq");
  await page.locator("#faq .v2-faq-question").first().click();
  const durations = await page.locator("#faq .v2-faq-answer").first().evaluate(el => getComputedStyle(el).transitionDuration.split(",").map(d => Number(d.trim().replace(/s$/, ""))));
  expect(durations.every(duration => Number.isFinite(duration) && duration < 0.01)).toBe(true);
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
  await expect(page.getByRole("heading", { name: "Why Pareto works" })).toBeVisible();
  await expect(page.locator("#trust .v2-trust-step-button")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Turn hiring briefs into matches" })).toBeVisible();
  const mascotAnimation = await page.locator(".v2-close-mascot").evaluate((el) => getComputedStyle(el).animationName);
  expect(mascotAnimation).toBe("none");
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
    const anchors = ["hero", "problem", "how-it-works", "similar", "trust", "get-started", "site-footer"];
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
    for (const section of ["problem", "how-it-works", "similar"]) {
      const y = await page.locator("#" + section).evaluate((el) => window.scrollY + el.getBoundingClientRect().top + el.getBoundingClientRect().height * .5);
      await page.evaluate((value) => window.scrollTo({ top: value, behavior: "instant" }), y);
      await page.screenshot({ path: testInfo.outputPath(size.name + "-mid-" + section + ".png") });
    }
    expect(errors).toEqual([]);
  });
}
