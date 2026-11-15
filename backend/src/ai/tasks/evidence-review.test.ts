import { afterEach, describe, expect, it, vi } from "vitest";
import { proposeEvidenceReview } from "./evidence-review";

afterEach(() => vi.unstubAllEnvs());

describe("read-only, quote-grounded evidence review suggestions", () => {
  const example = { field: "skill" as const, value: "Java", excerpt: "Professional skills: Java, AWS" };
  it("only suggests grounded support and always requires source-owner human review", async () => {
    const model = vi.fn().mockResolvedValue({ provider: "Gemini", raw: {
      verdict: "supported", quote: "Java", reasonCode: "DIRECT_STATEMENT",
    } });
    const result = await proposeEvidenceReview(example, [model], "owner-demo");
    expect(result).toMatchObject({
      verdict: "supported", quote: "Java", reasonCode: "DIRECT_STATEMENT",
      provider: "Gemini", requiresHumanReview: true,
    });
    expect(model.mock.calls[0][1]).toContain("untrustedDocumentData");
    expect(model.mock.calls[0][3]).toBe(1200);
  });

  it("abstains when JavaScript is falsely presented as Java experience", async () => {
    const model = vi.fn().mockResolvedValue({ provider: "Groq", raw: {
      verdict: "supported", quote: "JavaScript", reasonCode: "DIRECT_STATEMENT",
    } });
    const result = await proposeEvidenceReview({
      field: "skill", value: "Java", excerpt: "Professional skills: JavaScript",
    }, [model]);
    expect(result).toMatchObject({
      verdict: "unknown", quote: null, reasonCode: "INSUFFICIENT",
      requiresHumanReview: true,
    });
  });

  it("rejects invented source quotes even when the output is otherwise valid JSON", async () => {
    const model = vi.fn().mockResolvedValue({ provider: "Gemini", raw: {
      verdict: "supported", quote: "Certified AWS engineer", reasonCode: "DIRECT_STATEMENT",
    } });
    await expect(proposeEvidenceReview({
      field: "certification", value: "AWS Solutions Architect",
      excerpt: "Considering a certification next year",
    }, [model])).rejects.toMatchObject({ code: "SEMANTIC_UNVERIFIED" });
  });

  it("recognizes explicit negative evidence without authorizing rejection", async () => {
    const model = vi.fn().mockResolvedValue({ provider: "Gemini", raw: {
      verdict: "contradicted", quote: "No Java experience", reasonCode: "NEGATED",
    } });
    const result = await proposeEvidenceReview({
      field: "skill", value: "Java", excerpt: "No Java experience; JavaScript is the main language",
    }, [model]);
    expect(result).toMatchObject({ verdict: "contradicted", requiresHumanReview: true });
  });

  it("abstains when duration refers to projects, not notice", async () => {
    const model = vi.fn().mockResolvedValue({ provider: "Gemini", raw: {
      verdict: "supported", quote: "30 days", reasonCode: "DIRECT_STATEMENT",
    } });
    const result = await proposeEvidenceReview({
      field: "noticePeriodDays", value: 30, excerpt: "Worked on a project for 30 days",
    }, [model]);
    expect(result.verdict).toBe("unknown");
  });

  it("refuses oversized input before invoking a model", async () => {
    const model = vi.fn();
    await expect(proposeEvidenceReview({ ...example, excerpt: "x".repeat(1900) }, [model]))
      .rejects.toMatchObject({ code: "BAD_INPUT" });
    expect(model).not.toHaveBeenCalled();
  });
});
