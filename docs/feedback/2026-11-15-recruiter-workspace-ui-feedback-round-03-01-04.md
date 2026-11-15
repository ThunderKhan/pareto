# Pareto — Recruiter Workspace Feedback (Round 03 #01–#04)

> **Captured / authorized:** 15 November 2026, Frontend 03
>
> **Repository:** [ThunderKhan/pareto](https://github.com/ThunderKhan/pareto), branch `main`
>
> **Scope:** Only the four feedback items below. This round follows [Round 02](./2026-11-15-recruiter-workspace-ui-feedback-round-02-01-10.md).

## User feedback and acceptance criteria

| # | Surface | Feedback | Implementation |
| --- | --- | --- | --- |
| 01 | Authenticated workspace sidebar | Expanding/collapsing snaps abruptly; make it feel like a refined conversation app sidebar | Animate actual desktop grid column between 264px and 78px with restrained easing; labels fade/clip rather than display-toggle; nav icons remain stable; reduced-motion disables animation |
| 02 | Candidate-search overlays | Manual criteria drawer and reference picker appear/disappear abruptly | Add purposeful slide/fade entrance **and exit** transitions; keep content mounted until exit completes, including Escape/outside-click/discard; mobile sheets and reduced-motion are supported |
| 03 | Root path `/` | Existing logged-in users get the public landing page and must enter `/dashboard` manually | Use verified server-side Supabase user and MFA assurance; redirect an authenticated, fully verified user to `/dashboard`; MFA-pending to `/mfa?next=/dashboard`; signed-out users continue to see original landing; root is dynamic and proxy refreshes cookies on `/` |
| 04 | Authenticated top bar | Breadcrumb `Workspace / ...` and dividing rule are distracting | Remove breadcrumbs and bottom border; on desktop keep only notification bell and **New search** right aligned; on mobile preserve necessary navigation toggle, bell and New search |

### Design and security constraints

- Preserve all links, search/history state, candidate access, account settings and notification actions.
- Never infer authentication from client localStorage or unsigned cookies. Only verified server-side Supabase state may redirect from `/`. Expired or revoked sessions fall back to the public landing; MFA must not be bypassed.
- Preserve the original landing page when signed out, and do not change other marketing route behavior.
- Avoid animation that blocks user input, clips the collapsed account dropdown, causes horizontal overflow, or remains active under `prefers-reduced-motion: reduce`.
- Do not change the criteria-confirmation contract: opening or dismissing a panel never saves a revision.
- Desktop sidebar collapse does not affect mobile drawer behavior; the hamburger remains present when the desktop breadcrumbs are removed.

### Acceptance and tests

1. Clicking collapse or expand shows an actual nonzero desktop `grid-template-columns` transition; collapsed nav links retain accessible labels. The account popup must still open outside the narrow sidebar.
2. Criteria and reference surfaces use named in/out animations; after dismiss they detach, and under reduced motion they detach immediately without animation.
3. In a real signed-in browser, `GET /` lands on `/dashboard` and survives refresh. In a signed-out browser, `GET /` continues to show the `Find your next match.` landing page.
4. Breadcrumb elements do not exist; top-bar border-bottom is zero; notifications and New search remain accessible at desktop and mobile sizes.
5. CI lint/typecheck/backend tests/build/Playwright and Docker checks pass. Authenticated Playwright tests can be skipped without dedicated recruiter credentials; if skipped, **live behavioral acceptance remains pending**.

## Current implementation pointers

- `frontend/src/app/page.tsx`, `frontend/src/proxy.ts`: server-validated session-aware root.
- `frontend/src/components/dashboard/dashboard-shell.tsx`, `round-03.css`: minimal top bar, desktop sidebar transition, collapsed link labels.
- `frontend/src/components/search/workspace.tsx`, `round-03-motion.css`: timed overlay exit states and transform/opacity motion.
- `frontend/tests/e2e/recruiter-round-03.spec.ts`: public root plus credential-gated signed-in routing, top-bar, sidebar, overlay and reduced-motion tests.

## Status

**4/4 implemented in source on `main`; signed-in visual verification pending.** See [implementation ledger](./2026-11-15-recruiter-workspace-round-03-implementation-ledger.md) for commits and CI evidence.
