"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowClockwise, MagnifyingGlass, PencilSimple, Sparkle, UsersThree, X } from "@phosphor-icons/react";
import { criteriaSchema, ruleKey, type Rule } from "@pareto/backend/search";
import type { candidateList, confirmSearch, referenceDraft } from "@pareto/backend/search/server";
import CriteriaEditor, { labels } from "./criteria-editor";
import SearchOrb from "./search-orb";
import ParitoAvatar from "@/components/dashboard/parito-avatar";
import SearchHealthPanel from "./search-health";
import WhatIfPanel from "./what-if";
import NearMatchExplanation from "./near-match";
import "./search.css";
import "./insights.css";
import "./round-02.css";
import "./round-03-motion.css";

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
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceClosing, setReferenceClosing] = useState(false);
  const referenceCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftClosing, setDraftClosing] = useState(false);
  const referenceTriggerRef = useRef<HTMLButtonElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const referencePanelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const draftDialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Draft>();
  const [results, setResults] = useState<Results>();
  const [offset, setOffset] = useState(0);
  const [message, setMessage] = useState("");
  const [alert, setAlert] = useState("");
  const [lastRequest, setLastRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Working…");
  const isDraftOpen = Boolean(draft);
  const composerText = results ? followup : prompt;
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Exit animations keep overlays mounted until they finish; all timers are
  // cancelled on unmount or when a new panel is opened.
  useEffect(() => () => {
    if (referenceCloseTimer.current !== null) clearTimeout(referenceCloseTimer.current);
    if (draftCloseTimer.current !== null) clearTimeout(draftCloseTimer.current);
  }, []);

  function closeReference() {
    if (referenceCloseTimer.current !== null) return;
    if (prefersReducedMotion()) {
      setReferenceOpen(false);
      setReferenceClosing(false);
      return;
    }
    setReferenceClosing(true);
    referenceCloseTimer.current = setTimeout(() => {
      referenceCloseTimer.current = null;
      setReferenceOpen(false);
      setReferenceClosing(false);
    }, 220);
  }

  function closeDraft() {
    if (draftCloseTimer.current !== null) return;
    // Closing an unconfirmed draft must never leave a ghost user request.
    if (!results) setLastRequest("");
    if (prefersReducedMotion()) {
      setDraft(undefined);
      setDraftClosing(false);
      return;
    }
    setDraftClosing(true);
    draftCloseTimer.current = setTimeout(() => {
      draftCloseTimer.current = null;
      setDraft(undefined);
      setDraftClosing(false);
    }, 230);
  }

  // Keep the same textarea mounted while the session moves from centered to active.
  useEffect(() => {
    const input = composerRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 176) + "px";
  }, [composerText, results]);

  // The candidate picker reads the real owner-scoped API and cancels stale lookups.
  useEffect(() => {
    const name = lookupName.trim();
    if (!referenceOpen || name.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLookupBusy(true);
      void fetch("/api/v1/search?q=" + encodeURIComponent(name), {
        cache: "no-store", signal: controller.signal,
      }).then(async response => {
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error : "Candidate lookup failed.",
        );
        if (!controller.signal.aborted) setLookup(data as Lookup);
      }).catch(error => {
        if (!controller.signal.aborted) setLookupError(
          error instanceof Error ? error.message : "Candidate lookup is unavailable.",
        );
      }).finally(() => { if (!controller.signal.aborted) setLookupBusy(false); });
    }, 230);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [lookupName, referenceOpen]);

  // Dismiss a lightweight picker by Escape or pointer outside; restore its trigger.
  useEffect(() => {
    if (!referenceOpen) return;
    referenceInputRef.current?.focus();
    const outside = (event: PointerEvent) => {
      if (referencePanelRef.current?.contains(event.target as Node) ||
          referenceTriggerRef.current?.contains(event.target as Node)) return;
      closeReference();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeReference();
      referenceTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [referenceOpen]);

  // Dialog focus is trapped and returned to the element that opened the review.
  useEffect(() => {
    if (!isDraftOpen) return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = draftDialogRef.current;
    dialog?.querySelector<HTMLElement>(".search-rule__fields select, .search-editor__add, .pareto-draft-close")?.focus();
    const keys = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); if (!busy) closeDraft(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(node => node.getClientRects().length > 0);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("keydown", keys); if (origin?.isConnected) origin.focus(); };
  }, [isDraftOpen]);

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
    if (draftCloseTimer.current !== null) {
      clearTimeout(draftCloseTimer.current);
      draftCloseTimer.current = null;
    }
    if (referenceCloseTimer.current !== null) {
      clearTimeout(referenceCloseTimer.current);
      referenceCloseTimer.current = null;
    }
    setDraftClosing(false);
    setReferenceClosing(false);
    setReferenceOpen(false);
    setDraft({ criteria: criteria.map(rule => ({ ...rule })), warnings, requestId: crypto.randomUUID(), ...options });
  }

  function discardDraft() {
    if (!busy) closeDraft();
  }

  function toggleReference() {
    if (referenceOpen) { closeReference(); return; }
    if (referenceCloseTimer.current !== null) {
      clearTimeout(referenceCloseTimer.current);
      referenceCloseTimer.current = null;
    }
    setReferenceClosing(false);
    setDraft(undefined);
    setLookupName("");
    setLookup(undefined);
    setLookupError("");
    setLookupBusy(false);
    setReferenceOpen(true);
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
      // Keep the review visible for its closing transition, while updating
      // the newly confirmed search underneath. The saved revision is already real.
      setResults(data); setOffset(0);
      if (prefersReducedMotion()) {
        setDraft(undefined);
      } else {
        setDraftClosing(true);
        if (draftCloseTimer.current !== null) clearTimeout(draftCloseTimer.current);
        draftCloseTimer.current = setTimeout(() => {
          draftCloseTimer.current = null;
          setDraft(undefined);
          setDraftClosing(false);
        }, 230);
      }
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
  const conversationStarted = Boolean(results || draft || lastRequest || busy || alert || message || initialSession || initialReference);

  return <div className={"pareto-chat " + (conversationStarted ? "pareto-chat--active" : "pareto-chat--fresh")} aria-busy={busy}>
    <div className="pareto-chat__timeline">
      {!results && !draft && !lastRequest && <div className="pareto-chat__empty">
        <SearchOrb />
        <h2>Who are we looking for?</h2>
      </div>}
      {lastRequest && <div className="pareto-chat__request">
        <span className="pareto-chat__caption">YOUR REQUEST</span>
        <p>{lastRequest}</p>
      </div>}
      {(busy || message || alert || results) && <div className="pareto-chat__assistant-turn"
        role="group" aria-label="Pareto response">
        <span className="pareto-chat__assistant-icon" aria-hidden="true">
          {busy ? <SearchOrb working /> : <ParitoAvatar size="chat" />}
        </span>
        <div className="pareto-chat__assistant-content">
      {busy && <div className="pareto-chat__processing" role="status">
        <span>{busyLabel}</span>
      </div>}
      {message && <p className="pareto-chat__notice" role="status">{message}</p>}
      {alert && <p className="search-error" role="alert">{alert}</p>}
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
        <div className="insight-panels" aria-label="Search analysis tools">
          <SearchHealthPanel key={"health:" + results.sessionId + ":" + results.version}
            sessionId={results.sessionId} version={results.version}
            onReview={(criteria, warnings) => openDraft(criteria, warnings, { active: results })}/>
          <WhatIfPanel key={"scenario:" + results.sessionId + ":" + results.version}
            sessionId={results.sessionId} version={results.version} criteria={results.criteria}
            onReview={(criteria, warnings) => openDraft(criteria, warnings, { active: results })}/>
        </div>
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
              {!similarityOnly && (eligibility === "INELIGIBLE" || eligibility === "NEEDS_REVIEW") &&
                <NearMatchExplanation key={results.sessionId + ":" + results.version + ":" + candidate.id}
                  sessionId={results.sessionId} version={results.version}
                  candidateId={candidate.id} candidateName={candidate.displayName}
                  onReview={(criteria, warnings) => openDraft(criteria, warnings, { active: results })}/>}
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
        </div>
      </div>}
    </div>
    <div className="pareto-chat__composer-dock">
      {referenceOpen && <section id="pareto-reference-picker"
        className={"pareto-reference-picker" + (referenceClosing ? " pareto-reference-picker--closing" : "")} role="dialog"
        aria-label="Find a reference candidate" ref={referencePanelRef}>
        <header className="pareto-reference-picker__header">
          <h2>Find a reference candidate</h2>
          <button type="button" onClick={() => {
            closeReference(); referenceTriggerRef.current?.focus();
          }} aria-label="Close reference picker"><X size={18} aria-hidden="true"/></button>
        </header>
        <label className="pareto-reference-picker__search" htmlFor="reference-name">
          <MagnifyingGlass size={19} aria-hidden="true"/>
          <span className="sr-only">Search by candidate name</span>
          <input ref={referenceInputRef} id="reference-name" type="search" maxLength={100}
            value={lookupName} onChange={event => {
              setLookupName(event.target.value); setLookup(undefined); setLookupError("");
            }} onKeyDown={event => {
              if (event.key === "ArrowDown") {
                const first = referencePanelRef.current?.querySelector<HTMLButtonElement>(".pareto-reference-picker__result");
                if (first) { event.preventDefault(); first.focus(); }
              }
            }} placeholder="Search candidates by name…" autoComplete="off"/>
        </label>
        <div className="pareto-reference-picker__list">
          {lookupName.trim().length < 2 && <p>Enter at least two characters to find a profile.</p>}
          {lookupName.trim().length >= 2 && lookupBusy && <p role="status">Searching candidate profiles…</p>}
          {lookupError && <p role="alert">{lookupError}</p>}
          {!lookupBusy && !lookupError && lookupName.trim().length >= 2 && lookup?.length === 0 &&
            <p role="status">No matching profiles. Try another name.</p>}
          {!lookupBusy && !lookupError && lookup?.map(candidate =>
            <button type="button" className="pareto-reference-picker__result" key={candidate.id}
              disabled={busy} onClick={() => fromReference(candidate.id)}>
              <span className="pareto-reference-picker__initial" aria-hidden="true">{candidate.displayName.charAt(0)}</span>
              <span><strong>{candidate.displayName}</strong>
                <small>{candidate.roleTitle ?? "Role not documented"} · {candidate.city ?? "City not documented"}</small>
              </span>
            </button>)}
        </div>
      </section>}
    <form className="pareto-chat__composer" onSubmit={submitComposer} aria-label="Candidate search composer">
      <label className="pareto-chat__composer-label" htmlFor={results ? "search-followup" : "search-brief"}>
        {results ? "Refine this search" : "Hiring brief"}
      </label>
      <textarea ref={composerRef} id={results ? "search-followup" : "search-brief"} value={results ? followup : prompt}
        onChange={event => results ? setFollowup(event.target.value) : setPrompt(event.target.value)}
        onKeyDown={keydown} required minLength={3} maxLength={2000} rows={1}
        placeholder={results ? "Refine your search…" : "Describe the candidate you're looking for…"} />
      <div className="pareto-chat__composer-actions">
        <div className="pareto-chat__composer-tools">
          <button ref={referenceTriggerRef} type="button" disabled={busy} aria-expanded={referenceOpen}
            aria-controls="pareto-reference-picker" onClick={toggleReference}>
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
        </button>
      </div>
    </form>
    </div>
    {draft && <div className={"pareto-draft-layer" + (draftClosing ? " pareto-draft-layer--closing" : "")}>
      <button type="button" tabIndex={-1} className="pareto-draft-backdrop"
        aria-label="Dismiss criteria review" onClick={discardDraft}/>
      <section className="pareto-draft-dialog" ref={draftDialogRef} role="dialog"
        aria-modal="true" aria-labelledby="pareto-draft-title">
        <header className="pareto-draft-header">
          <div><p className="pareto-chat__caption">RECRUITER REVIEW REQUIRED</p>
            <h2 id="pareto-draft-title">Review draft criteria</h2></div>
          <button type="button" className="pareto-draft-close" onClick={discardDraft}
            aria-label="Close criteria review"><X size={20} aria-hidden="true"/></button>
        </header>
        <form className="pareto-draft-form" onSubmit={confirm}>
          <div className="pareto-draft-scroll">
            <p className="pareto-draft-intro">Review what is required and what is preferred. The current search stays unchanged until you confirm.</p>
            {draft.reference && <details className="pareto-draft-context">
              <summary>Reference profile · {draft.reference.displayName}</summary><ProfileFacts profile={draft.reference}/>
            </details>}
            {draft.warnings.length > 0 && <ul className="pareto-chat__warnings">
              {draft.warnings.map((warning,index) => <li key={index}>{warning}</li>)}
            </ul>}
            {changes.length > 0 && <div className="pareto-draft-changes">
              <h3>Proposed changes</h3>
              <ul>{changes.map(change => <li key={change}>{change}</li>)}</ul>
            </div>}
            <CriteriaEditor rules={draft.criteria} disabled={busy}
              onChange={criteria => setDraft({ ...draft, criteria, requestId: crypto.randomUUID() })}/>
          </div>
          <footer className="pareto-draft-footer">
            <p>Changes are saved only when you confirm.</p>
            <div className="pareto-draft-actions">
              <button type="button" disabled={busy} className="pareto-draft-discard"
                onClick={discardDraft}>Discard draft</button>
              <button type="submit" disabled={busy || !draft.criteria.length} className="pareto-draft-confirm">
                Confirm Search
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>}
  </div>;
}
