import { expect, test } from "@playwright/test";
import nextConfig from "../../next.config";

const original = process.env.PARETO_API_ORIGIN;
test.afterEach(() => {
  if (original === undefined) delete process.env.PARETO_API_ORIGIN;
  else process.env.PARETO_API_ORIGIN = original;
});
async function beforeFiles() {
  if (!nextConfig.rewrites) throw new Error("Missing rewrite config");
  const result = await nextConfig.rewrites();
  if (Array.isArray(result)) throw new Error("Expected explicit beforeFiles precedence");
  return result.beforeFiles;
}
test("Railway and local app keep all routes native when proxy mode is off", async () => {
  delete process.env.PARETO_API_ORIGIN;
  expect(await beforeFiles()).toEqual([]);
});
test("Vercel can delegate authenticated API paths to exact Railway HTTPS service", async () => {
  process.env.PARETO_API_ORIGIN = "https://pareto-production.up.railway.app";
  expect(await beforeFiles()).toEqual([{
    source: "/api/v1/:path*",
    destination: "https://pareto-production.up.railway.app/api/v1/:path*",
  }]);
});
test("reject unreviewed domains, relative paths, and origin credentials", async () => {
  for (const origin of [
    "http://pareto-production.up.railway.app",
    "https://pareto-production.up.railway.app.attacker.test",
    "https://pareto-production.up.railway.app/api",
    "https://user:password@pareto-production.up.railway.app",
    "https://pareto-production.up.railway.app:8443",
  ]) {
    process.env.PARETO_API_ORIGIN = origin;
    await expect(beforeFiles()).rejects.toThrow("trusted Railway HTTPS origin");
  }
});
