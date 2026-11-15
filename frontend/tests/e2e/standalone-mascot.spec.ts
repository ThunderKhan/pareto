import { expect, test } from "@playwright/test";

test("shared Parito mascot is standalone, without resume card or enclosing badge", async ({ request }) => {
  const response = await request.get("/mascot/pareto-mascot.svg");
  expect(response.status()).toBe(200);
  const artwork = await response.text();
  expect(artwork).toContain("a friendly blue document character");
  expect(artwork).toContain('viewBox="0 0 240 225"');
  expect(artwork).toContain("parito-blue");
  expect(artwork).not.toContain("candidate profile and waving");
  expect(artwork).not.toContain('transform="rotate(-11');
  expect(artwork).not.toContain('rx="63"');
});
