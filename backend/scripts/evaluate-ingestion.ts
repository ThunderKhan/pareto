import { readFileSync } from "node:fs";
import { evaluateQuality, type QualityCase } from "../src/ingestion/quality-eval.ts";

// Explicitly offline: no AI keys, DB access or network. Fixtures are synthetic,
// and deliberately include bad observed predictions to exercise the scorer.
const filename = new URL("../evals/fixtures/resume-quality.json", import.meta.url);
const samples = JSON.parse(readFileSync(filename, "utf8")) as QualityCase[];
const result = evaluateQuality(samples);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
