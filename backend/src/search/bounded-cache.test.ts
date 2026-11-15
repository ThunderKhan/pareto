import { describe, expect, it } from "vitest";
import { BoundedAsyncCache, privateCacheKey } from "./bounded-cache";

describe("tenant-bound bounded async cache", () => {
  it("reuses a successful result only until TTL expires", async () => {
    let now = 0, calls = 0;
    const cache = new BoundedAsyncCache<number>(2, 100, () => now);
    const load = async () => ++calls;
    expect(await cache.getOrLoad("a", load)).toBe(1);
    now = 99;
    expect(await cache.getOrLoad("a", load)).toBe(1);
    now = 100;
    expect(await cache.getOrLoad("a", load)).toBe(2);
    expect(calls).toBe(2);
  });

  it("coalesces concurrent requests and never caches rejected responses", async () => {
    let calls = 0, fail = true;
    const cache = new BoundedAsyncCache<number>(4, 10_000);
    const load = async () => {
      ++calls;
      await Promise.resolve();
      if (fail) throw new Error("provider failed");
      return 42;
    };
    const first = await Promise.allSettled([
      cache.getOrLoad("a", load), cache.getOrLoad("a", load),
    ]);
    expect(first.map(x => x.status)).toEqual(["rejected", "rejected"]);
    expect(calls).toBe(1);
    expect(cache.size()).toBe(0);
    fail = false;
    expect(await cache.getOrLoad("a", load)).toBe(42);
    expect(calls).toBe(2);
  });

  it("evicts oldest entries, including on a cache hit", async () => {
    const cache = new BoundedAsyncCache<string>(2, 10_000);
    await cache.getOrLoad("a", async () => "A");
    await cache.getOrLoad("b", async () => "B");
    await cache.getOrLoad("a", async () => "WRONG");
    await cache.getOrLoad("c", async () => "C");
    expect(cache.size()).toBe(2);
    expect(await cache.getOrLoad("b", async () => "NEW")).toBe("NEW");
  });

  it("hashes tenant, query and model with unambiguous framing", () => {
    const a = privateCacheKey(["owner-a", "model-v1", "Java"]);
    const b = privateCacheKey(["owner-b", "model-v1", "Java"]);
    const c = privateCacheKey(["owner-a", "model-v2", "Java"]);
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(privateCacheKey(["ab", "c"])).not.toBe(privateCacheKey(["a", "bc"]));
    expect(a).not.toContain("owner-a");
    expect(a).not.toContain("Java");
  });
});
