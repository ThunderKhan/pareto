import "dotenv/config";
import { database } from "../search/db";
import { workerOptions, runWorker } from "./runner";

const controller = new AbortController();
process.once("SIGTERM", () => controller.abort());
process.once("SIGINT", () => controller.abort());

try {
  await runWorker(workerOptions(controller.signal));
} catch {
  // Do not print DB URLs, environment, model inputs or provider errors.
  process.stderr.write("Resume ingestion worker exited unexpectedly. Check redacted operational logs.\n");
  process.exitCode = 1;
} finally {
  await database().$disconnect().catch(() => undefined);
}
