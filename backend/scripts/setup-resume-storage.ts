import "dotenv/config";
import { setupPrivateResumeBucket } from "../src/ingestion/storage.ts";

// Explicit operator-only action. Never invoked on app startup or by an upload.
try {
  const result = await setupPrivateResumeBucket();
  process.stdout.write(result.created
    ? "Created private resume bucket: " + result.bucket + "\n"
    : "Verified private resume bucket: " + result.bucket + "\n");
} catch (error) {
  process.stderr.write("Could not verify/create private resume Storage bucket. Check server configuration and project permissions.\n");
  process.exitCode = 1;
}
