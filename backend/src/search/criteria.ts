import { z } from "zod";
export { z };

const text = z.string().trim().min(1).max(100);
export const fields = ["role", "city", "experience", "skill", "notice", "pastRole", "industry", "education", "certification", "employmentType"] as const;
const mode = z.enum(["required", "preferred"]);
const months = z.number().int().min(0).max(720);
export const criterion = z.discriminatedUnion("field", [
  z.strictObject({ field: z.enum(["role", "city", "pastRole", "industry", "education", "certification", "employmentType"]), mode, value: text }),
  z.strictObject({ field: z.literal("skill"), mode, value: text, exclude: z.boolean().default(false) }),
  z.strictObject({ field: z.literal("notice"), mode, maxDays: z.number().int().min(0).max(365) }),
  z.strictObject({ field: z.literal("experience"), mode, minMonths: months.optional(), maxMonths: months.optional() }),
]);

export type Rule = z.output<typeof criterion>;
export const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const skillAliases: ReadonlyMap<string, string> = new Map([
  ["amazon web services", "aws"], ["amazon aws", "aws"], ["springboot", "spring boot"],
  ["js", "javascript"], ["nodejs", "node.js"], ["postgres", "postgresql"],
]);
export function skillKey(value: string) {
  const key = normalize(value);
  return skillAliases.get(key) ?? key;
}

export function ruleKey(rule: Rule) {
  switch (rule.field) {
    case "skill": return `skill:${skillKey(rule.value)}`;
    case "pastRole":
    case "certification": return `${rule.field}:${normalize(rule.value)}`;
    default: return rule.field;
  }
}

export const criteriaSchema = z.array(criterion).min(1, "Add at least one criterion.").max(40).superRefine((rules, ctx) => {
  const seen = new Set<string>();
  rules.forEach((rule, index) => {
    const key = ruleKey(rule);
    if (seen.has(key)) ctx.addIssue({ code: "custom", path: [index], message: `Duplicate or conflicting criterion: ${key}.` });
    seen.add(key);
    if (rule.field !== "experience") return;
    const { minMonths, maxMonths } = rule;
    if ((minMonths === undefined && maxMonths === undefined) ||
      (minMonths !== undefined && maxMonths !== undefined && minMonths > maxMonths)) {
      ctx.addIssue({ code: "custom", path: [index], message: "Enter a valid experience range with at least one bound." });
    }
  });
});

export const promptSchema = z.string().trim().min(3).max(2000);
export const deltaSchema = z.array(z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("set"), rule: criterion }),
  z.strictObject({ op: z.literal("remove"), key: z.string().min(1).max(120) }),
])).min(1).max(40);

export function applyDelta(current: Rule[], delta: z.output<typeof deltaSchema>) {
  const rules = new Map(current.map(rule => [ruleKey(rule), rule]));
  for (const change of delta) {
    if (change.op === "remove") {
      if (!rules.delete(change.key)) throw new Error("The requested criterion is absent from this search.");
    } else {
      const key = ruleKey(change.rule);
      const prior = rules.get(key);
      const next = change.rule;
      if (prior?.field === "experience" && next.field === "experience") {
        rules.set(key, { ...prior, ...next });
      } else rules.set(key, next);
    }
  }
  return criteriaSchema.parse([...rules.values()]);
}
