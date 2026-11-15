import { privateCacheKey } from "./bounded-cache";

/** Bounded process-local cache, invalidated by the DB epoch on every read. */
export class VersionedSnapshotCache<T> {
  private readonly entries = new Map<string, { value: T; until: number }>();
  constructor(
    private readonly capacity: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(capacity) || capacity <= 0 || !Number.isFinite(ttlMs) || ttlMs <= 0)
      throw new Error("Invalid cache configuration");
  }
  private key(owner: string, session: string, revision: number, epoch: string, evaluator: string) {
    return privateCacheKey([owner, session, String(revision), epoch, evaluator]);
  }
  get(owner: string, session: string, revision: number, epoch: string, evaluator: string): T | null {
    const key = this.key(owner, session, revision, epoch, evaluator);
    const hit = this.entries.get(key);
    if (!hit) return null;
    if (hit.until <= this.now()) { this.entries.delete(key); return null; }
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit.value;
  }
  set(owner: string, session: string, revision: number, epoch: string, evaluator: string, value: T) {
    const key = this.key(owner, session, revision, epoch, evaluator);
    this.entries.delete(key);
    this.entries.set(key, { value, until: this.now() + this.ttlMs });
    while (this.entries.size > this.capacity) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) this.entries.delete(first);
    }
  }
  clear() { this.entries.clear(); }
  size() { return this.entries.size; }
}
