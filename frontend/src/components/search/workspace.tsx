"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { criteriaSchema, ruleKey, type Rule } from "@pareto/backend/search";
import type { candidateList, confirmSearch, referenceDraft } from "@pareto/backend/search/server";
import CriteriaEditor, { labels } from "./criteria-editor";

type Results = Awaited<ReturnType<typeof confirmSearch>>;
type Lookup = Awaited<ReturnType<typeof candidateList>>;
type Profile = Results["results"][number]["candidate"];
type Draft = {
  criteria: Rule[];
  warnings: string[];
  requestId: string;
  active?: Pick<Results, "sessionId" | "version">;
  reference?: Profile;
};

const statuses = { ELIGIBLE: "Eligible", NEEDS_REVIEW: "Needs review", INELIGIBLE: "Ineligible" };

async function api<T>(query = "", body?: object): Promise<T> {
  const response = await fetch(`/api/v1/search${query}`, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "The search request failed.");
  return data;
}

function describe(rule: Rule) {
  switch (rule.field) {
    case "experience": return [rule.minMonths === undefined ? "" : `min ${rule.minMonths}`, rule.maxMonths === undefined ? "" : `max ${rule.maxMonths}`].filter(Boolean).join(" / ") + " months";
    case "notice": return `up to ${rule.maxDays} days`;
    case "skill": return `${rule.exclude ? "Exclude " : ""}${rule.value}`;
    default: return rule.value;
  }
}

function ProfileFacts({ profile }: { profile: Profile }) {
  return <dl className="search-facts">
    {Object.entries({
      "Current role": profile.roleTitle, City: profile.city,
      Experience: profile.experienceMonths === null ? null : `${profile.experienceMonths} months`,
      "Notice period": profile.noticePeriodDays === null ? null : `${profile.noticePeriodDays} days`,
      Skills: profile.skills?.join(", "), Industry: profile.industry, Education: profile.education,
      "Employment type": profile.employmentType, "Previous roles": profile.pastRoles.join(", "),
      Certifications: profile.certifications.join(", "),
    }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not documented"}</dd></div>)}
  </dl>;
}

export default function SearchWorkspace() {
  const [prompt, setPrompt] = useState("");
  const [followup, setFollowup] = useState("");
  const [name, setName] = useState("");
  const [lookup, setLookup] = useState<Lookup>();
  const [draft, setDraft] = useState<Draft>();
  const [results, setResults] = useState<Results>();
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = new URLSearchParams(window.location.search).get("session");
    if (!session) return;
    let cancelled = false;
    void api<Results>(`?session=${encodeURIComponent(session)}`)
      .then(value => { if (!cancelled) setResults(value); })
      .catch(error => { if (!cancelled) setAlert(error.message); });
    return () => { cancelled = true; };
  }, []);

  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setAlert("");
    setMessage("");
    try { await operation(); }
    catch (error) { setAlert(error instanceof Error ? error.message : "The request failed."); }
    finally { setBusy(false); }
  }

  function openDraft(criteria: Rule[], warnings: string[] = [], options: Partial<Draft> = {}) {
    setDraft({ criteria, warnings, requestId: crypto.randomUUID(), ...options });
  }

  function fromReference(id: string) {
    return run(async () => {
      const data = await api<Awaited<ReturnType<typeof referenceDraft>>>("", { action: "reference", candidateId: id });
      openDraft(data.criteria, [], { reference: data.candidate });
    });
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const parsed = criteriaSchema.safeParse(draft.criteria);
    if (!parsed.success) {
      setAlert(parsed.error.issues.map(issue => issue.message).join(" "));
      return;
    }
    void run(async () => {
      const data = await api<Results>("", {
        action: "confirm", criteria: parsed.data, requestId: draft.requestId,
        sessionId: draft.active?.sessionId, expectedVersion: draft.active?.version, referenceId: draft.reference?.id,
      });
      setDraft(undefined);
      setResults(data);
      setOffset(0);
      setFollowup("");
      window.history.replaceState(null, "", `?session=${encodeURIComponent(data.sessionId)}`);
      setMessage(`Revision ${data.version} confirmed.`);
    });
  }

  const previous = new Map((draft?.active ? results?.criteria ?? [] : []).map(rule => [ruleKey(rule), rule]));
  const current = new Map(draft?.criteria.map(rule => [ruleKey(rule), rule]));
  const changes = [...new Set([...previous.keys(), ...current.keys()])].flatMap(key => {
    const before = previous.get(key);
    const after = current.get(key);
    if (!draft?.active || JSON.stringify(before) === JSON.stringify(after)) return [];
    const field = (before ?? after)?.field;
    return field ? [`${labels[field]}: ${before ? `${describe(before)} (${before.mode})` : "Absent"} → ${after ? `${describe(after)} (${after.mode})` : "Removed"}`] : [];
  });

  return <div className="search-workspace" aria-busy={busy}>
    <div className="search-columns">
      <form className="search-panel" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          const data = await api<{ criteria: Rule[]; warnings: string[]; provider: string }>("", { action: "interpret", prompt });
          openDraft(data.criteria, data.warnings);
          setMessage(`Draft interpreted by ${data.provider}.`);
        });
      }}>
        <label htmlFor="search-brief">Hiring brief</label>
        <textarea id="search-brief" maxLength={2000} minLength={3} required rows={4} value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder="Find a Senior Java Developer in Hyderabad with Java, Spring Boot, AWS, 6–10 years of experience and 30 days’ notice." />
        <div className="search-actions">
          <button className="button button--dark" disabled={busy}><MagnifyingGlass size={17} /> Extract criteria</button>
          <button type="button" disabled={busy} onClick={() => openDraft([])}>Enter criteria manually</button>
        </div>
      </form>
      <form className="search-panel" onSubmit={event => {
        event.preventDefault();
        void run(async () => setLookup(await api<Lookup>(`?q=${encodeURIComponent(name)}`)));
      }}>
        <label htmlFor="reference-name">Find candidates like someone</label>
        <input id="reference-name" maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Search by candidate name" />
        <button className="button button--dark" disabled={busy}><UsersThree size={17} /> Find reference profiles</button>
        {lookup && (lookup.length ? <ul>{lookup.map(candidate => <li key={candidate.id}><button type="button" disabled={busy}
          onClick={() => void fromReference(candidate.id)}>{candidate.displayName} · {candidate.roleTitle ?? "Role not documented"} · {candidate.city ?? "City not documented"}</button></li>)}</ul>
          : <p>No profiles found for that name.</p>)}
      </form>
    </div>
    {busy && <p role="status">Working…</p>}
    {message && <p role="status">{message}</p>}
    {alert && <p className="search-error" role="alert">{alert}</p>}
    {draft && <form className="search-panel" onSubmit={confirm}>
      <h2>Review draft criteria</h2>
      <p>Candidate results stay the same until you confirm this draft.</p>
      {draft.reference && <details><summary>Reference profile · {draft.reference.displayName}</summary><ProfileFacts profile={draft.reference} /></details>}
      {draft.warnings.length > 0 && <ul>{draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      {changes.length > 0 && <ul aria-label="Proposed changes">{changes.map(change => <li key={change}>{change}</li>)}</ul>}
      <CriteriaEditor rules={draft.criteria} disabled={busy} onChange={criteria => setDraft({ ...draft, criteria, requestId: crypto.randomUUID() })} />
      <div className="search-actions">
        <button className="button button--dark" disabled={busy || !draft.criteria.length}>Confirm Search</button>
        <button type="button" disabled={busy} onClick={() => setDraft(undefined)}>Discard draft</button>
      </div>
    </form>}
    {results && <section className="search-panel" aria-label="Confirmed results">
      <h2>Search results · revision {results.version}</h2>
      <p>{results.counts.ELIGIBLE} eligible · {results.counts.NEEDS_REVIEW} need review · {results.counts.INELIGIBLE} ineligible</p>
      {results.referenceId && <p>Similarity counts equally weighted preferred profile criteria. Missing evidence earns zero credit.</p>}
      <details><summary>Confirmed criteria</summary><ul>{results.criteria.map(rule =>
        <li key={ruleKey(rule)}>{labels[rule.field]} · {describe(rule)} ({rule.mode})</li>)}</ul></details>
      <form className="search-followup" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          const data = await api<{ criteria: Rule[]; warnings: string[]; changed: boolean }>("", {
            action: "refine", prompt: followup, sessionId: results.sessionId, expectedVersion: results.version,
          });
          if (data.changed) openDraft(data.criteria, data.warnings, { active: results });
          else setMessage(data.warnings.join(" ") || "No effective criteria changed.");
        });
      }}>
        <label htmlFor="search-followup">Refine this search</label>
        <input id="search-followup" value={followup} onChange={e => setFollowup(e.target.value)} required minLength={3} maxLength={2000}
          placeholder="Only candidates who can join within 30 days" />
        <div className="search-actions">
          <button className="button button--dark" disabled={busy}>Propose refinement</button>
          <button type="button" disabled={busy} onClick={() => openDraft(results.criteria, [], { active: results })}>Edit confirmed criteria</button>
        </div>
      </form>
      {results.total === 0 && <p>No candidate profiles are available in this workspace.</p>}
      {results.results.map(({ candidate, details, eligibility, requiredMet, requiredTotal, preferenceMet, preferenceTotal }) =>
        <article key={candidate.id} className="search-result">
          <h3>{candidate.displayName}</h3>
          <p>{candidate.roleTitle ?? "Role not documented"} · {candidate.city ?? "City not documented"}</p>
          <p><strong>{statuses[eligibility]}</strong>{requiredTotal > 0 && ` · ${requiredMet}/${requiredTotal} requirements met`}
            {preferenceTotal > 0 && ` · ${preferenceMet}/${preferenceTotal} ${results.referenceId ? "similarity" : "preferred"} criteria matched`}</p>
          <details><summary>Match evidence</summary><ul>{details.map(detail =>
            <li key={ruleKey(detail.rule)}><strong>{labels[detail.rule.field]} · {detail.outcome}</strong> · {detail.reason}</li>)}</ul></details>
          <details><summary>Candidate details</summary><ProfileFacts profile={candidate} />
            <button type="button" disabled={busy} onClick={() => void fromReference(candidate.id)}>Find candidates like {candidate.displayName}</button>
          </details>
        </article>)}
      {results.total > 20 && <div className="search-actions">
        {[-20, 20].map(step => <button key={step} type="button" disabled={busy || offset + step < 0 || offset + step >= results.total}
          onClick={() => void run(async () => {
            const next = offset + step;
            setResults(await api<Results>(`?session=${encodeURIComponent(results.sessionId)}&offset=${next}`));
            setOffset(next);
          })}>{step < 0 ? "Previous page" : "Next page"}</button>)}
        <span>{offset + 1}–{offset + results.results.length} of {results.total}</span>
      </div>}
    </section>}
  </div>;
}
