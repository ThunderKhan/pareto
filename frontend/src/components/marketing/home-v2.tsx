"use client";

import { useId, useRef, useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Check, CheckCircle, CaretDown,
  List, MagnifyingGlass, ShieldCheck, SlidersHorizontal, WarningCircle,
  X,
} from "@phosphor-icons/react";
import { assessPreview, previewCandidates } from "./preview-data";
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
          <a href="#similar">Explore matching</a>
          <a href="#trust">Why Pareto</a>
        </nav>
        <div className="v2-header-actions">
          <Link className="v2-login" href="/login">Login</Link>
          <Link className="v2-btn v2-btn--primary v2-header-cta" href="/signup">Get started free</Link>
          <button ref={menuButton} className="v2-menu-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="v2-mobile-nav" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={22} aria-hidden="true" /> : <List size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && <nav className="v2-mobile-nav" id="v2-mobile-nav" aria-label="Mobile navigation">
        <a href="#problem" onClick={() => setOpen(false)}>The problem</a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        <a href="#similar" onClick={() => setOpen(false)}>Explore matching</a>
        <a href="#trust" onClick={() => setOpen(false)}>Why Pareto</a>
        <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
        <Link href="/signup" className="v2-mobile-primary" onClick={() => setOpen(false)}>Get started free</Link>
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
  return <section className="v2-section v2-how" id="how-it-works">
    <div className="v2-container">
      <div className="v2-section-intro v2-section-intro--center">
        <Label>HOW IT WORKS</Label>
        <h2>From a hiring brief to <em className="v2-how-accent">a reasoned shortlist.</em></h2>
        <p>Three moments, one continuous workspace. You control when a proposed interpretation becomes a search.</p>
      </div>
      <div className="v2-story">
        {process.map((item, index) => <article
          className={"v2-story-row" + (index === 1 ? " v2-story-row--reverse" : "")}
          id={"how-it-works-step-" + (index + 1)}
          key={item.tab}
          aria-labelledby={"v2-story-title-" + (index + 1)}
        >
          <div className="v2-story-copy">
            <h3 id={"v2-story-title-" + (index + 1)}>{item.title}</h3>
            <p>{item.body}</p>
          </div>
          <div className="v2-story-media" aria-label={item.tab + " recruitment workspace"}>
            <WorkspaceFrame
              state={index === 0 ? "describe" : index === 1 ? "review" : "results"}
              onConfirm={index === 1 ? () => document.getElementById("how-it-works-step-3")?.scrollIntoView({ block: "start" }) : undefined}
            />
          </div>
        </article>)}
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
  ["Are the candidate profiles shown on this page real?", "No. The walkthrough and reference-based discovery examples use fictional profiles. Live candidate search requires a signed-in recruiter account."],
  ["Can recruiters change the criteria before searching?", "Yes. Recruiters review and confirm the interpreted requirements before searching. The walkthrough shows the steps."],
  ["How does reference-based discovery work?", "It compares skills, experience, location and other meaningful attributes to highlight similarities and differences."],
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <li className="v2-faq-item">
    <h3>
      <button type="button" id={id + "-question"} className="v2-faq-question"
        aria-expanded={expanded} aria-controls={id + "-answer"}
        onClick={() => setExpanded(value => !value)}>
        <span>{question}</span>
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true"
          className="v2-faq-plus">
          <path d="M4 10H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M10 4V16" className="v2-faq-plus-vertical" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </h3>
    <div id={id + "-answer"} className={"v2-faq-answer" + (expanded ? " v2-faq-answer--open" : "")}
      role="region" aria-labelledby={id + "-question"} aria-hidden={!expanded}>
      <div className="v2-faq-answer-inner"><p>{answer}</p></div>
    </div>
  </li>;
}

function FAQ() {
  return <section id="faq" className="v2-faq" aria-labelledby="v2-faq-title">
    <div className="v2-faq-container">
      <h2 id="v2-faq-title">Frequently asked questions</h2>
      <ul className="v2-faq-list">
        {faqs.map(([question, answer]) => <FAQItem key={question} question={question} answer={answer}/>)}
      </ul>
    </div>
  </section>;
}

const trustSteps = [
  {
    title: "Interpret the brief",
    description: "Pareto turns a natural-language hiring brief into structured requirements, ready for a recruiter to inspect.",
    icon: "/icons/delegate-62cfd1852df1e0.svg",
    state: "describe",
  },
  {
    title: "Review before searching",
    description: "Check the proposed role, skills, experience and joining window. A recruiter confirms what matters before searching.",
    icon: "/icons/review-d37a7fa1d5ec05.svg",
    state: "review",
  },
  {
    title: "Explain every result",
    description: "Understand which criteria are met, missed or still unknown, instead of relying on an unexplained score.",
    icon: "/icons/automate-516705627f4d66.svg",
    state: "results",
  },
  {
    title: "Keep searches protected",
    description: "Candidate retrieval belongs in the signed-in recruiter workspace, not in a public homepage demo.",
    icon: "/icons/protect-1226f5f4def480.svg",
    state: "access",
  },
] as const;

function TrustDemo({ step }: { step: number }) {
  const state = trustSteps[step]?.state ?? "describe";
  if (state === "access") {
    return <div className="v2-trust-access" aria-label="Protected recruiter workspace">
      <div className="v2-trust-access-bar"><span className="v2-workspace-mini-icon">p.</span><strong>pareto</strong><span>Recruiter workspace</span></div>
      <div className="v2-trust-access-content">
        <div className="v2-trust-access-icon"><ShieldCheck size={34} weight="regular" aria-hidden="true"/></div>
        <p className="v2-window-overline">RECRUITER ACCESS</p>
        <h3>Search in your workspace.</h3>
        <p>Sign in to access protected candidate search. Public examples on this page do not retrieve live profiles.</p>
        <Link href="/login" className="v2-trust-access-link">Log in to Pareto <ArrowRight size={16} aria-hidden="true"/></Link>
      </div>
    </div>;
  }
  return <WorkspaceFrame state={state}/>;
}

function Trust() {
  const [activeStep, setActiveStep] = useState(0);
  const stepsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileTrack = useRef<HTMLDivElement | null>(null);
  const [mobileStep, setMobileStep] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    let observer: IntersectionObserver | undefined;
    let animationFrame: number | null = null;

    // IntersectionObserver thresholds alone can miss a step that stays partially
    // visible while being centered. The scroll handler keeps the active demo
    // synchronized with the viewport's reading position in that case.
    const syncActiveStep = () => {
      if (!media.matches || animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        const timeline = stepsRef.current[0]?.closest(".v2-trust-timeline");
        if (!timeline) return;
        const section = timeline.getBoundingClientRect();
        if (section.bottom < 0 || section.top > window.innerHeight) return;
        const line = window.innerHeight * .44;
        let nearest = -1;
        let closest = Infinity;
        stepsRef.current.forEach((node, index) => {
          if (!node) return;
          const rect = node.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height / 2 - line);
          if (distance < closest) { closest = distance; nearest = index; }
        });
        if (nearest !== -1) setActiveStep(current => current === nearest ? current : nearest);
      });
    };

    const observe = () => {
      observer?.disconnect();
      if (!media.matches) return;
      if (typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(syncActiveStep,
          { rootMargin: "-20% 0px -35% 0px", threshold: .25 });
        stepsRef.current.forEach(node => { if (node) observer?.observe(node); });
      }
      syncActiveStep();
    };
    observe();
    window.addEventListener("scroll", syncActiveStep, { passive: true });
    window.addEventListener("resize", syncActiveStep);
    media.addEventListener("change", observe);
    return () => {
      observer?.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", syncActiveStep);
      window.removeEventListener("resize", syncActiveStep);
      media.removeEventListener("change", observe);
    };
  }, []);

  const chooseStep = (index: number) => {
    setActiveStep(index);
    const target = stepsRef.current[index];
    if (target) target.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  const chooseMobileStep = (index: number) => {
    setMobileStep(index);
    const track = mobileTrack.current;
    const child = track?.children.item(index) as HTMLElement | null;
    if (track && child) track.scrollTo({
      left: child.offsetLeft - (track.children.item(0) as HTMLElement).offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return <section className="v2-section v2-trust" id="trust" aria-labelledby="v2-trust-title">
    <div className="v2-container">
      <div className="v2-trust-heading">
        <Label>WHY PARETO</Label>
        <h2 id="v2-trust-title">Why Pareto works</h2>
      </div>
      <div className="v2-trust-timeline">
        <ol className="v2-trust-steps" aria-label="Why Pareto works steps">
          {trustSteps.map((item, index) => <li key={item.title} className="v2-trust-step">
            <div className="v2-trust-step-rail">
              <Image className="v2-trust-step-icon" src={item.icon} alt="" width={40} height={40} aria-hidden="true" unoptimized />
              {index < trustSteps.length - 1 && <span className="v2-trust-connector" aria-hidden="true"/>}
            </div>
            <button
              type="button"
              ref={node => { stepsRef.current[index] = node; }}
              className="v2-trust-step-button"
              aria-current={activeStep === index ? "step" : undefined}
              aria-controls="v2-trust-demo"
              onClick={() => chooseStep(index)}
            >
              <span className="v2-trust-step-title">{item.title}</span>
              <span className="v2-trust-step-description">{item.description}</span>
            </button>
          </li>)}
        </ol>
        <div className="v2-trust-demo-column">
          <div className="v2-trust-demo-sticky">
            <div id="v2-trust-demo" className="v2-trust-demo" role="region" aria-label="Selected Pareto workflow example" aria-live="polite">
              <TrustDemo step={activeStep}/>
            </div>
          </div>
        </div>
      </div>
      <div className="v2-trust-mobile" aria-label="Why Pareto works on mobile">
        <div ref={mobileTrack} className="v2-trust-mobile-track" role="group" aria-roledescription="carousel"
          aria-label="Pareto capabilities" onScroll={(event) => {
            const track = event.currentTarget;
            const first = track.children.item(0) as HTMLElement | null;
            const second = track.children.item(1) as HTMLElement | null;
            if (!first || !second) return;
            const distance = second.offsetLeft - first.offsetLeft;
            if (distance > 0) setMobileStep(Math.max(0, Math.min(trustSteps.length - 1, Math.round(track.scrollLeft / distance))));
          }}>
          {trustSteps.map((item, index) => <article key={item.title} className="v2-trust-mobile-card"
            role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${trustSteps.length}: ${item.title}`}>
            <Image src={item.icon} width={40} height={40} alt="" aria-hidden="true" unoptimized/>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="v2-trust-mobile-preview"><TrustDemo step={index}/></div>
          </article>)}
        </div>
        <div className="v2-trust-mobile-dots" role="group" aria-label="Choose a capability">
          {trustSteps.map((item, index) => <button key={item.title} type="button"
            aria-label={`Show ${item.title}`} aria-current={mobileStep === index ? "true" : undefined}
            onClick={() => chooseMobileStep(index)}/>)}
        </div>
      </div>
    </div>
  </section>;
}


function Footer() {
  return <>
    <section className="v2-close" id="get-started" aria-labelledby="v2-close-title">
      <div className="v2-container v2-close-inner">
        <Image
          src="/mascot/pareto-mascot.svg"
          alt="Pareto mascot waving and holding a candidate profile"
          width={240}
          height={225}
          className="v2-close-mascot"
          unoptimized
        />
        <h2 id="v2-close-title">Turn hiring briefs into matches</h2>
        <p>Describe who you need in plain English. Review the criteria, then discover candidates with a reason behind every match.</p>
        <div className="v2-close-actions">
          <a className="v2-btn v2-btn--secondary" href="#how-it-works">See how it works</a>
          <Link className="v2-btn v2-btn--primary" href="/signup">Start searching</Link>
        </div>
      </div>
    </section>
    <footer className="v2-footer"><div className="v2-container v2-footer-inner"><Logo/><p>Recruitment intelligence, with reasons.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#similar">Explore matching</a><Link href="/login">Log in</Link></nav><span>© 2026 Pareto · std::zero</span></div></footer>
  </>;
}

export default function HomepageV2({ fontClasses = "" }: { fontClasses?: string }) {
  return <div className={"v2-page " + fontClasses}>
    <a href="#v2-main" className="v2-skip">Skip to content</a>
    <Header/>
    <main id="v2-main">
      <section className="v2-hero" aria-labelledby="v2-hero-title">
        <div className="v2-container v2-hero-copy">
          <h1 id="v2-hero-title">Find the right people.<br/><em>Understand <span className="v2-hero-accent">every match.</span></em></h1>
          <p>Describe who you&apos;re looking for. Review your criteria. Discover candidates backed by clear evidence.</p>
          <div className="v2-hero-proof" aria-label="Pareto capabilities">
            <span className="v2-hero-proof-item"><MagnifyingGlass size={17} aria-hidden="true" />Natural-language search</span>
            <span className="v2-hero-proof-divider" aria-hidden="true" />
            <span className="v2-hero-proof-item"><ShieldCheck size={17} aria-hidden="true" />Evidence-backed matching</span>
          </div>
          <div className="v2-hero-actions"><a className="v2-btn v2-btn--secondary" href="#how-it-works">See how it works</a><Link className="v2-btn v2-btn--primary" href="/signup">Get started free</Link></div>
        </div>
        <div className="v2-container v2-hero-stage">
          
          <WorkspaceFrame state="hero"/>
          
        </div>
      </section>
      <Problem/>
      <HowItWorks/>
      <Similarity/>
      <Trust/>
      <FAQ/>
    </main>
    <Footer/>
  </div>;
}
