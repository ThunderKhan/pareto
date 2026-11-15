import { createHash } from "node:crypto";

/** Hash keys rather than storing raw recruiter queries or tenant identifiers. */
export function privateCacheKey(parts: readonly string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(String(Buffer.byteLength(part, "utf8")) + ":");
    hash.update(part);
  }
  return hash.digest("hex");
}

/** Single-process, bounded TTL cache. Only successful results are reusable. */
export class BoundedAsyncCache<T> {
  private readonly entries = new Map<string, {
    value?: T; pending?: Promise<T>; expiresAt: number;
  }>();
  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly clock: () => number = Date.now,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || !Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error("Invalid bounded cache configuration.");
    }
  }
  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const prior = this.entries.get(key);
    if (prior && (prior.pending || prior.expiresAt > this.clock())) {
      this.entries.delete(key);
      this.entries.set(key, prior);
      if (prior.pending) return prior.pending;
      return prior.value as T;
    }
    if (prior) this.entries.delete(key);
    const entry: { value?: T; pending?: Promise<T>; expiresAt: number } = {
      expiresAt: 0,
    };
    const pending = Promise.resolve().then(loader);
    entry.pending = pending;
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    try {
      const value = await pending;
      if (this.entries.get(key) === entry) {
        entry.value = value;
        entry.pending = undefined;
        entry.expiresAt = this.clock() + this.ttlMs;
      }
      return value;
    } catch (error) {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    }
  }
  clear() { this.entries.clear(); }
  size() { return this.entries.size; }
}
