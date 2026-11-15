import { describe, expect, it } from "vitest";
import { VersionedSnapshotCache } from "./snapshot-cache";

describe("confirmed search result snapshot cache", () => {
  it("uses the authenticated owner, exact revision, data epoch and evaluator", () => {
    let now = 0;
    const cache = new VersionedSnapshotCache<{ matches: number }>(2, 100, () => now);
    cache.set("owner-a", "session", 1, "3", "v1", { matches: 42 });
    expect(cache.get("owner-a", "session", 1, "3", "v1")).toEqual({ matches: 42 });
    expect(cache.get("owner-b", "session", 1, "3", "v1")).toBeNull();
    expect(cache.get("owner-a", "session", 2, "3", "v1")).toBeNull();
    expect(cache.get("owner-a", "session", 1, "4", "v1")).toBeNull();
    expect(cache.get("owner-a", "session", 1, "3", "v2")).toBeNull();
    now = 100;
    expect(cache.get("owner-a", "session", 1, "3", "v1")).toBeNull();
  });
  it("limits memory and evicts least recently used entries", () => {
    const cache = new VersionedSnapshotCache<number>(2, 1000);
    cache.set("a", "one", 1, "0", "v1", 1);
    cache.set("a", "two", 1, "0", "v1", 2);
    expect(cache.get("a", "one", 1, "0", "v1")).toBe(1);
    cache.set("a", "three", 1, "0", "v1", 3);
    expect(cache.get("a", "two", 1, "0", "v1")).toBeNull();
    expect(cache.size()).toBe(2);
  });
});
