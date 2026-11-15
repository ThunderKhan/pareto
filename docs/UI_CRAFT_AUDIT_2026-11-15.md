# Pareto — cross-route design refinement audit (15 November 2026)

**Scope:** public landing, login, signup, MFA/recovery, recruiter dashboard, search/chat, Pareto Frontier, Search Health, What-If, candidate library/detail, resume imports/review, profile/security/settings, and the shared shell. This report records source inspection and committed changes; it does not substitute for a signed-in visual acceptance session.

## Established design system (measured from landing CSS)

The source of truth is frontend/src/components/marketing/home-v2.css. The product alias is frontend/src/components/dashboard/workspace-tokens.css; both retain a separate graphite dark mode for the workspace.

| Element | Exact existing value / behavior |
| --- | --- |
| Primary ink | #020e24 (landing --v2-ink; workspace --ws-ink and --ws-primary) |
| Paper | #fffdf9 (--v2-paper / --ws-paper) |
| Secondary warm surface | #f7f5ef (--v2-warm / --ws-panel) |
| Hairline | #e7e1d8 (--v2-border / --ws-edge) |
| Brand blue / focus | #467beb (--v2-blue; workspace --ws-blue / --ws-focus) |
| Muted text | #52616e (--v2-text-quiet / --ws-muted) |
| Display face | Locally hosted STK Earl regular/medium |
| UI face | Next-hosted Inter; controls inherit it |
| Marketing measure | 1078px container with 24px side gutters |
| Controls | Rounded 12px and at least 44px for principal actions |

The site uses larger editorial display type and a distinctive mascot, while operational screens preserve higher information density, wider tables, and concise body type. Existing landing composition, hover art and auth shader are intentional brand elements and were preserved.

**Product-specific direction.** Product: recruiter-facing, evidence-based candidate search and bounded hiring-strategy comparison. Character: warm, exact, editorial. World: research dossier, candidate records and decision evidence. Moments: branded public hero/mascot and measured baseline-versus-proposal comparison in Frontier. Signature: explicit requirement, the measured candidate consequence, and a clear boundary between preview and confirmed results.

## Four verified design inputs

1. **Impeccable** — https://github.com/pbakaus/impeccable/blob/main/plugin/skills/impeccable/SKILL.md and reference/polish.md, reference/craft-floor.md. Applied preserving the incumbent brand, route-level flow checks, contrast/focus/spacing rules, functional and state defects first.
2. **Anti UI Slop** — https://github.com/minagishl/anti-ui-slop/blob/main/SKILL.md and references/patterns-to-avoid.md, references/design-tokens.md. Applied token-first decisions, reducing generic stacks of KPI cards, redundant uppercase micro-labels, and unmotivated decoration.
3. **Hallmark** — https://github.com/nutlope/hallmark/blob/main/skills/hallmark/SKILL.md and references/flow.md (app-screen guidance). Applied the operational floor: familiar controls, focus/keyboard states, honest figures, real form/empty states, and secondary disclosure. Did not install another theme or run Hallmark's unrelated new-site scaffolding.
4. **Unslop**, Damir Sokolovsky — https://github.com/heydamir/unslop/blob/main/skills/unslop/SKILL.md and references/signs.md. Its ordered nine-pass methodology informed the audit and changes. Only design principles were adapted; the CC BY 4.0 skill files were not copied. No remote installation scripts were executed.

Some skills discourage decorative display faces, eyebrows or italics categorically. Pareto's established landing uses STK Earl and a restrained overline/brand accent purposefully; the original brand takes precedence over generic styling prohibitions. Functionality, accessibility and factual correctness come before stylistic guidance.

## Route and severity audit

| Route | Finding (severity) | Intervention |
| --- | --- | --- |
| Public landing / | P2: hero CTA minimum height varied below 44px | 44px minimum in mobile and desktop hero; retained all flagship composition |
| Login /login and signup /signup | P1: cool-blue panel borders, inputs and status blocks drifted from warm landing | Shared display font, ink/paper/warm tokens, quieter input/control styling, keyboard focus; real auth and shader unchanged |
| MFA /mfa | P2: Georgia instead of STK Earl and inconsistent control border | Aligned shared display type and focus |
| Recovery /forgot-password | P2: older generic elements; flow currently informational only | Shared global type and color tokens; existing no-email limitation preserved, not disguised as functional recovery |
| Dashboard overview /dashboard | P1: generic personalized greeting and heavy recent-search card stack | Task-specific heading, concise introduction, hairline recent-search list with real saved revisions |
| Shell / navigation | P1: multiple hardcoded cool-blue hover/selected treatments and dense links | Semantic token-aligned rows, muted secondary text, consistent targets and focus |
| Candidate search/chat /dashboard/search | P1: noisy overline labels and competing insight panels | Clear captions; Phase 1–3 criteria, conversation and shortlist retained; Frontier primary, diagnostics/simulation behind optional disclosure |
| Pareto Frontier | P0/P1: repeated equal cards weakened current-versus-preview comparison | Single-column editorial comparison, explicit current/proposed numeric outcomes, consequences and preview-only language; original review-confirm boundary intact |
| Search Health and What-If | P1: competed visually with flagship and normal candidate results | Moved presentation under accessible secondary details; all original components retained |
| Candidate library/details /dashboard/candidates | P1: blue cards and weak empty state, misleading null-versus-empty skills | Divided list/detail panels, explicit import action, distinguish known empty from unknown |
| Resume imports /dashboard/candidates/import | P1: competing status tiles/cards and horizontally wide table lacking keyboard scroll target | Warm neutral summary strip, consolidated form controls, keyboard-focusable scroll region and server-derived queue, preserving processing statuses |
| Profile/security/settings /dashboard/profile | P1: card chrome and duotone icons inconsistent with landing | Regular icons, shared input/button tokens, reduced card layering, preserved dark raised account panel |
| Responsive | P1: inconsistent actions and overflow risk at 320px+ | Shared target height, explicit focus for scroll areas, mobile density overrides and root clipping |

## Unslop ordered nine-pass changes

1. **Spacing:** normalized primary hit targets, row/group rhythm and consistent form/list padding.
2. **Color:** retained ink/ivory/warm/brand-blue tokens; no new palette or hue gradient.
3. **Icons:** regularized profile icons and restrained accent color in dashboard chrome.
4. **Copy:** task-oriented dashboard header and less redundant tracked uppercase labels while preserving source-backed recruitment wording.
5. **Typography:** locally hosted STK Earl across auth, MFA, landing and workspace; consistent body text and tabular figures.
6. **Layout:** results first; Frontier as the clear comparison tool; analysis tools available through disclosure, not another set of competing primary panels.
7. **Details:** reduced nested cards, harmonized form controls, set sensible boundaries, enabled table keyboard scrolling.
8. **Visuals:** no invented results, stock imagery, fake data visualizations or new decorative assets.
9. **Motion:** existing branded motion and reduced-motion support retained, no new looping animations.

## Changed areas and verification boundaries

Implementation spans global typography, landing button targets, auth styles, MFA, dashboard shared styling, overview, candidates/profile, imports, search and Frontier, plus tests. The new brand-across-routes Playwright spec verifies public landing/login/signup tokens, typography, mobile sizing and screenshot capture. Its authenticated screen loop is conditioned on dedicated recruiter credentials.

Required CI gates: pnpm check (lint, TypeScript, unit/Postgres), production build, Playwright smoke, Docker image and signed-out access protection. PR CI should attach screenshot artifacts from public tests. Running browser tests is not identical to personally inspecting their actual rendered output. Screenshot review and live signed-in recruitment acceptance must be completed separately if a configured account or capture access is unavailable.

**Open limitations:** Real authenticated recruiter and source-reviewed import journeys cannot be claimed tested when the recruiter-live job is skipped. The existing password recovery page explicitly does not send reset mail; finishing that separate feature requires an approved product/auth change outside this UI-only task. No backend algorithms, search contract, database migration or authorization behavior was changed.
