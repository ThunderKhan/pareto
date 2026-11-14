# Pareto Homepage V2 typography and OpenTag hero reference

## Measured reference

Source: [ThunderKhan/opentag-clone](https://github.com/ThunderKhan/opentag-clone), not the design brief.

- `src/styles/reference.css` around lines 12072-12094: `stkEarlRegular` @font-face, **400 normal**, WOFF2 and `font-display: swap`; fallback uses Times New Roman with 77.42% ascent, 19.36% descent, 124% size-adjust. Shared `stkEarl` **500 normal** font from around line 11878.
- `src/styles/reference.css` around lines 12185-12236: OpenTag homepage h1 and h2 use **STK Earl Regular 400**, `letter-spacing:-.03em`, h1 `clamp(2.5rem, calc((100vw - 2 * var(--ot-inset))/16), 4.5rem)` and `line-height:1`; h2 `clamp(2.125rem,1.4rem + 2.6vw,3.75rem)` and `line-height:1.02`. Lead uses **Inter** with `line-height:1.5` and `letter-spacing:-.015em`.
- `src/styles/reference.css` around lines 11018-11031: paper `#fffdf9`, ink `#020e24`, body `#4e4e4e`, muted fill `#10101014`, hairline `#020e240f`; responsive inset 24px mobile, 32px at 640px, `clamp(48px,8.6111vw,124px)` at 1024px.
- `src/pages/home.html`: hero heading uses `__display`, hero lead `__lead __heroLead`, top padding **76px mobile / 96px >=640 / 128px >=768**, badge below lead with **24px** spacing, then CTA with **32px** spacing; preview art starts after **88px mobile / 120px >=640 / 136px >=1024**. Two-part white bordered pill uses **14px** Inter (13px mobile), a thin divider on desktop, and true partner logos/endorsements which Pareto must not copy or imply.
- `src/components/header.html`: navigation Inter 14px/500, CTA Inter 16px/500, 42px tall on desktop; mobile menu retained in Pareto.
- `docs/research/INSPECTION.md`: OpenTag uses STK Earl for display headings, Inter for UI, Lato only in special Slack demo contexts. Lato is not needed by Pareto.

## Font authorization and files

On November 14, 2026, the project owner **stated that permission to use STK Earl had been obtained** and explicitly requested its use. This statement is the basis for this implementation. The actual license document and its distribution/web-embedding scope were **not independently inspected** here; the owner is responsible for ensuring the permission covers redistribution via this repository and web embedding in the deployed website.

Pareto locally bundles only the original OpenTag clone's exact **Regular and Medium WOFF2** font binaries at:
- `frontend/public/fonts/stk-earl-regular.woff2` (original Git blob SHA `2408e329aca4d6ae54551bc9a455047f1c585e5a`)
- `frontend/public/fonts/stk-earl-medium.woff2` (original Git blob SHA `d6c0f5de08005ff20472f41ccbbbcee84d805fe8`)

`frontend/src/components/marketing/home-v2.css` declares these as `"Pareto STK Earl"` through @font-face with normal style, 400/500 weights and `font-display:swap`. The font is **self-hosted** at `/fonts/` with no OpenTag font hotlinking. Body/interface use actual [Inter](https://rsms.me/inter/) loaded by Next's self-hosting integration. `Bitter` has been removed.

## Hero badge and interaction

The original OpenTag pill announces Slack Marketplace approval / Y Combinator backing. Pareto makes **no such endorsement claims**. It instead uses two factual product capability labels: **Natural-language search** and **Evidence-backed matching**. Same pill shape, divider, typography and responsive wrapping; different honest content and simple Pareto-relevant icons.

Pareto preserves its existing unique headline and hero CTA destinations; we cannot force the same line breaks as OpenTag's different text. Both CTA arrows remain removed. Product illustration, matching logic, authentication, backend and deployment settings remain unchanged. `prefers-reduced-motion` and keyboard navigation remain respected.

## Validation

`frontend/tests/e2e/marketing-experience.spec.ts` checks font-face loading, STK Earl local resource fetch, Inter, matching badge and responsive viewports. Inspect CI screenshots across 320, 390, 768, 1440 and 1920px for clipping, rhythm and spacing changes.
