import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { database } from "../../search/db";
import { AiFailure } from "../contracts/errors";
import { checkCredential, getAiConnections, openCredential, removeAiCredential,
  resolveAiProviders, sealCredential, selectAiMode, storeAiCredential,
  verifySavedAiCredential } from "./byok";

const key="f".repeat(64);
const owner="33333333-3333-4333-8333-333333333333";
const foreign="44444444-4444-4444-8444-444444444444";
const url=process.env.PARETO_TEST_DATABASE_URL;
if(url)process.env.DATABASE_URL=url;
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("encrypted BYOK envelope (offline)", () => {
  it("is nondeterministic and bound to the exact owner/provider", () => {
    vi.stubEnv("PARETO_BYOK_MASTER_KEY",key);
    const first=sealCredential(owner,"Gemini","AIza-synthetic-not-a-real-secret");
    const second=sealCredential(owner,"Gemini","AIza-synthetic-not-a-real-secret");
    expect(first.encryptedKey).not.toBe(second.encryptedKey);
    expect(JSON.stringify(first)).not.toContain("synthetic-not-a-real-secret");
    expect(openCredential(owner,"Gemini",first)).toBe("AIza-synthetic-not-a-real-secret");
    expect(() => openCredential(foreign,"Gemini",first)).toThrow(AiFailure);
    expect(() => openCredential(owner,"Groq",first)).toThrow(AiFailure);
    expect(() => openCredential(owner,"Gemini",{...first,encryptedKey:first.encryptedKey.slice(1)})).toThrow();
  });
  it("fails closed with missing or invalid encryption material", () => {
    vi.stubEnv("PARETO_BYOK_MASTER_KEY","");
    expect(() => sealCredential(owner,"Groq","gsk_synthetic-not-a-real-secret"))
      .toThrow(AiFailure);
  });
  it("tests provider keys against fixed endpoints with no resume data",async () => {
    vi.stubGlobal("fetch",vi.fn(async (url: string | URL,opts?: RequestInit) => {
      expect(String(url)).toBe("https://api.groq.com/openai/v1/models");
      expect(new Headers(opts?.headers).get("Authorization")).toBe("Bearer gsk_synthetic-not-a-real-secret");
      expect(opts?.method).toBe("GET");
      expect(opts?.body).toBeUndefined();
      return Response.json({ data: [] });
    }));
    await checkCredential("Groq","gsk_synthetic-not-a-real-secret");
  });
});
describe.skipIf(!url)("owner-scoped BYOK selection against PostgreSQL",()=>{
  const db=url?database():null;
  afterAll(async()=>{
    if(!db)return;
    await db.aiUserCredential.deleteMany({where:{userId:{in:[owner,foreign]}}});
    await db.aiUserPreference.deleteMany({where:{userId:{in:[owner,foreign]}}});
    await db.$disconnect();
  });
  it("never exposes saved secrets and never switches BYOK owner to platform credentials",async()=>{
    vi.stubEnv("PARETO_BYOK_MASTER_KEY",key);
    vi.stubEnv("GEMINI_MODEL","gemini-2.5-flash");
    vi.stubEnv("GROQ_MODEL","openai/gpt-oss-20b");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY","platform-test-key");
    vi.stubEnv("GROQ_API_KEY","platform-test-key");
    vi.stubGlobal("fetch",vi.fn(async () => Response.json({data:[]})));
    const before=await getAiConnections(owner);
    expect(before.mode).toBe("PLATFORM");
    await storeAiCredential(owner,"Groq","gsk_synthetic-not-a-real-secret");
    const settings=await selectAiMode(owner,"BYOK");
    expect(JSON.stringify(settings)).not.toContain("synthetic-not-a-real-secret");
    expect(settings.providers.find(p=>p.provider==="Groq")?.connected).toBe(true);
    expect(settings.providers.find(p=>p.provider==="Gemini")?.connected).toBe(false);
    const providers=await resolveAiProviders(owner);
    expect(providers).toHaveLength(1);
    expect(providers[0].providerName).toBe("Groq");
    expect(providers[0].providerSource).toBe("byok");
    expect((await getAiConnections(foreign)).providers.every(row=>!row.connected)).toBe(true);
    await expect(verifySavedAiCredential(foreign,"Groq")).rejects.toMatchObject({code:"AUTH_CONFIG"});
    await verifySavedAiCredential(owner,"Groq");
    await removeAiCredential(owner,"Groq");
    await expect(resolveAiProviders(owner)).rejects.toMatchObject({code:"AUTH_CONFIG"});
    expect((await getAiConnections(owner)).mode).toBe("BYOK");
    await selectAiMode(owner,"PLATFORM");
    expect((await resolveAiProviders(owner)).some(p=>p.providerSource==="platform")).toBe(true);
  });
});
