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
});
