# Authentication UI — two bounded refinement passes (2026-11-15)

Scope: Pareto `/login` and `/signup`. Both routes use `auth-form.tsx`; unchanged flows include email/password, optional configured Google OAuth, redirect handling, signup-only name fields, the mascot, and the approved Paper GrainGradient. The public marketing page and dashboard are excluded.

## Method and credit

Source-level review using design principles and quality checklists from:
- **Impeccable**, by Paul Bakaus — [source](https://github.com/pbakaus/impeccable) (Apache-2.0). Referenced its technical audit, craft-floor, and polish guidance.
- **Unslop**, by **Damir Sokolovsky** — [source](https://github.com/heydamir/unslop), [heydamir.design/unslop](https://heydamir.design/unslop) (CC BY 4.0). Applied its spacing, color, icons, copy, type, layout, details, visuals, and motion sequence.

This is an implementation of their principles, **not** an assertion that the standalone CLI detector ran. No skill source files were copied.

## Pass 1 — audit, clarify, harden

| Finding | Priority | Change |
| --- | --- | --- |
| Interactive links and buttons lacked a clearly scoped keyboard focus treatment. | P1 | `focus-visible` ring for branded navigation, auth buttons, recovery link, and local-setup disclosure. Inputs already had focus-within styling. |
| Placeholder text was faint and dense form labels were 12px. | P1 | Raised input and label sizes, increased placeholder contrast. |
| Production could show a wall of configuration variable names on auth screens. | P2 | Short, user-friendly unavailable message; developer setup instructions now live in a collapsible disclosure in development only. |
| Login password used signup-specific minimum-length placeholder. | P2 | Mode-specific prompt; signup retains current minimum-length guidance. |
| The form panel hid scrollbars even if an unexpected error needed extra vertical space. | P2 | Thin native scrollbar is available only when overflow exists. |
| In-flight state wasn't exposed on the form. | P2 | `aria-busy` added while the request is active. |

## Pass 2 — distill, adapt, polish

| Finding | Priority | Change |
| --- | --- | --- |
| A large auth-only CSS block lived in the shared app stylesheet. | P2 | Extracted into `components/auth/auth.css`, imported only by the auth component. Keeps other pages' CSS untouched. |
| Repeated key colors drifted between branding and controls. | P2 | Added a small scoped token set for ink, blue focus, border, and paper. |
| Mobile fields used 14px text, which can trigger browser auto-zoom when focused. | P1 | Set mobile inputs to 16px; no change to the desktop form shape. |
| Password/recovery controls had 36px interaction height. | P2 | Increased to 44px touch targets. |
| Supporting artwork label used tiny tracked uppercase type. | P3 | Switched to 12px natural-case product identification, preserving the mascot and large headline. |
| Password reveal control had changing label but no explicit state property. | P2 | Added `aria-pressed`. |

## Preserved by design

- No new cards, gradients, statistics, badges, integrations, or unnecessary motion.
- No rewording of approved auth headlines.
- Google OAuth remains conditional on Supabase configuration. A screenshot or CI check cannot prove successful third-party provider authorization.
- Short or mobile screens remain scrollable when necessary to keep every field reachable. Desktop single-viewport fit is protected by existing Playwright coverage.

## Verification

Extended Playwright assertions for labels, hints, keyboard focus, mobile input sizing, touch targets, reduced motion, and both routes. GitHub Actions runs frozen dependency install, lint, typecheck, backend tests, browser suite and production build. Inspect the relevant workflow run after commit; do not infer success merely from this document.

Any future visual review should compare both routes at desktop and mobile in one bounded pass, rather than repeatedly redesigning a stable UI.
