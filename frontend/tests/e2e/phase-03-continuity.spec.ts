import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  const email = process.env.PARETO_E2E_EMAIL;
  const password = process.env.PARETO_E2E_PASSWORD;
  if (!email || !password) {
    if (process.env.PARETO_REQUIRE_LIVE === "1") throw new Error("Dedicated recruiter credentials required.");
    test.skip(true, "Requires a seeded, dedicated authenticated recruiter account.");
    return false;
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", {name:"Log in"}).click();
  await expect(page).toHaveURL(/\/dashboard$/, {timeout:25000});
  return true;
}

test("search home offers only confirmed owner history as continuation", async ({ page }) => {
  if (!await signIn(page)) return;
  const id = "dd317c77-cd93-4a2a-a3b2-4b7a2f99f129";
  await page.route("**/api/v1/search?history=1", async route => {
    await route.fulfill({status:200, contentType:"application/json", body:JSON.stringify([
      {id, title:"Backend engineer hiring", version:3},
    ])});
  });
  await page.goto("/dashboard/search");
  const resume = page.getByTestId("recent-search-resume");
  await expect(resume).toBeVisible();
  await expect(resume).toContainText("Backend engineer hiring");
  await expect(resume.getByRole("link",{name:/Resume confirmed search/}))
    .toHaveAttribute("href", "/dashboard/search?session=" + id);
  await expect(page.getByRole("dialog",{name:"Review draft criteria"})).toHaveCount(0);
});

test("import continuity separates reviews, failures, active processing and reviewer rejections", async ({ page }) => {
  if (!await signIn(page)) return;
  const now = "2026-11-15T06:00:00.000Z";
  const job = (id: string, status: string) => ({
    id, status, stage: status === "RUNNING" ? "PARSING" : "COMPLETE",
    attempts:1, maxAttempts:3, manualRetries:0, runAfter:null, batchId:null,
    cancelRequested:false, lastErrorCode:null, startedAt:null, finishedAt:null,
  });
  const make = (id: string, status: string, errorCode: string | null, reviewState: string) => ({
    id, fileName:id + ".pdf", kind:"PDF", mimeType:"application/pdf", byteSize:1000,
    status:status, attempts:1, provider:null, errorCode, textTruncated:false,
    reviewReasons:[], createdAt:now, updatedAt:now, candidate:null,
    ingestionJob:job(id + "-job",status), reviewState, reviewVersion:0, reviewedAt:null,
  });
  const docs = [
    make("needs-review","NEEDS_REVIEW","PROFILE_UNVERIFIED","NEEDS_REVIEW"),
    make("rejected","NEEDS_REVIEW","HUMAN_REJECTED","NEEDS_REVIEW"),
    make("failed","FAILED_PERMANENT","MODEL_ERROR","NEEDS_REVIEW"),
    make("running","RUNNING",null,"UNREVIEWED"),
  ];
  await page.route("**/api/v1/imports**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") return route.continue();
    if (url.pathname === "/api/v1/imports") {
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({imports:docs})});
    } else if (url.pathname === "/api/v1/imports/jobs") {
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({jobs:docs.map(d=>d.ingestionJob)})});
    } else if (url.pathname === "/api/v1/imports/batches") {
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({batches:[]})});
    } else return route.continue();
  });
  await page.goto("/dashboard/candidates/import");
  const queue = page.getByTestId("import-next-steps");
  await expect(queue).toBeVisible();
  await expect(queue.getByRole("heading",{name:"Needs your decision"})).toBeVisible();
  await expect(queue.getByRole("button",{name:"Review source"})).toHaveCount(1);
  await expect(queue.getByRole("button",{name:"Inspect failure"})).toHaveCount(1);
  await expect(queue).toContainText("rejected by a reviewer");
  await expect(queue).toContainText("1 import queued, running or awaiting retry");
  await expect(page.getByRole("table",{name:"Recent resume imports"})).toContainText("Human rejected");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});
