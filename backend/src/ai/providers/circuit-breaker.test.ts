import { describe, expect, it } from "vitest";
import { ProviderCircuitBreaker } from "./circuit-breaker";

describe("provider circuit breaker", () => {
  it("opens after transient outages, then permits a bounded recovery probe", () => {
    let now = 1000;
    const circuit = new ProviderCircuitBreaker(2, 5000, () => now);
    expect(circuit.allows("Gemini")).toBe(true);
    circuit.onFailure("Gemini", "PROVIDER_5XX");
    expect(circuit.allows("Gemini")).toBe(true);
    circuit.onFailure("Gemini", "TIMEOUT");
    expect(circuit.allows("Gemini")).toBe(false);
    expect(circuit.allows("Groq")).toBe(true);
    now += 5001;
    expect(circuit.allows("Gemini")).toBe(true);
    circuit.onSuccess("Gemini");
    expect(circuit.allows("Gemini")).toBe(true);
  });
  it("does not trip on invalid model output or invalid configuration", () => {
    const circuit = new ProviderCircuitBreaker(1, 1000);
    circuit.onFailure("Groq", "OUTPUT_INVALID");
    circuit.onFailure("Groq", "AUTH_CONFIG");
    expect(circuit.allows("Groq")).toBe(true);
  });
});
