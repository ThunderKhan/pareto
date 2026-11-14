"use client";

import { useMemo, useRef, useState, useEffect, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Check, CheckCircle, CaretDown,
  List, MagnifyingGlass, Question, ShieldCheck, SlidersHorizontal,
  WarningCircle, X,
} from "@phosphor-icons/react";
import { assessPreview, summarizePreview, previewCandidates, type CandidateAssessment } from "./preview-data";
import "./home-v2.css";

const process = [
  {
    tab: "Describe",
    title: "Tell Pareto who you need.",
    body: "Write a hiring brief as naturally as you would explain it to a colleague. The starting point is your intent, not a maze of filters.",
  },
  {
    tab: "Review & confirm",
    title: "Check the interpretation.",
    body: "Inspect role, location, experience, skills and joining time. Correct assumptions and explicitly confirm before candidate retrieval.",
  },
  {
    tab: "Discover & explain",
    title: "Understand each result.",
    body: "See which requirements are met, which fail, and which need more evidence. An unexplained ranking is never the whole answer.",
  },
] as const;

const facets = [
  ["Role", "Backend engineer"],
  ["Location", "Hyderabad"],
  ["Experience", "6–10 years"],
  ["Required skills", "Java · Spring Boot · AWS"],
  ["Notice period", "Within 30 days"],
];

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={"v2-logo" + (inverse ? " v2-logo--inverse" : "")} aria-label="Pareto home">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="28" height="28" rx="7" fill="currentColor" />
        <path d="M9 8.5h5.8c4 0 6.4 2.3 6.4 5.8s-2.4 5.7-6.4 5.7H12v3.5H9V8.5Zm3 2.8v5.9h2.7c2.3 0 3.5-1.1 3.5-3s-1.2-2.9-3.5-2.9H12Z" fill="var(--v2-logo-hole, #fffdf9)" />
        <circle cx="21.6" cy="22" r="1.7" fill="var(--v2-logo-hole, #fffdf9)" />
      </svg>
      <span>pareto<span className="v2-logo-period">.</span></span>
    </Link>
  );
}

/** Original document/lens motif: an editable SVG, no third-party icon or mascot. */
function SignalArt({ variant = "interpret" }: { variant?: "interpret" | "review" | "verify" }) {
  return (
    <svg className={"v2-signal v2-signal--" + variant} viewBox="0 0 156 144" fill="none" role="img" aria-label={variant === "interpret" ? "Paper brief becoming structured lines" : variant === "review" ? "Checked requirements on a folded paper" : "Evidence inspected through a lens"}>
      <path d="M33 13H101L123 35V123H33V13Z" fill="#FFFDF9" stroke="#020E24" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M101 13V35H123" fill="#E4E9ED" stroke="#020E24" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 52H103M48 65H93M48 78H104M48 91H83" stroke="#B3BABD" strokeWidth="3.5" strokeLinecap="round" />
      {variant === "interpret" && <><path d="M48 52H77" stroke="#467BEB" strokeWidth="4" strokeLinecap="round"/><path d="M87 65H103" stroke="#467BEB" strokeWidth="4" strokeLinecap="round"/><path d="M12 94C27 91 32 101 43 105" stroke="#467BEB" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 6"/><circle cx="15" cy="94" r="5" fill="#467BEB"/></>}
      {variant === "review" && <><rect x="73" y="85" width="51" height="34" rx="8" fill="#EEF2FF" stroke="#020E24" strokeWidth="2"/><path d="m88 102 7 7 15-16" stroke="#235BA8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></>}
      {variant === "verify" && <><circle cx="94" cy="92" r="30" fill="#F4F6F8" fillOpacity=".88" stroke="#020E24" strokeWidth="3"/><path d="m116 115 23 22" stroke="#020E24" strokeWidth="7" strokeLinecap="round"/><path d="m81 93 9 9 17-20" stroke="#467BEB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></>}
    </svg>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    }
    function outside(e: PointerEvent) {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerdown", outside); };
  }, [open]);
  return (
    <header className="v2-header" ref={container}>
      <div className="v2-container v2-header-inner">
        <Logo />
        <nav className="v2-desktop-nav" aria-label="Main navigation">
          <a href="#problem">The problem</a>
          <a href="#how-it-works">How it works</a>
          <a href="#preview">Explore matching</a>
          <a href="#trust">Why Pareto</a>
        </nav>
        <div className="v2-header-actions">
          <Link className="v2-login" href="/login">Log in</Link>
          <Link className="v2-btn v2-btn--primary v2-header-cta" href="/signup">Start searching <ArrowUpRight size={16} weight="bold" aria-hidden="true"/></Link>
          <button ref={menuButton} className="v2-menu-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="v2-mobile-nav" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={22} aria-hidden="true" /> : <List size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && <nav className="v2-mobile-nav" id="v2-mobile-nav" aria-label="Mobile navigation">
        <a href="#problem" onClick={() => setOpen(false)}>The problem</a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        <a href="#preview" onClick={() => setOpen(false)}>Explore matching</a>
        <a href="#trust" onClick={() => setOpen(false)}>Why Pareto</a>
        <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
        <Link href="/signup" className="v2-mobile-primary" onClick={() => setOpen(false)}>Start searching <ArrowRight size={17} aria-hidden="true" /></Link>
      </nav>}
    </header>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="v2-eyebrow">{children}</span>;
}

function Chip({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <span className={"v2-chip" + (strong ? " v2-chip--strong" : "")}>{children}</span>;
}

function WorkspaceFrame({ state = "hero", onConfirm }: { state?: "hero" | "describe" | "review" | "results"; onConfirm?: () => void }) {
  const sample = assessPreview(30);
  return (
    <div className="v2-workspace" aria-label="Pareto candidate search workflow">
      <aside className="v2-workspace-rail" aria-label="Application navigation">
        <div className="v2-workspace-mini-brand"><span className="v2-workspace-mini-icon">p.</span><span>pareto</span><CaretDown size={12} aria-hidden="true" /></div>
        <p className="v2-rail-caption">WORKSPACE</p>
        <div className="v2-rail-item v2-rail-item--selected"><MagnifyingGlass size={16} aria-hidden="true"/> Candidate search</div>
        <div className="v2-rail-item"><SlidersHorizontal size={16} aria-hidden="true" /> Search criteria</div>
        <div className="v2-rail-spacer"/>
        <div className="v2-workspace-person"><span className="v2-person-dot">R</span><span>Recruiter workspace</span></div>
      </aside>
      <div className="v2-workspace-main">
        <div className="v2-workspace-toolbar">
          <span className="v2-workspace-breadcrumb">Recruitment / <strong>Candidate search</strong></span>
          
        </div>
        <div className="v2-workspace-content">
          <div className="v2-window-overline">SEARCH / NEW REQUEST</div>
          <div className="v2-window-heading">
            <div><h3>{state === "results" ? "A shortlist with reasons." : state === "review" ? "Review the interpretation." : "Describe your ideal candidate."}</h3>
            <p>{state === "results" ? "Matches against the confirmed criteria." : state === "review" ? "Make the requirements explicit before searching." : "Turn a natural-language brief into an editable search."}</p></div>
            <div className="v2-window-step">{state === "results" ? "03 / 03" : state === "review" ? "02 / 03" : "01 / 03"}</div>
          </div>
          {(state === "hero" || state === "describe" || state === "review") && (
            <div className="v2-query" aria-label="Example hiring brief">
              <div className="v2-query-label"><MagnifyingGlass size={16} aria-hidden="true"/> HIRING BRIEF</div>
              <p>Find <mark>Java backend engineers</mark> in <mark>Hyderabad</mark> with <mark>6–10 years</mark> of experience, <mark>Spring Boot and AWS</mark>, who can join <mark>within 30 days</mark>.</p>
              
            </div>
          )}
          {(state === "hero" || state === "review") && (
            <div className="v2-criteria" aria-label="Proposed structured criteria">
              <div className="v2-block-title"><span>Proposed criteria <small>Proposed for recruiter review</small></span><span className="v2-state-pill">Needs review</span></div>
              <div className="v2-criteria-grid">
                {facets.map(([label, value]) => <div className="v2-criteria-item" key={label}><span>{label}</span><strong>{value}</strong><Check size={14} aria-hidden="true"/></div>)}
              </div>
              <div className="v2-criteria-bottom"><ShieldCheck size={17} aria-hidden="true"/> Recruiter confirmation required {onConfirm && state === "review" ? <button type="button" className="v2-mock-action" onClick={onConfirm}>View results <ArrowRight size={14} aria-hidden="true"/></button> : <a href="#how-it-works" className="v2-mock-action">Explore workflow <ArrowRight size={14} aria-hidden="true"/></a>}</div>
            </div>
          )}
          {state === "describe" && <div className="v2-prompt-next"><SignalArt variant="interpret"/><p><strong>Understanding the brief</strong><span>Role, location, skills and joining requirements can be extracted for review.</span></p></div>}
          {state === "results" && <div className="v2-mini-results">
            <div className="v2-block-title"><span>Shortlist <small>30-day joining requirement</small></span></div>
            {sample.map((item) => <div className="v2-mini-result" key={item.candidate.id}>
              <span className="v2-initial">{item.candidate.id}</span>
              <span><strong>{item.candidate.name}</strong><small>{item.candidate.years} yrs · {item.candidate.city}</small></span>
              <span className={"v2-mini-result-state v2-mini-result-state--" + item.status}>{item.status === "match" ? "Eligible" : item.status === "fail" ? "Excluded" : "Needs review"}</span>
            </div>)}
            
          </div>}
        </div>
      </div>
    </div>
  );
}

function Problem() {
  return <section id="problem" className="v2-section v2-problem">
    <div className="v2-container">
      <div className="v2-section-intro"><Label>THE PROBLEM</Label><h2>Hiring is more than <em>a list of filters.</em></h2><p>Rigid searches hide trade-offs. A meaningful shortlist should show which details matter, what matched, and where the evidence stops.</p></div>
      <div className="v2-contrast">
        <div className="v2-contrast-old">
          <div className="v2-contrast-kicker">TRADITIONAL FILTERING</div>
          <h3>Matches a keyword.<br/>Misses the context.</h3>
          <div className="v2-filter-pile"><Chip>Java</Chip><Chip>Hyderabad</Chip><Chip>6+ years</Chip><Chip>Any notice period</Chip></div>
          <div className="v2-opaque-row"><span className="v2-initial">B</span><span>Candidate B <small>“Good match”</small></span><strong aria-label="Unexplained score">?</strong></div>
          
        </div>
        <div className="v2-contrast-new">
          <div className="v2-contrast-kicker">PARETO&apos;S APPROACH</div>
          <h3>Every criterion has <em>a reason.</em></h3>
          <div className="v2-evidence-line"><CheckCircle size={19} aria-hidden="true"/><span>Java · Spring Boot · AWS</span><b>Present</b></div>
          <div className="v2-evidence-line"><CheckCircle size={19} aria-hidden="true"/><span>Hyderabad · 8 years</span><b>Present</b></div>
          <div className="v2-evidence-line v2-evidence-line--miss"><WarningCircle size={19} aria-hidden="true"/><span>Joining within 30 days</span><b>60-day notice</b></div>
          
        </div>
      </div>
    </div>
  </section>;
}

function HowItWorks() {
  const [step, setStep] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (index: number) => { setStep(index); tabs.current[index]?.focus(); };
  const onKey = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {event.preventDefault(); select((index + 1) % 3);}
    if (event.key === "ArrowLeft") {event.preventDefault(); select((index + 2) % 3);}
    if (event.key === "Home") {event.preventDefault(); select(0);}
    if (event.key === "End") {event.preventDefault(); select(2);}
  };
  return <section className="v2-section v2-how" id="how-it-works">
    <div className="v2-container">
      <div className="v2-section-intro v2-section-intro--center"><Label>HOW IT WORKS</Label><h2>From a hiring brief to <em>a reasoned shortlist.</em></h2><p>Three moments, one continuous workspace. You control when a proposed interpretation becomes a search.</p></div>
      <div className="v2-steps" role="tablist" aria-label="Recruitment search workflow">
        {process.map((item, index) => <button key={item.tab} ref={(node) => {tabs.current[index]=node;}} role="tab" type="button" tabIndex={step === index ? 0 : -1} aria-selected={step === index} aria-controls="v2-process-panel" id={"v2-process-tab-" + index} onClick={() => setStep(index)} onKeyDown={(e) => onKey(e, index)}>
          <span className="v2-step-num">0{index + 1}</span>{item.tab}<ArrowRight size={17} aria-hidden="true"/>
        </button>)}
      </div>
      <div className="v2-process-layout">
        <div className="v2-process-copy" role="tabpanel" id="v2-process-panel" aria-labelledby={"v2-process-tab-" + step} tabIndex={0}>
          <span className="v2-overline">STEP 0{step + 1} OF 03</span>
          <div className="v2-process-icon"><SignalArt variant={step === 0 ? "interpret" : step === 1 ? "review" : "verify"}/></div>
          <h3>{process[step].title}</h3>
          <p>{process[step].body}</p>
          <div className="v2-step-controls">
            <button type="button" onClick={() => setStep((step + 2) % 3)} aria-label="Previous step">←</button>
            <span>0{step + 1} / 03</span>
            <button type="button" onClick={() => setStep((step + 1) % 3)} aria-label="Next step">→</button>
          </div>
        </div>
        <div className="v2-process-window"><WorkspaceFrame state={step === 0 ? "describe" : step === 1 ? "review" : "results"} onConfirm={() => select(2)}/></div>
      </div>
    </div>
  </section>;
}

function CandidateRow({ assessment }: { assessment: CandidateAssessment }) {
  const c = assessment.candidate;
  const status = assessment.status;
  return <article className={"v2-candidate v2-candidate--" + status} data-status={status}>
    <div className="v2-candidate-top">
      <div className="v2-avatar" aria-hidden="true">{c.id}</div>
      <div className="v2-candidate-name"><h3>{c.name}</h3><p>{c.title} · {c.city ?? "Location unknown"}</p><span>{c.years === null ? "Experience unknown" : c.years + " years"} · {c.skills.join(" · ")}</span></div>
      <div className={"v2-candidate-badge v2-candidate-badge--" + status}>{status === "match" ? <CheckCircle size={16} aria-hidden="true" /> : status === "fail" ? <WarningCircle size={16} aria-hidden="true"/> : <Question size={16} aria-hidden="true"/>}{status === "match" ? "Eligible" : status === "fail" ? "Excluded" : "Needs review"}</div>
    </div>
    <div className="v2-reason">{assessment.reason}</div>
    <details className="v2-candidate-details">
      <summary>Inspect {c.name} criteria <CaretDown size={15} aria-hidden="true" /></summary>
      <div className="v2-breakdown">
        {assessment.checks.map((check) => <div className="v2-breakdown-row" key={check.label}>
          <span><b>{check.label}</b><small>{check.expected}</small></span>
          <span className={"v2-check-state v2-check-state--" + check.state}>{check.state === "match" ? "Meets" : check.state === "fail" ? "Misses" : "Unknown"} · {check.actual}</span>
        </div>)}
      </div>
    </details>
  </article>;
}

function Preview() {
  const [notice, setNotice] = useState<30 | 60>(30);
  const assessments = useMemo(() => assessPreview(notice), [notice]);
  const total = useMemo(() => summarizePreview(assessments), [assessments]);
  return <section className="v2-section v2-preview" id="preview">
    <div className="v2-container">
      <div className="v2-section-intro"><Label>INTERACTIVE EVIDENCE</Label><h2>Change one requirement. <em>See what changes.</em></h2><p>Change the joining window from 30 to 60 days to see how each matching decision changes.</p></div>
      <div className="v2-preview-frame" role="region" aria-label="Interactive candidate matching example">
        <div className="v2-preview-sidebar">
          <div className="v2-overline">SEARCH CRITERIA</div>
          <h3>Backend engineers<br/>in Hyderabad</h3>
          <div className="v2-preview-filter"><span>Required skills</span><strong>Java, Spring Boot, AWS</strong></div>
          <div className="v2-preview-filter"><span>Experience</span><strong>6–10 years</strong></div>
          <div className="v2-notice-control">
            <span id="v2-notice-label">Maximum joining notice</span>
            <div role="group" aria-labelledby="v2-notice-label" className="v2-segmented">
              <button type="button" aria-pressed={notice === 30} onClick={() => setNotice(30)}>30 days</button>
              <button type="button" aria-pressed={notice === 60} onClick={() => setNotice(60)}>60 days</button>
            </div>
          </div>
          
          <div className="v2-preview-key"><span>✓ Eligible</span><span>! Excluded</span><span>? Needs review</span></div>
        </div>
        <div className="v2-preview-content">
          <div className="v2-preview-heading"><div><div className="v2-overline">EXPLAINABLE RESULTS</div><h3>What the evidence says.</h3></div><span className="v2-example-tag">EXAMPLE PROFILES</span></div>
          <div className="v2-count-bar" role="status" aria-live="polite" aria-atomic="true">
            <span><strong data-testid="eligible-count">{total.eligible}</strong><small>Eligible</small></span>
            <span><strong>{total.excluded}</strong><small>Excluded</small></span>
            <span><strong>{total.needsReview}</strong><small>Needs review</small></span>
            <p>Joining window: <b>{notice} days</b></p>
          </div>
          <div className="v2-candidates">{assessments.map((item) => <CandidateRow key={item.candidate.id} assessment={item}/>)}</div>
          
        </div>
      </div>
    </div>
  </section>;
}

const comparable = previewCandidates[0];
function Similarity() {
  const others = previewCandidates.slice(1);
  return <section className="v2-section v2-similar" id="similar">
    <div className="v2-container">
      <div className="v2-section-intro"><Label>REFERENCE-BASED DISCOVERY</Label><h2>Found someone promising? <em>Find others like them.</em></h2><p>Use a reference profile to identify people with comparable skills, experience and location.</p></div>
      <div className="v2-similar-board">
        <div className="v2-source-person">
          <div className="v2-overline">REFERENCE PROFILE</div>
          <div className="v2-source-identity"><span className="v2-source-avatar">A</span><div><h3>{comparable.name}</h3><p>{comparable.title}</p></div></div>
          <div className="v2-source-divider"/>
          <div className="v2-source-meta"><span>LOCATION</span><strong>{comparable.city}</strong></div>
          <div className="v2-source-meta"><span>EXPERIENCE</span><strong>{comparable.years} years</strong></div>
          <div className="v2-source-meta"><span>SKILL SET</span><div>{comparable.skills.map((skill) => <Chip key={skill} strong>{skill}</Chip>)}</div></div>
          <div className="v2-source-footer"><SignalArt variant="interpret"/><span>Reference attributes provide a starting point for human review.</span></div>
        </div>
        <div className="v2-similar-compare">
          <div className="v2-similar-board-heading"><span className="v2-overline">COMPARABLE PROFILES</span></div>
          {others.map((candidate) => {
            const common = candidate.skills.filter((skill) => comparable.skills.some((item) => item.toLowerCase() === skill.toLowerCase()));
            const experienceGap = candidate.years === null || comparable.years === null ? null : Math.abs(candidate.years - comparable.years);
            return <div className="v2-comparison" key={candidate.id}>
              <div className="v2-comparison-head"><span className="v2-avatar">{candidate.id}</span><div><h3>{candidate.name}</h3><p>{candidate.title}</p></div></div>
              <div className="v2-comparison-grid"><span>Shared skills <b>{common.join(" · ") || "None documented"}</b></span><span>Experience <b>{experienceGap === null ? "Unknown" : experienceGap === 0 ? "Same tenure" : experienceGap + (experienceGap === 1 ? " year apart" : " years apart")}</b></span><span>Location <b>{candidate.city === null ? "Unknown" : candidate.city === comparable.city ? "Same city" : candidate.city}</b></span><span>Notice period <b>{candidate.notice === null ? "Unknown · needs review" : candidate.notice + " days"}</b></span></div>
            </div>;
          })}
          
        </div>
      </div>
    </div>
  </section>;
}

const faqs = [
  ["Does an unknown notice period count as a match?", "No. Unknown values are marked Needs review unless another known required criterion already fails. Missing evidence must never be treated as eligibility."],
  ["Does the public preview search a real candidate database?", "No. This preview uses fictional candidate profiles to explain the matching approach. Live candidate search requires a signed-in account."],
  ["Can recruiters change the criteria before searching?", "Yes. Recruiters review and confirm the interpreted requirements before searching. The walkthrough shows the steps."],
  ["How does reference-based discovery work?", "It compares skills, experience, location and other meaningful attributes to highlight similarities and differences."],
];

function Trust() {
  return <section className="v2-section v2-trust" id="trust">
    <div className="v2-container">
      <div className="v2-section-intro"><Label>CONFIDENCE THROUGH CLARITY</Label><h2>Human-confirmed. <em>Evidence-backed.</em></h2><p>Useful AI should make decisions easier to examine, not harder to question.</p></div>
      <div className="v2-trust-grid">
        {[
          ["01", "Interpret", "AI proposes a structured reading of the hiring brief.", "interpret"],
          ["02", "Confirm", "A recruiter reviews and approves requirements before retrieval.", "review"],
          ["03", "Explain", "Each criterion is visibly met, missed or unknown.", "verify"],
        ].map(([number, title, desc, variant]) => <article key={title} className="v2-trust-item">
          <div className="v2-trust-num">{number}<SignalArt variant={variant as "interpret" | "review" | "verify"}/></div>
          <h3>{title}</h3><p>{desc}</p>
        </article>)}
      </div>
      <div className="v2-faq">
        <div><Label>QUESTIONS, ANSWERED</Label><h3>Nothing hidden in <em>the fine print.</em></h3></div>
        <div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<CaretDown size={19} aria-hidden="true"/></summary><p>{answer}</p></details>)}</div>
      </div>
    </div>
  </section>;
}

function Footer() {
  return <>
    <section className="v2-close" id="get-started">
      <div className="v2-container v2-close-inner">
        <div className="v2-close-art" aria-hidden="true"><SignalArt variant="verify"/></div>
        <Label>MORE CLARITY. BETTER SEARCH.</Label>
        <h2>Search with <em>clarity.</em></h2>
        <p>Start with a brief. Keep the reasoning visible.</p>
        <Link className="v2-btn v2-btn--primary" href="/signup">Start searching <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
    </section>
    <footer className="v2-footer"><div className="v2-container v2-footer-inner"><Logo/><p>Recruitment intelligence, with reasons.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#preview">Explore matching</a><Link href="/login">Log in</Link></nav><span>© 2026 Pareto · std::zero</span></div></footer>
  </>;
}

export default function HomepageV2({ fontClasses = "" }: { fontClasses?: string }) {
  return <div className={"v2-page " + fontClasses}>
    <a href="#v2-main" className="v2-skip">Skip to content</a>
    <Header/>
    <main id="v2-main">
      <section className="v2-hero" aria-labelledby="v2-hero-title">
        <div className="v2-container v2-hero-copy">
          <Label>INTELLIGENT CANDIDATE DISCOVERY</Label>
          <h1 id="v2-hero-title">Find the right people.<br/><em>Understand every match.</em></h1>
          <p>Describe who you&apos;re looking for. Review your criteria. Discover candidates backed by clear evidence.</p>
          <div className="v2-hero-actions"><Link className="v2-btn v2-btn--primary" href="/signup">Start searching <ArrowUpRight size={18} aria-hidden="true" /></Link><a className="v2-btn v2-btn--secondary" href="#how-it-works">See how it works <ArrowRight size={18} aria-hidden="true" /></a></div>
        </div>
        <div className="v2-container v2-hero-stage">
          
          <WorkspaceFrame state="hero"/>
          
        </div>
      </section>
      <Problem/>
      <HowItWorks/>
      <Preview/>
      <Similarity/>
      <Trust/>
    </main>
    <Footer/>
  </div>;
}
