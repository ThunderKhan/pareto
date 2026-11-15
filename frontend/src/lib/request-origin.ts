/** Browser cross-origin mutation guard for cookie-authenticated APIs.
 * This complements, but does not replace, authenticated owner scope.
 */
export function rejectCrossOriginMutation(request: Request): Response | null {
  const site = request.headers.get("sec-fetch-site");
  let allowed = site !== "cross-site";
  const origin = request.headers.get("origin");
  if (origin) {
    try { allowed &&= new URL(origin).origin === new URL(request.url).origin; }
    catch { allowed = false; }
  }
  return allowed ? null : Response.json(
    { code: "CROSS_ORIGIN", error: "Cross-origin requests are not allowed." },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}
