# Pareto — Product Experience & Design System

> **Document:** `docs/DESIGN.md` · **Version:** 1.0 · **Date:** 14 November 2026 (IST)  
> **Status:** Approved design direction and implementation specification; The marketing landing and entry screens now have an **unverified implementation**; real search/backend and screenshot-fidelity validation remain pending.  
> **Design source:** Private [ThunderKhan/opentag-clone](https://github.com/ThunderKhan/opentag-clone), branch `main`, inspected source tree `adb6ba9ad135386e2800bd3ac0ef4999e6ac240d`.  
> **Product references:** [MVP.md](MVP.md), [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), [IMPLEMENTATION.md](IMPLEMENTATION.md).  
> **Governing principle:** The **visual language** is based on the inspected OpenTag public-site clone. The **product content, logo, wording, user journeys, and private dashboard** belong to Pareto and must be designed for its recruitment problem.

## 1. Overview — design intent, provenance, and guardrails

### 1.1 Desired experience

Pareto should look and feel like a restrained, precise, editorial software product: **warm off-white surfaces, deep navy typography, generous layout breathing room, elegant serif display headings, exceptionally clear sans-serif working text, subtle borders, low-noise motion, and deliberate dark CTA buttons**. This is **not** the earlier dark navy placeholder aesthetic.

The user has selected the OpenTag public-site clone as the **primary UI reference**. Aim for high fidelity in page spacing, navigation proportions, typography hierarchy, button shape, responsive behavior, visual rhythm, and understated micro-interactions. Carry this visual grammar into new product surfaces rather than transplant unrelated OpenTag content or features.

**Confidence/source labels used throughout:**
- **[VERIFIED FROM CLONE]**: literal CSS or page-source value, or a statement in the clone's inspection documentation.
- **[PARETO ADAPTATION]**: a deliberate new design decision not evidenced by the clone—especially auth and dashboard.
- **[VALIDATE IN BROWSER]**: must be checked visually before claiming pixel-level fidelity. No live browser screenshot comparison of the new Pareto app has yet been performed.

### 1.2 What the reference actually includes

The clone recreates **175 public OpenTag website routes** and contains editable static HTML, source-preserved presentation CSS, independently implemented interaction JS, local assets, research notes and desktop/mobile comparison screenshots. It is **not** a clone of the private SaaS product. Sign-up and sign-in buttons in the reference link to external OpenTag account services; there are **no private application dashboard or authenticated account screens to study**.

| Reference area | Grounded source file | What we reuse conceptually |
| --- | --- | --- |
| Brand/navigation proportions, CTA design | `src/components/header.html` | Header structure, high-contrast actions, responsiveness |
| Homepage hero, section sequencing, rich demo | `src/pages/home.html` | Editorial hero, visual storytelling, progressive sections |
| Color variables, type scales, radii, breakpoints, motion | `src/styles/reference.css` | Normative reference tokens, not a stylesheet to paste wholesale |
| Hover/menu/dialog and reduced-motion treatment | `src/styles/app.css` | Accessible interaction conventions |
| Documentation sidebar + search layout | `src/pages/docs.html` | Inspiration for a compact **Pareto-specific** dashboard shell |
| Interaction conventions | `src/app.js` | Keyboard handling, tabs, search and menu behaviors |
| Research screenshots and testing evidence | `docs/research/INSPECTION.md` and `docs/research/screenshots/` | Reference viewports and fidelity checklist |
| Public routes / limitations | `README.md` and `docs/research/ROUTES.md` | Confirm what is and is not included in source |

**Important IP and security boundary:** OpenTag's trademarks, mascot, illustration files, photography, customer logos, copy and any proprietary fonts remain their owners' materials. **Do not copy them into Pareto or publish the private clone.** Create original Pareto graphics/copy and only use a font if its license permits reuse in this project. Use legally licensed/open-source lookalikes where necessary. Fidelity is to the **layout system and interaction language**, not impersonation of OpenTag.

## 2. Colors

### 2.1 Primary palette — extracted from reference CSS

These values are literal variables from `src/styles/reference.css` and are the **reference baseline**.

| Reference token | Verified value | Function in Pareto |
| --- | --- | --- |
| `--ot-page` | `#FFFDF9` | Primary marketing/page canvas |
| `--ot-ink` | `#020E24` | Headings, strongest text, primary CTA background |
| `--ot-body` | `#4E4E4E` | Supporting body text |
| `--ot-muted` | `#7A7A7A` (desktop override `#6B6B6B`) | Secondary hints and metadata; check contrast |
| `--ot-fill` | `#10101014` | Soft control fill over page/background |
| `--ot-fill-hover` | `#10101021` | Hover fill |
| `--ot-hairline` | `#020E240F` | Subtle strokes |
| `--ot-rule` | `#020E2414` | Dividers |
| `--ot-divider` | `#020E2426` | Stronger separators |
| `--ot-star` | `#429DFC` | Small blue accents, diagrams and focus accents where accessible |
| `--ot-navy` | `#052169` | Supporting navy accent |

**Additional observed surfaces:** `#F7F4ED` appears on a documentation subnav; `#F4EFE6` appears in active/pressed local controls; white `#FFFFFF` appears in dialogs and cards. These are contextual, not substitutes for the primary canvas.

### 2.2 Pareto semantic tokens — implementation-facing

Use **semantic names**, so shadcn/ui and Tailwind share one source of truth rather than hard-coded color values across pages.

```css
/* [PARETO ADAPTATION] Map reference colors into app semantics. */
:root {
  --pareto-canvas: #fffdf9;
  --pareto-surface: #ffffff;
  --pareto-surface-subtle: #f7f4ed;
  --pareto-ink: #020e24;
  --pareto-body: #4e4e4e;
  --pareto-muted: #6b6b6b;
  --pareto-border-subtle: #020e240f;
  --pareto-border: #020e2414;
  --pareto-border-strong: #020e2426;
  --pareto-accent: #429dfc;
  --pareto-navy: #052169;
  --pareto-control-fill: #10101014;
  --pareto-control-hover: #10101021;
  --pareto-focus: #052169;
}
```

### 2.3 Status colors — Pareto-specific, not OpenTag values

Search results require **semantic evidence states**, not decorative score coloring. These are **proposed** and must pass contrast checks in actual components:

| Status | Proposed ink / surface | Label requirement |
| --- | --- | --- |
| Matched / Eligible | `#166534` / `#F0FDF4` | Always spell out “Matched” / “Eligible” |
| Failed / Ineligible | `#991B1B` / `#FEF2F2` | Always spell out reason and failing criterion |
| Unknown / Needs review | `#92400E` / `#FFFBEB` | Never imply absence is a pass or failure |
| Informational / Preferred | `#052169` / `#EFF6FF` | Clearly distinguish preference from hard eligibility |

Color alone must **never** encode eligibility, evidence status or confirmation.

## 3. Typography

### 3.1 Families

- **[VERIFIED FROM CLONE]** STK Earl (regular/medium) is used for expressive display headings; **Inter** is the dominant interface and body family. **Lato** appears within Slack demonstration content in the original clone, not general layout. JetBrains Mono/Geist Mono also appear among available font variables.
- **[PARETO ADAPTATION]** Use STK Earl **only if a valid redistribution/web license is confirmed**. Otherwise choose a licensed/open-source serif with comparably elegant editorial rhythm (for example, **Instrument Serif** or another approved alternative), then match size, tracking and line-height visually. Use properly licensed **Inter** for UI/body.
- The typography contrast is intentional: **serif for marketing/storytelling; Inter sans-serif for application controls, explanations, tables and form text**. Do not typeset candidate result tables in decorative serif.

### 3.2 Reference scale (verified CSS)

| Role | CSS evidence | Use in Pareto |
| --- | --- | --- |
| Homepage `v2 display` | `clamp(2.5rem, (100vw - 2*inset)/16, 4.5rem)`, line-height `1` | Hero heading |
| Editorial `v2 H2` | `clamp(2.125rem, 1.4rem + 2.6vw, 3.75rem)`, line-height `1.02` | Landing section headings |
| `ot-display` | `clamp(2.5rem, 1.95rem + 2.2vw, 4rem)`, weight `500`, line-height `1.2` | Other editorial headers |
| `ot-h1` | `clamp(2.375rem, 1.957rem + 1.7143vw, 3.5rem)`, line-height `1.1` | Large page titles |
| `ot-h2` | `clamp(2rem, 1.814rem + .7619vw, 2.5rem)`, line-height `1.1` | Section headers |
| `ot-h3` | `clamp(1.5rem, 1.407rem + .381vw, 1.75rem)`, line-height `1.2` | Feature/callout headers |
| `ot-h4` | `1.375rem`, line-height `1.32` | Small editorial headings |
| `ot-body-lg` | `1.125rem/1.75rem` | Lead description |
| `ot-body` | `1rem/1.5rem` | Normal body text |
| `ot-body-sm` | `0.875rem/1.25rem` | Detail copy |
| `ot-label` | `0.875rem/1.25rem`, weight 500 | Labels |
| `ot-label-button` | `1rem/1.375rem`, weight 500 | Button labels |

Reference letter spacing: editorial `-0.03em`; Inter utility/body commonly `-0.04em`. Preserve carefully, but **[PARETO ADAPTATION]** for dense data tables prefer normal or slightly reduced negative tracking to protect legibility. The clone defines reduced mobile sizes for some editorial classes.

### 3.3 Dashboard typography extension

- Dashboard page title: Inter or restrained serif, **24–32px** depending on density.
- Section headings: Inter 18–20px semibold.
- Form/candidate body: Inter 14–16px; minimum 16px for mobile inputs to avoid unwanted zoom.
- Metadata: Inter 12–14px with contrast check.
- Numeric counters: Inter tabular numerals; do not use decorative large-number marketing type inside evidence rows.
- Code, IDs, logs: monospace only where technically meaningful.

These dashboard sizes are **new Pareto decisions**, because OpenTag's private app screens are not included in the clone.

## 4. Layout, grid and spacing

### 4.1 Reference canvas and responsive grid

**[VERIFIED FROM CLONE]** The CSS uses:

```css
:root {
  --ot-inset: 24px;
  --site-header-height: 66px;
}
@media (min-width: 640px) {
  :root { --ot-inset: 32px; --site-header-height: 65px; }
}
@media (min-width: 1024px) {
  :root {
    --ot-inset: clamp(48px, 8.6111vw, 124px);
    --site-header-height: 91px;
  }
}
```

The outer `max-w-ot-page` is **90rem (1440px)**, but the 1440px viewport has **124px gutters per side**, leaving **1192px usable content width** (as also recorded in the clone's inspection notes). Do **not** confuse outer container width with interior text width.

- **Desktop ≥1024px:** 91px main header, fluid gutters up to 124px.
- **Tablet 640–1023px:** 65px header, 32px gutters.
- **Mobile <640px:** 66px header, 24px gutters.
- Homepage hero top padding in source: **76px mobile**, **96px small**, **128px medium+**.
- Public-site body composition: centered, generous vertical sections and carefully controlled text measure.
- Document layout provides a **232px** left-hand navigation column at desktop with a wider right content region; this is useful precedent for Pareto's dashboard extension.

### 4.2 Working spacing scale

**[PARETO ADAPTATION]** Use the clone's Tailwind-like **4px base rhythm**; express production design as tokens rather than copying arbitrary bracketed class values everywhere.

| Token | Pixels | Usage |
| --- | ---: | --- |
| `space-1` | 4 | Tiny icon/text corrections |
| `space-2` | 8 | Icon labels, compact controls |
| `space-3` | 12 | List rows, small control gaps |
| `space-4` | 16 | Basic row/card gaps |
| `space-5` | 20 | Compact card padding |
| `space-6` | 24 | Default page gutters/mobile and panel padding |
| `space-8` | 32 | Section gaps and tablet gutters |
| `space-10` | 40 | Feature-group spacing |
| `space-12` | 48 | Page-section spacing |
| `space-16` | 64 | Large interior sections |
| `space-20` | 80 | Prominent editorial spacing |
| `space-24` | 96 | Marketing section spacing |
| `space-32` | 128 | Large hero breathing room |

### 4.3 Dashboard grid — Pareto adaptation

The source public website **does not specify an authenticated app shell**. Derive a pragmatic and consistent working layout:

- Large desktop: **220–240px sidebar** (232px as initial target), flexible main pane with 24–32px inner padding, optional 320–380px details drawer for candidate evidence.
- Compact desktop/tablet: sidebar collapses; main content remains readable; details become full-screen sheet/overlay if necessary.
- Mobile: single-column search/results flow, no permanent sidebar, touch-sized controls, horizontal filters only when accessible.
- Keep the landing page's large editorial gutters **on public pages**; the app dashboard intentionally has denser information architecture.
- No sideways scroll for entire page at **390px**, **768px**, **1440px**, and **1920px**. Constrained comparison tables may scroll inside labeled containers.

## 5. Elevation, depth, borders and surfaces

### 5.1 From the reference

- Subtle hairlines (nav dividers and card outlines), warm/off-white canvas, minimal opaque shadows.
- Reference homepage declares a `--ui-shadow` stack approximately **0 0 0 .5px rgba(0,0,0,.18), 0 1px 2px rgba(0,0,0,.05), 0 12px 28px -14px rgba(0,0,0,.22)** and a lighter `--card-lift` for selected cards.
- The clone's local dialog styles use a softer elevated white surface and darkened/blurred backdrop. Avoid applying high-elevation shadows indiscriminately.

### 5.2 Pareto surface hierarchy

1. Page canvas: `#FFFDF9`.
2. Working panel/card: white or very slightly warm, 1px subtle border.
3. Nested/recessed information: `#F7F4ED` with low-contrast separators.
4. Active overlay/dialog: white, moderate shadow, dim backdrop.
5. Primary CTA: solid navy with white text.

Use shadows for **floating** objects (menus/sheets), not for every content card. Evidence tables should favor hairlines and spacing over faux depth.

## 6. Shapes, controls and iconography

### 6.1 Verified reference shapes

- `.rounded-ot`: **12px**.
- Header primary and secondary buttons: about **42px high** from source classes (mobile variant 38–40px); desktop text roughly 16px, horizontal padding 20px.
- Other observed radii include 8px menu button, 10px search field, 20px local consent card and dialogs. This is a *small scale of intentional variants*, not one global radius for every surface.

### 6.2 Pareto component decisions

- Primary button: dark ink / white label, 42–44px height, 12px radius, consistent keyboard focus outline.
- Secondary button: soft-fill / ink label, same dimensions; avoid flat low-contrast disabled text.
- Input/search prompt: high legibility, 44–48px minimum tap height, 10–12px radius, visible label and validation/error state.
- Chips: compact required/preferred/editable filters, avoid using color only to convey priority.
- Candidate card: simple white surface, 1px rule, 12–16px radius; structured fact rows and evidence preview.
- Dialog/sheet: accessible keyboard focus management; explicit confirmation/cancel.
- Navigation: responsive; `aria-current` on active route and obvious sign-in CTA.

**Icons:** **Phosphor Icons** (`@phosphor-icons/react`) for Pareto. The clone contains inline SVG/Remix-style icons in some public pages; the selected icon library is a conscious consistency adaptation. **Do not use Lucide as the default.** Match icon weight, size (typically 16/20px), optical alignment and subdued treatment.

## 7. Motion and interaction guidelines

### 7.1 Observed reference motion

- The homepage includes an entrance `settle` animation: **900ms**, easing **`cubic-bezier(0.22,1,0.36,1)`**, starting approximately **14px lower**, **4px blur** and zero opacity. It respects `prefers-reduced-motion`.
- Common button hover/color changes use about **150–200ms** transitions.
- The public clone includes sophisticated mascot/collage and staged demo animations, automatically rotating tabs, and step changes tied to scroll. Those specific branded animations are **not** portable recruitment functionality.
- The independent interaction code includes accessible FAQ toggles, tabs, menu dismissal, documentation search keyboard shortcuts and mobile navigation.

### 7.2 Pareto motion scale

**[PARETO ADAPTATION]** Restrained motion, with performance and reduced-motion safeguards:

| Interaction | Duration | Treatment |
| --- | --- | --- |
| Button hover/focus | 150–200ms | Color/border, no layout jump |
| Menu/popover/sheet | 180–240ms | Small fade/translate, no jarring overshoot |
| Confirmation/diff appearance | 200–280ms | Gentle emphasis; preserve text visibility |
| Landing editorial sections | ≤900ms when intentional | Source-like settle, not on every scroll/element |
| Result loading | As long as operation takes | Accessible status/skeleton, no misleading perpetual animation |
| Diagnostic graph changes | 250–350ms | Restrained fade/size transition; values stay legible |

Respect `prefers-reduced-motion: reduce` by disabling nonessential entrance/parallax/autoplay and minimizing transitions. Avoid autoplaying a candidate-results carousel or animating match percentages as if measured evidence is changing.

## 8. Navigation, route map and end-to-end product experience

The route system below is **new Pareto product scope**. The clone only defines public-marketing routes.

### 8.1 Primary route architecture

| Route | Visibility | Purpose | Priority |
| --- | --- | --- | --- |
| `/` | Public | OpenTag-style, Pareto-branded landing page and conversion |
| `/login` | Public / redirect if signed in | Email/password + Google sign-in |
| `/signup` | Public / redirect if signed in | New account registration + Google signup |
| `/auth/callback` | Auth flow only | Supabase OAuth code/PKCE exchange; safe redirect |
| `/forgot-password`, `/reset-password` | Public token flows | Recover sign-in access |
| `/dashboard` | Protected | Orientation/home of recruitment workspace |
| `/dashboard/search` | Protected | **P0-ORG:** prompt, draft criteria, confirm, results and refinement |
| `/dashboard/search/[id]` | Protected | Saved active search and revisions |
| `/dashboard/candidates` | Protected | Candidate list and reference candidate selection |
| `/dashboard/candidates/[id]` | Protected | Candidate evidence detail and “Find Similar” |
| `/dashboard/imports` | Protected P1 | Private resume uploads and status |
| `/dashboard/settings` | Protected P1 | Profile and account settings |

**Public landing CTA → `/signup`**; secondary **Log in → `/login`**. Successful auth → `/dashboard`, or a validated return-to route if the recruiter was redirected from a protected page. Signed-in users who visit `/signup` or `/login` should proceed to the dashboard. A new user may go from dashboard to Search with one clear action.

**Authorization requirement:** Route guarding is only the outer layer. Every private API resource is authorized server-side, including via Prisma, and every resume object remains private.

### 8.2 Landing page: verified visual pattern, Pareto content

Proposed sequence (borrow structural rhythm, not OpenTag text/images):

1. **Header:** original Pareto wordmark; concise product links (How it works, Features, Privacy); **Log in** secondary and **Get started** dark CTA.
2. **Hero:** large editorial serif headline about *finding candidates with evidence*, clear Inter lead text and signup CTA; optional static/interactive original product illustration.
3. **Product preview:** **actual Pareto UI** search prompt → criteria confirmation → explainable results, not a fake OpenTag chat demo.
4. **How it works:** Describe → Review → Confirm → Explain → Refine.
5. **Capability sections:** conversational refinement, reference-based search, diagnostics/what-if (only label as available if implemented).
6. **Trust/clarity section:** recruiter control, unknown evidence, clear constraints and private document handling.
7. **Final signup CTA and concise footer.**

The reference homepage contains customer logo strips, use-case tabs, Slack demo, four-step work panels, FAQ and illustrated footer. **[PARETO ADAPTATION]** Reuse the visual *pattern* only where corresponding Pareto content is real. Do not invent testimonials, statistics, security certifications or customer logos.

### 8.3 Authentication screens: new Pareto design in reference style

- Warm `#FFFDF9` background, clean Pareto wordmark, editorial short statement, a high-clarity form/panel and 12px dark CTA.
- Google sign-in first or prominent; email/password below with visible labels, validation and accessible error summary.
- Sign-up: email, password, confirmation/verification handling per Supabase configuration; link back to login.
- Login: email/password, Google, forgot password, sign-up link.
- Real pending/error/success states, rate-limit feedback, password reset.
- No unauthorized dashboard content flashing during redirects. Handle OAuth cancellation or errors with safe copy.
- **No actual reference sign-in forms exist in opentag-clone**; this is a coherent, original extrapolation.

### 8.4 Dashboard: new Pareto working UI

**Shell:** compact navy-on-cream header + 232px-inspired left sidebar and flexible working pane. Provide persistent navigation, user menu/sign out, responsive collapse.

**Dashboard homepage** should orient the recruiter without fabricating analytics. Prefer **“Start a candidate search”** as the dominant CTA, recent searches only when stored, candidate-dataset count only when computed, and simple guidance/empty state.

**Search workspace** should be the most polished app surface:
- Left/top: prompt or selected reference candidate, conversation context and search revision.
- Center: editable criteria with explicit required/preferred filters and **Confirm Search**.
- Results: exact/needs-review/near-match group separation and evidence-backed cards.
- Candidate detail: per-criterion match, fail, unknown and source field/excerpt.
- P1 diagnostics and what-if appear as progressive disclosure **after** real results; not preempting the organizer-required flow.

**Candidates:** searchable list with role, experience, location, skill chips; open detail; **Find Candidates Like Me** action.  
**Imports P1:** private file status with extraction errors, not a decorative drag-and-drop.  
**Mobile:** single-column progression; results and detail in accessible page/sheet; no hidden confirm action.

## 9. Component inventory and state contracts

| Component | Source styling cue | Required product behavior |
| --- | --- | --- |
| `PublicHeader` | OpenTag header, desktop 91px, restrained CTA | Responsive nav; routes to real Pareto pages |
| `PublicHero` | Serif editorial display, wide gutters | Signup CTA and truthful product preview |
| `AuthCard` | Warm canvas, rounded white surface | Google/email states and validation |
| `AppShell` | Docs-style sidebar and hairlines | Protected navigation and user menu |
| `SearchComposer` | Clean textual input, minimal ornament | Typed prompt or reference search |
| `CriteriaEditor` | Restrained form controls/chips | Edit draft; explicit **Confirm Search** |
| `CriteriaDiff` | Clear changed-field emphasis | Review conversational refinements |
| `CandidateResultCard` | Quiet white bordered cards | Exact/needs-review/near state and evidence |
| `EvidenceBreakdown` | Dense Inter working text | Each criterion's value, state and reason |
| `SearchDiagnostics` | Original clean panels | Actual measured bottleneck counts |
| `WhatIfComparison` | Bordered two-column comparison | No mutation until recruiter confirms |
| `ImportStatus` | Stepper/status list | Real upload/progress/failure; private docs |
| `EmptyState` | Editorial spacing + crisp copy | Helpful next action without fake counts |
| `Modal/Popover/Toast` | Reference subtle depth/animation | Keyboard accessible, safe dismissal |

Each component **MUST** specify default, hover, focus, disabled, loading, error and empty states as relevant. A success badge never hides missing or failed requirements.

## 10. Accessibility and responsive behavior

- Semantic landmarks, heading hierarchy, explicit accessible names and **Skip to content**.
- Keyboard navigation for menus, tabs, dialogs, candidate result links and criteria editing; restore focus after dialogs.
- Visible `:focus-visible` style with enough contrast; do not rely on a faint blue border alone.
- WCAG **2.2 AA target** for core flows: text ≥4.5:1 contrast (except permitted large-text cases), non-text UI ≥3:1 where applicable, sensible tap targets, labels and meaningful errors.
- Color + text + icon/shape together distinguish matched, failed and unknown.
- Reduced-motion compliance; no essential state communicated exclusively by animation.
- Test at **390×844 mobile**, **768px tablet**, **1440×1000 desktop** and **1920px wide** as used by the clone's inspection process; also verify ~320px and zoomed/text-enlarged states.
- Be mindful of focus order when changing from desktop sidebar to mobile menu.
- Use `next/font` or licensed local font assets; do not publish third-party font binaries with unknown rights.

## 11. Implementation mapping — Next.js + Tailwind + shadcn/ui

- The clone is a **static HTML/CSS/JS** recreation. It is **not** a React component library; do not import it wholesale into Next.js or copy its 1.7 MB reference stylesheet.
- Implement in `frontend/src/app/globals.css` (semantic vars) and a small shared `frontend/src/components/ui/` design layer; use Tailwind utilities and shadcn primitives for behavior, while overriding default shadcn visual tokens to this palette.
- Create `frontend/src/app/(marketing)/`, `(auth)/`, `(dashboard)/` route groups and corresponding shared layouts. Next.js route groups do not change URL segments; map URLs exactly as §8.
- Keep domain/services in `backend/`; no CSS or UI logic in the backend.
- Shared components are owned by `frontend/src/components/`; Phosphor icons only by default.
- Keep **one live source of truth** for colors/type/spacing; this Markdown defines the design contract, CSS implements the tokens. No needless duplication of raw hex across dozens of components.
- Use progressive enhancement; ensure meaningful content without waiting for decorative motion or client-side JS.
- **Do not block P0 search correctness** while perfecting landing animations, signup illustration, or dashboard metrics.

### 11.1 Example token implementation

```css
/* Proposed CSS mapping; must be tested against the actual Next.js app. */
:root {
  --background: #fffdf9;
  --foreground: #020e24;
  --card: #ffffff;
  --card-foreground: #020e24;
  --primary: #020e24;
  --primary-foreground: #ffffff;
  --secondary: #10101014;
  --secondary-foreground: #020e24;
  --muted: #f7f4ed;
  --muted-foreground: #6b6b6b;
  --border: #020e2414;
  --ring: #052169;
  --radius: 0.75rem;
}
```

The color values above come from the inspected reference; the **semantic mapping to shadcn** is Pareto-specific.

## 12. Design fidelity, review, and acceptance

### 12.1 Visual comparison protocol

The clone already has reference images and browser tests. For Pareto:
1. Implement baseline tokens and **marketing header/hero** first.
2. Capture Pareto screenshots at 390×844 and 1440×1000.
3. Compare typography family/size/line-height, gutters/header heights, button shape, page warmth, navigation density and section spacing against the **clone's** local/source screenshots.
4. Record measurable deviations and their reasons (e.g. licensed replacement serif; different brand content).
5. Repeat for the new auth and dashboard routes using **this document**, not nonexistent OpenTag private-app screenshots.
6. Use Playwright to check no horizontal overflow, keyboard path, selected tab states, reduced motion and auth redirects.

### 12.2 Minimum deliverable surfaces

| Gate | Requirement | Evidence |
| --- | --- | --- |
| UX-01 | Public landing has OpenTag-like design rhythm and original Pareto identity | Screenshot across two widths; header/hero compare |
| UX-02 | **Get started → Signup** and **Login → Login** | Working navigation |
| UX-03 | Google OAuth and email/password actually work when auth enabled | Tested success/error/callback |
| UX-04 | Signed-in route → protected dashboard, unauthorized redirect | E2E and authorization negatives |
| UX-05 | Dashboard → original PS1 search flow in ≤1 navigation step | Playwright browse-to-search |
| UX-06 | Criteria editor/revision/confirmation accessible and explicit | End-to-end original PS1 gate |
| UX-07 | Result evidence and unknown states visually unambiguous | Fixture screenshots + tests |
| UX-08 | Mobile navigation and primary action accessible; no overflow | Responsive browser audit |
| UX-09 | Prefers-reduced-motion and keyboard operation supported | Browser test/manual audit |

### 12.3 Release order

1. Apply base palette/typography/header components and public landing **skeleton**.
2. Create login/signup and protected dashboard **route structure** as the user-requested app journey.
3. Complete **organizer P0** search, confirmation, explanation, refinement and “Find Candidates Like Me” inside the dashboard.
4. Fully integrate Google OAuth/access control for real/private workflows; if blocked, retain only a limited synthetic demo—never expose private resumes.
5. Add actual dashboard supporting pages, diagnostics, and what-if after P0.
6. Refine illustration, footer, FAQ, and optional animation **last**.

This order balances a coherent product entry route against the organizer's higher-priority functional evaluation.

## 13. Open decisions and known limitations

- **STK Earl licensing** has not been confirmed. Do not copy its WOFF2 files. Select a licensed equivalent if necessary.
- **OpenTag private dashboard/auth design** is unavailable in the clone; the app layout is a **Pareto adaptation**, not a claimed exact copy.
- Source screenshot binaries are present in the private reference repo, but a new Pareto side-by-side visual run has **not** occurred. “Pixel perfect” cannot yet be claimed.
- Pareto now has a committed warm landing and conditional authentication/dashboard route shells. **Browser rendering, exact font fidelity, Supabase credentials and real search services are not verified.**
- The private source repository must stay private. Do not copy branding, mascot, proprietary customer logos or unlicensed illustrations.
- **Conversational and voice UI** are not frozen in this document. If added later, evaluate dedicated components against the same tokens and keyboard/motion conventions; **voice is not required by PS1**.

## 14. Reference literature and provenance

### Repository-specific evidence

- [Clone README](https://github.com/ThunderKhan/opentag-clone/blob/main/README.md) — public-site-only scope, features and exclusions.
- [Inspection notes](https://github.com/ThunderKhan/opentag-clone/blob/main/docs/research/INSPECTION.md) — inspected viewport, typography, layout and behaviors.
- [Reference CSS](https://github.com/ThunderKhan/opentag-clone/blob/main/src/styles/reference.css) — exact CSS custom properties and type/motion definitions.
- [Local interaction CSS](https://github.com/ThunderKhan/opentag-clone/blob/main/src/styles/app.css) — menu/search/dialog and reduced-motion examples.
- [Shared header](https://github.com/ThunderKhan/opentag-clone/blob/main/src/components/header.html) — navigation geometry and CTA.
- [Homepage](https://github.com/ThunderKhan/opentag-clone/blob/main/src/pages/home.html) and [docs page](https://github.com/ThunderKhan/opentag-clone/blob/main/src/pages/docs.html) — editorial composition and sidebar precedent.
- [Reference screenshots folder](https://github.com/ThunderKhan/opentag-clone/tree/main/docs/research/screenshots) — captures for future screenshot comparison, not reused as published Pareto assets.

### Design-system research used to structure this document

- [Google Labs — DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md) — human-readable rationale plus structured tokens; overview, colors, typography, layout, elevation, shapes, components and do/don't guidance.
- [Design Tokens Community Group — 2025.10 format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) — typed, named tokens and alias/reference concepts (community-group format; not a W3C Recommendation).
- [MDN — reduced-motion accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility) — honor platform motion preferences.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — accessibility review target.

**DESIGN.md maintenance rule:** Source measurements and Pareto proposals stay labeled separately. When actual screenshots/tests establish new values, update the token table with evidence and explain the divergence. The reference governs the *visual system*; the [PRD](PRD.md) governs the *recruitment functionality*.

## 15. Scrollcraft motion reference — new implementation supplement

**Motion and visitor-story reference:** [Scrollcraft by Nate Herk](https://github.com/nateherkai/scroll-craft), specifically its [skill instructions](https://github.com/nateherkai/scroll-craft/blob/main/plugins/nateherk-design/skills/scroll-craft/SKILL.md), [hero-depth guide](https://github.com/nateherkai/scroll-craft/blob/main/plugins/nateherk-design/skills/scroll-craft/references/hero-depth.md) and [verification checklist](https://github.com/nateherkai/scroll-craft/blob/main/plugins/nateherk-design/skills/scroll-craft/references/verify.md).

**Separation of concerns:** OpenTag remains the source of visual design values. Scrollcraft informs the **scroll-driven narrative**, layered hero, variation between sections, one meaningful “peak” interaction, mobile composition, and reduced-motion acceptance. Do not adopt an unrelated Scrollcraft default theme or import its full standalone vanilla-JS runtime into the React app. The skill's engine is MIT, but **was not installed** in this React-native adaptation.

**New committed homepage surfaces:** dimensional candidate-search hero, editorial value section, sticky step story, three-profile deterministic what-if demo, principles ledger and final CTA. The live miniature explicitly identifies invented/synthetic candidate data and cannot be confused with real Gemini/Groq search.

See [SCROLLCRAFT.md](SCROLLCRAFT.md) for the creative brief, authored decisions, feeling curve, layer contract, score, source attribution, code mapping and **unexecuted verification plan**. Dashboard search screens remain utility-first and do not need a cinematic treatment.

**Status:** source files committed, but actual browser rendering / image comparison / test commands **not yet executed**. Do not mark UX-505 verified.
