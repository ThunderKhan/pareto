import { database } from "../../search/db";
import type { AiTaskId } from "../contracts/task";
import type { AiErrorCode } from "../contracts/errors";

/** Owner-scoped, metadata-only ledger. Disabled until its migration exists.
 * Write failures are deliberately best effort and cannot change a model answer;
 * reporting includes explicit coverage caveats instead of inventing billing.
 */
export async function recordAiAttempt(event: {
  userId?: string; taskId: AiTaskId; provider: "Gemini"|"Groq";
  modelId?: string; credentialSource?: "platform"|"byok";
  outcome: "ok"|AiErrorCode; inputTokens?: number; outputTokens?: number;
  latencyMs: number;
}) {
  if (process.env.AI_USAGE_LEDGER_ENABLED !== "true" || !event.userId) return;
  const sane = (n: number|undefined) => n !== undefined && Number.isSafeInteger(n) && n >= 0 && n <= 10000000 ? n : null;
  try {
    await database().aiUsageRecord.create({ data: {
      userId: event.userId, taskId: event.taskId, provider: event.provider,
      modelId: event.modelId ?? null, credentialSource: event.credentialSource ?? "platform",
      outcome: event.outcome, inputTokens: sane(event.inputTokens), outputTokens: sane(event.outputTokens),
      latencyMs: Math.min(86400000, Math.max(0, Math.round(event.latencyMs))),
    } });
  } catch { /* A partial ledger must never be mistaken for provider billing. */ }
}
type PriceRate = {
  provider: string; model: string; version: string;
  inputPerMillionUsd: number; outputPerMillionUsd: number;
};
export function priceCatalog(json = process.env.AI_PRICE_CATALOG_JSON): PriceRate[] {
  if (!json) return [];
  try {
    const rows: unknown = JSON.parse(json);
    if (!Array.isArray(rows) || rows.length > 50) return [];
    const valid = (r: unknown): r is PriceRate => {
      if (!r || typeof r !== "object") return false;
      const v = r as Partial<PriceRate>;
      return ["Gemini","Groq"].includes(v.provider ?? "") &&
        typeof v.model === "string" && /^[A-Za-z0-9_./:-]{1,120}$/.test(v.model) &&
        typeof v.version === "string" && /^[A-Za-z0-9_.-]{1,40}$/.test(v.version) &&
        typeof v.inputPerMillionUsd === "number" && Number.isFinite(v.inputPerMillionUsd) &&
        v.inputPerMillionUsd >= 0 && v.inputPerMillionUsd <= 1000 &&
        typeof v.outputPerMillionUsd === "number" && Number.isFinite(v.outputPerMillionUsd) &&
        v.outputPerMillionUsd >= 0 && v.outputPerMillionUsd <= 1000;
    };
    return rows.every(valid) ? rows : [];
  } catch { return []; }
}
export function estimatedUsd(record: {
  provider: string; modelId: string|null; inputTokens: number|null; outputTokens: number|null;
}, prices: PriceRate[]) {
  if (!record.modelId || record.inputTokens === null || record.outputTokens === null) return null;
  const rate = prices.find(p => p.provider === record.provider && p.model === record.modelId);
  if (!rate) return null;
  return { usd: (record.inputTokens*rate.inputPerMillionUsd +
    record.outputTokens*rate.outputPerMillionUsd)/1000000, priceVersion: rate.version };
}
export async function aiUsageSummary(userId: string, days: 1|7|30|90 = 7) {
  if (![1,7,30,90].includes(days)) throw new Error("Invalid usage window");
  const since = new Date(Date.now() - days*86400000);
  const aggregated = await database().aiUsageRecord.groupBy({
    by: ["taskId","provider","modelId","credentialSource","outcome"],
    where: { userId, createdAt: { gte: since } },
    _sum: { inputTokens: true, outputTokens: true },
    _count: { _all: true }, _avg: { latencyMs: true },
  });
  const prices = priceCatalog();
  const rows = aggregated.map(row => {
    const inputTokens = row._sum.inputTokens, outputTokens = row._sum.outputTokens;
    const cost = estimatedUsd({ provider: row.provider, modelId: row.modelId, inputTokens, outputTokens },prices);
    return { taskId:row.taskId,provider:row.provider,modelId:row.modelId,
      credentialSource:row.credentialSource,outcome:row.outcome,
      attempts:row._count._all,inputTokens,outputTokens,
      averageLatencyMs:row._avg.latencyMs===null?null:Math.round(row._avg.latencyMs),
      estimatedUsd:cost?.usd??null,priceVersion:cost?.priceVersion??null };
  });
  return { days, measuredAt:new Date().toISOString(),attempts:rows.reduce((s,r)=>s+r.attempts,0),
    rows,estimatedTotalUsd:rows.length && rows.every(r=>r.estimatedUsd!==null)
      ? rows.reduce((s,r)=>s+(r.estimatedUsd??0),0):null,
    caveats:[
      "Only attempts recorded with AI_USAGE_LEDGER_ENABLED=true are counted.",
      "Provider prices are optional operator-configured estimates, not verified invoices.",
      "Missing token counts or model prices produce unknown costs, not zero.",
      "Previously failed, unreported or unpersisted provider calls may be absent.",
      "Direct embedding requests and credential validation are not included in this gateway ledger.",
    ] };
}
