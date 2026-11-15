import { AiFailure } from "../contracts/errors";

function limit(name: string, fallback: number, maximum: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= maximum ? value : fallback;
}

/**
 * Strictly a per-process burst safeguard, NOT a distributed billing ledger.
 * Multiple replicas require a database/Redis-backed owner quota before production.
 */
export class AiProcessLimiter {
  private inflight = 0;
  private globalWindow = { startedAt: Date.now(), calls: 0 };
  private owners = new Map<string, { startedAt: number; calls: number }>();
  constructor(
    readonly concurrency: number,
    readonly maxPerOwnerHour: number,
    readonly maxGlobalHour: number,
    readonly now: () => number = Date.now,
  ) {}
  acquire(ownerId: string): () => void {
    const now = this.now(), hour = 60 * 60 * 1000;
    if (this.globalWindow.startedAt + hour <= now) this.globalWindow = { startedAt: now, calls: 0 };
    let window = this.owners.get(ownerId);
    if (!window || window.startedAt + hour <= now) {
      window = { startedAt: now, calls: 0 };
      this.owners.set(ownerId, window);
    }
    if (this.inflight >= this.concurrency || window.calls >= this.maxPerOwnerHour ||
        this.globalWindow.calls >= this.maxGlobalHour) throw new AiFailure("BUDGET_EXCEEDED", false);
    if (this.owners.size > 10000) {
      for (const [id, value] of this.owners) if (value.startedAt + hour <= now) this.owners.delete(id);
      if (this.owners.size > 10000) throw new AiFailure("BUDGET_EXCEEDED", false);
    }
    this.inflight++;
    window.calls++;
    this.globalWindow.calls++;
    let released = false;
    return () => { if (!released) { released = true; this.inflight--; } };
  }
  stats() { return { inflight: this.inflight, globalCallsThisHour: this.globalWindow.calls }; }
}
export const aiProcessLimiter = new AiProcessLimiter(
  limit("AI_MAX_CONCURRENT_CALLS", 4, 100),
  limit("AI_MAX_CALLS_PER_RECRUITER_HOUR", 40, 10000),
  limit("AI_MAX_GLOBAL_CALLS_PER_HOUR", 2000, 500000),
);
