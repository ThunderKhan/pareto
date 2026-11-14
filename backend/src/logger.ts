import pino from "pino";

/** Server-only structured logging. Never log source resumes, credentials, or candidate PII. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "*.password", "*.apiKey", "*.token"],
});
