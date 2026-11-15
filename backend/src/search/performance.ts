/**
 * Privacy-safe process-local diagnostic sample. Never log queries, resumes,
 * candidates, tenants, IPs, result bodies or cache keys.
 */
export type SearchStage = "search.candidates" | "search.rank" |
  "search.total" | "search.cache-lookup" | "embedding.provider";
const samples: Array<{ stage: SearchStage; durationMs: number }> = [];
export function recordSearchTiming(stage: SearchStage, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  samples.push({ stage, durationMs: Math.round(durationMs * 100) / 100 });
  if (samples.length > 256) samples.splice(0, samples.length - 256);
}
function percentile(sorted: number[], q: number): number | null {
  return sorted.length ? sorted[Math.ceil(sorted.length * q) - 1] : null;
}
export type SearchStageSummary = Record<SearchStage, {
  count: number; p50Ms: number | null; p95Ms: number | null;
}>;
export function localSearchPerformanceSnapshot(): SearchStageSummary {
  const stages: SearchStage[] = ["search.candidates", "search.rank", "search.total",
    "search.cache-lookup", "embedding.provider"];
  return Object.fromEntries(stages.map(stage => {
    const durations = samples.filter(row => row.stage === stage).map(row => row.durationMs)
      .sort((a, b) => a - b);
    return [stage, { count: durations.length, p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95) }];
  })) as SearchStageSummary;
}
