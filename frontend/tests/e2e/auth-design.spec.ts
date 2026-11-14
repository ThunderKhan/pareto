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
  await expect(page.getByLabel("First name")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Last name")).toHaveAttribute("autocomplete", "family-name");
  await expect(page.getByLabel("Last name")).toHaveAttribute("required", "");
  await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("placeholder", "At least 6 characters");
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("button", { name: /apple/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /windows/i })).toHaveCount(0);

  const notice = page.getByRole("status").filter({ hasText: "Authentication is unavailable in this environment." });
  if (await notice.count()) {
    if (await notice.locator("summary").count()) {
      await expect(notice.getByText("Local setup instructions")).toBeVisible();
      await notice.locator("summary").click();
      await expect(notice).toContainText("frontend/.env.local");
    } else {
      // Production must not expose implementation details to visitors.
      await expect(notice).not.toContainText("NEXT_PUBLIC_SUPABASE_URL");
    }
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
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("placeholder", "Enter your password");
  await expect(page.locator(".auth-form")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByLabel(/First name/)).toHaveCount(0);
  await expect(page.getByLabel(/Last name/)).toHaveCount(0);
  await expect(page.locator(".auth-form__names")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("button", { name: "Show password" })).toHaveAttribute("aria-pressed", "false");
});

test("six auth refinements remove nonessential chrome and retain useful controls", async ({ page }) => {
  for (const route of ["/login", "/signup"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await expect(page.locator(".auth-sheet__footer")).toHaveCount(0);
    await expect(page.locator(".auth-back")).toHaveCount(0);
    await expect(page.locator(".auth-assurance")).toHaveCount(0);
    await expect(page.locator(".auth-art__topline")).toHaveCount(0);
    await expect(page.locator(".auth-art__spark")).toHaveCount(0);
    await expect(page.getByText("Describe a role naturally. Review the criteria.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pareto home" })).toBeVisible();
    await expect(page.locator(".auth-art h2")).toBeVisible();
    const size = await page.evaluate(() => ({
      viewport: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
      bodyHeight: document.body.scrollHeight,
    }));
    expect(size.scrollHeight, `document scroll on ${route}`).toBeLessThanOrEqual(size.viewport + 1);
    expect(size.bodyHeight, `body scroll on ${route}`).toBeLessThanOrEqual(size.viewport + 1);
    const submit = page.locator(".auth-submit");
    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  }
});

test("auth panels fit conventional desktop heights without page scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const widthHeight of [{width: 1366, height: 768}, {width: 1440, height: 900}, {width: 1920, height: 1080}]) {
    await page.setViewportSize(widthHeight);
    for (const route of ["/login", "/signup"]) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        innerScroll: document.querySelector(".auth-sheet")!.scrollHeight - document.querySelector(".auth-sheet")!.clientHeight,
      }));
      expect(dimensions.documentHeight, `page overflow ${route} ${widthHeight.height}`).toBeLessThanOrEqual(dimensions.viewportHeight + 1);
      expect(dimensions.innerScroll, `panel overflow ${route} ${widthHeight.height}`).toBeLessThanOrEqual(1);
    }
  }
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

test("auth controls show keyboard focus and expose readable input text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  const logo = page.getByRole("link", { name: "Pareto home" });
  await page.keyboard.press("Tab");
  await expect(logo).toBeFocused();
  await expect(logo).toHaveCSS("outline-style", "solid");
  const placeholderColor = await page.getByLabel("Email").evaluate(el =>
    getComputedStyle(el, "::placeholder").color
  );
  expect(placeholderColor).toBe("rgb(91, 107, 128)");
  const labelSize = await page.locator(".auth-field span").first().evaluate(el =>
    parseFloat(getComputedStyle(el).fontSize)
  );
  expect(labelSize).toBeGreaterThanOrEqual(13);
});

test("mobile form fields use a zoom-safe text size and controls remain accessible", async ({ page }) => {
  for (const route of ["/login", "/signup"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    const size = await page.getByLabel("Email").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
    for (const name of ["Show password", ...(route === "/login" ? ["Forgot password?"] : [])]) {
      const control = name === "Forgot password?"
        ? page.getByRole("link", { name })
        : page.getByRole("button", { name });
      const rect = await control.boundingBox();
      expect(rect).not.toBeNull();
      expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("auth pages have a static fallback without motion even if the GPU shader does not render", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.locator(".auth-art__fallback")).toBeAttached();
  const bg = await page.locator(".auth-art__fallback").evaluate(node => getComputedStyle(node).backgroundImage);
  expect(bg).toContain("gradient");
});
