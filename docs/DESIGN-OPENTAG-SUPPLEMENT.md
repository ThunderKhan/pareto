---
version: alpha
name: OpenTag
description: A playful, light SaaS landing-page system with editorial headlines and calm utility UI.
colors:
  primary: "#020E24"
  secondary: "#141414"
  tertiary: "#467BEB"
  neutral: "#FFFFFF"
  surface: "#F7F5EF"
  on-surface: "#141414"
  muted: "#5F5A57"
  border: "#E7E1D8"
  accent: "#467BEB"
  error: "#D64545"
typography:
  headline-display:
    fontFamily: "stkEarlRegular"
    fontSize: "72px"
    fontWeight: 400
    lineHeight: "72px"
    letterSpacing: "-0.03em"
  headline-xl:
    fontFamily: "stkEarlRegular"
    fontSize: "52px"
    fontWeight: 400
    lineHeight: "61px"
    letterSpacing: "-0.03em"
  headline-lg:
    fontFamily: "stkEarlRegular"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: "52px"
    letterSpacing: "-0.03em"
  headline-md:
    fontFamily: "Lato"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: "46px"
    letterSpacing: "0px"
  headline-sm:
    fontFamily: "-apple-system"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: "34px"
    letterSpacing: "0px"
  body-lg:
    fontFamily: "Inter"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: "30px"
    letterSpacing: "-0.04em"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0px"
  label-lg:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "0px"
  label-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0px"
  label-sm:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.02em"
  button:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0px"
  nav:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0px"
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0px"
rounded:
  none: 0px
  sm: 6px
  md: 12px
  lg: 20px
  xl: 24px
  full: 9999px
spacing:
  xs: 6px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 112px
  gutter: 132px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "13px 20px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "13px 20px"
    height: "42px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  navbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  banner:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
---

# OpenTag

## Overview
OpenTag feels like a friendly, modern SaaS brand with a slightly whimsical personality. The page balances a premium editorial headline style with simple utility UI, making it feel approachable rather than corporate. The overall composition is airy and spacious, with strong central focus and restrained supporting elements.

## Colors
- **Primary (#020E24):** A deep navy ink used for the main CTA, top navigation emphasis, and strong text contrast. It gives the system its seriousness and anchors the otherwise playful illustration style.
- **Secondary (#141414):** A near-black used for body copy and general on-surface text. It reads as crisp and neutral without feeling harsh.
- **Tertiary / Accent (#467BEB):** A vivid blue used for the brand mark and illustrative accents. It provides energy and a friendly, tech-forward feel.
- **Surface (#F7F5EF):** A warm off-white page background that softens the layout and prevents the UI from feeling sterile.
- **Neutral (#FFFFFF):** Pure white used for cards, pills, and inset surfaces, especially where contrast against the warm background is needed.
- **Border (#E7E1D8):** A subtle warm divider color for outlines, separators, and low-emphasis component edges.
- **Muted (#5F5A57):** Support text and secondary UI copy should use a softened gray-brown tone rather than a cool gray, matching the warm page surface.
- **Error (#D64545):** Reserved for validation, destructive actions, and alert states; not prominent in the landing page but necessary for product UI.

## Typography
The typography system mixes a distinctive serif display face with clean sans-serif utility text. `stkEarlRegular` drives the hero and section headlines, giving the page its editorial, premium character; the large negative letter-spacing tightens the display composition. `Inter` handles body text, buttons, labels, and navigation for readability and product clarity. Supporting display sizes may use `Lato` or system sans styles where a lighter, more neutral emphasis is needed, while `JetBrains Mono` is appropriate for code-like or technical metadata if needed.

Headlines should stay elegant and large, with minimal weight variation and carefully controlled line height. Body copy should be comfortable, medium-sized, and slightly compact in spacing to maintain the dense-yet-airy landing-page rhythm. Labels and buttons should remain semibold for clarity, with only modest letter-spacing; avoid all-caps unless a component specifically needs a micro-label treatment.

## Layout
The layout is centered and fixed-max-width rather than fully fluid across the entire viewport. Large vertical breathing room separates the hero, social proof, and product preview, with the `xl` and `gutter` spacing values used to preserve a spacious landing-page cadence. Content blocks are aligned to a clean center axis, while navigation and CTA clusters use smaller spacing to keep the header compact and efficient.

Use generous section padding and moderate internal padding on cards, chips, and pills. Horizontal spacing should feel controlled and symmetrical, with `sm` and `md` tokens used for inline groupings and `lg` to `xl` for section separation. Cards and embedded screenshots should sit comfortably inside the layout without crowding edges.

## Elevation & Depth
The system is mostly flat and light, relying on contrast, white surfaces, and subtle shadows rather than heavy depth. Small shadows are used to lift cards, pills, and embedded UI previews just enough to separate them from the warm background. Borders are soft and minimal; they should support structure without making components feel boxed-in.

Use tonal layering sparingly: warm background, white surfaces, then deep navy or black text for hierarchy. The strongest visual emphasis comes from contrast and typography, not from dramatic elevation. Avoid large, glossy shadows or complex gradients.

## Shapes
The shape language is friendly and rounded. Buttons use a medium radius, cards use a larger radius, and pills/chips use full rounding to create a soft, approachable feel. Overall geometry should avoid sharp corners except where functional detail demands it.

Interactive controls should feel tactile but not bubbly. The radius scale should remain consistent across the interface so that buttons, inputs, and containers feel like part of one system. For product chrome, slightly larger radii help the UI match the playful illustration style.

## Components
Buttons follow a clear hierarchy. `button-primary` is the dominant CTA: dark navy background, white text, medium rounded corners, and a compact 42px height. `button-secondary` is a light/neutral action with the same sizing but transparent background and dark text, used for lower-emphasis actions like “Book a demo.” `button-tertiary` should be reserved for text-only actions and links, with minimal padding and no visible container.

States should stay understated: hover can darken or deepen the background slightly, but avoid animated flourishes. Button padding should remain balanced horizontally, and label text should stay sentence case. Avoid full-width buttons in hero sections unless the layout demands it.

Cards should use a white background, `rounded.lg`, and subtle shadow. They should feel like framed content rather than heavy panels. Keep internal padding comfortable and consistent, with enough room for text, avatars, or embedded screenshots to breathe.

Inputs should be simple and clearly bordered, with white backgrounds and soft radii. Placeholder text should be muted and readable; focus states can use the accent blue or a stronger border contrast, but should not overwhelm the layout. Search fields in navigation can be slightly more compact than content form inputs.

Chips, banners, and proof pills should be pill-shaped with full rounding and minimal borders. Their job is to group trust signals and metadata in a compact, scannable way. Use small icons and restrained spacing so they read as supportive UI rather than decorative badges.

Navigation items should stay lightweight and text-first, with active states indicated by darker text or subtle emphasis rather than heavy fills. The top bar should feel unobtrusive and balanced against the hero content. If additional lists, menus, or tooltips are introduced, keep them small, clean, and aligned to the existing rounded, low-noise style.

## Do's and Don'ts
- Do use the serif headline style for major marketing statements and keep it centered and spacious.
- Do keep body text and UI labels in Inter for legibility and product consistency.
- Do preserve the warm off-white background and white surface layering for a soft premium feel.
- Do use the navy primary color for the strongest CTA and key emphasis only.
- Don't introduce harsh black-heavy interfaces or high-contrast dark modes into this landing-page system.
- Don't overuse shadows, gradients, or borders; hierarchy should come mostly from type and spacing.
- Don't make buttons overly tall, pill-like, or decorative; keep them compact and functional.
- Don't mix too many font families in one component hierarchy; reserve display and utility faces for clear roles.