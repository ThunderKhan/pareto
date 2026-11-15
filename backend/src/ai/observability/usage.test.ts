import { describe, expect, it } from "vitest";
import { localProviderLatencySnapshot, recordSafeUsage } from "./usage";

describe("bounded privacy-safe provider latency snapshot", () => {
  it("records attempts and percentiles without exposing request data", () => {
    recordSafeUsage({ taskId: "search.interpret.v1", requestId: "private-request",
      provider: "Gemini", promptVersion: "1.0.0", schemaVersion: "v1",
      latencyMs: 200, outcome: "ok" });
    recordSafeUsage({ taskId: "search.interpret.v1", requestId: "another-request",
      provider: "Gemini", promptVersion: "1.0.0", schemaVersion: "v1",
      latencyMs: 450, outcome: "TIMEOUT" });
    const result = localProviderLatencySnapshot();
    expect(result.Gemini.samples).toBeGreaterThanOrEqual(2);
    expect(result.Gemini.failures).toBeGreaterThanOrEqual(1);
    expect(result.Gemini.p95Ms).not.toBeNull();
    expect(JSON.stringify(result)).not.toContain("private-request");
    expect(JSON.stringify(result)).not.toContain("another-request");
  });
});
