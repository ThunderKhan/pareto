import { database } from "../../search/db";
import { availableProviders } from "../providers/http";

export type AiConfigurationState = "disabled" | "unconfigured" | "partial" | "configured";
export type OperationalReadiness = {
  status: "ready" | "unavailable";
  database: "ready" | "unavailable";
  ai: { configuration: AiConfigurationState; configuredProviders: number; probed: false };
};

/**
 * Configuration inspection only. Key presence does NOT establish that
 * a provider account or model is healthy. No model call or private payload.
 */
export function aiConfigurationState(): OperationalReadiness["ai"] {
  if (process.env.AI_ENABLED === "false")
    return { configuration: "disabled", configuredProviders: 0, probed: false };
  const count = availableProviders().length;
  const configuration: AiConfigurationState =
    count === 0 ? "unconfigured" : count === 1 ? "partial" : "configured";
  return { configuration, configuredProviders: count, probed: false };
}

/** Database is required; AI is optional. Never echo DB errors or credentials. */
export async function operationalReadiness(
  probe: () => Promise<unknown> = () => database().$queryRaw`SELECT 1`,
): Promise<OperationalReadiness> {
  let db: OperationalReadiness["database"] = "ready";
  try { await probe(); }
  catch { db = "unavailable"; }
  return {
    status: db === "ready" ? "ready" : "unavailable",
    database: db,
    ai: aiConfigurationState(),
  };
}
