/**
 * Origin check for cookie-authenticated API mutations.
 *
 * A reverse proxy (Railway) can expose HTTPS to the browser but hand the
 * Next.js app an internal http://host:PORT Request.url. Comparing Origin only
 * to Request.url therefore rejects legitimate same-site browser calls.
 *
 * Trust the platform-provided domain ENVIRONMENT variable, not arbitrary
 * incoming X-Forwarded-Host / X-Forwarded-Proto headers: those headers may
 * be supplied by clients or internal peers on some deployment topologies.
 *
 * RAILWAY_PUBLIC_DOMAIN is provided by Railway, without a scheme. An optional
 * operator-controlled PARETO_PUBLIC_ORIGIN supports another public HTTPS domain.
 */
function canonicalOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
        parsed.username || parsed.password || parsed.pathname !== "/" ||
        parsed.search || parsed.hash || parsed.origin !== value) return null;
    return parsed.origin;
  } catch { return null; }
}

function railwayOrigin(): string | null {
  const hostname = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().toLowerCase();
  if (!hostname || hostname.length > 253 || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(hostname) ||
      hostname.split(".").some(label =>
        label.length > 63 || label.startsWith("-") || label.endsWith("-"))) return null;
  return canonicalOrigin("https://" + hostname);
}

/** Verify the requesting browser origin without disabling CSRF safeguards. */
export function isSameOriginMutation(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const received = request.headers.get("origin");
  if (!received) return true; // Preserve support for non-browser callers.

  const origin = canonicalOrigin(received);
  if (!origin) return false;
  let internalOrigin: string;
  try { internalOrigin = new URL(request.url).origin; }
  catch { return false; }
  if (origin === internalOrigin) return true;

  // Railway's public HTTPS domain is a trusted deployment configuration.
  const publicRailwayOrigin = railwayOrigin();
  if (publicRailwayOrigin && origin === publicRailwayOrigin) return true;

  // Custom domains must be explicitly configured by the operator; never
  // reflect a request's Host or X-Forwarded-Host into this allowlist.
  const configured = process.env.PARETO_PUBLIC_ORIGIN;
  return Boolean(configured && configured.startsWith("https://") &&
    origin === canonicalOrigin(configured));
}

/** Browser cross-origin mutation guard for cookie-authenticated APIs.
 * This complements, but does not replace, authenticated owner scope.
 */
export function rejectCrossOriginMutation(request: Request): Response | null {
  return isSameOriginMutation(request) ? null : Response.json(
    { code: "CROSS_ORIGIN", error: "Cross-origin requests are not allowed." },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}
