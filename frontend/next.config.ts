import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Playwright uses 127.0.0.1; permit only this loopback origin for dev assets/HMR.
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  transpilePackages: ["@pareto/backend"],
};

export default nextConfig;
