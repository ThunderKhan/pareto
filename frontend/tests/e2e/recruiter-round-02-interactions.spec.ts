import { expect, test } from "@playwright/test";

/** Real recruiter browser checks; absence of a demo account skips these rather than inventing a login. */
test("composer grows, reference picker dismisses, and manual reviews never save on discard", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Authenticated test credentials required.");
    test.skip(true, "Requires a dedicated Pareto Supabase recruiter.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });

  await page.goto("/dashboard/search");
  const composer = page.getByLabel("Hiring brief");
  await expect(composer).toHaveAttribute("rows", "1");
  await expect(composer).toHaveAttribute("placeholder", "Describe the candidate you're looking for…");
  const initialHeight = await composer.evaluate(el => el.getBoundingClientRect().height);
  await composer.fill("Find senior Java developers in Hyderabad.\nPrefer candidates with AWS and Spring Boot.\nExperience from six to ten years.");
  const grownHeight = await composer.evaluate(el => el.getBoundingClientRect().height);
  expect(grownHeight).toBeGreaterThan(initialHeight);
  await composer.press("Shift+Enter");
  await expect(composer).toHaveValue(/years\.\n$/);
  await composer.fill("");

  const reference = page.getByRole("button", { name: "Reference", exact: true });
  await reference.click();
  const picker = page.getByRole("dialog", { name: "Find a reference candidate" });
  await expect(picker).toBeVisible();
  await expect(page.locator(".pareto-chat__reference")).toHaveCount(0);
  await picker.getByRole("searchbox", { name: "Search by candidate name" }).fill("Asha");
  await expect(picker.getByRole("button", { name: /Asha Nair/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(reference).toBeFocused();

  await reference.click();
  await picker.getByRole("searchbox", { name: "Search by candidate name" }).fill("Asha");
  await picker.getByRole("button", { name: /Asha Nair/ }).click();
  const review = page.getByRole("dialog", { name: "Review draft criteria" });
  await expect(review).toBeVisible();
  await expect(review).toContainText("Reference profile · Asha Nair");
  await expect(picker).toHaveCount(0);
  await review.getByRole("button", { name: "Discard draft" }).click();
  await expect(review).toHaveCount(0);

  await page.getByRole("button", { name: "Enter criteria manually" }).click();
  await expect(review).toBeVisible();
  await expect(review.getByText("No criteria yet.")).toBeVisible();
  await review.getByRole("button", { name: "Add criterion" }).click();
  await expect(review.locator(".search-rule--card")).toHaveCount(1);
  await expect(review.getByRole("heading", { name: "Required", exact: true })).toBeVisible();
  await expect(review.getByRole("heading", { name: "Preferred", exact: true })).toBeVisible();
  await expect(review.getByRole("button", { name: "Confirm Search" })).toBeDisabled();
  await review.getByLabel("Skill", { exact: true }).fill("Java");
  await expect(review.getByRole("button", { name: "Confirm Search" })).toBeEnabled();
  await review.getByRole("button", { name: "Collapse criterion 1: Skill" }).click();
  await expect(review.getByLabel("Skill", { exact: true })).not.toBeVisible();
  await review.getByRole("button", { name: "Edit criterion 1: Skill" }).click();
  await review.getByLabel("Priority", { exact: true }).selectOption("preferred");
  await expect(review.locator(".review-group--preferred .search-rule--card")).toHaveCount(1);
  await expect(review.locator(".review-group--required .search-rule--card")).toHaveCount(0);
  await expect(review.getByRole("button", { name: "Confirm Search" })).toBeEnabled();
  await review.getByLabel("Priority", { exact: true }).selectOption("required");
  await expect(review.locator(".review-group--required .search-rule--card")).toHaveCount(1);
  await review.getByRole("button", { name: "Discard draft" }).click();
  await expect(review).toHaveCount(0);
  await expect(page.locator(".pareto-chat--fresh")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Enter criteria manually" }).click();
  await expect(review).toBeVisible();
  await expect(review.getByRole("button", { name: "Confirm Search" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await review.getByRole("button", { name: "Discard draft" }).click();

  // No Confirm Search action was called, so this browser did not persist a draft.
  await expect(page.locator(".pareto-chat__results")).toHaveCount(0);
});

test("recruiter menus dismiss with Escape and mobile New search retains its label", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Authenticated test credentials required.");
    test.skip(true, "Requires a dedicated Pareto Supabase recruiter.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });

  const account = page.locator(".pareto-account");
  await account.locator("summary").click();
  await expect(account).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(account).not.toHaveAttribute("open", "");
  await expect(account.locator("summary")).toBeFocused();

  const notifications = page.locator(".pareto-notifications");
  await notifications.locator("summary").click();
  await expect(notifications).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(notifications).not.toHaveAttribute("open", "");
  await expect(notifications.locator("summary")).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const newSearch = page.getByRole("link", { name: "New search" });
  await expect(newSearch).toBeVisible();
  const size = await newSearch.evaluate(el => ({ width: el.getBoundingClientRect().width, font: getComputedStyle(el).fontSize }));
  expect(parseFloat(size.font)).toBeGreaterThanOrEqual(12);
  expect(size.width).toBeGreaterThan(55);
});
