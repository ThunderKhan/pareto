import type { JsonProvider } from "../providers/http";
import { proposeStructured } from "../providers/gateway";
import { resumeExtractPromptV1 } from "../prompts/resume-extract.v1";

/**
 * Model proposals only: no candidate/Storage persistence here.
 * The ingestion service alone owns authorization and database writes.
 */
export function proposeResumeFacts<T extends object>(
  resumeText: string,
  verify: (output: unknown) => T,
  providers: JsonProvider[],
  ownerId?: string,
): Promise<T & { provider: string }> {
  const input = JSON.stringify({ resumeText: resumeText.slice(0, 16000) });
  return proposeStructured(resumeExtractPromptV1, input, verify, providers, {
    taskId: "resume.extract.v1", ownerId,
  });
}
