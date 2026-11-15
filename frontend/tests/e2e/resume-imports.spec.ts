import { expect, test } from "@playwright/test";

test("private resume importer requires verified recruiter authentication", async ({ page }) => {
  await page.goto("/dashboard/candidates/import");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("import, queue, batch, metrics and review APIs deny signed-out callers", async ({ request }) => {
  const id = "6f78b020-785c-41f1-b2f8-ccb285e973f4";
  const requests = [
    () => request.get("/api/v1/imports"),
    () => request.post("/api/v1/imports"),
    () => request.get("/api/v1/imports/jobs"),
    () => request.get("/api/v1/imports/batches"),
    () => request.post("/api/v1/imports/batches", {data:{documentIds:[id]}}),
    () => request.get("/api/v1/imports/metrics?days=30"),
    () => request.get("/api/v1/imports/" + id),
    () => request.get("/api/v1/imports/" + id + "/job"),
    () => request.get("/api/v1/imports/" + id + "/profile"),
    () => request.post("/api/v1/imports/" + id + "/profile", {data:{action:"approve",expectedVersion:0,confirmedAgainstSource:true}}),
    () => request.get("/api/v1/imports/" + id + "/audit"),
    () => request.get("/api/v1/imports/" + id + "/download"),
    () => request.post("/api/v1/imports/" + id, {data:{action:"retry"}}),
  ];
  for (const invoke of requests) {
    const result = await invoke();
    expect(result.status()).toBe(401);
    expect(result.headers()["cache-control"]).toContain("no-store");
  }
});

test("authenticated import workspace exposes real uploader, queue and review entrypoints", async ({ page }) => {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Missing dedicated recruiter test credentials.");
    test.skip(true, "Requires an authenticated dedicated recruiter and private ingestion schema.");
    return;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", {name:"Log in"}).click();
  await expect(page).toHaveURL(/\/dashboard$/, {timeout:25000});
  await page.goto("/dashboard/candidates/import");
  await expect(page.getByRole("heading",{name:"Import resumes."})).toBeVisible();
  await expect(page.getByTestId("resume-imports")).toBeVisible();
  await expect(page.locator("#resume-files")).toHaveAttribute("multiple", "");
  await expect(page.getByRole("region",{name:"Import history"})).toBeVisible();
  await expect(page.getByRole("region",{name:"Schedule import batch"})).toBeVisible();
  await expect(page.getByTestId("import-metrics")).toBeVisible();
  await expect(page.getByRole("button",{name:"Upload selected"})).toBeDisabled();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
