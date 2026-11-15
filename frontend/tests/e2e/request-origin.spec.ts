import { test, expect } from "@playwright/test";
import { isSameOriginMutation, rejectCrossOriginMutation } from "../../src/lib/request-origin";

const internal = "http://0.0.0.0:8080/api/v1/search";
const local = "http://localhost:3000/api/v1/search";
function post(url: string, origin?: string, site = "same-origin") {
  return new Request(url, { method: "POST", headers: {
    "sec-fetch-site": site, ...(origin ? { origin } : {}),
  } });
}
test.describe("authenticated mutation origin guard behind a trusted proxy", () => {
  test.beforeEach(() => {
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    delete process.env.PARETO_PUBLIC_ORIGIN;
  });
  test.afterEach(() => {
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
    delete process.env.PARETO_PUBLIC_ORIGIN;
  });
  test("accepts legitimate same-origin requests locally", () => {
    expect(isSameOriginMutation(post(local, "http://localhost:3000"))).toBe(true);
    expect(rejectCrossOriginMutation(post(local, "http://localhost:3000"))).toBeNull();
  });
  test("accepts configured Railway public HTTPS origin when internal URL differs", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "pareto-production.up.railway.app";
    expect(isSameOriginMutation(post(internal, "https://pareto-production.up.railway.app"))).toBe(true);
    expect(rejectCrossOriginMutation(post(internal, "https://pareto-production.up.railway.app"))).toBeNull();
  });
  test("denies arbitrary cross-origin and cannot be bypassed via spoofed forwarded headers", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "pareto-production.up.railway.app";
    const request = new Request(internal, { method: "POST", headers: {
      origin: "https://attacker.example", "sec-fetch-site": "same-origin",
      "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https",
    } });
    expect(isSameOriginMutation(request)).toBe(false);
    expect(rejectCrossOriginMutation(request)?.status).toBe(403);
    expect(isSameOriginMutation(post(internal, "https://pareto-production.up.railway.app", "cross-site"))).toBe(false);
  });
  test("rejects invalid or hostile configured domains and malformed origins", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "attacker.example/path";
    expect(isSameOriginMutation(post(internal, "https://attacker.example"))).toBe(false);
    process.env.RAILWAY_PUBLIC_DOMAIN = "pareto-production.up.railway.app";
    expect(isSameOriginMutation(post(internal, "https://pareto-production.up.railway.app.evil.test"))).toBe(false);
    expect(isSameOriginMutation(post(internal, "https://pareto-production.up.railway.app@evil.test"))).toBe(false);
    expect(isSameOriginMutation(post(internal, "https://pareto-production.up.railway.app/path"))).toBe(false);
    expect(isSameOriginMutation(post(internal, "null"))).toBe(false);
  });
  test("permits an explicitly configured HTTPS custom domain but not HTTP or off-origin", () => {
    process.env.PARETO_PUBLIC_ORIGIN = "https://app.pareto.example";
    expect(isSameOriginMutation(post(internal, "https://app.pareto.example"))).toBe(true);
    expect(isSameOriginMutation(post(internal, "http://app.pareto.example"))).toBe(false);
    expect(isSameOriginMutation(post(internal, "https://evil.example"))).toBe(false);
    process.env.PARETO_PUBLIC_ORIGIN = "http://app.pareto.example";
    expect(isSameOriginMutation(post(internal, "http://app.pareto.example"))).toBe(false);
  });
  test("still accepts no-Origin non-browser requests except explicit cross-site", () => {
    expect(isSameOriginMutation(post(internal))).toBe(true);
    expect(isSameOriginMutation(post(internal, undefined, "cross-site"))).toBe(false);
  });
});
