# Pareto Homepage V2 — Design decisions and exceptions

**Authority:** `docs/DESIGN.md` is the exact supplied measured OpenTag study. `docs/DESIGN-OPENTAG-SUPPLEMENT.md` is the exact supplied semantic companion. `docs/DESIGN-LEGACY.md` preserves the release branch's previous Pareto design plan verbatim. `docs/HOMEPAGE-V2-SPEC.md` preserves the supplied project brief.

## Token resolution
- **Canvas:** measured `#FFFDF9` on the page. `#F7F5EF` is a contained warm section surface, not the whole-page canvas. White `#FFFFFF` is reserved for interface windows.
- **Ink:** `#020E24` for primary text, controls and high contrast; `#141414` for readable UI text. Secondary text uses the measured `#4E4E4E`, which retains contrast against ivory and white.
- **Border conflict:** the detailed study records `#3C3C3C` for measured hairlines; do not apply it as a solid all-panel border. Subtle decorative and structural dividers use the semantic `#E7E1D8` or transparent navy strokes, preserving the measured dark border for focused controls.
- **Accent:** the measured purplish `#4A154B` was observed without a portable product role. For Pareto originals, a small cool-blue accent on evidence motifs may use the semantic `#467BEB`; never copy OpenTag's mascot graphics or gradients.
- **Spacing and grid:** follow 24px mobile / 32px tablet gutters and ~124px large-desktop gutters where space allows; marketing content uses a max measure close to the measured 1078px reference (except the wider hero product stage).
- **Type:** the proprietary `stkEarlRegular` font files are not copied. Use local `Georgia` as the license-safe editorial fallback and `Inter` if installed (with a system sans-serif fallback). No fonts from the clone are redistributed.
- **Shapes:** primary controls use 12px radius and ~42–44px height. Secondary badge treatments are lightly rounded; cards are 14px and native disclosures carry clear focus outlines.
- **Illustration:** original front-facing React/CSS product windows and an original folded-document / magnifying-lens SVG motif with no cloned OpenTag assets.
- **Statuses:** explicit `Eligible`, `Excluded`, and `Needs review` labels with icon/word evidence, not colors alone. Synthetic data never represents production recruiting records.

- **Text contrast adjustment:** the measured source contains several pale 9–12px metadata colors. V2 strengthens secondary interface labels to `#62717B` (about 5.0:1 on white) rather than copying inaccessible values; decorative accent strokes remain visually subtle. This is a source-authorized accessibility exception, not a new brand palette.

## Structural and release boundaries
- The new homepage is a standalone marketing component `home-v2.tsx`, replacing only the `/` import in `frontend/src/app/page.tsx`. The old `scroll-landing.tsx`, `marketing.css` and deterministic `preview-data.ts` remain unchanged for rollback.
- No dashboard, APIs, authentication, Prisma, migration, CI, infrastructure, or release settings are edited. This work originates from `integration/release-20261114`.
- The hero and workflow visuals are honest, local synthetic demonstrations. The real protected candidate search is not invoked, and reference-based search is illustrated rather than offered as a live public query.
- FAQ uses native `details`/ `summary` and step navigation uses keyboard-focusable buttons. Motion is decorative and removed under `prefers-reduced-motion`.

## Validation
Browser screenshots and test output must come from actual execution; source-only inspection is not visual verification. Any unrun checks must remain visible in the PR.