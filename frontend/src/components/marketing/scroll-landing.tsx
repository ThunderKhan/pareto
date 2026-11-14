"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { assessPreview, summarizePreview, type CandidateAssessment } from "./preview-data";
import "./marketing.css";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  Code,
  Compass,
  Funnel,
  List,
  MagnifyingGlass,
  Question,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

const story = [
  { eyebrow: "01 / DESCRIBE", title: "Start with a hiring question.", copy: "Write your brief in plain language instead of translating it into a dozen rigid filters." },
  { eyebrow: "02 / EXTRACT", title: "Make assumptions visible.", copy: "Role, skills, location, experience and joining time become structured, editable criteria." },
  { eyebrow: "03 / REVIEW", title: "Keep the human in control.", copy: "Correct what the assistant inferred. Confirm the final criteria before searching candidate records." },
  { eyebrow: "04 / RETRIEVE", title: "Search against attributes.", copy: "The confirmed brief is applied to candidate records. Missing information remains missing evidence." },
  { eyebrow: "05 / EXPLAIN", title: "See reasons, not just ranks.", copy: "Read the criterion-by-criterion breakdown for each match, near miss and unknown." },
  { eyebrow: "06 / REFINE", title: "Change the request, not the workflow.", copy: "Refine your active search conversationally, or use a reference profile to explore similar talent." },
] as const;

function useScrollDirection() {
  const heroRef = useRef<HTMLElement | null>(null);
  const narrativeRef = useRef<HTMLElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.documentElement.classList.add("motion-ready");
    const animated = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
    );
    animated.forEach((el) => revealObserver.observe(el));

    let frame = 0;
    const update = () => {
      frame = 0;
      if (prefersReducedMotion.matches) return;
      const hero = heroRef.current;
      if (hero) {
        const bounds = hero.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, bounds.height)));
        hero.style.setProperty("--hero-progress", progress.toFixed(3));
      }
      const narrative = narrativeRef.current;
      if (narrative && window.innerWidth >= 768) {
        const box = narrative.getBoundingClientRect();
        const travel = Math.max(1, box.height - window.innerHeight);
        const progress = Math.max(0, Math.min(0.999, -box.top / travel));
        narrative.style.setProperty("--narrative-progress", progress.toFixed(3));
        setActiveStep(Math.min(story.length - 1, Math.floor(progress * story.length)));
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      document.documentElement.classList.remove("motion-ready");
      revealObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const selectStep = (step: number) => {
    setActiveStep(step);
    const narrative = narrativeRef.current;
    // Align the pinned story timeline with an explicitly selected stage.
    if (narrative && window.innerWidth >= 768 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const travel = Math.max(0, narrative.offsetHeight - window.innerHeight);
      window.scrollTo({
        top: window.scrollY + narrative.getBoundingClientRect().top + travel * ((step + 0.5) / story.length),
        behavior: "auto",
      });
    }
  };
  return { heroRef, narrativeRef, activeStep, selectStep };
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <a href="/" className={"brand-mark " + (light ? "brand-mark--light" : "")} aria-label="Pareto home">
      <span className="brand-glyph" aria-hidden="true"><i /><i /><i /></span>
      <span>pareto<span className="brand-period">.</span></span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  return (
    <header ref={headerRef} className="site-header">
      <div className="site-header__inner container-wide">
        <Brand />
        <nav className="nav-desktop" aria-label="Main navigation">
          <a href="#approach">How it works</a>
          <a href="#evidence">Why Pareto</a>
          <a href="#preview">Explore the product</a>
        </nav>
        <div className="nav-actions">
          <a className="nav-login" href="/login">Log in</a>
          <a className="button button--dark nav-cta" href="/signup">Get started <ArrowUpRight size={17} weight="bold" aria-hidden="true" /></a>
          <button
            ref={toggleRef}
            className="menu-toggle"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-controls="mobile-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={23} /> : <List size={23} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation">
          <a href="#approach" onClick={() => setOpen(false)}>How it works</a>
          <a href="#evidence" onClick={() => setOpen(false)}>Why Pareto</a>
          <a href="#preview" onClick={() => setOpen(false)}>Explore the product</a>
          <a href="/login" onClick={() => setOpen(false)}>Log in</a>
          <a className="mobile-navigation__primary" href="/signup" onClick={() => setOpen(false)}>Get started <ArrowRight size={18} /></a>
        </nav>
      )}
    </header>
  );
}

function EvidenceCard() {
  return (
    <div className="hero-scene__evidence" aria-hidden="true">
      <div className="hero-scene__tiny-head"><span className="status-dot status-dot--green" /> SYNTHETIC EVIDENCE</div>
      <div className="evidence-lines"><CheckCircle size={15} weight="fill" /> Java · Spring Boot · AWS <b>In sample</b></div>
      <div className="evidence-lines"><CheckCircle size={15} weight="fill" /> Hyderabad · 7 years <b>In sample</b></div>
      <div className="evidence-lines evidence-lines--review"><Question size={15} weight="fill" /> Joining availability <b>Unknown</b></div>
      <div className="evidence-trace">Nothing missing is treated as a match.</div>
    </div>
  );
}

function HeroScene() {
  return (
    <div className="hero-scene" aria-label="Illustrative product search interface built with synthetic examples">
      <div className="hero-scene__orbit hero-scene__orbit--back" aria-hidden="true" />
      <div className="hero-scene__orbit hero-scene__orbit--front" aria-hidden="true" />
      <div className="hero-scene__side-tag hero-scene__side-tag--top" aria-hidden="true">SOURCE → SIGNAL</div>
      <div className="hero-scene__side-tag hero-scene__side-tag--bottom" aria-hidden="true">INTELLIGENCE / WITH EVIDENCE</div>
      <div className="hero-console">
        <div className="hero-console__top">
          <span><span className="hero-console__logo">p.</span> Search workspace</span>
          <span className="hero-console__indicator"><span /> Draft</span>
        </div>
        <div className="hero-console__body">
          <div className="hero-console__caption">DESCRIBE YOUR IDEAL CANDIDATE</div>
          <div className="hero-console__query">
            Find <strong>Java backend engineers</strong> in Hyderabad, 6–10 years of experience, with Spring Boot and AWS. Joining within 30 days.
          </div>
          <div className="hero-console__divider"><span>PROPOSED SEARCH CRITERIA</span><SlidersHorizontal size={14} /></div>
          <div className="hero-console__chips">
            <span>Java <Check size={12} weight="bold" /></span>
            <span>Spring Boot <Check size={12} weight="bold" /></span>
            <span>AWS <Check size={12} weight="bold" /></span>
            <span>Hyderabad</span>
            <span>6–10 years</span>
            <span>≤30 days</span>
          </div>
          <div className="hero-console__bottom">
            <span><ShieldCheck size={15} weight="fill" /> Recruiter review required</span>
            <a className="hero-console__fake-button" href="#preview" aria-label="Explore the illustrative search preview">Explore preview <ArrowRight size={13} /></a>
          </div>
        </div>
      </div>
      <EvidenceCard />
      <div className="hero-scene__note" aria-hidden="true"><span className="hero-scene__note-icon"><Sparkle size={18} weight="fill" /></span><span>Structured, not guessed.<small>Every filter can be inspected.</small></span></div>
    </div>
  );
}

function ResultRow({ assessment }: { assessment: CandidateAssessment }) {
  const { candidate: profile, status, reason, checks } = assessment;
  const Icon = status === "match" ? CheckCircle : status === "fail" ? WarningCircle : Question;
  return (
    <article className={"demo-result demo-result--" + status} data-status={status}>
      <div className="demo-result__avatar" aria-hidden="true">{profile.id}</div>
      <div className="demo-result__body">
        <div className="demo-result__topline">
          <div className="demo-result__identity">
            <strong>{profile.name}</strong>
            <span>{profile.title} · {profile.city ?? "Location not supplied"}</span>
            <small>{profile.years === null ? "Experience not supplied" : `${profile.years} years`} · {profile.skills.join(", ")}</small>
          </div>
          <div className={"demo-result__state demo-result__state--" + status}>
            <span><Icon size={15} weight="fill" aria-hidden="true" />{status === "match" ? "Eligible" : status === "fail" ? "Does not match" : "Needs review"}</span>
            <small>{profile.notice === null ? "Notice period unknown" : profile.notice + "-day notice"}</small>
          </div>
        </div>
        <p className="demo-result__reason">{reason}</p>
        <details className="demo-result__details">
          <summary>View criterion breakdown</summary>
          <ul>
            {checks.map((check) => (
              <li key={check.label}>
                <span>{check.label}<small>{check.expected}</small></span>
                <span className={"criterion-state criterion-state--" + check.state}>
                  {check.state === "match" ? "Meets" : check.state === "fail" ? "Misses" : "Unknown"} · {check.actual}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}

function InteractivePreview() {
  const [notice, setNotice] = useState<30 | 60>(30);
  const assessments = useMemo(() => assessPreview(notice), [notice]);
  const summary = useMemo(() => summarizePreview(assessments), [assessments]);
  return (
    <div className="preview-panel" role="region" aria-label="Interactive synthetic candidate matching example">
      <div className="preview-panel__toolbar">
        <div><span className="preview-panel__status-dot" /> PARETO / SEARCH EXPLORER</div>
        <span>INTERACTIVE PREVIEW · SYNTHETIC DATA</span>
      </div>
      <div className="preview-panel__main">
        <div className="preview-panel__aside">
          <div className="preview-panel__aside-title">Active search</div>
          <p>Backend engineers in Hyderabad</p>
          <div className="preview-panel__filter"><Code size={17} aria-hidden="true" /> Java · Spring Boot · AWS</div>
          <div className="preview-panel__filter"><SlidersHorizontal size={17} aria-hidden="true" /> 6–10 years experience</div>
          <div className="preview-panel__control">
            <div className="preview-panel__control-label" id="notice-label">Maximum joining notice</div>
            <div className="preview-panel__switch" role="group" aria-labelledby="notice-label">
              <button type="button" aria-pressed={notice === 30} onClick={() => setNotice(30)}>30 days</button>
              <button type="button" aria-pressed={notice === 60} onClick={() => setNotice(60)}>60 days</button>
            </div>
            <small>Change one requirement to inspect the difference. All values come from the three records below.</small>
          </div>
          <div className="preview-panel__legend">
            <span><span className="legend-dot legend-dot--match" />Eligible</span>
            <span><span className="legend-dot legend-dot--fail" />Excluded</span>
            <span><span className="legend-dot legend-dot--unknown" />Needs review</span>
          </div>
        </div>
        <div className="preview-panel__results">
          <div className="preview-panel__summary" role="status" aria-live="polite" aria-atomic="true">
            <div><span>ELIGIBLE PROFILES</span><strong data-testid="eligible-count">{summary.eligible}<span> / {summary.total}</span></strong></div>
            <p>{summary.excluded} excluded · {summary.needsReview} need{summary.needsReview === 1 ? "s" : ""} review. Joining window: {notice} days.</p>
          </div>
          <div className="preview-panel__result-list">
            {assessments.map((assessment) => <ResultRow key={assessment.candidate.id} assessment={assessment} />)}
          </div>
          <p className="preview-panel__caution"><ShieldCheck size={15} aria-hidden="true" /> Unknown evidence never becomes an automatic match. This is a local demonstration, not a live candidate search.</p>
        </div>
      </div>
    </div>
  );
}

export default function ScrollLanding() {
  const { heroRef, narrativeRef, activeStep, selectStep } = useScrollDirection();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main id="main-content">
        <section className="landing-hero" ref={heroRef}>
          <div className="landing-hero__mesh" aria-hidden="true" />
          <div className="landing-hero__inner container-wide">
            <div className="landing-hero__copy">
              <div className="eyebrow"><span className="eyebrow__line" /> RECRUITMENT, WITH REASONS</div>
              <h1>Find the right talent.<br /><em>Know why.</em></h1>
              <p className="landing-hero__lede">Turn a hiring brief into a search you can inspect, refine, and trust. Every candidate comes with the evidence behind the match.</p>
              <div className="landing-hero__actions">
                <a className="button button--dark button--large" href="/signup">Get started <ArrowUpRight size={18} weight="bold" /></a>
                <a className="text-link" href="#approach">See how it works <ArrowRight size={18} /></a>
              </div>
              <div className="landing-hero__fineprint"><span className="hero-tiny-dot" /> A human confirms every search. An algorithm explains every result.</div>
            </div>
            <HeroScene />
          </div>
          <div className="landing-hero__index container-wide"><span>01 — THE NEW SEARCH EXPERIENCE</span><a href="#approach">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a></div>
        </section>

        <div className="value-ribbon" aria-label="The Pareto workflow">
          <div className="value-ribbon__inner container-wide"><span>UNDERSTAND INTENT</span><span className="value-ribbon__plus">+</span><span>CONFIRM CRITERIA</span><span className="value-ribbon__plus">+</span><span>EXPLAIN THE MATCH</span></div>
        </div>

        <section className="approach-section container-wide" id="approach">
          <div className="section-intro" data-reveal>
            <p className="eyebrow">THE PROBLEM WITH SEARCH</p>
            <h2>A list is easy.<br /><em>An answer is harder.</em></h2>
            <p>Recruitment searches are rarely just a list of keywords. They involve trade-offs, missing information and decisions a recruiter should be able to defend.</p>
          </div>
          <div className="approach-cards">
            <article className="approach-card" data-reveal><div className="approach-card__number">01 /</div><MagnifyingGlass size={28} weight="light" /><h3>Describe what matters.</h3><p>Write a hiring brief in natural language. Turn it into structured, editable criteria before retrieving candidates.</p><div className="approach-card__rule" /></article>
            <article className="approach-card" data-reveal><div className="approach-card__number">02 /</div><Funnel size={28} weight="light" /><h3>Review every constraint.</h3><p>Keep essential requirements separate from preferences. Nothing runs until you confirm the interpretation.</p><div className="approach-card__rule" /></article>
            <article className="approach-card" data-reveal><div className="approach-card__number">03 /</div><Compass size={28} weight="light" /><h3>Explore the near misses.</h3><p>Understand why a profile falls short, which details are unknown and how changing a condition affects the pool.</p><div className="approach-card__rule" /></article>
          </div>
        </section>

        <section className="narrative" id="evidence" ref={narrativeRef} aria-label="Six stages of explainable candidate search">
          <div className="narrative__sticky">
            <div className="narrative__inner container-wide">
              <div className="narrative__text" aria-live="off">
                <span className="narrative__micro">THE RECRUITMENT WORKFLOW</span>
                <div className="narrative__steps" role="group" aria-label="Workflow stages">
                  {story.map((s, i) => <button key={s.eyebrow} type="button" className={i === activeStep ? "is-active" : ""} aria-current={i === activeStep ? "step" : undefined} aria-label={s.eyebrow + ": " + s.title} onClick={() => selectStep(i)}>{String(i + 1).padStart(2, "0")}</button>)}
                </div>
                <p className="narrative__eyebrow" key={story[activeStep].eyebrow}>{story[activeStep].eyebrow}</p>
                <h2 key={story[activeStep].title}>{story[activeStep].title}</h2>
                <p key={story[activeStep].copy}>{story[activeStep].copy}</p>
                <a className="narrative__link" href="#preview">Explore the example <ArrowUpRight size={18} /></a>
              </div>
              <div className="narrative__art">
                <span className="narrative__art-label">SEARCH LOGIC / AT A GLANCE</span>
                <div className="narrative__art-card">
                  <div className="narrative__art-head"><span><span className="art-beacon" /> Candidate criteria</span><span>v 01</span></div>
                  {[
                    ["Required skill", "Java, Spring Boot, AWS"],
                    ["Experience", "6–10 years"],
                    ["Location", "Hyderabad"],
                    ["Joining", "≤ 30 days"],
                  ].map(([key, value], i) => <div className={"narrative__art-row " + (activeStep >= 2 && i === 3 ? "is-emphasized" : "")} key={key}><span>{key}</span><strong>{value}</strong><Check size={16} weight="bold" /></div>)}
                  <div className="narrative__art-foot">{[
                      "A brief begins in natural language",
                      "The assistant proposes editable criteria",
                      "Recruiter confirms the final constraints",
                      "Confirmed criteria are applied to records",
                      "Each criterion has a visible outcome",
                      "Search context is ready for refinement",
                    ][activeStep]} <ArrowRight size={16} /></div>
                </div>
                <div className="narrative__art-corner" aria-hidden="true">P / 03</div>
              </div>
            </div>
            <div className="narrative__progress" aria-hidden="true"><span /></div>
          </div>
        </section>

        <section className="preview-section" id="preview">
          <div className="preview-section__inner container-wide">
            <div className="preview-section__head" data-reveal>
              <div><p className="eyebrow">THE DIFFERENCE IS IN THE DETAILS</p><h2>When constraints change,<br /><em>the answer changes.</em></h2></div>
              <p>Explore a small, fully transparent example. A 30-day notice requirement excludes one otherwise qualified sample profile; see exactly what changes when the window grows to 60 days.</p>
            </div>
            <div data-reveal><InteractivePreview /></div>
            <p className="preview-section__disclaimer">This is a locally calculated illustration using three synthetic records; it is not connected to live recruitment data or the production matching service.</p>
          </div>
        </section>

        <section className="principles-section container-wide">
          <div className="principles-section__heading" data-reveal><p className="eyebrow">BUILT FOR DECISIONS</p><h2>Less black box.<br /><em>More clarity.</em></h2></div>
          <div className="principles-section__rows">
            <div className="principle-row" data-reveal><span>01</span><h3>Explainable by design</h3><p>Required criteria, preferences and missing information have distinct outcomes.</p><ArrowUpRight size={22} /></div>
            <div className="principle-row" data-reveal><span>02</span><h3>Human-confirmed search</h3><p>You can correct the model&apos;s understanding before any results are returned.</p><ArrowUpRight size={22} /></div>
            <div className="principle-row" data-reveal><span>03</span><h3>Iteration without starting over</h3><p>Refine a search over multiple turns while preserving the context you already established.</p><ArrowUpRight size={22} /></div>
            <div className="principle-row" data-reveal><span>04</span><h3>Explore similar talent</h3><p>Start with a reference profile to discover candidates with comparable experience and skills. This is a product workflow, not part of the synthetic preview above.</p><ArrowUpRight size={22} /></div>
          </div>
        </section>

        <section className="landing-close">
          <div className="landing-close__ring landing-close__ring--one" aria-hidden="true" />
          <div className="landing-close__ring landing-close__ring--two" aria-hidden="true" />
          <div className="landing-close__inner container-wide" data-reveal>
            <p className="landing-close__eyebrow">RECRUITMENT INTELLIGENCE, WITH INTENT</p>
            <h2>Find better answers.<br /><em>Make better decisions.</em></h2>
            <p>Start with a brief. Stay for the reasoning.</p>
            <a className="button button--light button--large" href="/signup">Get started <ArrowUpRight size={18} weight="bold" /></a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container-wide site-footer__inner">
          <Brand />
          <span>Built to make candidate search more transparent.</span>
          <div><a href="#approach">How it works</a><a href="/login">Log in</a><span>© 2026 Pareto</span></div>
        </div>
      </footer>
    </>
  );
}
