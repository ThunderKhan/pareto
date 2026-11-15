import { describe, expect, it } from "vitest";
import { localSearchPerformanceSnapshot, recordSearchTiming } from "./performance";

describe("privacy-safe search performance metrics", () => {
  it("records durations only and computes bounded percentiles", () => {
    recordSearchTiming("embedding.provider", 2);
    recordSearchTiming("embedding.provider", 10);
    recordSearchTiming("embedding.provider", Number.NaN);
    const value = localSearchPerformanceSnapshot()["embedding.provider"];
    expect(value.count).toBeGreaterThanOrEqual(2);
    expect(value.p50Ms).not.toBeNull();
    expect(value.p95Ms).not.toBeNull();
    expect(JSON.stringify(localSearchPerformanceSnapshot())).not.toContain("owner");
  });
});
