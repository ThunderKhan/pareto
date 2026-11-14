import { expect, test } from "@playwright/test";

test("recruiter confirms edited criteria, refines twice, and searches from a reference", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  test.skip(!email || !password, "Requires a configured, seeded Supabase test recruiter and AI provider.");
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: /start candidate search/i }).click();
  await page.getByLabel("Hiring brief").fill("Find Senior Java Developers in Hyderabad with 6 to 10 years of experience and Java. They should be able to join within 30 days.");
  await page.getByRole("button", { name: "Extract criteria" }).click();
  await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible({ timeout: 25000 });
  await expect(page.getByRole("region", { name: "Confirmed results" })).toHaveCount(0);
  await page.getByLabel("Maximum (days)").fill("45");
  await page.getByRole("button", { name: "Confirm Search" }).click();
  await expect(page.getByRole("heading", { name: "Search results · revision 1" })).toBeVisible();
  for (const [index, followup] of ["Require Spring Boot and AWS", "Only candidates who can join within 30 days"].entries()) {
    await page.getByLabel("Refine this search").fill(followup);
    await page.getByRole("button", { name: "Propose refinement" }).click();
    await expect(page.getByRole("heading", { name: "Review draft criteria" })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole("heading", { name: `Search results · revision ${index + 1}` })).toBeVisible();
    await page.getByRole("button", { name: "Confirm Search" }).click();
    await expect(page.getByRole("heading", { name: `Search results · revision ${index + 2}` })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Search results · revision 3" })).toBeVisible();
  const candidate = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Asha Nair", exact: true }) });
  await candidate.getByText("Candidate details", { exact: true }).click();
  await candidate.getByRole("button", { name: "Find candidates like Asha Nair" }).click();
  await expect(page.getByText("Reference profile · Asha Nair")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Search" }).click();
  await expect(page.getByRole("heading", { name: "Search results · revision 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asha Nair", exact: true })).toHaveCount(0);
});
