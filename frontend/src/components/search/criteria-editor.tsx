import { fields, type Rule } from "@pareto/backend/search";
import { Plus, Trash } from "@phosphor-icons/react";

export const labels: Record<Rule["field"], string> = {
  role: "Current role", city: "City", experience: "Experience", skill: "Skill",
  notice: "Notice period", pastRole: "Previous role", industry: "Industry",
  education: "Education", certification: "Certification", employmentType: "Employment type",
};

function emptyRule(field: Rule["field"]): Rule {
  const mode = "required";
  switch (field) {
    case "experience": return { field, mode };
    case "notice": return { field, mode, maxDays: 30 };
    case "skill": return { field, mode, value: "", exclude: false };
    default: return { field, mode, value: "" };
  }
}

export default function CriteriaEditor({ rules, onChange, disabled }: {
  rules: Rule[]; onChange: (rules: Rule[]) => void; disabled: boolean;
}) {
  function update(index: number, rule: Rule) {
    onChange(rules.map((previous, position) => position === index ? rule : previous));
  }

  return <fieldset disabled={disabled} className="search-editor">
    <legend>Editable criteria</legend>
    <p className="search-editor__hint">Required rules determine eligibility. Preferred rules influence ranking.</p>
    {rules.length === 0 && <p className="search-editor__empty">No criteria yet. Add a requirement to build your search.</p>}
    {rules.map((rule, index) => <section className="search-rule search-rule--card" key={index} aria-label={"Criterion " + (index + 1)}>
      <div className="search-rule__header">
        <span className="search-rule__number">Criterion {index + 1}</span>
        <button className="search-rule__remove" type="button" aria-label={"Remove criterion " + (index + 1)}
          onClick={() => onChange(rules.filter((_, position) => position !== index))}>
          <Trash size={15} aria-hidden="true"/> Remove
        </button>
      </div>
      <div className="search-rule__fields">
        <label>Field
          <select value={rule.field} onChange={e => update(index, emptyRule(e.target.value as Rule["field"]))}>
            {fields.map(field => <option key={field} value={field}>{labels[field]}</option>)}
          </select>
        </label>
        <label>Priority
          <select value={rule.mode} onChange={e => update(index, { ...rule, mode: e.target.value as Rule["mode"] })}>
            <option value="required">Required</option><option value="preferred">Preferred</option>
          </select>
        </label>
        {rule.field === "experience" ? <>
          <label>Minimum (months)<input type="number" min={0} max={720} value={rule.minMonths ?? ""}
            onChange={e => update(index, { ...rule, minMonths: e.target.value === "" ? undefined : e.target.valueAsNumber })} /></label>
          <label>Maximum (months)<input type="number" min={0} max={720} value={rule.maxMonths ?? ""}
            onChange={e => update(index, { ...rule, maxMonths: e.target.value === "" ? undefined : e.target.valueAsNumber })} /></label>
        </> : rule.field === "notice" ?
          <label>Maximum (days)<input type="number" min={0} max={365} required value={Number.isNaN(rule.maxDays) ? "" : rule.maxDays}
            onChange={e => update(index, { ...rule, maxDays: e.target.valueAsNumber })} /></label> :
          <label>{labels[rule.field]}<input required maxLength={100} value={rule.value}
            onChange={e => update(index, { ...rule, value: e.target.value })} /></label>}
      </div>
      {rule.field === "skill" && <label className="search-checkbox search-rule__exclude">
        <input type="checkbox" checked={rule.exclude}
          onChange={e => update(index, { ...rule, exclude: e.target.checked })}/>
        Exclude this skill
      </label>}
    </section>)}
    <button className="search-editor__add" type="button" disabled={rules.length >= 40}
      onClick={() => onChange([...rules, emptyRule("skill")])}>
      <Plus size={16} aria-hidden="true"/> Add criterion
    </button>
  </fieldset>;
}
