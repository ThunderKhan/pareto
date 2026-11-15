// Local development may use backend/.env. Production worker runtimes supply
// secrets through the process supervisor and must work with --prod installs,
// where the optional dotenv developer dependency is absent.
await import("dotenv/config").catch(() => undefined);
import { database } from "../search/db";
import { workerOptions, runWorker, workOnce } from "./runner";

const controller = new AbortController();
process.once("SIGTERM", () => controller.abort());
process.once("SIGINT", () => controller.abort());

try {
  if (process.env.INGEST_WORKER_ONCE === "1") {
    // Explicit CI/operator smoke mode. No daemon, no scheduled or repeated calls.
    await workOnce("ingest-smoke-" + process.pid, { global: 1, perOwner: 1 });
  } else {
    await runWorker(workerOptions(controller.signal));
  }
} catch {
  // Do not print DB URLs, environment, model inputs or provider errors.
  process.stderr.write("Resume ingestion worker exited unexpectedly. Check redacted operational logs.\n");
  process.exitCode = 1;
} finally {
  await database().$disconnect().catch(() => undefined);
}
