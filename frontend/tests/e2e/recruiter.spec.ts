import { expect, test, type Page } from "@playwright/test";

async function draftFields(page: Page) {
  return page.locator(".search-rule").evaluateAll(rows =>
    rows.map(row => ({
      field: (row.querySelector("select") as HTMLSelectElement).value,
      mode: (row.querySelectorAll("select")[1] as HTMLSelectElement).value,
    })),
  );
}

test("real recruiter: edit, confirm, inspect evidence, refine twice, and find similar profiles", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Live authentication credentials are missing from the secure test environment.");
    test.skip(true, "Requires a confirmed Supabase demo recruiter and live Gemini/Groq credentials.");
    return;
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 25000 });
  await expect(page.locator(".pareto-account .pareto-avatar img")).toHaveAttribute("src", "/mascot/pareto-mascot.svg");
  await page.goto("/dashboard/profile");
  await expect(page.getByRole("heading", { name: "Your profile." })).toBeVisible();
  await expect(page.locator(".pareto-profile-intro .pareto-avatar img")).toHaveAttribute("src", "/mascot/pareto-mascot.svg");
  await expect(page.locator(".pareto-profile-intro .pareto-avatar")).toBeVisible();
  await expect(page.getByLabel("Account email")).toHaveValue(email);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: /start candidate search/i }).click();
  // The request context attached to this browser shares the actual Supabase cookies.
  // The isolated Playwright test request fixture would always be unauthorized, even
  // when browser sign-out was broken, so it cannot prove session invalidation.
  const signedInSearch = await page.context().request.get("/api/v1/search?q=Asha");
  expect(signedInSearch.status()).toBe(200);
  expect(await signedInSearch.json()).toEqual(expect.arrayContaining([
    expect.objectContaining({ displayName: "Asha Nair" }),
  ]));

  await page.getByLabel("Hiring brief").fill(
    "Find Senior Java Developers in Hyderabad with 6 to 10 years of experience and Java. They must be able to join within 30 days.",
  );
  await page.getByRole("button", { name: "Extract criteria" }).click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("region", { name: "Confirmed results" })).toHaveCount(0);
  const initial = await draftFields(page);
  expect(initial.map(rule => rule.field).sort()).toEqual(["city", "experience", "notice", "role", "skill"]);
  expect(initial.every(rule => rule.mode === "required")).toBe(true);

  await page.getByLabel("Maximum (days)").fill("45");
  await page.getByRole("button", { name: "Confirm Search" }).click();
  const confirmed = page.getByRole("region", { name: "Confirmed results" });
  await expect(confirmed.getByRole("heading", { name: "Search results · revision 1" })).toBeVisible();
  await expect(confirmed).toContainText("4 eligible");
  const asha = confirmed.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Asha Nair", exact: true }),
  });
  await expect(asha).toBeVisible();
  await asha.getByText("Match evidence", { exact: true }).click();
  await expect(asha.getByText(/Notice period · MATCH/)).toBeVisible();
  await expect(asha).toContainText("Stored: 15");

  const followups = [
    { prompt: "Require Spring Boot and AWS while keeping all existing requirements", version: 2, count: "4 eligible", expectedRules: 7 },
    { prompt: "Now only candidates who can join within 30 days; keep all other requirements", version: 3, count: "3 eligible", expectedRules: 7 },
  ];
  for (const step of followups) {
    await page.getByLabel("Refine this search").fill(step.prompt);
    await page.getByRole("button", { name: "Propose refinement" }).click();
    await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible({ timeout: 30000 });
    await expect(confirmed.getByRole("heading", { name: `Search results · revision ${step.version - 1}` })).toBeVisible();
    const fields = await draftFields(page);
    expect(fields).toHaveLength(step.expectedRules);
    for (const field of ["city", "role", "experience", "notice"]) {
      expect(fields.some(rule => rule.field === field && rule.mode === "required")).toBe(true);
    }
    await page.getByRole("button", { name: "Confirm Search" }).click();
    await expect(confirmed.getByRole("heading", { name: `Search results · revision ${step.version}` })).toBeVisible();
    await expect(confirmed).toContainText(step.count);
  }

  await page.reload();
  await expect(confirmed.getByRole("heading", { name: "Search results · revision 3" })).toBeVisible();
  const reference = confirmed.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Asha Nair", exact: true }),
  });
  await reference.getByText("Candidate details", { exact: true }).click();
  await reference.getByRole("button", { name: "Find candidates like Asha Nair" }).click();
  await expect(page.getByText("Reference profile · Asha Nair")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Search" }).click();
  await expect(confirmed.getByRole("heading", { name: "Search results · revision 1" })).toBeVisible();
  await expect(confirmed).toContainText("47 candidates ranked by similarity");
  await expect(confirmed.getByText("Similarity-ranked").first()).toBeVisible();
  await expect(confirmed.getByRole("heading", { name: "Asha Nair", exact: true })).toHaveCount(0);

  // Follow up on a similarity search: a required AWS rule must change eligibility,
  // preserving the reference self-exclusion and all other preferred attributes.
  await page.getByLabel("Refine this search").fill("Require AWS skills in the similar candidate cohort");
  await page.getByRole("button", { name: "Propose refinement" }).click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible({ timeout: 30000 });
  const referenceRules = await draftFields(page);
  expect(referenceRules.some(rule => rule.field === "skill" && rule.mode === "required")).toBe(true);
  await page.getByRole("button", { name: "Confirm Search" }).click();
  await expect(confirmed.getByRole("heading", { name: "Search results · revision 2" })).toBeVisible();
  await expect(confirmed).toContainText("21 eligible");
  await expect(confirmed).toContainText("5 need review");
  await expect(confirmed.getByRole("heading", { name: "Asha Nair", exact: true })).toHaveCount(0);

  await page.locator(".pareto-account > summary").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/", { timeout: 15000 });
  expect((await page.context().request.get("/api/v1/search?q=Asha")).status()).toBe(401);
});
