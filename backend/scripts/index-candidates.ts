import { config } from "dotenv";
import { indexOwner } from "../src/search/semantic";
import { database } from "../src/search/db";

config({ path: "../.env", quiet: true });
config({ path: ".env", quiet: true });
const ownerId = process.env.PARETO_INDEX_OWNER_ID || process.env.DEMO_OWNER_ID || "";
const limit = process.env.PARETO_INDEX_LIMIT ? Number(process.env.PARETO_INDEX_LIMIT) : undefined;
async function main() {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ownerId)) {
    throw new Error("Set PARETO_INDEX_OWNER_ID to the intended recruiter's Supabase UUID.");
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error("Set GOOGLE_GENERATIVE_AI_API_KEY.");
  const result = await indexOwner(ownerId, { limit });
  console.log(JSON.stringify({ task: "semantic-index", ...result }));
  if (result.failed || result.stale) process.exitCode = 1;
}
main().catch(() => {
  console.error("Semantic index failed. Check database/pgvector, configured provider, owner and rate limits.");
  process.exitCode = 1;
}).finally(async () => {
  await database().$disconnect();
});
