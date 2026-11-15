import { afterEach, describe, expect, it, vi } from "vitest";
import { isResumeIngestionEnabled } from "./policy";
afterEach(() => vi.unstubAllEnvs());
describe("resume ingestion operational switch", () => {
  it("defaults to enabled and can be disabled without affecting search", () => {
    vi.stubEnv("RESUME_INGESTION_ENABLED", "true");
    expect(isResumeIngestionEnabled()).toBe(true);
    vi.stubEnv("RESUME_INGESTION_ENABLED", "false");
    expect(isResumeIngestionEnabled()).toBe(false);
  });
});
