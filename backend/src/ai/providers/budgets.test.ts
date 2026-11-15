import { describe, expect, it } from "vitest";
import { AiProcessLimiter } from "./budgets";

describe("bounded per-process AI call budget", () => {
  it("limits global concurrent calls and permits release exactly once", () => {
    let time = 1000;
    const limiter = new AiProcessLimiter(1, 3, 4, () => time);
    const release = limiter.acquire("owner-a");
    expect(() => limiter.acquire("owner-b")).toThrow();
    release(); release();
    expect(limiter.stats().inflight).toBe(0);
    limiter.acquire("owner-b")();
    expect(limiter.stats().globalCallsThisHour).toBe(2);
    time += 3600001;
    limiter.acquire("owner-a")();
    expect(limiter.stats().globalCallsThisHour).toBe(1);
  });
  it("charges fallback attempts and never silently resets an owner quota", () => {
    const limiter = new AiProcessLimiter(10, 2, 10, () => 1234);
    limiter.acquire("owner-a")();
    limiter.acquire("owner-a")();
    expect(() => limiter.acquire("owner-a")).toThrow();
    limiter.acquire("owner-b")();
  });
});
