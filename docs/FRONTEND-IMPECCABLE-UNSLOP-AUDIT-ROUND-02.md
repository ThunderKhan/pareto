# Pareto authenticated experience — Round 02 Impeccable + Unslop audit

**Date:** 15 November 2026  
**Scope:** dashboard Overview, AI candidate search, candidate list/detail, account settings/profile, login/signup, notification dropdown, sidebar account menu.  
**Authoritative design benchmark:** Pareto's approved public landing page. **Not** a redesign target.  
**Source-level audit with CI regression checks; authenticated screenshot verification requires a dedicated recruiter account.**

## Design direction

- **Users:** Recruiters working from specific hiring briefs and private candidate records.
- **Product character:** Calm, precise, visibly human-confirmed; lightly expressive where the real Parito mascot is relevant.
- **Visual world:** Editorial STK Earl display headings, functional Inter, warm ivory/light surfaces; neutral graphite/near-black dark workspace; cobalt only for meaningful emphasis.
- **Signature interaction:** A compact chat composer, discoverable reference lookup and clear, separate human criteria confirmation surface.
- **Anti-direction:** Decorative gradients, generic orbs, redundant cards, long form-like chat composers, ungrounded counters, fake history and multiple nested overlays.

## References and method

- [Impeccable](https://github.com/pbakaus/impeccable), Paul Bakaus, Apache-2.0: operational UI craft, accessibility, hierarchy, precision, responsive constraints, focus, error states, motion restraint and complete verification. The repository has previously documented its use in [the auth review](./AUTH-IMPECCABLE-UNSLOP-REVIEW.md) and [the homepage review](./HOMEPAGE-IMPECCABLE-UNSLOP-REVIEW.md).
- [Unslop](https://github.com/heydamir/unslop), Damir Sokolovsky, CC BY 4.0: identify generic AI patterns; define a product-specific design direction; refine **spacing, color, icons, copy, typography, layout, details, visuals and motion**.
- Review basis: actual repository React/Next and CSS source at the start of this round, screenshots supplied by the user, baseline Playwright assertions, and GitHub Actions checks.
- **Honest tooling limit:** The installed runtime did not offer Impeccable or Unslop as executable local skills, nor an interactive signed-in Pareto browser. The audit applies the verified published design guidance and source-level checks. No claim is made that the Impeccable detector/CLI, live browser overlays or a full visual audit was run.

## Prioritized findings and remediation

**Evidence labels:** **Confirmed in source** = visible in the inspected code; **User screenshot** = supplied in Round 02; **Inference** = cause/appearance requires live verification; **Design judgment** = subjective, explicitly requested.

| Priority | Surface/source | Evidence and impact | Change implemented | Verification / limit |
| --- | --- | --- | --- | --- |
| **P1** | `/dashboard/search`, `workspace.tsx` | **Confirmed:** Reference candidate form was inserted inside the scrollable chat timeline, competing with the bottom composer and scrollbars (#07) | Replaced with bounded searchable, real-data picker anchored above composer; Escape/outside dismissal, focus restoration, loading/empty/error states | CI build; signed-in selection/keyboard test added; live test credential-dependent |
| **P1** | `/dashboard/search`, `workspace.tsx`, `criteria-editor.tsx` | **Confirmed/User screenshot:** Manual and AI drafts displayed oversized row-based forms in the chat transcript (#08); repeated panels interfered with reviewing results | Single responsive right drawer / mobile full-width sheet with compact per-rule fields, obvious review/confirm/discard and focus loop; existing API, versions, request IDs retained | CI build; signed-in browser test added; exact small-screen appearance still external |
| **P1** | `/dashboard` top bar, `dashboard.css` | **Confirmed:** mobile `font-size: 0` hid the text of “New search” after an earlier cleanup removed its decorative icon, leaving an apparently blank action | Restored visible text and 42px+ target on mobile in `audit-polish.css` | Source and signed-in Playwright assertion; live screenshot remains unverified |
| **P1** | `/dashboard/candidates`, `candidate-library.tsx` | **Confirmed:** first render showed “0 profiles” and an empty-state message before the initial API request resolved; a delayed server looked like a genuinely empty workspace | Explicit first-load state, gated count/empty message, selected-row `aria-pressed`, token-based contrast/spacing | Build; real signed-in list fetch not exercised by public CI |
| **P1** | `/login`, `auth.css` | **User screenshot / inference:** Chrome's autofill painting appeared on only the native email input, not its trailing inline label (#09) | Matched native autofill painting/text to the entire white field; retained real `autocomplete`, focus styles and password-manager support | Source/CSS; must confirm actual browser autofill using a saved email in Chrome |
| **P2** | `/dashboard/search`, composer | **Confirmed/User screenshot:** tall textarea and long placeholder dominated fresh screen; no automatic growth (#06) | Auto-growing one-row composer (up to bounded height), short placeholder, compact tool row, unchanged Enter/Shift+Enter and actual submit validation | Build; dedicated signed-in interaction test added |
| **P2** | Notification dropdown and sidebar account menu | **Confirmed:** native `details` menus remained open when clicking elsewhere and lacked Escape/focus recovery | Escape/outside-pointer closing and focus to summary; notification link closes dropdown on navigation | Build; signed-in menu keyboard test added |
| **P2** | `/dashboard/candidates`, dense rows and form | **Confirmed:** 11px low-contrast metadata, selected candidate indicated only by background; search lacked visible focus on enclosing border | Raised secondary metadata to 12px, added accessible pressed state and clearer focus/surface tokens | Source inspection and CI; real contrast measurement in signed-in viewport pending |
| **P2** | `/dashboard/profile`, notification checkbox alignment | **Confirmed in source/User screenshot** from Round 02 #03: inherited generic min-height overrode checkbox size | Retained implemented 19px/centered row fix from #01–#05 | Earlier standard CI passed; real screenshot QA pending |
| **P2** | Entire authenticated app incl. menus | **Design judgment/User screenshot** from Round 02 #04: overly navy dark mode | Retained prior graphite tokens and added consistency for list, menus, borders and form controls | Theme controls exist; full live light/dark screenshot comparison remains pending |
| **P3** | Overview, Profile and auth design hierarchy | **Confirmed in source:** real personalized greeting/history, existing MFA/session/profile settings, branded serif/functional sans type | Preserved existing design rather than redoing functional, approved surfaces | Standard CI protects public/auth routes; Supabase MFA/security not retested |
| **P3** | Search analysis (Health, What-if, Near-match) | **Confirmed in source:** measured read-only candidate analysis and explicit review path | Preserved the existing read-only previews; editor opening uses the same confirmation drawer | Live scenario test remains skipped without dedicated credentials |

## Unslop nine-pass treatment (scoped to operational routes)

1. **Spacing:** Reduce dead composer height; remove stacked in-timeline Reference and review forms, retain data-view density.
2. **Color:** Keep approved ivory and intentional neutral graphite; use existing workspace tokens and low-key blue for focus, not decorative glows.
3. **Icons:** Retain Phosphor line icons only where controls benefit; no new decorative icon tiles or emoji.
4. **Copy:** Replace long illustrative hiring brief placeholder with a short action; keep factual confirmation warnings.
5. **Typography:** Reuse landing-derived display serif for editor/picker headings; functional Inter for input and lists; improve candidate metadata readability.
6. **Layout:** Single floating picker, single focus-managed review drawer, responsive composer; remove conflicting in-timeline forms.
7. **Details:** Normalized control hit areas, keyboard dismissal and focus return; real loading/empty/error states.
8. **Visuals:** Preserve original Parito as a product-specific visual marker, not a stock/generative candidate image.
9. **Motion:** No new ambient motion; preserve reduced-motion behavior and avoid distracting drawer animations.

## Acceptance boundaries and known risks

- Only an explicit **Confirm Search** still persists search sessions/revisions. The Reference picker queries the existing owner-scoped candidate search; the criteria editor never writes by opening or discarding.
- Rule editing still uses `criteriaSchema`, `sessionId`, `expectedVersion`, and fresh `requestId` values. No backend or database migrations are introduced by this round.
- **No production candidates, notification items, account roles or search histories were fabricated.**
- Protected pages cannot be fully visual-tested without a signed-in Supabase demo account. Public Playwright, backend tests, typechecking, Docker and production build provide useful but narrower confidence.
- **Open manual checks:** actual browser-autofill painting (Chrome/Brave), mobile Reference panel and drawer with onscreen keyboard, keyboard focus restoration after selecting a candidate, dark-mode color contrast across all panels, TOTP/session workflows in the real Supabase project.
- The original screenshot's circular development overlay with “N” is Next.js tooling, not a Pareto avatar. Do not redesign it.
- The public landing page, hero shader, footer and pre-existing visually approved auth split layout are unchanged outside the narrowly scoped autofill correction.

## Verification

New credential-dependent tests: `frontend/tests/e2e/recruiter-round-02-interactions.spec.ts` and the updated `recruiter-round-02-visuals.spec.ts`. Public/auth tests remain part of normal CI.

**Completion rule:** Mark only code/API work passing standard CI as implemented. Keep “live visual acceptance pending” until an authenticated browser run is performed. Do not claim this manual source audit was an executable-skill detector scan.
