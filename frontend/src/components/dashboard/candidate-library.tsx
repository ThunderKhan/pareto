"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import type { candidateList, candidateFor } from "@pareto/backend/search/server";

type Summary = Awaited<ReturnType<typeof candidateList>>[number];
type Profile = Awaited<ReturnType<typeof candidateFor>>;

async function get<T>(query: string): Promise<T> {
  const response = await fetch("/api/v1/search" + query, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Candidate request failed.");
  return data as T;
}

export default function CandidateLibrary({ initialCandidateId }: { initialCandidateId?: string }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void get<Summary[]>("?q=").then(value => { if (live) setItems(value); })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : "Unable to load candidates."); })
      .finally(() => { if (live) setInitialLoading(false); });
    if (initialCandidateId) {
      void get<Profile>("?candidate=" + encodeURIComponent(initialCandidateId))
        .then(value => { if (live) setSelected(value); })
        .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : "Candidate profile unavailable."); });
    }
    return () => { live = false; };
  }, [initialCandidateId]);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const data = await get<Summary[]>("?q=" + encodeURIComponent(query.trim()));
      setItems(data); setSelected(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search unavailable.");
    } finally { setBusy(false); }
  }

  async function select(id: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { setSelected(await get<Profile>("?candidate=" + encodeURIComponent(id))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Profile unavailable."); }
    finally { setBusy(false); }
  }

  return <div className="pareto-candidates">
    <section className="pareto-candidates__list" aria-label="Candidate library" aria-busy={busy || initialLoading}>
      <form className="pareto-candidates__search" onSubmit={search}>
        <label htmlFor="candidate-name-query">Search by name</label>
        <div>
          <MagnifyingGlass size={19} aria-hidden="true"/>
          <input id="candidate-name-query" type="search" maxLength={100} value={query}
            onChange={event => setQuery(event.target.value)} placeholder="Search candidate names"/>
          <button type="submit" disabled={busy}>Search</button>
        </div>
      </form>
      {error && <p role="alert" className="search-error">{error}</p>}
      {(busy || initialLoading) && <p role="status">Loading candidates…</p>}
      {!initialLoading && <p className="pareto-candidates__count" aria-live="polite">
        {items.length} profile{items.length === 1 ? "" : "s"} shown · up to 50 per search
      </p>}
      <div className="pareto-candidates__rows">
        {items.map(item => <button type="button" key={item.id} disabled={busy}
          aria-pressed={selected?.id === item.id}
          className={"pareto-candidates__row" + (selected?.id === item.id ? " pareto-candidates__row--selected" : "")}
          onClick={() => void select(item.id)}>
          <span className="pareto-candidates__initial" aria-hidden="true">{item.displayName.charAt(0).toUpperCase()}</span>
          <span><strong>{item.displayName}</strong><small>{item.roleTitle ?? "Role not documented"} · {item.city ?? "City not documented"}</small></span>
          <ArrowRight size={17} aria-hidden="true"/>
        </button>)}
        {!busy && !initialLoading && !items.length && <div className="pareto-candidates__empty">
          <UsersThree size={26} aria-hidden="true"/>
          <p>No candidates found. Try another name or confirm this workspace has imported profiles.</p>
        </div>}
      </div>
    </section>
    <section className="pareto-candidates__detail" aria-label="Candidate profile">
      {selected ? <>
        <p className="pareto-page-eyebrow">Candidate details</p>
        <h2>{selected.displayName}</h2>
        <p className="pareto-candidates__subtitle">{selected.roleTitle ?? "Role not documented"} · {selected.city ?? "City not documented"}</p>
        <dl>{Object.entries({
          "Experience": selected.experienceMonths === null ? "Not documented" : String(selected.experienceMonths) + " months",
          "Notice period": selected.noticePeriodDays === null ? "Not documented" : String(selected.noticePeriodDays) + " days",
          "Skills": selected.skills?.join(", ") || "Not documented",
          "Industry": selected.industry || "Not documented",
          "Education": selected.education || "Not documented",
          "Employment type": selected.employmentType || "Not documented",
          "Previous roles": selected.pastRoles.join(", ") || "Not documented",
          "Certifications": selected.certifications.join(", ") || "Not documented",
        }).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <Link href={"/dashboard/search?reference=" + encodeURIComponent(selected.id)} className="pareto-candidates__similar">
          Find candidates like {selected.displayName} <ArrowRight size={17} aria-hidden="true"/>
        </Link>
      </> : <div className="pareto-candidates__empty">
        <UsersThree size={30} aria-hidden="true"/>
        <h2>Explore candidate details.</h2>
        <p>Select a candidate to inspect documented evidence and start a similarity search.</p>
      </div>}
    </section>
  </div>;
}
