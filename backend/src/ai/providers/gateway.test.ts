import { describe, expect, it, vi } from "vitest";
import { AiFailure, classifyHttpStatus } from "../contracts/errors";
import { proposeStructured } from "./gateway";

describe("bounded provider gateway", () => {
  const accept = (raw: unknown) => {
    if (typeof raw !== "object" || !raw || !("valid" in raw) || raw.valid !== true)
      throw new Error("bad shape");
    return { valid: true };
  };
  it("never falls back on invalid provider credentials", async () => {
    const primary = vi.fn().mockRejectedValue(classifyHttpStatus(401));
    const secondary = vi.fn().mockResolvedValue({ raw: { valid: true }, provider: "Groq" });
    await expect(proposeStructured("instructions", "data", accept, [primary, secondary]))
      .rejects.toMatchObject({ code: "AUTH_CONFIG" });
    expect(secondary).not.toHaveBeenCalled();
  });
  it("falls back for transient outage or malformed model output", async () => {
    const secondary = vi.fn().mockResolvedValue({ raw: { valid: true }, provider: "Groq" });
    const down = vi.fn().mockRejectedValue(classifyHttpStatus(429));
    await expect(proposeStructured("instructions", "data", accept, [down, secondary]))
      .resolves.toMatchObject({ valid: true, provider: "Groq" });
    const invalid = vi.fn().mockResolvedValue({ raw: { valid: "maybe" }, provider: "Gemini" });
    await expect(proposeStructured("instructions", "data", accept, [invalid, secondary]))
      .resolves.toMatchObject({ provider: "Groq" });
    expect(secondary).toHaveBeenCalledTimes(2);
  });
  it("refuses oversized input and absent providers without calling a model", async () => {
    const model = vi.fn();
    await expect(proposeStructured("instruction", "x".repeat(8001), accept, [model]))
      .rejects.toMatchObject({ code: "BAD_INPUT" });
    expect(model).not.toHaveBeenCalled();
    await expect(proposeStructured("instruction", "data", accept, []))
      .rejects.toBeInstanceOf(AiFailure);
  });
  it("preserves semantic rejection codes so invalid evidence is not misclassified as malformed JSON", async () => {
    const model = vi.fn().mockResolvedValue({
      raw: { evidence: "plausible but unsupported" }, provider: "Gemini",
    });
    await expect(proposeStructured("instructions", "data", () => {
      throw new AiFailure("SEMANTIC_UNVERIFIED", false);
    }, [model])).rejects.toMatchObject({
      code: "SEMANTIC_UNVERIFIED", retryable: false,
    });
    expect(model).toHaveBeenCalledOnce();
  });

  it("supports bounded, operator-tunable per-provider timeout budgets", async () => {
    const original = process.env.AI_PRIMARY_TIMEOUT_MS;
    const fallbackOriginal = process.env.AI_FALLBACK_TIMEOUT_MS;
    try {
      process.env.AI_PRIMARY_TIMEOUT_MS = "3200";
      process.env.AI_FALLBACK_TIMEOUT_MS = "2400";
      const failing = vi.fn().mockRejectedValue(classifyHttpStatus(429));
      const succeeding = vi.fn().mockResolvedValue({ raw: { valid: true }, provider: "Groq" });
      await proposeStructured("instructions", "data", accept, [failing, succeeding]);
      expect(failing.mock.calls[0][2]).toBe(3200);
      expect(succeeding.mock.calls[0][2]).toBeLessThanOrEqual(2400);
      process.env.AI_PRIMARY_TIMEOUT_MS = "not-a-timeout";
      const single = vi.fn().mockResolvedValue({ raw: { valid: true }, provider: "Gemini" });
      await proposeStructured("instructions", "data", accept, [single]);
      expect(single.mock.calls[0][2]).toBe(9000);
    } finally {
      if (original === undefined) delete process.env.AI_PRIMARY_TIMEOUT_MS;
      else process.env.AI_PRIMARY_TIMEOUT_MS = original;
      if (fallbackOriginal === undefined) delete process.env.AI_FALLBACK_TIMEOUT_MS;
      else process.env.AI_FALLBACK_TIMEOUT_MS = fallbackOriginal;
    }
  });
  it("passes task-specific bounded output limits to model adapters", async () => {
    const provider = vi.fn().mockResolvedValue({ raw: { valid: true }, provider: "Gemini" });
    await proposeStructured("instructions", "data", accept, [provider], { taskId: "search.interpret.v1" });
    expect(provider.mock.calls[0][3]).toBe(2600);
    await proposeStructured("instructions", "data", accept, [provider], { taskId: "resume.extract.v1" });
    expect(provider.mock.calls[1][3]).toBe(4096);
  });

  it("enforces task-specific decoded response byte caps, not just the transport cap", async () => {
    const model = vi.fn().mockResolvedValue({
      provider: "Gemini", raw: { valid: true, extra: "x".repeat(20000) },
    });
    await expect(proposeStructured("instructions", "input", accept, [model], {
      taskId: "resume.evidence-review.v1",
    })).rejects.toMatchObject({ code: "OUTPUT_INVALID" });
    expect(model).toHaveBeenCalledOnce();
  });

});
