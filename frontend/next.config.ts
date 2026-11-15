import path from "node:path";
import type { NextConfig } from "next";

/** Optional public-frontend mode:
 *  - Vercel runs the Next.js React UI + Supabase Auth callbacks.
 *  - The *existing* Railway app remains the canonical authenticated API.
 *  - No Gemini/Groq or database credentials are required by the proxied API
 *    routes on Vercel; private app-specific server pages still need their
 *    own database connection, or can show their unavailable state.
 *  - Local and Railway deployments are unchanged unless this is set.
 *
 * A pinned HTTPS origin prevents an operator typo from shipping private
 * authenticated requests to an unexpected host. Change through a reviewed
 * source commit if the production Railway host changes.
 */
const API_HOST = "pareto-production.up.railway.app";
function upstreamApiOrigin(): string | null {
  const raw = process.env.PARETO_API_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== API_HOST ||
        url.port || url.username || url.password || url.pathname !== "/" ||
        url.search || url.hash || raw !== url.origin) {
      throw new Error("Unsupported API origin");
    }
    return url.origin;
  } catch {
    throw new Error("PARETO_API_ORIGIN must be the exact trusted Railway HTTPS origin");
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  transpilePackages: ["@pareto/backend"],
  async rewrites() {
    const upstream = upstreamApiOrigin();
    // beforeFiles is deliberate: these paths also have local route handlers.
    // The proxy must take precedence so Vercel sends the browser's owner-scoped
    // API calls to the already-verified Railway backend.
    return {
      beforeFiles: upstream ? [{ source: "/api/v1/:path*", destination: upstream + "/api/v1/:path*" }] : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
