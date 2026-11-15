import { useId, useState } from "react";
import { criteriaSchema, fields, type Rule } from "@pareto/backend/search";
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

function summary(rule: Rule) {
  if (rule.field === "experience") return [
    rule.minMonths === undefined ? "" : "At least " + rule.minMonths + " months",
    rule.maxMonths === undefined ? "" : "At most " + rule.maxMonths + " months",
  ].filter(Boolean).join(" · ") || "Experience range needed";
  if (rule.field === "notice") return "Within " + (Number.isFinite(rule.maxDays) ? rule.maxDays : "—") + " days";
  return (rule.field === "skill" && rule.exclude ? "Exclude " : "") + (rule.value.trim() || "Value needed");
}

/** The search remains a draft. Visual grouping never changes the saved rule order. */
export default function CriteriaEditor({ rules, onChange, disabled }: {
  rules: Rule[]; onChange: (rules: Rule[]) => void; disabled: boolean;
}) {
  const editorId = useId();
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const result = criteriaSchema.safeParse(rules);
    return new Set(result.success ? [] : result.error.issues
      .map(issue => issue.path[0]).filter((i): i is number => typeof i === "number"));
  });
  const result = criteriaSchema.safeParse(rules);
  const errorsByIndex = new Map<number, string[]>();
  const generalErrors: string[] = [];
  if (!result.success) {
    for (const issue of result.error.issues) {
      const index = issue.path[0];
      if (typeof index !== "number") { generalErrors.push(issue.message); continue; }
      errorsByIndex.set(index, [...(errorsByIndex.get(index) ?? []), issue.message]);
    }
  }
  const indexed = rules.map((rule, index) => ({ rule, index }));
  const required = indexed.filter(({ rule }) => rule.mode === "required");
  const preferred = indexed.filter(({ rule }) => rule.mode === "preferred");
  const attention = errorsByIndex.size + generalErrors.length;

  function update(index: number, rule: Rule) {
    onChange(rules.map((previous, position) => position === index ? rule : previous));
  }
  function remove(index: number) {
    setExpanded(previous => new Set([...previous].filter(i => i !== index).map(i => i > index ? i - 1 : i)));
    onChange(rules.filter((_, position) => position !== index));
  }
  function add() {
    setExpanded(previous => new Set([...previous, rules.length]));
    onChange([...rules, emptyRule("skill")]);
  }
  function toggle(index: number) {
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function renderRule({ rule, index }: { rule: Rule; index: number }) {
    const issues = errorsByIndex.get(index) ?? [];
    const isExpanded = expanded.has(index);
    const fieldsId = editorId + "-fields-" + index;
    return <section className="search-rule search-rule--card" key={index} aria-label={"Criterion " + (index + 1)}>
      <div className="search-rule__header">
        <div className="review-row__description">
          <span className="search-rule__number">{String(index + 1).padStart(2, "0")} / {labels[rule.field]}</span>
          <strong className="review-row__value">{summary(rule)}</strong>
        </div>
        <div className="review-row__controls">
          <button type="button" className="review-row__edit" aria-expanded={isExpanded} aria-controls={fieldsId}
            aria-label={(isExpanded ? "Collapse" : "Edit") + " criterion " + (index + 1) + ": " + labels[rule.field]}
            onClick={() => toggle(index)}>{isExpanded ? "Collapse" : "Edit"}</button>
          <button type="button" className="search-rule__remove" aria-label={"Remove criterion " + (index + 1)}
            onClick={() => remove(index)}><Trash size={15} aria-hidden="true"/> Remove</button>
        </div>
      </div>
      {issues.length > 0 && <ul className="review-row__issues">
        {issues.map((issue, i) => <li key={i}>{issue}</li>)}
      </ul>}
      <div className="review-row__editor" id={fieldsId} hidden={!isExpanded}>
        <div className="search-rule__fields">
          <label>Field
            <select value={rule.field} onChange={event => update(index, emptyRule(event.target.value as Rule["field"]))}>
              {fields.map(field => <option key={field} value={field}>{labels[field]}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={rule.mode} onChange={event => update(index, { ...rule, mode: event.target.value as Rule["mode"] })}>
              <option value="required">Required</option><option value="preferred">Preferred</option>
            </select>
          </label>
          {rule.field === "experience" ? <>
            <label>Minimum (months)<input type="number" min={0} max={720} value={rule.minMonths ?? ""}
              onChange={event => update(index, { ...rule, minMonths: event.target.value === "" ? undefined : event.target.valueAsNumber })}/></label>
            <label>Maximum (months)<input type="number" min={0} max={720} value={rule.maxMonths ?? ""}
              onChange={event => update(index, { ...rule, maxMonths: event.target.value === "" ? undefined : event.target.valueAsNumber })}/></label>
          </> : rule.field === "notice" ?
            <label>Maximum (days)<input type="number" min={0} max={365} required value={Number.isNaN(rule.maxDays) ? "" : rule.maxDays}
              onChange={event => update(index, { ...rule, maxDays: event.target.valueAsNumber })}/></label> :
            <label>{labels[rule.field]}<input required maxLength={100} value={rule.value}
              onChange={event => update(index, { ...rule, value: event.target.value })}/></label>}
        </div>
        {rule.field === "skill" && <label className="search-checkbox search-rule__exclude">
          <input type="checkbox" checked={rule.exclude}
            onChange={event => update(index, { ...rule, exclude: event.target.checked })}/>
          Exclude this skill
        </label>}
      </div>
    </section>;
  }

  return <fieldset disabled={disabled} className="search-editor review-editor">
    <legend className="review-editor__legend">Editable criteria</legend>
    <div className="review-overview" aria-label="Criteria summary">
      <div><strong>{required.length}</strong><span>Required</span></div>
      <div><strong>{preferred.length}</strong><span>Preferred</span></div>
      <div data-attention={attention > 0}><strong>{attention}</strong><span>Needs attention</span></div>
    </div>
    <p className="search-editor__hint">Required rules determine eligibility. Preferred rules influence ranking, not eligibility.</p>
    {generalErrors.length > 0 && <ul className="review-row__issues">
      {generalErrors.map((message, i) => <li key={i}>{message}</li>)}
    </ul>}
    {rules.length === 0 && <p className="search-editor__empty">No criteria yet. Add a requirement to build your search.</p>}
    <section className="review-group review-group--required" aria-labelledby={editorId + "-required"}>
      <div className="review-group__heading">
        <div><h3 id={editorId + "-required"}>Required</h3>
          <p>Candidates must satisfy these conditions to qualify.</p></div>
        <span>{required.length} {required.length === 1 ? "condition" : "conditions"}</span>
      </div>
      {required.length ? <div className="review-group__rows">{required.map(renderRule)}</div> :
        <p className="review-group__empty">No required conditions. Results may be ranked only by preferences.</p>}
    </section>
    <section className="review-group review-group--preferred" aria-labelledby={editorId + "-preferred"}>
      <div className="review-group__heading">
        <div><h3 id={editorId + "-preferred"}>Preferred</h3>
          <p>Preferences influence ranking without excluding candidates.</p></div>
        <span>{preferred.length} {preferred.length === 1 ? "condition" : "conditions"}</span>
      </div>
      {preferred.length ? <div className="review-group__rows">{preferred.map(renderRule)}</div> :
        <p className="review-group__empty">No preferences. Change a rule’s priority to Preferred to add one.</p>}
    </section>
    <button className="search-editor__add" type="button" disabled={rules.length >= 40} onClick={add}>
      <Plus size={16} aria-hidden="true"/> Add criterion
    </button>
  </fieldset>;
}
