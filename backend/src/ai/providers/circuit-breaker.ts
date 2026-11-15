import type { AiErrorCode } from "../contracts/errors";
import type { ProviderName } from "../contracts/task";

export class ProviderCircuitBreaker {
  private status = new Map<ProviderName, { failures: number; openedAt: number | null }>();
  constructor(readonly threshold = 3, readonly cooldownMs = 30000, readonly now: () => number = Date.now) {}
  allows(name: ProviderName): boolean {
    const state = this.status.get(name);
    if (!state?.openedAt) return true;
    if (this.now() - state.openedAt >= this.cooldownMs) {
      this.status.set(name, { failures: 0, openedAt: null });
      return true;
    }
    return false;
  }
  onSuccess(name: ProviderName) { this.status.delete(name); }
  onFailure(name: ProviderName, code: AiErrorCode) {
    if (!["TIMEOUT", "NETWORK", "PROVIDER_5XX", "RATE_LIMIT"].includes(code)) return;
    const prior = this.status.get(name) ?? { failures: 0, openedAt: null };
    const failures = prior.failures + 1;
    this.status.set(name, { failures, openedAt: failures >= this.threshold ? this.now() : null });
  }
}
export const providerCircuitBreaker = new ProviderCircuitBreaker();
