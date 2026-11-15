import type { AiTaskId } from "./contracts/task";
export const aiRegistry = {
  "search.interpret.v1": { promptVersion: "1.0.0", schemaVersion: "search-rule.v1", maxInputChars: 2000, maxOutputBytes: 65536, effects: "none" },
  "search.refine.v1": { promptVersion: "1.0.0", schemaVersion: "search-delta.v1", maxInputChars: 14000, maxOutputBytes: 65536, effects: "none" },
  "resume.extract.v1": { promptVersion: "1.0.0", schemaVersion: "resume-proposal.v1", maxInputChars: 40000, maxOutputBytes: 65536, effects: "none" },
  "resume.evidence-review.v1": { promptVersion: "1.0.0", schemaVersion: "evidence-review.v1", maxInputChars: 6000, maxOutputBytes: 16384, effects: "none" },
} as const satisfies Record<AiTaskId, {promptVersion: string; schemaVersion: string; maxInputChars: number; maxOutputBytes: number; effects: "none"}>;
export function taskDefinition(id: AiTaskId) { return aiRegistry[id]; }
