# Homepage V2 typography — source evidence and licensing

## Source of truth inspected

Original captured site: [ThunderKhan/opentag-clone](https://github.com/ThunderKhan/opentag-clone). These are source CSS/HTML rules, **not** values copied from the Pareto design documents:

- `src/styles/reference.css`, approx. lines **12185–12215**, `.v2-module__K2wbAW__display`, `__h2`, `__lead`: the homepage's editorial typography uses `--font-stk-earl-regular` (STK Earl **Regular 400**). The main hero uses `clamp(2.5rem, calc((100vw - 2 * var(--ot-inset)) / 16), 4.5rem)`, `line-height: 1`, `letter-spacing: -.03em`. Section h2 uses `clamp(2.125rem, 1.4rem + 2.6vw, 3.75rem)`, `line-height: 1.02`, `letter-spacing: -.03em`. Lead uses Inter, `line-height: 1.5`, `letter-spacing: -.015em`.
- `src/styles/reference.css`, approx. lines **843–936**, `.ot-display`, `.ot-h2`, `.ot-label`, `.ot-label-button`: general/shared display typography uses STK Earl **Medium 500**. Body and navigation use Inter. `.ot-label` is `14px/20px` at weight 500; `.ot-label-button` is `16px/22px` at weight 500; typical body uses 16px/24px, `letter-spacing:-.04em`.
- `src/styles/reference.css`, approx. lines **11018–11031**, `--ot-inset`: 24px mobile; 32px from 640px; `clamp(48px, 8.6111vw, 124px)` from 1024px, used to compute the hero type scale. The same source defines Inter variable WOFF2 at 100–900, STK Earl Regular 400 and Medium 500, all normal (upright), `font-display: swap`; no licensed STK Earl italic face is evidenced.
- `src/pages/home.html`: hero h1 `v2-module__K2wbAW__display`; its lead uses `__lead __heroLead`, and section headings `__h2`. The page includes the Regular font variable class and shared Medium variable. The source hero's product-specific line breaks differ from Pareto's copy and should not be forced.
- `src/components/header.html`: main navigation `ot-label`, link typography at 14px/20px and weight 500; header CTA at 16px/22px and weight 500 (38px mobile, 42px wider). `src/components/footer.html` uses mostly font-inheriting utilities; no independent headline font-face declaration.
- `docs/research/INSPECTION.md` confirms STK Earl headings, Inter UI, and Lato in Slack demos. No Slack-styled UI exists on Pareto's homepage, so Lato is **not** loaded.
- Screenshots `docs/research/screenshots/source-desktop.png` and `source-mobile.png` were visually inspected. The original OpenTag typographic proportions rely on font-specific metrics; a different face will not exactly reproduce them.

## Licensing: exact STK Earl is not authorized

The captured clone contains STK Earl Regular/Medium WOFF2 reference copies; it does **not** provide an applicable license granting redistribution and web embedding into Pareto. STK Earl is offered commercially by Smuss Type Kiosk (see [STK Earl font listing](https://inspotype.com/directory/typefaces/stk-earl) and [commercial font details](https://www.whatfontis.com/OTH_STKEarl-Medium.font)). **Do not copy, bundle or hotlink these proprietary binaries without a separate confirmed license.**

Pareto uses [**Bitter**](https://fonts.google.com/specimen/Bitter), an open-source **SIL OFL 1.1 slab serif** (variable, regular 400 and medium 500 available) in place of STK Earl. It preserves the reference's slab classification, editorial feel and 400-weight headline hierarchy, but **is not metrically or visually identical** to STK Earl. UI and body use [**Inter**](https://github.com/rsms/inter), also SIL OFL 1.1. Both fonts are loaded via Next.js 16.4.6 `next/font/google`, which downloads fonts at build time and self-hosts `/_next/static/media/*.woff2` files; browser visitors do not contact Google Fonts or OpenTag.

## Pareto implementation boundaries

- Only homepage-specific typography changed; the same h1 text, seven sections, controls, product illustrations and navigation destinations remain.
- `frontend/src/app/page.tsx` creates two font variables and passes their generated CSS class names into the existing homepage root. Protected pages are not re-styled.
- `home-v2.css` uses the **source's actual display size formula, tracking, 1.0 hero line-height, section h2 formula, lead line-height and label/button specifications**. The comparison board / synthetic product workspace retain their compact Inter UI metrics; no source Slack demo style is copied.
- The source does not demonstrate italic STK Earl headings, and the clone only has upright Regular and Medium. Pareto retains semantic `<em>` emphasis but renders it upright in the same display font, with a color difference, avoiding synthetic italic.
- At widths below 360px, Pareto retains the existing 36px h1 safety rule due to its different longer copy; the original OpenTag 40px minimum cannot be transferred blindly without possible clipping. Header CTA likewise keeps compact mobile sizes due to differing text/available width.
- Browser checks in `frontend/tests/e2e/marketing-experience.spec.ts` assert **computed actual font family**, loaded FontFace status, self-hosted WOFF2 network responses, no STK Earl requests and no synthetic italic. Separate existing responsive tests cover 320/390/768/1440/1920px and overflow.

## Limitations

These are verified CSS-source measurements combined with Pareto browser-computed measurements. The font **shape and precise wrapping** of STK Earl cannot be reproduced without legal access to STK Earl, and success on this substitute is not an STK Earl licensing claim. The Next font build uses a supported Next.js integration; it does not manually vendor third-party font files or pin a particular upstream Google font revision.
