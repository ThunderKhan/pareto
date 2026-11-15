import { operationalReadiness } from "@pareto/backend";

export async function GET() {
  const state = await operationalReadiness();
  return Response.json(state, {
    status: state.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
