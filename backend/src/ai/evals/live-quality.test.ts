import { describe, it, expect } from "vitest";
import { interpret } from "../../search/interpret";
import { skillKey } from "../../search/criteria";

/** Opt-in paid requests, never automatic CI. Synthetic input only, no PII. */
describe.skipIf(process.env.PARETO_VERIFY_LIVE_MODELS !== "1" || process.env.PARETO_EVAL_LIVE !== "1")(
  "live semantic interpretation acceptance (explicit operator opt-in)", () => {
    const probes = [
      { prompt: "Find Java developers with Spring Boot in Hyderabad, available within 30 days", skills: ["java", "spring boot"], city: "hyderabad" },
      { prompt: "Find JavaScript engineers with React in Pune", skills: ["javascript", "react"], city: "pune" },
      { prompt: "Find backend Python engineers in Chennai, AWS nice to have", skills: ["python", "aws"], city: "chennai" },
      { prompt: "Find Data Scientists with PyTorch in Mumbai", skills: ["pytorch"], city: "mumbai" },
      { prompt: "Find PostgreSQL database administrators in Delhi", skills: ["postgresql"], city: "delhi" },
    ];
    for (const [i, probe] of probes.entries()) {
      it(`probe \${i+1} extracts target fields without mixing Java and JavaScript`, async () => {
        const draft = await interpret(probe.prompt);
        expect(draft.criteria.some(rule => rule.field === "city" && rule.value.toLowerCase() === probe.city)).toBe(true);
        const skills = draft.criteria.filter(rule => rule.field === "skill").map(rule => skillKey(rule.value));
        for (const required of probe.skills) expect(skills).toContain(required);
        if (i === 1) expect(skills).not.toContain("java");
      }, 25000);
    }
  }
);
