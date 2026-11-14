import { describe, expect, it } from "vitest";
import { healthStatus } from "./health";

describe("healthStatus", () => {
  it("reports the scaffold status", () => {
    expect(healthStatus()).toEqual({
      status: "ok",
      service: "pareto",
      phase: "scaffold",
    });
  });
});
