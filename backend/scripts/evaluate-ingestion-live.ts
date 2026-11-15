import { readFileSync } from "node:fs";
import { configuredProviders } from "../src/search/interpret.ts";
import { extractResumeProfile } from "../src/ingestion/extract.ts";
import { evaluateQuality, type QualityCase } from "../src/ingestion/quality-eval.ts";
import type { ParsedResume } from "../src/ingestion/parse.ts";

// Cost-sensitive and explicitly opt-in. Never invoked in ordinary CI.
// Only synthetic prompt text is submitted. No credentials or raw responses
// are printed and no source documents or candidate records are accessed.
if (process.env.PARETO_VERIFY_LIVE_MODELS !== "1") {
  process.stderr.write("Live resume evaluation is disabled. Set PARETO_VERIFY_LIVE_MODELS=1 explicitly.\n");
  process.exit(2);
}
const providers = configuredProviders();
if (!providers.length) {
  process.stderr.write("No configured Gemini/Groq provider. Set a valid provider key and model pair.\n");
  process.exit(2);
}
const fixtures = JSON.parse(readFileSync(new URL(
  "../evals/fixtures/resume-live.json", import.meta.url), "utf8",
)) as {id:string; category:string; resumeText:string; expected: QualityCase["expected"]}[];
if (!fixtures.length || fixtures.length > 8 ||
    fixtures.some(f => f.resumeText.length > 900)) {
  throw Error("Synthetic live evaluation exceeds the safe input budget.");
}
let providersWithSuccessfulOutput = 0;
const reports = [];
for (const provider of providers) {
  const comparisons: QualityCase[] = [];
  let processed = 0, failed = 0;
  for (const fixture of fixtures) {
    const parsed: ParsedResume = {
      text: fixture.resumeText,
      pages: [{number:null,text:fixture.resumeText}],
      truncated:false, warnings:[],
    };
    const result = await extractResumeProfile(parsed,[provider]);
    processed++;
    if (!result.profile) failed++;
    comparisons.push({id:fixture.id,category:fixture.category,
      expected:fixture.expected,observed:result.profile ?? {}});
  }
  if (failed < processed) providersWithSuccessfulOutput++;
  reports.push({provider: comparisons.length && providers[0] === provider ? "primary" : "fallback",
    processed, failed, ...evaluateQuality(comparisons)});
}
process.stdout.write(JSON.stringify({mode:"opt-in-live-synthetic",
  fixtureCount:fixtures.length, reports,
  warning:"Live test covers only synthetic examples. Do not infer production candidate quality.",
},null,2)+"\n");
if (!providersWithSuccessfulOutput) process.exitCode = 1;
