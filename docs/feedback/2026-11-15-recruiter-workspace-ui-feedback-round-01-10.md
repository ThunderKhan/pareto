# Pareto — Recruiter Workspace UX Feedback (Round 01: Items 01–10)

> **Feedback captured:** 15 November 2026  
> **Project:** Pareto — Recruitment Intelligence Platform (Trustume AI Hackathon, team `std::zero`)  
> **Repository:** [ThunderKhan/pareto](https://github.com/ThunderKhan/pareto)  
> **Affected experience:** Authenticated recruiter workspace, candidate search, Overview, recruiter profile, navigation, account settings, shared visual language, and application title  
> **Status:** **Recorded only — not yet approved for implementation.**  
> **Source:** User's numbered feedback and screenshots in the UX review conversation of 15 November 2026.

This document is the durable source of truth for feedback **#1 through #10** from this review round. It distinguishes requested changes from implementation assumptions and outstanding technical prerequisites. **Creating this document does not authorize any UI, API, database, or authentication changes.** Begin implementation only after the user explicitly gives the go-ahead.

## Feedback index

| # | Area | Request | Status |
| --- | --- | --- | --- |
| 01 | Dashboard/header | Remove decorative CTA arrows and unnecessary “Recruiter workspace” text | Recorded |
| 02 | AI candidate search | Minimal empty state; remove redundant headings/copy and initial scrolling | Recorded |
| 03 | AI candidate search | Center empty-chat composer; move it to the bottom when conversation starts | Recorded |
| 04 | Dashboard Overview | Replace marketing copy/cards with a personalized home and real recent sessions | Recorded |
| 05 | Browser tab | Set application title to **Pareto** | Recorded |
| 06 | Authenticated app | Unify UI design language with the approved landing page | Recorded |
| 07 | Theme | Complete, intentional Light / Dark / System theme support | Recorded |
| 08 | Sidebar | Remove duplicate “My profile”; retain account menu and real search history | Recorded |
| 09 | Account settings | Functional professional identity, workspace/role, MFA, sessions, theme, notifications | Recorded |
| 10 | Avatar | Use the product mascot **Parito** instead of user initials | Recorded |

---

## #01 — Remove unnecessary CTA arrows and header text

**User intent:** Decorative right arrows in ordinary call-to-action buttons feel generic/“AI slop.” The top-right header label does not add meaningful information.

**Required changes**
- Remove the decorative arrow from **“New search”** in the dashboard top bar.
- Remove the decorative arrow from **“Start candidate search”** on Overview.
- Apply the same restraint to other **decorative CTA arrows** in the authenticated UI when doing the consistency pass; preserve icons that convey a genuine action or state.
- Remove **“Recruiter workspace”** from the top-right header.
- Retain button labels, destinations, keyboard accessibility, and underlying functionality.

**Acceptance:** No redundant header label; those CTA buttons remain prominent, functional, and visually clean without decorative arrows.

## #02 — Make the AI candidate-search empty state minimal and non-scrollable

**User intent:** The fresh candidate-search screen should feel as focused as an empty ChatGPT conversation, not like another marketing page.

**Required changes**
- On `/dashboard/search`, remove the large introductory block:
  - “RECRUITMENT INTELLIGENCE”
  - “Candidate search.”
  - “Describe who you need, review the criteria, and explore matches with evidence.”
- **Keep** the primary empty-state question **“Who are we looking for?”**
- Remove the explanatory paragraph below it beginning **“Describe a role in your own words…”**.
- Remove the under-composer disclaimer **“AI suggests criteria. Only you can confirm a candidate search.”**
- Fit the **fresh/empty search state** within an ordinary desktop viewport without page-level scrolling or a blank, overlong vertical document.
- Preserve working hiring-brief input, AI orb, reference candidate action, manual-criteria action, and backend search behavior.
- Do not clip content or suppress needed scrolling on short/mobile screens or when criteria, candidate results, errors, or history increase content height.

**Acceptance:** The default empty state has one central question and an obvious composer, no redundant promotional/explanatory copy, and no unnecessary initial desktop scroll.

## #03 — Dynamic ChatGPT-style composer positioning

**User intent:** The composer is the center of attention before a request; during an active search it becomes the persistent bottom input.

**Required changes**
- **Fresh/empty search:** Position the question and input together in the **vertical center** of the available workspace.
- **Once a request is submitted / the search interaction begins:** Transition the input naturally to the **bottom** of the chat workspace; show interactions, proposed criteria, results, and revisions above it.
- Keep the composer reachable for follow-ups and let the **conversation/results region** scroll independently where practical.
- Avoid flicker, scroll jumps, lost text, remounting the input unnecessarily, or keyboard/focus disruption. Respect reduced-motion preferences.
- Keep the **review → edit → explicit confirmation** gate before executing a candidate database search.

**Implementation interpretation to validate during QA:** Trigger the reposition on the first submitted request (not the first keystroke, which would make typing disruptive). Existing confirmed sessions loaded from a URL should open in the active/bottom-composer state.

**Acceptance:** Fresh workspace centers the composer; an active conversation uses a bottom composer, with accessible results and stable input state.

## #04 — Replace the marketing-style Overview with a useful recruiter home

**User intent:** An authenticated recruiter needs a productivity homepage, not a second landing page.

**Required changes**
- Remove/rework redundant promotional content such as:
  - “WORKSPACE OVERVIEW”
  - “Find the right people.”
  - “Turn a hiring brief into criteria you can review…”
  - the oversized pale-blue **“A clearer way to search.”** promotional card and its explanation
  - repetitive **“Browse your candidates”** and **“Your recruiter profile”** promotional shortcut cards, unless a concrete workflow warrants a shortcut
  - sidebar filler **“Human-confirmed search. Evidence you can inspect.”**
- Add a **personalized greeting** derived from the signed-in recruiter’s actual profile; an example discussed was **“Good morning, Ayan.”**. It is not hardcoded sample data; the product must use the current account's real name and appropriate time context if using time-of-day greetings.
- Provide a clear primary **New candidate search** action.
- Show **real recent confirmed search sessions**, sourced from authorized persisted search data, with links to reopen/resume them.
- Display a quiet, useful **empty state** if the recruiter has no search history.
- Avoid duplicate navigation, marketing language, fake counters, mock searches, placeholder activity, or decorative statistics.

**Open detail:** The user expressly postponed discussion of how to handle missing names. Do **not** hardcode a name or invent a final fallback without considering that later feedback.

**Acceptance:** The Overview answers *what can I do now?* and *where can I pick up?* using real account and search data. Zero fabricated rows or stats.

## #05 — Browser tab title: “Pareto”

**User intent:** A concise established product identity.

**Required changes**
- Replace **“Pareto — Recruitment Intelligence”** with exactly **“Pareto”** as the browser tab/document title.
- Apply consistently to landing, auth, and authenticated routes rather than allowing nested layouts to restore the old suffix.
- Retain the existing favicon and other SEO functionality where possible. This is a **metadata change**, not a request to redesign the landing page.

**Acceptance:** The tab reads **Pareto** on all relevant routes.

## #06 — Unify the authenticated UI with Pareto’s landing-page visual identity

**User intent:** The landing page is the **capstone / benchmark** of the Pareto design system. The authenticated app currently feels too much like a generic SaaS template.

**Required changes**
- Refine **Overview, dashboard shell/sidebar, AI candidate search, candidate library, profile, and shared controls** as a cohesive product.
- Reuse the approved landing/auth visual language: expressive but controlled serif headline typography, readable body type, ivory and deep-navy surfaces, precise cobalt-blue accents, disciplined whitespace, clean CTA styling, and consistent icon treatment.
- Create or consolidate real shared design tokens/components for typography, colors, spacing, radii, borders, form states, buttons, and focus states; do not rely on inconsistent one-off overrides.
- Reduce generic oversized panels, redundant outlines, overly prominent promotional cards, and filler copy.
- Keep the productivity UI more compact and information-dense than the landing page: **consistency does not mean copying marketing layout or adding a shader to data tables**.
- Apply Impeccable / Unslop-style **audit, distill, refine, and accessibility** passes where useful.
- **Do not redesign the landing page** while doing this work.

**Acceptance:** Dashboard, candidate search, library, and profile unmistakably feel like one Pareto product, without losing efficiency or accessibility.

## #07 — Purpose-built dark mode (Light / Dark / System)

**User intent:** Dark mode must be an intentionally designed theme, **not** just a black background or inverted light colors.

**Required changes**
- Design proper dark-theme **surfaces, elevation, borders, muted text, accent colors, semantic states, inputs, menus, dropdowns, candidate results, criteria editor, and profile settings**.
- Provide **Light / Dark / System** controls; System follows the OS preference.
- Persist the chosen preference across refreshes and sessions, subject to the real storage/account design.
- Prevent visible flash of an incorrect theme on page load where feasible.
- Preserve readable contrast, accessible focus states, sensible hover/disabled/error/success/loading treatments, and reduced-motion support.
- Ensure the dark design still looks like **Pareto**, rather than a generic dark SaaS skin.
- Scope applies to the **authenticated application**. Use the landing page as the visual standard, without redesigning its already approved look.

**Acceptance:** All authenticated routes work and look intentional in both modes, with persistent theme selection and adequate usability.

## #08 — Remove duplicate profile item; retain bottom account control and session navigation

**User intent:** The sidebar should not list “My profile” as both a normal navigation item and an account-menu destination.

**Required changes**
- Remove **“My profile”** from the main sidebar navigation.
- Keep the **bottom account block**, showing the recruiter's profile identity; its menu provides **Account settings** (`/dashboard/profile`) and **Sign out**.
- Keep **Overview, new/search, and Candidates** as meaningful navigation.
- Preserve the ability to revisit existing **real, confirmed search sessions** within a **Recent searches** section.
- As history grows, the sidebar should handle overflow gracefully; future search, pagination, or archive controls should be based on actual backend capabilities, not placeholder menu items.
- Do not automatically give an admin access to other recruiters' sessions. Cross-account/shared workspace history needs an explicit authorization model.

**Acceptance:** One clear profile entry point at the bottom, no duplicate “My profile” item, usable genuine search-session navigation.

## #09 — Professional, functional recruiter account settings

**User intent:** Turn `/dashboard/profile` into a clean, functional account-settings experience with **Personal Information, Professional Information, Security, Appearance, and Notifications**. The user specifically requested that **job title, organization/company, workspace, role, 2FA, theme preferences, active sessions, and notification preferences** be visible and implemented.

**Required sections and behavior**

### A. Personal Information
- View and edit **first name** and **last name**, persisted to the real authenticated account.
- Display the account **email**. The current email is read-only; do not falsely claim the identity provider is incapable of changing emails. A future verified email-change workflow can be separate.
- Do not require a phone number, birthday, residence, or extraneous personal information.

### B. Professional Information
- **Job title:** genuinely editable and persisted for the recruiter (e.g., Talent Acquisition Specialist).
- **Organization/company:** backed by a real company/workspace record and membership validation; do not conflate a user-editable display string with verified company membership.
- **Workspace:** show the actual current workspace/membership, not a fake switcher.
- **Workspace role:** show assigned **Admin / Recruiter / Viewer** (or the actual supported role model) as **read-only to ordinary members**. Users cannot promote themselves by updating a profile field.
- Workspace membership, roles, authorization, and owner-scoped candidate data may require dedicated database tables and server enforcement.

### C. Security
- Preserve working **password change** and appropriate identity-provider reauthentication requirements.
- Implement real **2FA/MFA** enrollment, challenge/verification, and disable/recovery handling using supported identity-provider mechanisms; never present a nonfunctional toggle.
- Provide **active session** visibility and revocation **only via actual supported session APIs/workflows**. Verify exact per-device session listing and revocation capabilities instead of claiming them without evidence.
- Handle provider errors, cross-device sign-out consequences, and accessibility appropriately.

### D. Appearance
- Connect real **Light / Dark / System** preferences to the theme system in #07; persist across visits.

### E. Notifications
- Provide saved preferences for **genuine supported recruitment events** and make them affect delivery behavior.
- If notifications do not yet exist, implement supporting event/delivery infrastructure as necessary or clearly identify the dependency **before claiming completion**. Do not add inert switches.

**Cross-cutting expectations**
- Clean, compact account settings layout; remove filler like “Your name appears in your private Pareto workspace.”
- Every editable setting must have a real data model, validation, authorization, clear error/success states, and persistence.
- Avoid misleading or fake “enabled,” “verified,” “active session,” or role states.
- **This is a larger backend/auth scope than visual feedback #01–#08.** It requires a separate capability check of Supabase and database models, schema migrations and tests as needed.

**Acceptance:** All requested account sections are visible and backed by real, permission-checked behavior. Any unavailable third-party capability is explicitly disclosed rather than silently simulated.

## #10 — Replace initials avatars with Parito, the mascot

**User intent:** The Pareto mascot now has an official name: **Parito**. Reuse the existing brand mascot as a friendly, cohesive account avatar instead of initials such as `AK`, `JK`, etc.

**Required changes**
- Replace initials-based profile avatars with the existing **Parito mascot asset** in the sidebar bottom account control, authenticated-app profile/account UI, and any genuine account-avatar surfaces.
- Preserve the recognizable mascot styling and keep it appropriately sized and composed for small UI placements.
- Do not introduce random generated avatars, unnecessary personal-photo upload flows, or gimmicky animation.
- Check the contrast/visibility of the avatar in both light and dark themes.
- Distinguish **genuine Pareto account avatars** from developer-tool overlays: the round `N` seen in some screenshots is likely a Next.js development indicator, **not** the recruiter's avatar; do not replace or mistake developer tooling for product UI.

**Acceptance:** Real account-avatar surfaces show Parito consistently and look polished at small sizes.

---

## Shared rules for implementation (once explicitly authorized)

1. **Use real data.** No fabricated recent searches, profile fields, notifications, accounts, session counts, candidate results, or role assignments. Real empty states are preferable to false UI.
2. **Keep the approved landing page intact** except for the explicitly requested global browser-title metadata change.
3. **Preserve core workflows:** Supabase authentication, sign-out, candidate lookup, reference-based similarity, AI criteria interpretation, explicit edit/confirm gate, evidence-backed results, and revision persistence.
4. **Keep scope honest:** `SearchSession` currently persists confirmed criteria and revisions; it does not by itself store full ChatGPT-style transcripts. If a later requirement calls for full chat history, design and persist messages explicitly.
5. **Security first:** account-scoped records, workspace memberships, role assignment, and sessions must be server-validated. UI labels and user metadata alone are not access controls.
6. **Responsive and accessible:** no initial desktop page overflow on the empty search screen, no clipping on small devices, keyboard support, reduced-motion handling, accessible states in both themes.
7. **Treat #09 as a backend feature set**, not decorative UI. Check Supabase capabilities and dependencies before implementing MFA, session administration, or notification delivery.
8. **Testing:** include meaningful browser regression checks for UI behavior, persisted settings, session boundaries, and empty/loaded states; run lint, typecheck, automated tests, and production build after changes.
9. **Review results without overstating verification.** A green standard CI build does not prove a real multi-user organization, live MFA, or third-party notification delivery unless those were actually exercised.
10. **Do not start based on this document alone.** Wait for the user's explicit implementation instruction; this record intentionally precedes coding.

## Implementation checklist — not yet started

- [ ] #01 CTA/header cleanup
- [ ] #02 Search empty-state minimalism and viewport fit
- [ ] #03 Adaptive composer layout
- [ ] #04 Personalized Overview with real recent searches
- [ ] #05 Application title “Pareto”
- [ ] #06 Authenticated UI visual-system unification
- [ ] #07 Accessible, persistent Light/Dark/System themes
- [ ] #08 Sidebar profile deduplication and search history
- [ ] #09 Complete, backed account settings and security
- [ ] #10 Parito avatar adoption

**Status as of capture:** 10/10 feedback items documented; **0/10 implemented as part of this feedback round**.
