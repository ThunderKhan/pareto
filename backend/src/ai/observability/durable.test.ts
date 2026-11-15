import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { database } from "../../search/db";
import { aiUsageSummary, estimatedUsd, priceCatalog, recordAiAttempt } from "./durable";

const url=process.env.PARETO_TEST_DATABASE_URL;
if(url)process.env.DATABASE_URL=url;
const owner="55555555-5555-4555-8555-555555555555";
const foreign="66666666-6666-4666-8666-666666666666";
afterEach(()=>vi.unstubAllEnvs());
describe("cost estimation never fabricates unknown prices",()=>{
  it("estimates only token-complete attempts with an operator versioned price",()=>{
    const prices=priceCatalog(JSON.stringify([{
      provider:"Gemini",model:"gemini-test",version:"example-v1",
      inputPerMillionUsd:0.2,outputPerMillionUsd:1.0,
    }]));
    expect(estimatedUsd({provider:"Gemini",modelId:"gemini-test",
      inputTokens:1000000,outputTokens:100000},prices)).toEqual({
        usd:0.3,priceVersion:"example-v1",
      });
    expect(estimatedUsd({provider:"Groq",modelId:"unknown",
      inputTokens:100,outputTokens:100},prices)).toBeNull();
    expect(estimatedUsd({provider:"Gemini",modelId:"gemini-test",
      inputTokens:null,outputTokens:100},prices)).toBeNull();
    expect(priceCatalog('[{"provider":"Gemini","model":"a","version":"x","inputPerMillionUsd":-1,"outputPerMillionUsd":1}]')).toEqual([]);
  });
});
describe.skipIf(!url)("durable owner-only AI attempt usage",()=>{
  const db=url?database():null;
  afterAll(async()=>{
    if(!db)return;
    await db.aiUsageRecord.deleteMany({where:{userId:{in:[owner,foreign]}}});
    await db.$disconnect();
  });
  it("counts real provider attempts and never stores raw model inputs",async()=>{
    vi.stubEnv("AI_USAGE_LEDGER_ENABLED","true");
    vi.stubEnv("AI_PRICE_CATALOG_JSON",JSON.stringify([{
      provider:"Gemini",model:"gemini-test",version:"example-v1",
      inputPerMillionUsd:0.5,outputPerMillionUsd:2,
    }]));
    await recordAiAttempt({userId:owner,taskId:"resume.extract.v1",provider:"Gemini",
      modelId:"gemini-test",credentialSource:"byok",outcome:"ok",
      inputTokens:1800,outputTokens:400,latencyMs:550});
    await recordAiAttempt({userId:owner,taskId:"resume.extract.v1",provider:"Gemini",
      modelId:"gemini-test",credentialSource:"byok",outcome:"RATE_LIMIT",
      latencyMs:150});
    await recordAiAttempt({userId:foreign,taskId:"search.interpret.v1",provider:"Groq",
      credentialSource:"platform",outcome:"ok",inputTokens:50,outputTokens:10,latencyMs:200});
    const result=await aiUsageSummary(owner,1);
    expect(result.attempts).toBe(2);
    expect(result.rows.some(r=>r.credentialSource==="byok"&&r.outcome==="ok"&&r.inputTokens===1800)).toBe(true);
    expect(result.estimatedTotalUsd).toBeNull(); // failed request has no recorded tokens
    expect(JSON.stringify(result)).not.toContain(foreign);
    const stored=await db!.aiUsageRecord.findMany({where:{userId:owner}});
    expect(stored).toHaveLength(2);
    expect(JSON.stringify(stored)).not.toContain("secret");
    const isolated=await aiUsageSummary(foreign,1);
    expect(isolated.attempts).toBe(1);
  });
});
