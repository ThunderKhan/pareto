import { afterEach, describe, expect, it, vi } from "vitest";
import { availableProviders } from "./http";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("actual provider HTTP request construction (offline)", () => {
  it("constructs the Gemini endpoint with the real model ID and uses an API-key header", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "synthetic-gemini-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GROQ_MODEL", "");
    const mock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-goog-api-key")).toBe("synthetic-gemini-key");
      expect(headers.has("authorization")).toBe(false);
      const body = JSON.parse(String(init?.body));
      expect(body.systemInstruction.parts[0].text).toBe("task instructions");
      expect(body.contents[0].parts[0].text).toBe("untrusted input");
      return Response.json({
        candidates: [{ content: { parts: [{ text: '{"value":"ok"}' }] } }],
        usageMetadata: { promptTokenCount: 13, candidatesTokenCount: 7 },
      });
    });
    vi.stubGlobal("fetch", mock);
    const [provider] = availableProviders();
    expect(provider?.providerName).toBe("Gemini");
    const result = await provider("task instructions", "untrusted input");
    expect(result).toMatchObject({
      raw: { value: "ok" }, provider: "Gemini",
      modelId: "gemini-2.5-flash", inputTokens: 13, outputTokens: 7,
    });
    expect(mock).toHaveBeenCalledOnce();
  });

  it("constructs a valid Groq bearer authorization and never sends keys inside the prompt", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GROQ_API_KEY", "synthetic-groq-key");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    const mock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer synthetic-groq-key");
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("openai/gpt-oss-20b");
      expect(JSON.stringify(body.messages)).not.toContain("synthetic-groq-key");
      return Response.json({
        choices: [{ message: { content: '{"answer":42}' } }],
        usage: { prompt_tokens: 22, completion_tokens: 11 },
      });
    });
    vi.stubGlobal("fetch", mock);
    const [provider] = availableProviders();
    expect(provider?.providerName).toBe("Groq");
    const result = await provider("task instructions", "untrusted input");
    expect(result).toMatchObject({
      raw: { answer: 42 }, provider: "Groq",
      modelId: "openai/gpt-oss-20b", inputTokens: 22, outputTokens: 11,
    });
    expect(mock).toHaveBeenCalledOnce();
  });

  it("fails closed for a provider-auth error without disclosing the response body", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "synthetic-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("GROQ_MODEL", "");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("API key was invalid; echoed private data", { status: 401 })));
    await expect(availableProviders()[0]("task", "input"))
      .rejects.toMatchObject({ code: "AUTH_CONFIG", retryable: false });
  });

  it("rejects oversized model responses rather than retaining them", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GROQ_API_KEY", "synthetic-key");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      choices: [{ message: { content: "x".repeat(70000) } }],
    })));
    await expect(availableProviders()[0]("task", "input"))
      .rejects.toMatchObject({ code: "OUTPUT_INVALID", retryable: false });
  });
});
