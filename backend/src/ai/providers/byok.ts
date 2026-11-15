import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { database } from "../../search/db";
import { AiFailure } from "../contracts/errors";
import { availableProviders, providerCall, type JsonProvider, type ProviderConfig } from "./http";

export type AiProvider = "Gemini" | "Groq";
export type AiSelectionMode = "PLATFORM" | "BYOK";
const providers = ["Gemini", "Groq"] as const;
const keyPattern = /^[\x21-\x7e]{12,256}$/;
const modelPattern = /^[a-zA-Z0-9_./:-]{1,120}$/;

/** Dedicated 32-byte, 64-character hex encryption master secret, server-side ONLY.
 * Requires the same key on API + dedicated workers. This is not a Supabase
 * publishable/anon key. Rotate using a reviewed dual-key migration, never by
 * changing the env value without re-encrypting existing rows.
 */
function masterKey(): Buffer {
  const value = process.env.PARETO_BYOK_MASTER_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value))
    throw new AiFailure("AUTH_CONFIG", false);
  return Buffer.from(value, "hex");
}
function aad(userId: string, provider: AiProvider) {
  return Buffer.from("pareto:byok:v1:" + userId + ":" + provider);
}
export function sealCredential(userId: string, provider: AiProvider, key: string) {
  if (!userId || !providers.includes(provider) || !keyPattern.test(key))
    throw new AiFailure("BAD_INPUT", false);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  cipher.setAAD(aad(userId, provider));
  const encryptedKey = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  return { encryptedKey: encryptedKey.toString("base64"), iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"), keyVersion: 1 };
}
export function openCredential(userId: string, provider: AiProvider,
  stored: { encryptedKey: string; iv: string; tag: string; keyVersion: number }) {
  if (stored.keyVersion !== 1) throw new AiFailure("AUTH_CONFIG", false);
  try {
    const iv = Buffer.from(stored.iv, "base64"), tag = Buffer.from(stored.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid envelope");
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
    decipher.setAAD(aad(userId, provider));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(stored.encryptedKey,"base64")), decipher.final()]).toString("utf8");
  } catch { throw new AiFailure("AUTH_CONFIG", false); }
}
/** Key check does not send resume text, prompts or extracted candidate data. */
export async function checkCredential(provider: AiProvider, key: string) {
  if (!providers.includes(provider) || !keyPattern.test(key))
    throw new AiFailure("BAD_INPUT", false);
  const target = provider === "Gemini"
    ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1"
    : "https://api.groq.com/openai/v1/models";
  let response: Response;
  try {
    response = await fetch(target, {
      method: "GET",
      headers: provider === "Gemini" ? { "x-goog-api-key": key } : { Authorization: "Bearer " + key },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
  } catch { throw new AiFailure("NETWORK"); }
  await response.body?.cancel().catch(() => {});
  if (response.status === 401 || response.status === 403) throw new AiFailure("AUTH_CONFIG", false);
  if (!response.ok) throw new AiFailure("PROVIDER_5XX");
}
export async function getAiConnections(userId: string) {
  const db = database();
  const [preference, rows] = await Promise.all([
    db.aiUserPreference.findUnique({ where: { userId }, select: { mode: true } }),
    db.aiUserCredential.findMany({ where: { userId },
      select: { provider: true, updatedAt: true } }),
  ]);
  return { mode: preference?.mode === "BYOK" ? "BYOK" as const : "PLATFORM" as const,
    providers: providers.map(provider => {
      const credential = rows.find(row => row.provider === provider);
      return { provider, connected: Boolean(credential),
        updatedAt: credential?.updatedAt.toISOString() ?? null };
    }) };
}
export async function storeAiCredential(userId: string, provider: AiProvider, key: string) {
  // Validate remotely before writing ciphertext. Never retain or return plaintext.
  await checkCredential(provider, key);
  const sealed = sealCredential(userId, provider, key);
  await database().aiUserCredential.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, ...sealed },
    update: sealed,
  });
  return getAiConnections(userId);
}
export async function removeAiCredential(userId: string, provider: AiProvider) {
  await database().aiUserCredential.deleteMany({ where: { userId, provider } });
  return getAiConnections(userId);
}
export async function verifySavedAiCredential(userId: string, provider: AiProvider) {
  const row = await database().aiUserCredential.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row) throw new AiFailure("AUTH_CONFIG", false);
  await checkCredential(provider, openCredential(userId, provider, row));
  return { provider, valid: true };
}
export async function selectAiMode(userId: string, mode: AiSelectionMode) {
  if (mode !== "BYOK" && mode !== "PLATFORM") throw new AiFailure("BAD_INPUT", false);
  if (mode === "BYOK") {
    const count = await database().aiUserCredential.count({ where: { userId } });
    if (!count) throw new AiFailure("AUTH_CONFIG", false);
    masterKey(); // fail closed if workers cannot decrypt these credentials
  }
  await database().aiUserPreference.upsert({
    where: { userId }, create: { userId, mode }, update: { mode },
  });
  return getAiConnections(userId);
}
/** Explicit test providers always win; never mix personal and platform keys.
 * If BYOK is selected but broken or removed, fail closed rather than charge
 * the platform without user consent.
 */
export async function resolveAiProviders(userId?: string, override?: JsonProvider[]): Promise<JsonProvider[]> {
  if (override !== undefined) return override;
  if (!userId) return availableProviders();
  const pref = await database().aiUserPreference.findUnique({
    where: { userId }, select: { mode: true },
  });
  if (pref?.mode !== "BYOK") return availableProviders();
  const records = await database().aiUserCredential.findMany({ where: { userId } });
  const selected = providers.flatMap(provider => {
    const row = records.find(record => record.provider === provider);
    if (!row) return [];
    const model = provider === "Gemini" ? process.env.GEMINI_MODEL : process.env.GROQ_MODEL;
    if (!model || !modelPattern.test(model)) return [];
    const key = openCredential(userId, provider, row);
    const config: ProviderConfig = { name: provider, key, model, source: "byok" };
    return [providerCall(config)];
  });
  if (!selected.length) throw new AiFailure("AUTH_CONFIG", false);
  return selected;
}
