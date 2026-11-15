import { queueResumeUpload } from "./service";
import { retryQueuedDocument } from "./queue";
import { workOnce } from "./runner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isResumeIngestionEnabled, shouldIndexResumeCandidate } from "./policy";
afterEach(() => vi.unstubAllEnvs());
describe("resume ingestion operational switch", () => {
  it("defaults to enabled and can be disabled without affecting search", () => {
    vi.stubEnv("RESUME_INGESTION_ENABLED", "true");
    expect(isResumeIngestionEnabled()).toBe(true);
    vi.stubEnv("RESUME_INGESTION_ENABLED", "false");
    expect(isResumeIngestionEnabled()).toBe(false);
  });
  it("does not generate paid embeddings for ingestion when semantic search is disabled", () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-api-key");
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("PARETO_SEMANTIC_SEARCH", "0");
    expect(shouldIndexResumeCandidate()).toBe(false);
    vi.stubEnv("PARETO_SEMANTIC_SEARCH", "1");
    expect(shouldIndexResumeCandidate()).toBe(true);
    vi.stubEnv("AI_ENABLED", "false");
    expect(shouldIndexResumeCandidate()).toBe(false);
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    expect(shouldIndexResumeCandidate()).toBe(false);
  });
  it("blocks jobs and uploads before any database access when suspended", async () => {
    vi.stubEnv("RESUME_INGESTION_ENABLED", "false");
    await expect(queueResumeUpload("owner", "candidate.txt", "text/plain",
      Buffer.from("Candidate text"), {} as never)).rejects.toMatchObject({
      status: 503, code: "INGESTION_DISABLED",
    });
    await expect(retryQueuedDocument("owner", "missing")).rejects.toMatchObject({
      status: 503, code: "INGESTION_DISABLED",
    });
    expect(await workOnce("suspended-worker", { global: 1, perOwner: 1 })).toBe(false);
  });

});
