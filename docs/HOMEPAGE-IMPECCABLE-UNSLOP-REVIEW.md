# Pareto homepage — Impeccable and Unslop refinement

**Date:** 2026-11-14
**Scope:** public Next.js homepage at `/`; preserves app, authentication, API, database and deployment behavior.

## Source skills and attribution

- [Impeccable](https://github.com/pbakaus/impeccable), by Paul Bakaus (Apache-2.0): audit, polish, craft floor, layout and responsive guidance.
- [Unslop](https://github.com/heydamir/unslop), by **Damir Sokolovsky** (CC BY 4.0), [heydamir.design/unslop](https://heydamir.design/unslop): diagnostic signs, direction and the nine-pass refinement method.

This implementation follows the two skills' recommendations; neither skill's source code is copied into Pareto.

## Design direction

- **Product:** natural-language candidate discovery with editable criteria and evidence-based match explanations for recruiters.
- **Character:** considered, exact, gently playful.
- **Visual world:** ivory, navy, measured blue; serif marketing headlines and functional sans-serif UI.
- **Visual focus:** an original mascot and a real-looking recruiter workflow; not decoration scattered across cards.
- **Signature detail:** matching evidence and uncertainty remain visible rather than being hidden behind scores.

This is a **refinement pass**. It deliberately preserves the user's established page layout, custom mascot and eye-tracking behavior, navy/ivory palette, navigation, FAQ, and bluish atmospheric footer.

## Source-level findings and fixes

| Severity | Finding | Change |
| --- | --- | --- |
| P1 | Mobile carousel pagination uses 9 × 9 CSS pixel controls. | 44 × 44 touch targets; visual indicators remain small. |
| P1 | Recruiter previews and status labels contain 9–11px text, undermining legibility. | Key evidence labels are 12–13px at desktop; mobile candidate rows have an 11px floor with wrapping. |
| P2 | A disclosure below the hero preview added visual clutter. | Removed the extra caption; the FAQ retains a clear explanation that candidate examples are fictional. |
| P2 | Marketing and evidence metadata use wide tracked all caps. | Sentence-case labels, reduced tracking, consistent neutral text roles. |
| P2 | Small FAQ and footer links use condensed negative tracking. | Normal tracking on small reading text. |
| P2 | Final CTA mascot bobs forever; footer letters declare `will-change` at rest. | CTA mascot stays still until hovered; no persistent GPU layer hints. |
| P2 | Scroll-selected trust demo uses a live region, potentially announcing changes unsolicited. | Preserve active-step state and semantic controls without auto live announcements. |

## Nine-pass treatment

1. **Spacing:** preserved the established page rhythm; retained visible separation of sections and controls.
2. **Color:** retained ivory/navy/blue and reinforced a quiet text token.
3. **Icons:** reused existing Phosphor and original mascot artwork; no emoji or new icon tiles.
4. **Copy:** changed shouty metadata to sentence case, removed a distracting demo caption, and retained the factual explanation in the FAQ.
5. **Type:** made evidence readable and removed negative tracking on small text.
6. **Layout:** enlarged carousel hitboxes without enlarging dots or breaking the mobile grid.
7. **Details:** improved control sizing and removed unneeded layer hints.
8. **Visuals:** kept the candidate workflow and mascot as distinct, product-specific imagery.
9. **Motion:** kept hover and pointer-tracking behavior, stopped an unrelated perpetual float.

## Intentional exceptions

OpenTag-inspired editorial serif type, the blue/ivory brand colors, the hero mascot interaction, and the soft bluish footer atmosphere are explicit user choices. Generic anti-pattern checks cannot override these. No new routes, arbitrary investor badges or statistics were introduced.

## Verification

Playwright tests cover disclosure, candidate evidence type size, 44px carousel hitboxes and idle-motion behavior. Existing checks cover responsive layout, keyboard navigation, auth destinations, the recruitment preview and production build.

**Limit:** Source-level and CI browser checks are not a substitute for a physical-device test or a manually reviewed screenshot. Report those separately when they are performed.
