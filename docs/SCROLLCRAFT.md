# Pareto — Scrollcraft Creative Brief & Motion Score

> **Working spec:** 14 November 2026 IST · **Status:** frontend implementation committed, **build/browser verification pending**.  
> **Source:** [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft), [original SKILL.md](https://github.com/nateherkai/scroll-craft/blob/main/plugins/nateherk-design/skills/scroll-craft/SKILL.md), MIT licensed.  
> **Visual authority:** [DESIGN.md](DESIGN.md), which is grounded in the private OpenTag public-site clone.  
> **Scope:** Public Pareto homepage and related entry screens. **Do not apply dramatic scroll choreography inside the candidate-search working dashboard**.

## 1. What we actually adopted

**Scrollcraft is not Framer Motion.** It is a structured creative process **and** a standalone vanilla-JS scroll engine. For Pareto, we adopted its creative and verification principles and built a **small Next.js/React-native motion layer** instead of importing the large standalone engine. This avoids introducing a second global DOM owner into the React application and preserves our existing Tailwind/Next.js app structure. **The original Scrollcraft engine is not installed or vendored in this implementation.**

The relevant principles taken directly from the skill and its references are:
- Design a **visitor journey and feeling curve before choosing scroll effects**.
- Build a **dimensional hero** with distinguishable visual planes and a readable static fallback.
- Vary motion devices by narrative purpose; avoid identical fades in six adjacent sections.
- Create **one memorable bespoke move**, not a gimmick applied to every card.
- Preserve semantic HTML, real actions, mobile composition, reduced-motion and explicit verification.
- Keep a truthful product demonstration: compute from visible/declared sample data instead of fake dashboard screenshots.

## 2. Source-based brief and authored decisions

The user explicitly requested: use the **OpenTag clone's visual language**, adopt **Scrollcraft** to make a **premium, demoable landing**, target **recruiters**, and keep landing → signup/login → dashboard. Other choices below are **design decisions made for this first engineering iteration**, *not invented user quotes or an eight-question interview*.

| Brief topic | Working answer / provenance |
| --- | --- |
| Vibe | **[Authored]** Editorial, measured, intelligent, dimensional, trustworthy |
| Sources | **[User]** \`ThunderKhan/opentag-clone\`; \`nateherkai/scroll-craft\` |
| Journey | **[Authored]** Recognition → tension → interpretation → agency → measured proof → commitment |
| Energy | **[Authored]** Calm hero; lighter problem exposition; focused dark scroll peak; interactive proof; quiet closing CTA |
| Emotional peak | **[Authored]** “I changed the notice requirement, and the eligible count actually changed—but unknown stayed unknown.” |
| Signature move | **[Authored]** Live three-candidate what-if comparison computed in React with one-click 30/60-day notice |
| Aesthetic range | **[Authored]** Restrained editorial with a working-product demonstration; no neon/cinematic overload |
| World structure | **[Authored]** Distinct scenes and hard transition into the narrative peak; not a continuous camera flight |
| Available assets | **[Observed]** Existing design tokens and UI patterns, but no legally cleared photo/video assets in Pareto. Use original CSS/HTML visual surfaces; no unlicensed mascot or photography |
| Customer belief | **[Authored]** A recruitment search can be inspectable, steerable, and explainable |
| One CTA | **[User intent + authored label]** Get started → \`/signup\` |

## 3. Bespoke page grammar

**Grammar:** *Evidence-led product tour*, intentionally authored for Pareto rather than copying the Scrollcraft demo template. This has aspects of an editorial product story and a live working preview, but **does not claim conformance with any one of Scrollcraft's eight predefined, mutually exclusive grammars**. Its own hard rules are:

- The **public marketing chrome stays standard**: wordmark, navigation, signup CTA, no camera controls.
- No video scrub, autoplay hero movie, pointer-lock, pseudo-3D clay objects, or heavy WebGL.
- The evidence interaction has to compute live from explicit synthetic data and **identify itself as a preview**.
- At most one sticky narrative stage; motion should not block a recruiter from reading.
- No animation inside the authenticated search workflow may override or obscure the mandatory **Confirm Search** control.
- One color system, as defined by OpenTag-derived \`DESIGN.md\`. Do not adopt Scrollcraft template's charcoal/lime palette.

This is a documented, reasoned adaptation, **not a claim of full formal Scrollcraft-workflow completion**.

## 4. Visitor journey and feeling curve

| Beat | Feeling before effect | Visitor learns | Device | Code target |
| --- | --- | --- | --- | --- |
| 1. Recognition | Curiosity and relevance | The product turns natural-language hiring briefs into inspectable rules | **Layered hero**: independent orbit, query console, evidence card planes | \`HeroScene\`, CSS \`--hero-progress\` |
| 2. Tension | Reflective discomfort | A list alone hides trade-offs and missing values | **Quiet editorial flow** and spacious three-part argument | \`approach-section\` |
| 3. Clarity | Understanding | Recruiter sees steps from proposed criteria to confirmation and reasons | **Sticky narrative** with explicit stages and controlled panel emphasis | \`narrative\`, \`--narrative-progress\` |
| 4. Agency / peak | Control and discovery | Changing one condition adjusts actual counts; unknown is still unknown | **Bespoke interactive what-if control**, 30 vs 60 days, pure computations | \`InteractivePreview\` |
| 5. Confidence | Competence and trust | Explainability and human control are product principles | **Horizontal rule / evidence ledger** with restrained reveal | \`principles-section\` |
| 6. Commitment | Calm readiness | Single next step is creating an account | **Simple resolved CTA** in a darker section | \`landing-close\` |

**Tell-someone sentence:** *It's the recruitment site where changing the joining window changes the actual candidate outcome while unknown data stays visibly unresolved.*

**Peak:** Beat 4. All other sections frame the interactive example rather than competing for attention.

## 5. Hero layer contract

| Plane | Content | Motion | Accessibility / contact rule |
| --- | --- | --- | --- |
| Ground | Soft off-white and blue-tinted grid wash | Fixed, no copy occlusion | Always legible without JS |
| Far | Two faint elliptical orbit rings | Slow independent CSS travel with \`--hero-progress\` | Decorative only, hidden from accessibility tree |
| Subject | Original search-composer visual | Restrained \`rotate\` and vertical translation | Synthetic example label; no fake backend calls |
| Foreground | Explanation/evidence card | Opposing, smaller parallax | Never covers primary CTA/headline |
| Atmosphere | Subtle gradients and drop shadows | Mostly static | No photos/copyrighted assets |
| Copy / actions | Semantic headline, description, real signup and anchor links | Static | Screen-reader readable and usable with reduced motion |

The hero's visual panels are **illustrative**, not actionable production search controls; the real, actionable miniature lives in Beat 4. The mobile version drops parallax transforms and changes the card stack to keep copy and cards readable.

## 6. The bespoke honest preview

We use three declared synthetic profiles (A, B, C), each with matching Java/Spring Boot/AWS skills, Hyderabad location and 6–10-year experience. Notice periods:

- A = **15 days** → eligible at 30 or 60.
- B = **60 days** → fails at 30; eligible at 60.
- C = **null** → needs review at both thresholds.

Counts are computed by \`c.notice !== null && c.notice <= notice\`. **No LLM, database or network is involved.** The preview labels this explicitly and uses distinct matched/failed/unknown status text. It must never be presented as the completed PS1 search engine.

## 7. Existing implementation and boundaries

| File | Current responsibility |
| --- | --- |
| \`frontend/src/components/marketing/scroll-landing.tsx\` | Layered hero, step narrative, synthetic what-if, navigation |
| \`frontend/src/app/globals.css\` | OpenTag-mapped tokens, CSS composition, responsive and reduced-motion |
| \`frontend/src/app/page.tsx\` | Page metadata and marketing entry |
| \`frontend/src/components/auth/auth-form.tsx\` | Real Supabase APIs when configured; otherwise explicit unavailable state |
| \`frontend/src/app/{signup,login}/page.tsx\` | Signup/login destinations |
| \`frontend/src/app/dashboard/\` | Protected shell and honest search-in-progress placeholder |
| \`frontend/tests/e2e/smoke.spec.ts\` | Proposed browser tests for routes, mobile, synthetic match logic |

**Not implemented:** Gemini/Groq criteria extraction, real candidate records, organizer-required search confirmation, reference search and inference, private imports, visual screenshot comparison, running deployment.

**Current blocker:** The agent test container could not resolve \`github.com\`, so it could not clone the repository and execute pnpm/Playwright. The GitHub API accepted the commits and file content was re-fetched, but **no green build, browser screenshot or runtime claim is justified**.

## 8. Verification and next engineering actions

1. Clone fresh on a local machine with network access and install using Node 22.18+ / pnpm 10.
2. Run \`pnpm install\`, \`pnpm lint\`, \`pnpm typecheck\`, \`pnpm test\`, \`pnpm build\`, then \`pnpm test:e2e\` once Playwright Chromium is available.
3. Capture screenshots at initial hero, middle of sticky narrative, interactive example, bottom CTA at **390×844**, **768px**, **1440×1000**, **1920px**, plus reduced motion. Inspect actual pixels, not only the final scroll location.
4. Verify no horizontal overflow or header/content overlap; verify keyboard focus and tab interactions; test with JS reduced/disabled where possible.
5. Confirm auth provider configuration and OAuth callback before calling signup/login functional. Password recovery remains a future integration, visibly labeled.
6. Fix any observed bugs and log the **actual** commands, outputs and screenshots.
7. After the marketing gate, return to **P0-ORG** search features. The skill is not permission to delay the organizer's functionality.

### Attribution

Source skill © 2026 Nate Herk, MIT licensed: [repository](https://github.com/nateherkai/scroll-craft), [license](https://github.com/nateherkai/scroll-craft/blob/main/LICENSE). The implementation above does **not** vendor the Scrollcraft JS/CSS engine and instead uses custom React/CSS adapted from the skill's design principles. No OpenTag proprietary font, mascot or customer asset has been copied.

## 9. Marketing-focused refinement — `feat/frontend-experience`

This isolated frontend iteration preserves the existing OpenTag-inspired layout and Scrollcraft-inspired devices rather than replacing the page, importing the engine, or editing shared `globals.css`.

### Changes to the verified design

- **Six explicit workflow stages:** Describe → Extract → Review → Retrieve → Explain → Refine. The existing three-stage sticky narrative now uses the same six stages for direct keyboard/touch selection and desktop scroll progression.
- **Connected manual stage selection:** selecting a stage on desktop moves the scroll timeline to that stage; on mobile and reduced-motion layouts, stage buttons update the visible explanation without forcing scroll.
- **Truthful product preview:** a pure `preview-data.ts` evaluator checks the sample records for location, experience, individual skills and maximum notice period. It returns explicit matched, failed and unknown states, derives every counter from assessments and exposes a per-candidate expandable evidence breakdown. It never invokes APIs or implies that mock data is an actual applicant.
- **Original visual treatment retained:** warm `#FFFDF9` canvas, deep `#020E24` primary ink, editorial serif, Inter fallbacks, fine strokes and restrained layered hero. New presentation rules live only in `frontend/src/components/marketing/marketing.css`, leaving Worker 1's protected dashboard and shared CSS untouched.
- **Interaction/accessibility:** 44px mobile menu hit area, Escape restoration of keyboard focus, outside-click dismissal, status announcements scoped to candidate summary, semantic native disclosure for evidence, and responsive layouts for 320/390/768/1440/1920 widths.
- **Reduced motion:** the long pinned timeline collapses to a normal-flow stage with manual navigation instead of leaving hundreds of viewport pixels of dead scroll.

### QA and evidence boundary

`frontend/tests/e2e/marketing-experience.spec.ts` defines Playwright checks for navigation/routes, synthetic state changes and criterion details, reduced motion, menu keyboard operation, browser errors, horizontal overflow, and screenshots at five viewport widths plus intermediate story scroll positions.

**Tests are authored, not yet executed in this environment.** The execution container has no external DNS access, Next.js dependencies, or Playwright runtime; GitHub Actions in this repository are manual-only. No screenshots of the running Pareto app have been produced here. Integration must run `pnpm install`, `pnpm check`, `pnpm build` and `pnpm test:e2e` in an environment with dependencies/Chromium before approving the PR. Inspect any emitted screenshots before describing the result as visually verified.

### Cross-worker contract

These files do not import search domain services and do not touch auth, API handlers, dashboard search or database models. Worker 1 should keep this marketing preview separate from production candidate search; candidate statuses in the preview are an illustration, not a schema or production policy contract. Reference-based search is presented as a problem-scope workflow, not claimed as an implemented feature by this branch.
