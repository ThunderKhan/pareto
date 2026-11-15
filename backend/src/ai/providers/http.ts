import { AiFailure, classifyHttpStatus, classifyProviderError } from "../contracts/errors";

export type JsonProvider = ((system: string, input: string, timeoutMs?: number) => Promise<{ raw: unknown; provider: string; inputTokens?: number; outputTokens?: number; modelId?: string }>) & { providerName?: "Gemini" | "Groq" };
type ProviderConfig = Readonly<{ name: "Gemini" | "Groq"; key: string; model: string }>;

function configured(): ProviderConfig[] {
  const values: Array<{ name: ProviderConfig["name"]; key?: string; model?: string }> = [
    { name: "Gemini", key: process.env.GOOGLE_GENERATIVE_AI_API_KEY, model: process.env.GEMINI_MODEL },
    { name: "Groq", key: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL },
  ];
  return values.filter((p): p is ProviderConfig =>
    Boolean(p.key && p.model && /^[a-zA-Z0-9_./:-]{1,120}$/.test(p.model)));
}

/** Fixed provider origins: no user-supplied URL or model tools are accepted. */
export function availableProviders(): JsonProvider[] {
  return configured().map(providerCall);
}

async function readBoundedJson(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new AiFailure("OUTPUT_INVALID", false);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) throw new AiFailure("OUTPUT_INVALID", false);
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return JSON.parse(chunks.join("")) as unknown;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function unwrap(payload: unknown, isGemini: boolean): unknown {
  if (!payload || typeof payload !== "object") throw new AiFailure("OUTPUT_INVALID", false);
  const doc = payload as Record<string, unknown>;
  let output: unknown;
  if (isGemini) {
    const candidate = Array.isArray(doc.candidates) ? doc.candidates[0] : undefined;
    const parts = (candidate as { content?: { parts?: unknown } } | undefined)?.content?.parts;
    output = Array.isArray(parts)
      ? parts.find(p => p && typeof p === "object" && !(p as { thought?: boolean }).thought && typeof (p as { text?: unknown }).text === "string")
      : undefined;
    output = (output as { text?: unknown } | undefined)?.text;
  } else {
    const choice = Array.isArray(doc.choices) ? doc.choices[0] : undefined;
    output = (choice as { message?: { content?: unknown } } | undefined)?.message?.content;
  }
  if (typeof output !== "string" || output.length > 60000) throw new AiFailure("OUTPUT_INVALID", false);
  try { return JSON.parse(output); }
  catch { throw new AiFailure("OUTPUT_INVALID", false); }
}

function providerCall({ name, key, model }: ProviderConfig): JsonProvider {
  const call: JsonProvider = async (system, input, timeoutMs = 9000) => {
    const isGemini = name === "Gemini";
    const endpoint = isGemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/\${encodeURIComponent(model)}:generateContent`
      : "https://api.groq.com/openai/v1/chat/completions";
    const payload = isGemini
      ? { systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: input }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2600, temperature: 0 } }
      : { model, messages: [{ role: "system", content: system }, { role: "user", content: input }],
          response_format: { type: "json_object" }, max_completion_tokens: 2600, temperature: 0 };
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST", signal: AbortSignal.timeout(Math.max(100, Math.min(timeoutMs, 9000))),
        headers: { "Content-Type": "application/json",
          ...(isGemini ? { "x-goog-api-key": key } : { Authorization: `Bearer \${key}` }) },
        body: JSON.stringify(payload),
      });
    } catch (error) { throw classifyProviderError(error); }
    // Do not read/log provider error bodies; they may echo private document text.
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw classifyHttpStatus(response.status);
    }
    let doc: unknown;
    try { doc = await readBoundedJson(response); }
    catch (error) { throw error instanceof AiFailure ? error : new AiFailure("OUTPUT_INVALID", false); }
    const record = (doc && typeof doc === "object") ? doc as Record<string, unknown> : {};
    const usage = (isGemini ? record.usageMetadata : record.usage) as Record<string, unknown> | undefined;
    const token = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1000000 ? value : undefined;
    const inputTokens = token(usage?.[isGemini ? "promptTokenCount" : "prompt_tokens"]);
    const outputTokens = token(usage?.[isGemini ? "candidatesTokenCount" : "completion_tokens"]);
    return { raw: unwrap(doc, isGemini), provider: name, modelId: model, inputTokens, outputTokens };
  };
  call.providerName = name;
  return call;
}
