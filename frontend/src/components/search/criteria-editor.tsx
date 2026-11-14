import { fields, type Rule } from "@pareto/backend/search";

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
    {rules.map((rule, index) => <div className="search-rule" key={index}>
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
      {rule.field === "skill" && <label className="search-checkbox"><input type="checkbox" checked={rule.exclude}
        onChange={e => update(index, { ...rule, exclude: e.target.checked })} /> Exclude skill</label>}
      <button type="button" onClick={() => onChange(rules.filter((_, position) => position !== index))}>Remove criterion {index + 1}</button>
    </div>)}
    <button type="button" disabled={rules.length >= 40} onClick={() => onChange([...rules, emptyRule("skill")])}>Add criterion</button>
  </fieldset>;
}
