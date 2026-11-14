import { healthStatus } from "@pareto/backend";

export function GET() {
  return Response.json(healthStatus());
}
