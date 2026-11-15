# Pareto — Recruiter Workspace UX Feedback (Round 02: Items 01–10)

> **Captured:** 15 November 2026
>
> **Product:** Pareto — Recruitment Intelligence Platform, Trustume AI Hackathon 2026, team `std::zero`
>
> **Repository / target branch:** [ThunderKhan/pareto](https://github.com/ThunderKhan/pareto) / `main`
>
> **Source:** User's ten numbered feedback messages and accompanying screenshots in the Frontend 03 conversation on 15 November 2026.
>
> **Status:** **All #01–#10 implemented in code on `main`, with a source-level Impeccable/Unslop audit documented. Standard CI passed on the combined implementation; signed-in visual acceptance and actual browser autofill checks remain pending.**
>
> **Implementation tracking:** [Round 02 implementation ledger](./2026-11-15-recruiter-workspace-round-02-implementation-ledger.md).

**This is a NEW round, distinct from** [Round 01 feedback](./2026-11-15-recruiter-workspace-ui-feedback-round-01-10.md) **and** [its implementation history](./2026-11-15-recruiter-workspace-implementation-01-09.md). The previous round's ten numbers must not be confused with this round's ten numbers. The initial capture preceded implementation, as requested. The user first approved **#01–#05**, then explicitly approved **#06–#10**. All ten have now been implemented in source on `main`. The #10 audit was a **manual source-level** application of published Impeccable and Unslop guidance; standalone detector tooling and live authenticated screenshot checks were not available.

## Feedback index

| Round 02 # | Surface | User request | Status |
| --- | --- | --- | --- |
| 01 | Account settings header | Fix awkward/cropped Parito profile avatar beside “Your profile.” | Implemented in code; signed-in visual QA pending |
| 02 | AI candidate search/chat | Show Parito on the left in the conversational/chat experience | Implemented in code; signed-in visual QA pending |
| 03 | Account settings > Notifications | Vertically align each checkbox with its label | Implemented in code; signed-in visual QA pending |
| 04 | Authenticated app theme | Replace pervasive bluish dark surfaces with an intentionally designed premium near-black scheme | Implemented in code; signed-in visual QA pending |
| 05 | Empty AI candidate search | Replace generic blue orb with original Parito mascot, preferably in a circle | Implemented in code; signed-in visual QA pending |
| 06 | Hiring-brief composer | Replace tall form-like input with compact ChatGPT-style expanding chat composer | Implemented in code; authenticated QA pending |
| 07 | Reference candidate selection | Redesign the oversized in-timeline Reference form and avoid awkward nested scrollbars | Implemented in code; authenticated QA pending |
| 08 | Manual criteria / draft review | Redesign oversized spreadsheet-like criteria editor, preferably a drawer/sheet | Implemented in code; authenticated QA pending |
| 09 | Login email input | Remove or seamlessly integrate partial blue browser-autofill background | CSS implemented; actual saved autofill QA pending |
| 10 | Entire authenticated UX + auth/dropdowns | Full Impeccable + Unslop/anti-UI-slop audit; implement grounded findings only after go-ahead | Manual source audit and prioritized fixes implemented; live QA pending |

---

## #01 — Refine the account-settings header avatar

**Observed:** The Parito account avatar adjacent to the very large “Your profile.” heading appears cropped, awkwardly proportioned and visually disconnected from the typography. The screenshot shows only a partial blue mascot/container.

**Request / design intent:**
- Rework its actual crop, scale, container, alignment, and spacing relative to the page heading and eyebrow.
- Use the existing official **Parito** mascot asset, not a generated substitute or initials.
- Determine whether it should sit next to the headline, above it, or in a subtle contained badge based on the available space; do not make the character unrecognizable.
- Avoid huge ornamental mascot blocks competing with the content.
- Test light/dark themes, 320–390px mobile, tablet and desktop, and longer or wrapped headlines.
- Preserve account identity, accessible headings, and the already functioning profile/MFA/settings behavior.

**Acceptance:** The entire recognizable mascot fits the intended visible area, maintains proportion, and aligns cleanly with the header on desktop and mobile without clipping or stretching.

## #02 — Parito at the left of conversational content

**Observed/requested:** The AI candidate search currently looks more like a collection of form cards than a conversation. The user wants the mascot “on the left, like chats”.

**Request / design intent:**
- Add a restrained Parito avatar **to the left of assistant/system turns** in active search conversations (e.g., interpretation responses, review guidance, search updates/results as appropriate).
- Distinguish recruiter messages (e.g., right-aligned hiring brief) from Pareto responses; do not mechanically place the mascot on every candidate result card or use it as an individual candidate's avatar.
- Prefer the existing `/mascot/pareto-mascot.svg` and one reusable, accessible avatar component.
- Maintain vertical alignment, sensible gutters and stable layout while content expands/scrolls. Keep the chat composer persistent and don't insert duplicate mascot markers into every nested panel.
- Decorative mascot images must not produce redundant screen-reader announcements when the assistant message is already identified in text.

**Acceptance:** Active conversation clearly communicates user vs Pareto turns, with recognizable Parito on the left of assistant content, no overflow, and no changes to owner-scoped candidate data or chat confirmation semantics.

**Open design detail:** Exact turn grouping has not been chosen. Audit the current search timeline before introducing a second message model; the current backend does not store a full ChatGPT-style transcript.

## #03 — Fix misaligned notification checkboxes

**Observed:** In `/dashboard/profile` → **Notifications**, checkbox squares sit lower than their corresponding label text. This appears in the provided dark-mode screenshot, especially for “Notify when a new candidate search is confirmed” and “Notify when a confirmed search is refined”.

**Required changes:**
- Make each checkbox and its label one well-aligned row; use flex/grid `align-items: center` or appropriate input/label alignment instead of relying on inherited line height/baseline.
- Keep comfortable spacing between rows and the Save notification preferences button.
- Preserve large enough click/touch targets, semantics (clicking label toggles checkbox), keyboard focus rings, disabled/saving state, and legible contrast in both themes.
- **Do not change** actual notification preference names or persistence behavior.

**Acceptance:** Both checkbox centers align vertically with their label text across light/dark, desktop/mobile, and 100%/zoomed views.

## #04 — Purpose-built premium near-black dark theme

**Observed:** Current dark mode is dominated by bluish navy across backgrounds, sidebar, content panels and controls, giving the workspace insufficient neutral separation. User explicitly invites creative refinement instead of a direct color substitution.

**Chosen direction to explore:** Neutral near-black graphite canvas with clearly differentiated charcoal surfaces, thin low-contrast borders and restrained blue/cobalt accents reserved for interactive emphasis. The existing approved Pareto landing-page brand remains the design reference.

**Exploration palette (not finalized production tokens):**

| Role | Direction | Exploratory hex |
| --- | --- | --- |
| Main canvas | Near-black, neutral | `#0B0C0F` |
| Panels / menus | Charcoal | `#17191E` |
| Borders / separators | Graphite | `#292D35` |
| Active accent | Controlled cool blue | `#92B4FF` |

**Requirements:**
- Audit and retune the **full authenticated workspace**, not only the profile page: Overview, AI candidate search and composer, candidate library/details, profile/security/notifications, nav/sidebar/topbar, dropdowns, search-analysis panels, empty/error/loading states and focus/hover/disabled states.
- Provide readable surface hierarchy and accessible contrast for text, semantic errors/warnings/success, checkboxes, inputs and buttons.
- Keep actual **Light / Dark / System** switching and persisted preference working, including OS system theme and first-load no-flash behavior.
- Avoid pure pitch black everywhere, oversaturated blue chrome, indiscriminate inversion, decorative gradients and new marketing UI.
- Respect reduced-motion. Verify responsive layout and long text.

**Acceptance:** Dark mode reads as a cohesive, premium near-black Pareto product, not a blue-tinted SaaS skin; every authenticated route, popup and form remains usable and legible. **Do not redesign the public landing page.**

## #05 — Replace the generic search orb with Parito

**Observed:** The blue gradient dot-spinner/orb above **“Who are we looking for?”** feels generic. User requests their existing, original mascot instead.

**Direction:** Prefer a clean, contained **circular Parito badge**. A softly scalloped/multipoint seal is an alternate concept only if demonstrably better; the user leaned toward a circle. Do not silently replace the official mascot artwork.

**Requirements:**
- Replace the initial/fresh search ornamental orb with the existing mascot in a carefully proportioned badge. Match the landing's mascot styling, not a pasted unrelated illustration.
- Review whether loading/working states also use mascot treatment; any motion should be subtle, purposeful, disabled with reduced-motion, and not obscure loading status.
- Avoid clipping the face and keep clear space around the headline.
- Pair coherently with feedback #01 (avatar) and #02 (chat messages) via a shared visual treatment where practical.

**Acceptance:** The first search state features recognizable Parito instead of a generic gradient orb; responsive and light/dark presentations are visually balanced and animation/accessibility remain correct.

## #06 — Compact ChatGPT-inspired hiring-brief composer

**Observed:** The “Hiring brief” box is unusually tall with a long example placeholder and separated controls. User references the compact ChatGPT composer as a layout/interaction benchmark, **not** a request to copy exact trademarked assets or unrelated actions.

**Requirements:**
- Replace the oversized fixed-area appearance with a compact rounded conversation input and a short actionable placeholder, e.g., **“Describe the candidate you’re looking for…”**.
- Allow textarea to grow with entered content up to a reasonable max height; then scroll inside it as needed, without jumping the overall workspace.
- Place **Reference**, **Enter criteria manually**, and send/Extract controls in a clean compact control row or equivalent responsive layout. Preserve all three real actions.
- Maintain current keyboard contract (Enter sends; Shift+Enter inserts a line break; composition/IME safe) or document/test an intentional change before shipping.
- Send button accurately reflects empty/invalid/busy states; preserve focus and typed text through fresh → active transitions.
- Use landing-derived typography, border radii, restrained borders, focus ring, and mobile touch targets.
- The active state must remain bottom-anchored without covering content, particularly in conjunction with #07 and #08.

**Acceptance:** Input is visually compact when empty, expands naturally while typing, supports keyboard/touch, and leaves all existing search/refinement functionality intact.

## #07 — Reference Search as a compact candidate picker, not an in-timeline form

**Observed:** The current **Reference** button inserts a second oversized “Find candidates like someone” form into the conversation. The long panel, bottom composer and internal scrollbar compete for limited viewport height.

**Approved planning direction, still subject to implementation QA:**
1. Click **Reference** in the composer → open a floating **candidate picker/popover** anchored above the composer.
2. The picker contains one clearly labeled candidate-name search input (no repetitive heading + duplicate label), a brief loading/empty/error presentation, and results from the real owner-scoped candidate lookup.
3. Display candidate **name, role and city** in compact scan-friendly rows. Selecting a result closes the picker and runs the established `referenceDraft` pathway into human review.
4. Desktop: popover/floating surface with a bounded list; mobile: compact bottom sheet or viewport-constrained equivalent, without obscured controls.
5. Dismiss with Escape, outside click, a visible Close control; return focus to the triggering action. Maintain keyboard navigation and accessible status/labels.
6. Keep only **one** active overlay (reference picker OR criteria editor). Preserve candidate self-exclusion and ownership checks.
7. Do not introduce multiple nested page scrollbars or permanently alter the scroll position of the fresh-chat viewport.

**Visual requirement:** Match the approved Pareto landing typography (editorial display for major titles, legible sans-serif controls), spacing, text sizes, navy/ivory/cobalt light palette, near-black revised dark palette, restrained border/radii and genuine focus states.

**Acceptance:** Reference selection feels like lightweight search, not a new page; user can find, select, cancel and restart without scrolling through stacked forms, losing their hiring brief or bypassing confirmation.

## #08 — Manual Criteria and AI-draft review redesign

**Observed:** The current **Enter criteria manually** creates an oversized in-timeline “Review draft criteria” panel, with spreadsheet-like horizontal rows for Field, Priority and Value, awkward inline “Exclude skill” and “Remove criterion 1” controls. It can stack beneath the already-open reference form while the composer stays visible, producing intrusive nested scrolling.

**Planned direction: A single dedicated criteria editor surface.**
- Use a **right-side drawer on desktop** and a **full-screen or comfortable-height sheet on mobile**, rather than a large new timeline card.
- Use the **same underlying editor** for manually entered criteria, AI-interpreted draft review, refinements and suggestions from Search Health / What-if / Near-match.
- Render each criterion as a compact, readable unit with coherent Field, Required/Preferred, value(s), optional skill exclusion and Remove controls. Use real labels and visible per-rule error guidance; never hide important data behind hover-only behavior.
- Group or arrange rules for scanning while preserving their types, full values, aliases and required/preferred semantics. Avoid unnecessary icons, big analytics cards, giant blank rows and repeated headings.
- Keep **Add criterion**, **Confirm Search**, **Discard draft**, warnings, actual diffs and reference-context information available; make destructive actions distinct and clear.
- Only **Confirm Search** persists a new search revision. Closing the drawer/discarding must preserve the current confirmed results and not silently save.
- Opening this editor closes the Reference picker; reopening the picker must not leave a hidden draft/form trapping focus. Keyboard Escape, focus trap/restore, screen-reader headings and small-screen scroll must be designed intentionally.
- Preserve the original `CriteriaEditor`, `openDraft`, `confirmSearch`, `sessionId`, `expectedVersion` and fresh request-ID protections rather than creating a parallel save path.

**Visual requirement:** Apply the approved landing-page type hierarchy, functional Inter text, consistent spacing/padding, sensible input sizes, compact professional cards/rows, light and revised dark palettes, proper breakpoints and accessible focus/disabled/error states.

**Acceptance:** Manual and AI review both use one coherent, responsive editing workflow; no stacked competing forms, clipped controls, confusing scrollbar or unreviewed persistent changes.

## #09 — Normalize login email autofill appearance

**Observed:** On the login form, email appears with a pale-blue autofill-style fill covering only the editable portion, leaving its trailing in-field “Email” label on a different background. Password remains white, making the layout visibly inconsistent.

**Likely cause (to verify during implementation):** Browser autofill painting applied to the native input while the surrounding custom container/label uses a separate background. Do not claim the exact CSS cause without inspection.

**Requirements:**
- Prefer a uniform email/password surface in their default, focused, typed and browser-autofilled states, across light/dark where applicable.
- Remove the undesirable blue rectangle or make the **entire relevant input control** appear seamless; the earlier recommendation was to suppress the blue autofill fill while preserving clear focus indication.
- Keep high text/background contrast even for browser-restored credentials, password manager fill, and selection highlight.
- Do **not** disable autocomplete, break password managers or modify authentication/OAuth logic.
- Verify Chrome/Chromium autofill plus ordinary typing, mobile input size, labels, keyboard focus and accessibility.

**Acceptance:** No partial blue segment or white/blue mismatch in the email field; forms remain usable with autofill and password managers.

## #10 — Full Impeccable + anti-UI-slop (Unslop) audit and follow-through

**User request:** Carry out a full audit of the **Overview/dashboard**, **recruiter profile/account settings**, **AI candidate search**, **candidate library**, and the **login / account menu / notification dropdown** surfaces using the same design skill approaches used previously. The user wants **the resulting justified fixes implemented on `main`**, but specifically instructed that **first we only record this feedback; do not execute the audit or implement fixes yet**.

**Skill references / precedence:**
- **Impeccable** by Paul Bakaus: https://github.com/pbakaus/impeccable — existing project use documented in [AUTH-IMPECCABLE-UNSLOP-REVIEW.md](../AUTH-IMPECCABLE-UNSLOP-REVIEW.md) and [HOMEPAGE-IMPECCABLE-UNSLOP-REVIEW.md](../HOMEPAGE-IMPECCABLE-UNSLOP-REVIEW.md).
- **Unslop** by Damir Sokolovsky: https://github.com/heydamir/unslop / https://heydamir.design/unslop — the repository's established anti-UI-slop reference.
- Before claiming to **use a skill**, load the actual available installed skill and instructions, or use the verified source principles with explicit attribution. Do not claim a CLI detector ran if only a manual/source audit happened.

**Audit scope:**
1. **Dashboard Overview:** personal greeting, search history, empty/loading/error states, sidebar, information hierarchy and spacing.
2. **AI candidate search:** fresh/active chat, composer, left-side assistant mascot, Reference picker, criteria editor, results, evidence, near-match, Search Health and What-if panels; follow-up/confirm flow and scrollbar behavior.
3. **Candidate library/details:** search/list/detail hierarchy, dense candidate data, navigation, empty/error states, small-screen readability, evidence and accessible status cues.
4. **Account settings/profile:** profile header mascot, professional fields, security/MFA/session UI, appearance theme, notification checkboxes and saved preferences.
5. **Chrome and auth:** desktop/mobile sidebar/topbar, **notification bell/dropdown**, account/login dropdown or account menu, login/signup shared auth form, autofill/focus behavior.
6. **Both Light and Dark** themes across the above, at desktop/tablet/mobile widths and compact heights, including keyboard-only navigation, reduced-motion, long text and actual loading/error states.
7. **Consistency with the approved Pareto landing page:** serif display type, functional Inter, intentional composition, restrained accents, spacing rhythm, exact icons and precise button/surface treatment. **Landing page itself is not the redesign target.**

**Audit deliverable (when authorized):**
- A prioritized **P0/P1/P2/P3** finding table with route/component, symptom, why it is harmful, evidence/screenshot or DOM/source location, proposed minimal change, and verification.
- Explicitly distinguish **verified problems**, **inferences to test** (e.g. autofill paint), and **subjective visual choices**.
- Run bounded Impeccable audit/craft/accessibility and Unslop spacing/color/type/copy/icons/layout/details/visuals/motion checks; preserve purposeful brand exceptions.
- Consolidate shared design tokens/components instead of accumulating CSS override debt. Remove filler, duplicate elements, gratuitous chips/cards/icons, thin low-contrast text and ungrounded copy; improve focus and component alignment.
- Then implement prioritized, scoped fixes directly on **`main` only after the user's explicit go-ahead**, with tracked commits and honest test results. Don't silently redesign functional workflows or introduce unrelated backend features.
- Produce/update an audit result document with what was audited, changes made, what was deliberately left unchanged and what remains externally unverified.

**Acceptance:** A reviewable, evidence-based cross-route audit and matching, implemented refinements—not a vague “looks better” claim. No inventing that live authenticated flows were tested if CI skipped them.

---

## Shared implementation guardrails (apply only AFTER authorization)

1. **Source of truth and round isolation:** This is feedback **Round 02**; Round 01 was already implemented. Do not reset it, duplicate old tasks or change previous feedback history.
2. **Preserve the public Pareto landing page:** Use it as a **design benchmark**, not a rewrite target. Preserve the original mascot art and product character.
3. **Preserve working application behavior:** Supabase login/signup, MFA, sessions, saved account settings and notification delivery; natural-language search, reference search, editable criteria, confirmation boundary, revisions, private evidence, candidate library, Search Health, What-if and Near-match.
4. **Single confirmation boundary:** Hypothetical suggestions, editor openings and simulations never persist until the independent **Confirm Search** action. Preserve optimistic version checks and correct request IDs.
5. **No fictitious UI data:** Actual candidate names, counts, search history, roles and notifications must come from authorized backend data. Do not hardcode tutorial examples into production UI.
6. **Responsive and accessible:** Test 320, 390, 768, 1440 and 1920px where useful; compact viewport height, browser zoom, keyboard, semantic roles, mobile touch targets, error/success/loading states, reduced motion, light/dark.
7. **Implementation sequence suggested:** first a bounded whole-app audit (#10), then shared visual tokens/theme (#04), reusable Parito treatments (#01/#02/#05), composer/layout and overlays (#06/#07/#08), focused checkbox/autofill fixes (#03/#09), integration QA. This sequence is a proposal, not authorization.
8. **Verification:** run lint, TypeScript, backend tests, production build and Playwright; add specific regression tests for these ten issues. GitHub CI may skip authenticated recruiter journeys without dedicated Supabase test credentials; document that limitation rather than claiming full signed-in QA.
9. **Data/security:** no unrequested Prisma migrations, new AI providers, sharing/authorization changes, synthetic records or unapproved deployments.
10. **User approval required:** This file is a durable handoff only. **Do not start implementation until the user expressly says to.**

## Implementation checklist — all ten implemented in source; live visual verification outstanding

- [x] #01 Profile-header Parito avatar composition fixed
- [x] #02 Left-side Parito added beside grouped assistant responses
- [x] #03 Notification checkbox rows vertically aligned
- [x] #04 Near-black graphite dark system implemented (live visual QA still pending)
- [x] #05 Generic search orb replaced with recognizable Parito
- [x] #06 Compact auto-growing chat composer shipped
- [x] #07 Reference picker redesigned and keyboard/mobile checks added (live run pending)
- [x] #08 Unified criteria drawer/sheet shipped; explicit confirmation preserved
- [x] #09 Login autofill CSS corrected (real saved-autofill verification pending)
- [x] #10 Manual Impeccable/Unslop source audit documented and prioritized fixes implemented; CLI/live browser not run

**Round 02 status after second authorization:** **10/10 recorded; 10/10 implemented in source on `main`. Published-guidance source audit completed and documented. Live authenticated visual QA remains outstanding.** Previous Round 01 implementation is unaffected.

## Implementation update — authorized feedback #01–#05

On 15 November 2026 the user explicitly authorized implementation of **only** items #01–#05. The application changed as follows:

- [`c4975c1`](https://github.com/ThunderKhan/pareto/commit/c4975c1cbd21becab553f0c24a12872d698e989e): Parito uses full-frame `object-fit: contain` rather than the oversized cropped image in profile/sidebar; normalized 19px checkbox sizing and centered row alignment; replaced the generic orb with a circular Parito badge and purposeful request-only progress indicator.
- [`9abb43d`](https://github.com/ThunderKhan/pareto/commit/9abb43d0d154b585b7c606a9b4c5b5bbc598f278): one left-aligned Parito marker for assistant output in the active search timeline, without pretending candidate portraits are product avatars.
- [`08d4866`](https://github.com/ThunderKhan/pareto/commit/08d4866a554f7282ce0a055c3f2e9728df777440): graphite near-black dark theme for existing authenticated routes and menus, preserving existing Light/Dark/System preference logic.
- [`858e795`](https://github.com/ThunderKhan/pareto/commit/858e795cdf83e8b69ce4486032b26708e39e41b3): added authenticated Playwright assertions for mascot framing, notification row geometry, dark theme and chat placement; these tests need dedicated recruiter credentials to execute.

Standard CI for the #01–#05 implementation passed. The **authenticated browser suite is configured to skip without dedicated Supabase credentials**, so implementation should not be described as fully screenshot-verified yet. A separate subsequent user instruction authorized #06–#10, documented below.

## Implementation update — authorized feedback #06–#10

The user explicitly authorized the second batch after #01–#05. Completed code work:

- **#06:** `frontend/src/components/search/workspace.tsx` and `round-02.css`: short placeholder, one-row auto-growing chat textarea, compact toolbar, unchanged Enter/Shift+Enter/AI-provider behavior.
- **#07:** Same search workspace: bounded, on-demand owner-scoped name lookup, keyboard ArrowDown/Escape, outside-click close, candidate role/location rows, preserved reference-based draft path.
- **#08:** Reused `CriteriaEditor` now renders structured rule cards. A single right-side review drawer (mobile full screen) covers manual/AI/refinement/suggestion drafts with explicit Confirm Search/Discard, focus trap, responsive layout, and existing version/request-ID protections.
- **#09:** `frontend/src/components/auth/auth.css` normalizes Chromium autofill's inner-input paint to the containing white auth field without disabling autocomplete or password managers.
- **#10:** `docs/FRONTEND-IMPECCABLE-UNSLOP-AUDIT-ROUND-02.md` contains the source-level prioritized audit and implementation/verification evidence. The cross-route fixes include an invisible mobile New search action, loading vs empty candidate library, Escape/outside dropdown dismissal, selected-row semantics, and keyboard focus/metadata legibility.

**Audit caveat:** Impeccable/Unslop published design guidance was applied manually to repository source and the user's screenshots; their standalone detector/CLI and a live signed-in screenshot loop were **not** run. Authenticated tests were added and will execute when the dedicated recruiter credentials are configured. **No new database migration** was introduced.
