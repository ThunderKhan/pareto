"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowClockwise, ArrowRight, MagnifyingGlass, PencilSimple, Sparkle, UsersThree } from "@phosphor-icons/react";
import { criteriaSchema, ruleKey, type Rule } from "@pareto/backend/search";
import type { candidateList, confirmSearch, referenceDraft } from "@pareto/backend/search/server";
import CriteriaEditor, { labels } from "./criteria-editor";
import SearchOrb from "./search-orb";
import "./search.css";

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
  const response = await fetch("/api/v1/search" + query, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "The search request failed.");
  return data as T;
}

function describe(rule: Rule) {
  switch (rule.field) {
    case "experience": return [rule.minMonths === undefined ? "" : "min " + rule.minMonths,
      rule.maxMonths === undefined ? "" : "max " + rule.maxMonths].filter(Boolean).join(" / ") + " months";
    case "notice": return "up to " + rule.maxDays + " days";
    case "skill": return (rule.exclude ? "Exclude " : "") + rule.value;
    default: return rule.value;
  }
}

function ProfileFacts({ profile }: { profile: Profile }) {
  return <dl className="search-facts">
    {Object.entries({
      "Current role": profile.roleTitle, City: profile.city,
      Experience: profile.experienceMonths === null ? null : profile.experienceMonths + " months",
      "Notice period": profile.noticePeriodDays === null ? null : profile.noticePeriodDays + " days",
      Skills: profile.skills?.join(", "), Industry: profile.industry, Education: profile.education,
      "Employment type": profile.employmentType, "Previous roles": profile.pastRoles.join(", "),
      Certifications: profile.certifications.join(", "),
    }).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not documented"}</dd></div>)}
  </dl>;
}

export default function SearchWorkspace({ initialSession, initialReference }: {
  initialSession?: string;
  initialReference?: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [followup, setFollowup] = useState("");
  const [lookupName, setLookupName] = useState("");
  const [lookup, setLookup] = useState<Lookup>();
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>();
  const [results, setResults] = useState<Results>();
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState("");
  const [lastRequest, setLastRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Working…");

  useEffect(() => {
    let cancelled = false;
    if (initialSession) {
      void api<Results>("?session=" + encodeURIComponent(initialSession))
        .then(value => { if (!cancelled) setResults(value); })
        .catch(error => { if (!cancelled) setAlert(error instanceof Error ? error.message : "Search unavailable."); });
    } else if (initialReference) {
      void api<Awaited<ReturnType<typeof referenceDraft>>>("", {
        action: "reference", candidateId: initialReference,
      }).then(value => {
        if (!cancelled) setDraft({ criteria: value.criteria, warnings: [],
          requestId: crypto.randomUUID(), reference: value.candidate });
      }).catch(error => { if (!cancelled) setAlert(error instanceof Error ? error.message : "Reference unavailable."); });
    }
    return () => { cancelled = true; };
  }, [initialSession, initialReference]);

  async function run(label: string, operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setBusyLabel(label); setAlert(""); setMessage("");
    try { await operation(); }
    catch (error) { setAlert(error instanceof Error ? error.message : "The request failed."); }
    finally { setBusy(false); }
  }

  function openDraft(criteria: Rule[], warnings: string[] = [], options: Partial<Draft> = {}) {
    setDraft({ criteria, warnings, requestId: crypto.randomUUID(), ...options });
  }

  function fromReference(id: string) {
    void run("Reading the reference profile…", async () => {
      const data = await api<Awaited<ReturnType<typeof referenceDraft>>>("", { action: "reference", candidateId: id });
      openDraft(data.criteria, [], { reference: data.candidate });
      setReferenceOpen(false);
      setLastRequest("Find candidates like " + data.candidate.displayName);
    });
  }

  function submitComposer(event: FormEvent) {
    event.preventDefault();
    const text = results ? followup.trim() : prompt.trim();
    if (busy || text.length < 3) return;
    setLastRequest(text);
    if (!results) {
      void run("Interpreting your hiring brief…", async () => {
        const data = await api<{ criteria: Rule[]; warnings: string[]; provider: string }>("", { action: "interpret", prompt: text });
        openDraft(data.criteria, data.warnings);
        setMessage("Draft interpreted by " + data.provider + ". Review and confirm before searching candidates.");
      });
    } else {
      void run("Proposing a refinement…", async () => {
        const data = await api<{ criteria: Rule[]; warnings: string[]; changed: boolean }>("", {
          action: "refine", prompt: text, sessionId: results.sessionId, expectedVersion: results.version,
        });
        if (data.changed) openDraft(data.criteria, data.warnings, { active: results });
        else setMessage(data.warnings.join(" ") || "No effective criteria changed.");
      });
    }
  }

  function keydown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const parsed = criteriaSchema.safeParse(draft.criteria);
    if (!parsed.success) {
      setAlert(parsed.error.issues.map(issue => issue.message).join(" "));
      return;
    }
    void run("Searching confirmed candidate records…", async () => {
      const data = await api<Results>("", {
        action: "confirm", criteria: parsed.data, requestId: draft.requestId,
        sessionId: draft.active?.sessionId, expectedVersion: draft.active?.version,
        referenceId: draft.reference?.id,
      });
      setDraft(undefined); setResults(data); setOffset(0);
      setFollowup(""); setPrompt(""); setLastRequest("");
      window.history.replaceState(null, "", "?session=" + encodeURIComponent(data.sessionId));
      window.dispatchEvent(new Event("pareto:search-confirmed"));
      setMessage("Revision " + data.version + " confirmed. These matches come from your candidate database.");
    });
  }

  const previous = new Map((draft?.active ? results?.criteria ?? [] : []).map(rule => [ruleKey(rule), rule]));
  const current = new Map(draft?.criteria.map(rule => [ruleKey(rule), rule]));
  const changes = [...new Set([...previous.keys(), ...current.keys()])].flatMap(key => {
    const before = previous.get(key);
    const after = current.get(key);
    if (!draft?.active || JSON.stringify(before) === JSON.stringify(after)) return [];
    const field = (before ?? after)?.field;
    return field ? [labels[field] + ": " +
      (before ? describe(before) + " (" + before.mode + ")" : "Absent") + " → " +
      (after ? describe(after) + " (" + after.mode + ")" : "Removed")] : [];
  });
  const similarityOnly = Boolean(results?.referenceId) && results?.criteria.every(rule => rule.mode === "preferred");

  return <div className="pareto-chat" aria-busy={busy}>
    <div className="pareto-chat__timeline">
      {!results && !draft && !lastRequest && <div className="pareto-chat__empty">
        <SearchOrb />
        <h2>Who are we looking for?</h2>
        <p>Describe a role in your own words. Pareto will propose criteria for you to review—nothing is searched until you confirm.</p>
        <div className="pareto-chat__suggestions">
          <button type="button" onClick={() => setPrompt("Find senior Java developers in Hyderabad with 6–10 years of experience and AWS.")}>
            Senior Java developers <ArrowRight size={13} aria-hidden="true"/>
          </button>
          <button type="button" onClick={() => setReferenceOpen(true)}>
            Find candidates like someone <ArrowRight size={13} aria-hidden="true"/>
          </button>
        </div>
      </div>}
      {lastRequest && <div className="pareto-chat__request">
        <span className="pareto-chat__caption">YOUR REQUEST</span>
        <p>{lastRequest}</p>
      </div>}
      {busy && <div className="pareto-chat__processing" role="status">
        <SearchOrb working /> <span>{busyLabel}</span>
      </div>}
      {message && <p className="pareto-chat__notice" role="status">{message}</p>}
      {alert && <p className="search-error" role="alert">{alert}</p>}
      {draft && <form className="search-panel pareto-chat__draft" onSubmit={confirm}>
        <p className="pareto-chat__caption">RECRUITER REVIEW REQUIRED</p>
        <h2>Review draft criteria</h2>
        <p>Candidate results stay the same until you confirm this draft. Required and preferred criteria are evaluated separately.</p>
        {draft.reference && <details><summary>Reference profile · {draft.reference.displayName}</summary><ProfileFacts profile={draft.reference}/></details>}
        {draft.warnings.length > 0 && <ul className="pareto-chat__warnings">{draft.warnings.map((warning,index) => <li key={index}>{warning}</li>)}</ul>}
        {changes.length > 0 && <ul aria-label="Proposed changes">{changes.map(change => <li key={change}>{change}</li>)}</ul>}
        <CriteriaEditor rules={draft.criteria} disabled={busy}
          onChange={criteria => setDraft({ ...draft, criteria, requestId: crypto.randomUUID() })}/>
        <div className="search-actions">
          <button className="button button--dark" disabled={busy || !draft.criteria.length}>Confirm Search</button>
          <button type="button" disabled={busy} onClick={() => setDraft(undefined)}>Discard draft</button>
        </div>
      </form>}
      {results && <section className="search-panel pareto-chat__results" aria-label="Confirmed results">
        <div className="pareto-chat__results-head">
          <div>
            <p className="pareto-chat__caption">CONFIRMED DATABASE SEARCH</p>
            <h2>Search results · revision {results.version}</h2>
          </div>
          <button type="button" disabled={busy} className="pareto-chat__edit"
            onClick={() => openDraft(results.criteria, [], { active: results })}>
            <PencilSimple size={16}/> Edit confirmed criteria
          </button>
        </div>
        {similarityOnly
          ? <p>{results.total} candidates ranked by similarity · no required filters yet</p>
          : <p>{results.counts.ELIGIBLE} eligible · {results.counts.NEEDS_REVIEW} need review · {results.counts.INELIGIBLE} ineligible</p>}
        {results.referenceId && <p>Similarity counts equally weighted preferred profile criteria. Missing evidence earns zero credit.</p>}
        <details><summary>Confirmed criteria</summary><ul>{results.criteria.map(rule =>
          <li key={ruleKey(rule)}>{labels[rule.field]} · {describe(rule)} ({rule.mode})</li>)}</ul></details>
        {results.total === 0 && <p>No candidate profiles are available in this workspace.</p>}
        <div className="pareto-chat__candidate-grid">
          {results.results.map(({candidate,details,eligibility,requiredMet,requiredTotal,preferenceMet,preferenceTotal}) =>
            <article key={candidate.id} className="search-result">
              <div className="pareto-chat__candidate-head">
                <span className="pareto-chat__candidate-avatar" aria-hidden="true">{candidate.displayName.charAt(0).toUpperCase()}</span>
                <div><h3>{candidate.displayName}</h3><p>{candidate.roleTitle ?? "Role not documented"} · {candidate.city ?? "City not documented"}</p></div>
              </div>
              <p><strong className={"pareto-chat__eligibility pareto-chat__eligibility--" + eligibility.toLowerCase()}>
                {similarityOnly ? "Similarity-ranked" : statuses[eligibility]}</strong>
                {requiredTotal > 0 && " · " + requiredMet + "/" + requiredTotal + " requirements met"}
                {preferenceTotal > 0 && " · " + preferenceMet + "/" + preferenceTotal + (results.referenceId ? " similarity" : " preferred") + " criteria matched"}</p>
              <details><summary>Match evidence</summary><ul>{details.map(detail =>
                <li key={ruleKey(detail.rule)}><strong>{labels[detail.rule.field]} · {detail.outcome}</strong> · {detail.reason}</li>)}</ul></details>
              <details><summary>Candidate details</summary><ProfileFacts profile={candidate}/>
                <button type="button" disabled={busy} onClick={() => fromReference(candidate.id)}>Find candidates like {candidate.displayName}</button>
              </details>
            </article>)}
        </div>
        {results.total > 20 && <div className="search-actions">
          {[-20,20].map(step => <button key={step} type="button" disabled={busy || offset + step < 0 || offset + step >= results.total}
            onClick={() => void run("Loading candidate results…",async () => {
              const next = offset + step;
              setResults(await api<Results>("?session=" + encodeURIComponent(results.sessionId) + "&offset=" + next));
              setOffset(next);
            })}>{step < 0 ? "Previous page" : "Next page"}</button>)}
          <span>{offset + 1}–{offset + results.results.length} of {results.total}</span>
        </div>}
      </section>}
      {referenceOpen && <form className="search-panel pareto-chat__reference" onSubmit={event => {
        event.preventDefault();
        void run("Finding reference candidates…",async () => {
          setLookup(await api<Lookup>("?q=" + encodeURIComponent(lookupName.trim())));
        });
      }}>
        <div className="pareto-chat__reference-head">
          <div><p className="pareto-chat__caption">REFERENCE-BASED SEARCH</p><h2>Find candidates like someone</h2></div>
          <button type="button" onClick={() => setReferenceOpen(false)}>Close</button>
        </div>
        <label htmlFor="reference-name">Find candidates like someone</label>
        <input id="reference-name" maxLength={100} value={lookupName} onChange={event => setLookupName(event.target.value)}
          placeholder="Search by candidate name" />
        <button className="button button--dark" disabled={busy}><UsersThree size={17}/> Find reference profiles</button>
        {lookup && (lookup.length ? <ul>{lookup.map(candidate => <li key={candidate.id}>
          <button type="button" disabled={busy} onClick={() => fromReference(candidate.id)}>
            {candidate.displayName} · {candidate.roleTitle ?? "Role not documented"} · {candidate.city ?? "City not documented"}
          </button></li>)}</ul> : <p>No profiles found for that name.</p>)}
      </form>}
    </div>
    <form className="pareto-chat__composer" onSubmit={submitComposer} aria-label="Candidate search composer">
      <label htmlFor={results ? "search-followup" : "search-brief"}>
        {results ? "Refine this search" : "Hiring brief"}
      </label>
      <textarea id={results ? "search-followup" : "search-brief"} value={results ? followup : prompt}
        onChange={event => results ? setFollowup(event.target.value) : setPrompt(event.target.value)}
        onKeyDown={keydown} required minLength={3} maxLength={2000} rows={2}
        placeholder={results ? "Only candidates who can join within 30 days…" :
          "Find a Senior Java Developer in Hyderabad with Java, Spring Boot, AWS and 6–10 years of experience…"} />
      <div className="pareto-chat__composer-actions">
        <div className="pareto-chat__composer-tools">
          <button type="button" disabled={busy} onClick={() => setReferenceOpen(value => !value)}>
            <UsersThree size={17} aria-hidden="true"/> Reference
          </button>
          <button type="button" disabled={busy} onClick={() => results ?
            openDraft(results.criteria, [], { active: results }) : openDraft([])}>
            <PencilSimple size={16} aria-hidden="true"/> {results ? "Edit criteria" : "Enter criteria manually"}
          </button>
        </div>
        <button type="submit" className="pareto-chat__send" disabled={busy || (results ? followup : prompt).trim().length < 3}>
          {results ? <ArrowClockwise size={17} aria-hidden="true"/> : <Sparkle size={17} aria-hidden="true"/>}
          {results ? "Propose refinement" : "Extract criteria"}
          <ArrowRight size={15} aria-hidden="true"/>
        </button>
      </div>
    </form>
    <p className="pareto-chat__footnote"><MagnifyingGlass size={12} aria-hidden="true"/> AI suggests criteria. Only you can confirm a candidate search.</p>
  </div>;
}
