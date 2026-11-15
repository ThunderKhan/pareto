import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateQuality } from "./quality-eval";
import type { QualityCase } from "./quality-eval";

const data = JSON.parse(readFileSync(
  new URL("../../evals/fixtures/resume-quality.json", import.meta.url), "utf8",
)) as QualityCase[];
describe("synthetic extraction-quality evaluation", () => {
  it("provides repeatable named golden cases with errors and abstentions", () => {
    expect(data.length).toBeGreaterThanOrEqual(15);
    expect(new Set(data.map(row => row.id)).size).toBe(data.length);
    const result = evaluateQuality(data);
    expect(result.datasetSize).toBe(data.length);
    expect(result.counts.unsupported).toBeGreaterThan(0);
    expect(result.counts.missed).toBeGreaterThan(0);
    expect(result.counts.unknownCorrect).toBeGreaterThan(0);
    expect(result.exactCaseRate).toBeLessThan(1);
    expect(result.warning).toContain("Synthetic fixture");
  });
  it("never scores missing fields as ground truth", () => {
    const out = evaluateQuality([{ id: "unknown", category: "missing",
      expected: { city: "Delhi" }, observed: {} }]);
    expect(out.counts).toMatchObject({
      evaluated: 1, correct: 0, unsupported: 0, missed: 1,
    });
  });
  it("treats skill sets as order-independent with canonical names", () => {
    const out = evaluateQuality([{ id: "order", category: "supported",
      expected: { skills: ["Java", "AWS"] }, observed: { skills: ["aws", "java"] } }]);
    expect(out).toMatchObject({ precision: 1, recall: 1, f1: 1 });
  });
  it("does not conflate unknown with observed empty skills or numeric zero", () => {
    const result = evaluateQuality([
      {id:"none",category:"unknown",expected:{skills:null},observed:{skills:[]}},
      {id:"notice",category:"unknown",expected:{noticePeriodDays:null},observed:{noticePeriodDays:0}},
    ]);
    expect(result.counts.unsupported).toBe(2);
    expect(result.counts.unknownCorrect).toBe(0);
  });
});
