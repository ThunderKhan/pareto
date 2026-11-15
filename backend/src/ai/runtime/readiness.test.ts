import { afterEach, describe, expect, it, vi } from "vitest";
import { aiConfigurationState, operationalReadiness } from "./readiness";

afterEach(() => vi.unstubAllEnvs());

describe("readiness distinguishes required database from optional AI configuration", () => {
  it("is ready with a healthy DB and no provider configured", async () => {
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GROQ_MODEL", "");
    expect(await operationalReadiness(async () => [{ ok: 1 }])).toEqual({
      status: "ready", database: "ready",
      ai: { configuration: "unconfigured", configuredProviders: 0, probed: false },
    });
  });
  it("fails closed for unavailable DB and never echoes errors or secrets", async () => {
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "synthetic-secret");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GROQ_API_KEY", "synthetic-secret-2");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    const status = await operationalReadiness(async () => { throw Error("private DB credentials"); });
    expect(status).toMatchObject({ status: "unavailable", database: "unavailable" });
    expect(status.ai).toMatchObject({ configuration: "configured", probed: false });
    expect(JSON.stringify(status)).not.toContain("synthetic-secret");
    expect(JSON.stringify(status)).not.toContain("private DB credentials");
  });
  it("honors the model kill switch without probing providers", () => {
    vi.stubEnv("AI_ENABLED", "false");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "synthetic-secret");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    expect(aiConfigurationState()).toEqual({
      configuration: "disabled", configuredProviders: 0, probed: false,
    });
  });
});
