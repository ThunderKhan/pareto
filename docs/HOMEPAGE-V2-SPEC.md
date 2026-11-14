# Pareto — Homepage V2 Creative and Implementation Specification

**Status:** Proposed design brief; not an implemented or visually verified page.
**Scope:** Only the public `/` homepage in the Next.js app. Preserve authentication, candidate-search application routes, APIs, database models, deployment files, and the verified integration release candidate.
**Team:** std::zero | **Product:** Pareto | **Deadline:** November 15, 2026, 5:00 PM IST.

## 1. Visual ambition

A premium editorial SaaS homepage with an immediately legible, believable recruitment-search interface. Use the measured OpenTag design system and its restrained, warm layout discipline. Borrow the product-led sequencing of Attio and Cursor, the purposeful interactive detail of Raycast, and the clear section-by-section framing of Vercel. This is not a direct copy of any competitor's brand or artwork.

**Reference websites:**
- OpenTag: https://www.tryopentag.com/; private editable reference: https://github.com/ThunderKhan/opentag-clone
- Attio: https://attio.com/
- Cursor: https://cursor.com/
- Raycast: https://www.raycast.com/
- Vercel: https://vercel.com/

**Primary visual requirements:** warm ivory canvas, near-black/navy ink, ample breathing room, subtle warm borders, editorial serif display treatment, compact clear UI type, tiny disciplined shadows, purposeful animations. Do not use generic glass cards, gradient blobs, tilted dashboard composites, orbit rings, gratuitous glows, or decorative AI sparkles.

## 2. Design-system source precedence

The user provided TWO OpenTag-related documents. Preserve both original texts verbatim:
1. Detailed measured reference (657 lines) → `docs/DESIGN.md` (canonical for measured source values and layout/typography behavior).
2. Concise semantic reference (222 lines) → `docs/DESIGN-OPENTAG-SUPPLEMENT.md` (semantic component palette and additional intended usage).

Before replacing the repository's existing `docs/DESIGN.md`, retain its existing content at `docs/DESIGN-LEGACY.md`. Write a compact `docs/DESIGN-DECISIONS.md` for explicit conflicts and implementation exceptions. For example: canvas #FFFDF9 versus lighter secondary surface #F7F5EF, semantic light border #E7E1D8 versus dark measured hairline #3C3C3C, and unlicensed `stkEarlRegular` font. Never silently copy copyrighted OpenTag font files, graphics, logos, mascots, product icons or Slack screenshots. Use a legally distributable, editorial serif alternative unless a valid license for that font exists. Keep real WCAG contrast and accessibility above literal measured values when they conflict.

## 3. Page structure and copy

### 01 — Hero + real-looking product stage
- **Eyebrow:** INTELLIGENT CANDIDATE DISCOVERY
- **Headline:** Find the right people. Understand every match.
- **Supporting copy:** Describe who you're looking for. Review your criteria. Discover candidates backed by clear evidence.
- **Primary CTA:** Start searching → `/signup` (or appropriate existing authenticated route if actually supported).
- **Secondary:** See how it works → `#how-it-works`.
- **Product-stage graphic:** A large, front-facing, recognizable Pareto recruiter workspace, centered under the hero. The scene uses authentic source-inspired UI patterns, not a tilted fake dashboard: search input, explicitly proposed filters, review-and-confirm stage, match evidence. Clearly label all public records as synthetic. A tiny original decorative brand illustration may accompany the demo but must not obscure the product.

### 02 — The problem
- **Headline:** Hiring is more than a list of filters.
- Show a compact contrast: a brittle rigid search/opaque score beside Pareto's editable requirements and named evidence. No invented user studies, conversion rates, or claims of superior measured accuracy.

### 03 — How it works
- **Headline:** From a hiring brief to a reasoned shortlist.
- Three focused stages: `Describe` → `Review & confirm` → `Discover & explain`. Each stage is represented by a visually related state of the SAME product window, with user-controlled tabs and optional scroll synchronization. Nothing should depend on animation to be understandable.

### 04 — Interactive evidence preview
- **Headline:** Change one requirement. See what changes.
- Accessible 30/60-day notice control grounded in a known synthetic fixture set. Display recalculated eligible / needs-review / ineligible outcomes and criterion-level evidence, derived from the exact same deterministic preview model. Do not imply this public demo is querying the protected database.

### 05 — Reference-based discovery
- **Headline:** Found someone promising? Find others like them.
- Source candidate profile alongside two compared synthetic profiles, with similarities and unknown attributes explicitly represented. Keep the relationship to the real protected search flow truthful; this is a preview until actual authorization.

### 06 — Trust and FAQ
- **Headline:** Human-confirmed. Evidence-backed.
- Explain what LLM interpretation does, why a recruiter reviews before retrieval, how MATCH / FAIL / UNKNOWN work, and what is synthetic. FAQ should answer real product questions, including whether unknown information automatically counts as a match (no).

### 07 — Final CTA and footer
- **Headline:** Search with clarity.
- Single prominent signup CTA, concise footer navigation, original Pareto mark. No fabricated customer logos, fictional endorsements, meaningless claims, pricing tiers, or unrelated features.

## 4. Graphic direction

Priority A: Rebuild hero/product scenes as accessible React/CSS with reusable components, not full-page screenshots. All text should remain sharp, selectable, and responsive. Design at 1440 first, then deliberately adapt 390 and 320. Avoid stacking 3 floating dashboards in the hero.

Priority B: Make two or three original vector micro-illustrations with a consistent Pareto-specific geometry (e.g., a folded paper / lens / evidence motif). They should express `interpret`, `review`, and `verify`. They MUST NOT duplicate OpenTag's starburst mascots, expressions, proportions, or clothing. Favor clean source SVG and CSS transitions; optionally use a licensed image generation/vector workflow for original artwork.

Priority C: Add subtle motion: query terms highlight, structured criteria enter sequentially, the explicit confirmation state appears, then evidence rows reveal. Ensure the public interactive preview remains manually operable, deterministic and clearly synthetic. Honor reduced-motion; no scroll trapping or long autoplay sequences.

## 5. Technical boundaries

- Work on `feat/homepage-v2`, forked from the current `integration/release-20261114` head, not old `main`.
- Owned files: `frontend/src/app/page.tsx`, dedicated marketing components and CSS, tests for `/`, and the new design/reference documents.
- Do NOT edit auth/dashboard/search workspace, backend, Prisma, secrets, Docker, CI, Railway, or organizer repo.
- Existing release candidate remains available as rollback.
- Use React components instead of importing the OpenTag clone's 1.7MB CSS or 579KB homepage HTML. Build only selected reusable patterns.

## 6. Verification and approval gate

- Show screenshot(s) at 1440×900, 390×844 and 320×700, including hero and representative intermediate states.
- Confirm product typography legible and interaction clear at normal browser zoom; no horizontal overflow.
- Check navigation/CTA routes; keyboard focus, accessible labels, reduced motion, mobile menu.
- Run lint/typecheck, production build, Playwright visual/behavioral regressions; disclose any skipped checks.
- Review with user BEFORE merging into integration/release or `main`.
- If time threatens submission, keep prior verified homepage as fallback. Do not block required code freeze for decorative polish.