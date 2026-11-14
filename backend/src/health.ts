export function healthStatus() {
  return {
    status: "ok" as const,
    service: "pareto",
    phase: "scaffold" as const,
  };
}
