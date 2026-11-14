---
version: alpha
name: Tryopentag
description: |
  OpenTag's design system projects a modern, approachable, and professional
  aesthetic built on clarity and accessibility. The palette centers on a deep
  navy (#020E24) paired with warm, cream-toned canvases (#FFFDF9), creating a
  sophisticated yet inviting atmosphere. Generous whitespace, restrained use of
  color, and a strong typographic hierarchy—anchored by the distinctive serif
  display font—communicate confidence and expertise. The system embraces
  micro-interactions and subtle depth through layered shadows rather than bold
  visual drama, positioning the interface as a trustworthy, intelligent agent
  that works seamlessly within existing team workflows.
source:
  url: "https://www.tryopentag.com/"
  pagesAnalyzed: 1
  extractedAt: 2026-11-14
  tokensMeasured: true
colors:
  primary: "#020E24"
  canvas: "#FFFDF9"
  ink: "#020E24"
  body: "#141414"
  muted: "#1D1C1D"
  faint: "#4E4E4E"
  hairline: "#3C3C3C"
  accent-1: "#4A154B"
  neutral-1: "#454245"
  neutral-2: "#616061"
  neutral-3: "#000000"
typography:
  display-xl:
    fontFamily: stkEarlRegular
    fontSize: 72px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -2.16px
  display-lg:
    fontFamily: stkEarlRegular
    fontSize: 59.84px
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: -1.8px
  display-md:
    fontFamily: stkEarlRegular
    fontSize: 43.84px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.32px
  body-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.8px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.68px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.64px
  body-md-strong:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.38
    letterSpacing: -0.64px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: -0.56px
  body-xs:
    fontFamily: Lato
    fontSize: 13.1923px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: 0px
  nav:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: -0.56px
  button-xl:
    fontFamily: stkEarlRegular
    fontSize: 23.36px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.7px
  button-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.8px
  button-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.56px
  caption-xl:
    fontFamily: Lato
    fontSize: 12px
    fontWeight: 900
    lineHeight: 1.33
    letterSpacing: 0px
  caption-lg:
    fontFamily: Lato
    fontSize: 11.9296px
    fontWeight: 400
    letterSpacing: 0px
  caption-md:
    fontFamily: Lato
    fontSize: 11.8198px
    fontWeight: 400
    letterSpacing: 0px
  caption-sm:
    fontFamily: Lato
    fontSize: 11.4708px
    fontWeight: 400
    lineHeight: 1.28
    letterSpacing: 0px
  caption-xs:
    fontFamily: Lato
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  caption-xs-strong:
    fontFamily: Lato
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0px
rounded:
  none: 0px
  xs: 4.39745px
  sm: 7.03592px
  md: 12px
  lg: 14px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 28px
  xxxl: 32px
  section: 36px
  band: 40px
shadows:
  sm: "rgba(82, 72, 70, 0.04) 0px 1px 2px 0px, rgba(82, 72, 70, 0.12) 0px 8px 24px -10px"
  md: "rgba(0, 0, 0, 0.18) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px, rgba(0, 0, 0, 0.22) 0px 12px 28px -14px"
  lg: "rgba(2, 14, 36, 0.2) 0px 1px 2px 0px"
  xl: "rgba(2, 14, 36, 0.1) 0px 0px 0px 1px"
elevationStrategy: layered-micro
themes:
  derived: dark   # the other theme is the site's measured palette
  light:
    bg: "#FFFDF9"
    surface: "#F7F5F2"
    surfaceRaised: "#EDECEA"
    text: "#020E24"
    textMuted: "#141414"
    border: "#3C3C3C"
    accent: "#020E24"
    accentFg: "#FFFFFF"
    focusRing: "#020E24"
    elevation: shadow
  dark:
    bg: "#0D0F11"
    surface: "#1C1D1F"
    surfaceRaised: "#28292B"
    text: "#F5F5F6"
    textMuted: "#9D9E9F"
    border: "#343537"
    accent: "#3B7CF4"
    accentFg: "#0B0B0C"
    focusRing: "#0D59E5"
    elevation: "border+surface"
gradients:
  - context: hero
    kind: linear
    value: "linear-gradient(45deg, rgb(74, 21, 75), rgb(74, 21, 75) 50%, rgb(74, 21, 75))"
components:
  button-primary:
    typography: "{typography.body-md-strong}"
    textColor: "rgb(255, 255, 255)"
    height: 42px
    padding: "0px 20px 0px 20px"
    rounded: "{rounded.md}"
    backgroundColor: "{colors.primary}"
  button-filled:
    typography: "{typography.body-md-strong}"
    textColor: "{colors.ink}"
    height: 42px
    padding: "0px 20px 0px 20px"
    rounded: "{rounded.md}"
    backgroundColor: "rgba(16, 16, 16, 0.08)"
  button-primary-sm:
    typography: "{typography.button-md}"
    textColor: "rgb(255, 255, 255)"
    height: 36px
    padding: "0px 12px 0px 12px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(2, 14, 36, 0.2) 0px 1px 2px 0px"
    rounded: "3.35544e+07px"
    backgroundColor: "{colors.primary}"
  button-text:
    typography: "{typography.button-md}"
    textColor: "{colors.ink}"
    height: 36px
    padding: "0px 12px 0px 12px"
    boxShadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(2, 14, 36, 0.1) 0px 0px 0px 1px"
    rounded: "3.35544e+07px"
    backgroundColor: "rgb(255, 255, 255)"
  card:
    typography: "{typography.body-md}"
    textColor: "{colors.body}"
    backgroundColor: "{colors.canvas}"
  card-sm:
    typography: "{typography.body-md}"
    textColor: "{colors.body}"
  navigation:
    typography: "{typography.nav}"
    textColor: "{colors.faint}"
    height: 20px
  link:
    typography: "{typography.nav}"
    textColor: "{colors.faint}"
    rounded: 4px
  link-2:
    typography: "{typography.nav}"
    textColor: "{colors.ink}"
    rounded: 4px
states:
  link-hover:
    target: link
    state: hover
    opacity: 1
  button-hover:
    target: button
    state: hover
    opacity: 0.9
  other-hover:
    target: other
    state: hover
    opacity: 1
  other-focus-visible:
    target: other
    state: focus-visible
    opacity: 0.9
breakpoints:
  - width: 375
    containerWidth: 327
    gridColumns: 2
    navLinksVisible: 0
    menuToggleVisible: true
    headingPx: 40
    bodyPx: 16
    sectionPaddingX: 24
  - width: 768
    containerWidth: 704
    gridColumns: 4
    navLinksVisible: 0
    menuToggleVisible: true
    headingPx: 44
    bodyPx: 16
    sectionPaddingX: 32
  - width: 1024
    containerWidth: 758
    gridColumns: 4
    navLinksVisible: 7
    menuToggleVisible: true
    headingPx: 53
    bodyPx: 16
    sectionPaddingX: 88
  - width: 1280
    containerWidth: 1078
    gridColumns: 5
    navLinksVisible: 7
    menuToggleVisible: true
    headingPx: 66
    bodyPx: 16
    sectionPaddingX: 110
  - width: 1440
    containerWidth: 1078
    gridColumns: 5
    navLinksVisible: 7
    menuToggleVisible: true
    headingPx: 72
    bodyPx: 16
    sectionPaddingX: 124
coverage:
  statesFound: 62
  gradientsFound: 1
  rolesUnassigned: 4
  archetypesUnnamed: 0
  archetypesDetected: 0
  responsiveMeasured: true
  stylesheetsBlocked: false
  semanticRampDeclared: false
---

# Design System Inspired by OpenTag

## 1. Visual Theme & Atmosphere

OpenTag's design system projects a modern, approachable, and professional aesthetic built on clarity and accessibility. The palette centers on a deep navy (`{colors.primary}` — `#020E24`) paired with warm, cream-toned canvases (`{colors.canvas}` — `#FFFDF9`), creating a sophisticated yet inviting atmosphere. Generous whitespace, restrained use of color, and a strong typographic hierarchy—anchored by the distinctive serif display font—communicate confidence and expertise. The system embraces micro-interactions and subtle depth through layered shadows rather than bold visual drama, positioning the interface as a trustworthy, intelligent agent that works seamlessly within existing team workflows.

**Key Characteristics**
- Premium serif headlines (`stkEarlRegular`) paired with clean geometric sans-serif body text (`Inter`)
- Deep navy and cream foundation with minimal decorative accent colors
- Subtle, multi-layer shadow system for barely-perceptible elevation
- Pill-shaped button radii (`{rounded.full}` — `9999px`) for secondary actions; sharp and medium-rounded for primary interactions
- Responsive typography that scales elegantly across viewport sizes
- Color-blocking strategy for depth; surfaces rely on background color shifts rather than heavy shadows
- Consistent spacing scale from `{spacing.xxs}` (`4px`) to `{spacing.band}` (`40px`)

## 2. Color Palette & Roles

### Primary
- **Primary / Brand / Ink** (`{colors.primary}` — `#020E24`): Deep navy serving as the brand anchor, primary text color, primary CTA fills, active states, and headings. The dominant voice in the system.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#FFFDF9`): Warm off-white page background, establishing the default surface and framing all content.
- **Body** (`{colors.body}` — `#141414`): Near-black, used for body copy and primary body text where maximum contrast is needed.
- **Muted** (`{colors.muted}` — `#1D1C1D`): Dark gray secondary text for captions and supporting information.
- **Faint** (`{colors.faint}` — `#4E4E4E`): Medium gray for tertiary text, placeholder text, and disabled states.
- **Hairline** (`{colors.hairline}` — `#3C3C3C`): Dark gray stroke color for 1px borders and dividers.

### Decorative
- **Accent Decorative** (`{colors.accent-1}` — `#4A154B`): Deep purple; no measured product role. Used as a decorative element in hero gradient and optional accent overlays.
- **Neutral (unassigned)** — Three additional neutral grays measured in the extraction (`{colors.neutral-1}` `#454245`, `{colors.neutral-2}` `#616061`, `{colors.neutral-3}` `#000000`) with no explicit role. Treat as fallback grays for edge cases or legacy code.

### Semantic / Status
No error, success, warning, or info colors are declared or measured in the site's stylesheet. Status communication, if required, should be implemented as text labels with icon support rather than color alone.

## 3. Typography Rules

### Font Family
**Primary Display:** `stkEarlRegular`, fallback: `Georgia, serif`
**Body & UI:** `Inter`, fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
**Captions:** `Lato`, fallback: `sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Display XL | stkEarlRegular | 72px | 400 | 1 | -2.16px | Hero headline; measured on h1 |
| Display LG | stkEarlRegular | 59.84px | 400 | 1.02 | -1.8px | Section headline; measured on h2 |
| Display MD | stkEarlRegular | 43.84px | 400 | 1.05 | -1.32px | Subsection headline; measured on h3 |
| Body XL | Inter | 20px | 400 | 1.5 | -0.8px | Large body text, intro paragraphs |
| Body LG | Inter | 17px | 500 | 1.5 | -0.68px | Semi-bold body, emphasis |
| Body MD | Inter | 16px | 400 | 1.5 | -0.64px | Standard paragraph text |
| Body MD Strong | Inter | 16px | 500 | 1.38 | -0.64px | Highlighted body, labels |
| Body SM | Inter | 14px | 400 | 1.43 | -0.56px | Secondary text, navigation |
| Body XS | Lato | 13.1923px | 400 | 1.47 | 0px | Tiny body text |
| Button XL | stkEarlRegular | 23.36px | 400 | 1.2 | -0.7px | Large display button text |
| Button LG | Inter | 20px | 500 | 1.5 | -0.8px | Large interactive button |
| Button MD | Inter | 14px | 500 | 1.5 | -0.56px | Standard button, tab labels |
| Navigation | Inter | 14px | 500 | 1.43 | -0.56px | Navigation links, menu items |
| Caption XL | Lato | 12px | 900 | 1.33 | 0px | Bold caption, badge text |
| Caption LG | Lato | 11.9296px | 400 | not measured | 0px | Large caption |
| Caption MD | Lato | 11.8198px | 400 | not measured | 0px | Standard caption |
| Caption SM | Lato | 11.4708px | 400 | 1.28 | 0px | Small caption |
| Caption XS | Lato | 10px | 400 | 1.5 | 0px | Tiny caption |
| Caption XS Strong | Lato | 10px | 700 | 1.5 | 0px | Bold tiny caption |

### Principles
- **Display sizes (`stkEarlRegular`)** use aggressive negative letter-spacing (-1.32px to -2.16px) to tighten the serif letterforms and command visual hierarchy. Line height set to 1 or near-1 for compact, impactful headlines.
- **Body and interactive text (`Inter`)** employ moderate negative tracking (-0.56px to -0.8px) for optical balance and professional finish; line height 1.5 ensures readability at smaller sizes.
- **Captions (`Lato`)** generally omit letter-spacing (0px) except where weight increases (bold captions) for emphasis.
- **Responsive scaling:** Largest heading shifts from 72px at 1440px to 40px at 375px; body copy remains 16px across all breakpoints for consistency.

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `{colors.primary}` (`#020E24`)
- Text color: white (`rgb(255, 255, 255)`)
- Padding: `0px 20px` (height 42px)
- Font: `{typography.button-md}` (14px, weight 500, Inter)
- Border radius: `{rounded.md}` (12px)
- Border: none
- Box shadow: none
- Hover state: `filter: brightness(1.06)`, `opacity: 1`, `box-shadow: rgba(6, 14, 30, 0.32) 0px 0px 0px 1px inset`, `background-color: rgba(16, 16, 16, 0.06)`
- Focus-visible: `outline: 2px solid #171717`

**Secondary Button (Filled)**
- Background: `rgba(16, 16, 16, 0.08)`
- Text color: `{colors.primary}` (`#020E24`)
- Padding: `0px 20px` (height 42px)
- Font: `{typography.button-md}` (14px, weight 500, Inter)
- Border radius: `{rounded.md}` (12px)
- Border: none
- Box shadow: none
- Hover state: `background-color: rgba(16, 16, 16, 0.06)`, `opacity: 0.9`

**Primary Button Small (Pill)**
- Background: `{colors.primary}` (`#020E24`)
- Text color: white (`rgb(255, 255, 255)`)
- Padding: `0px 12px` (height 36px)
- Font: `{typography.button-md}` (14px, weight 500, Inter)
- Border radius: `{rounded.full}` (9999px)
- Border: none
- Box shadow: `rgba(2, 14, 36, 0.2) 0px 1px 2px 0px`
- Hover state: `opacity: 0.9`

**Text Button (Pill, Ghost)**
- Background: white (`rgb(255, 255, 255)`)
- Text color: `{colors.primary}` (`#020E24`)
- Padding: `0px 12px` (height 36px)
- Font: `{typography.button-md}` (14px, weight 500, Inter)
- Border radius: `{rounded.full}` (9999px)
- Border: `rgba(2, 14, 36, 0.1) 0px 0px 0px 1px` (1px outline)
- Box shadow: none
- Hover state: `border-color: rgba(2, 14, 36, 0.28)`, `opacity: 1`

### Cards & Containers

**Card Default (Full-width page)**
- Background: `{colors.canvas}` (`#FFFDF9`)
- Text color: `{colors.body}` (`#141414`)
- Font: `{typography.body-md}` (16px, weight 400, Inter)
- Border radius: `{rounded.none}` (0px)
- Border: none
- Box shadow: none
- Padding: 0px

**Card Small (Contained section)**
- Background: transparent (`rgba(0, 0, 0, 0)`)
- Text color: `{colors.body}` (`#141414`)
- Font: `{typography.body-md}` (16px, weight 400, Inter)
- Border radius: `{rounded.lg}` (14px)
- Border: none
- Box shadow: none
- Hover state (on containers): `background-color: rgba(16, 16, 16, 0.04)` or `rgba(16, 16, 16, 0.13)`

### Inputs & Forms

**Message Input / Textarea**
- Background: white or `{colors.canvas}` (`#FFFDF9`)
- Text color: `{colors.body}` (`#141414`)
- Placeholder color: `{colors.faint}` (`#4E4E4E`)
- Font: `{typography.body-md}` (16px, weight 400, Inter)
- Border: 1px solid `{colors.hairline}` (`#3C3C3C`)
- Border radius: `{rounded.md}` (12px) or `{rounded.lg}` (14px)
- Padding: `{spacing.md}` (`16px`) internal
- Hover state: `border-color: rgba(2, 14, 36, 0.28)`
- Focus-visible: `outline: 2px solid #171717`

### Navigation

**Navigation Link (Header)**
- Text color: `{colors.faint}` (`#4E4E4E`)
- Font: `{typography.nav}` (14px, weight 500, Inter)
- Padding: `{spacing.xs}` to `{spacing.md}` (8px to 16px horizontal)
- Border radius: `{rounded.none}` (0px)
- Background: transparent
- Hover state: `color: var(--brand)` (navy), `opacity: 1`
- Active state: `color: {colors.primary}` (`#020E24`)

**Link (inline body)**
- Text color: `{colors.faint}` (`#4E4E4E`)
- Font: `{typography.body-sm}` (14px, weight 500, Inter)
- Border radius: `{rounded.xs}` (4.39745px)
- Background: transparent
- Hover state: `opacity: 1`, `color: {colors.primary}` (`#020E24`), `border-color: rgba(2, 14, 36, 0.28)`

### Footer

**Footer Container**
- Background: `{colors.canvas}` (`#FFFDF9`)
- Text color: `{colors.body}` (`#141414`)
- Font: `{typography.body-md}` (16px, weight 400, Inter)
- Border radius: `{rounded.none}` (0px)
- Padding: `{spacing.band}` to `{spacing.section}` (40px–36px vertical), `{spacing.lg}` to `{spacing.xxl}` (20px–28px) horizontal at mobile, scales to `{spacing.xxxl}` (`32px`) at desktop

## 5. Layout Principles

### Spacing System
The system uses an 8-base modular scale:
- `{spacing.xxs}` = 4px (micro gaps, tight component internals)
- `{spacing.xs}` = 8px (close pairing, button borders)
- `{spacing.sm}` = 12px (snug internal padding)
- `{spacing.md}` = 16px (standard padding, body line height unit)
- `{spacing.lg}` = 20px (breathing room, section margins)
- `{spacing.xl}` = 24px (loose grouping, component separation)
- `{spacing.xxl}` = 28px (major section breaks)
- `{spacing.xxxl}` = 32px (large-scale content blocks)
- `{spacing.section}` = 36px (section padding-bottom)
- `{spacing.band}` = 40px (hero and footer vertical rhythm)

**Usage context:**
- **Component internals:** `{spacing.xxs}` to `{spacing.sm}` (4–12px)
- **Button padding:** `{spacing.md}` to `{spacing.lg}` (16–20px horizontal)
- **Card/container margins:** `{spacing.lg}` to `{spacing.xl}` (20–24px)
- **Section margins:** `{spacing.section}` to `{spacing.band}` (36–40px)

### Grid & Container
- **Mobile (375px):** Content column 327px; section padding-x `{spacing.xl}` (`24px`); 2-column grid
- **Tablet (768px):** Content column 704px; section padding-x `{spacing.xxxl}` (`32px`); 4-column grid
- **Desktop (1024px):** Content column 758px; section padding-x 88px; 4-column grid; navigation links visible (7 items)
- **Large (1280px–1440px):** Content column 1078px (fixed max); section padding-x 110–124px; 5-column grid; all navigation visible

**Max-width strategy:** Content column pinned at 1078px for viewports ≥1280px; below that, column width grows with viewport. Horizontal section padding increases to maintain visual margins.

### Whitespace Philosophy
OpenTag employs aggressive whitespace to emphasize clarity and allow the display typography to command attention. Vertical rhythm scales with viewport: mobile sections are tightly packed (`{spacing.section}` / 36px), while desktop sections breathe at `{spacing.band}` / `40px` and beyond. Horizontal padding grows on desktop to keep line lengths readable and create visual breathing room. Never collapse whitespace to fill space—use it to create hierarchy and focus.

### Border Radius Scale
- `{rounded.none}` = 0px: Page-level containers, hero sections, full-bleed cards
- `{rounded.xs}` = 4.39745px: Inline elements, subtle decorative borders
- `{rounded.sm}` = 7.03592px: Small components, secondary cards
- `{rounded.md}` = 12px: Primary buttons, input fields, standard cards
- `{rounded.lg}` = 14px: Larger cards, containers, secondary containers
- `{rounded.full}` = 9999px: Pill-shaped buttons (secondary and text variants), icon buttons, badges with text

**Component-specific mapping:**
- Image: `{rounded.none}` (0px)
- Primary button: `{rounded.md}` (12px)
- Secondary/text button: `{rounded.full}` (9999px)
- Badge: `{rounded.none}` (0px) or `{rounded.full}` (9999px) for pill badges
- Card: `{rounded.lg}` (14px) or `{rounded.none}` (0px) for full-bleed containers

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, background color only | Default surfaces, nested text layers |
| Micro SM | `rgba(82, 72, 70, 0.04) 0px 1px 2px 0px, rgba(82, 72, 70, 0.12) 0px 8px 24px -10px` | Cards with minimal lift |
| Micro MD | `rgba(0, 0, 0, 0.18) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px, rgba(0, 0, 0, 0.22) 0px 12px 28px -14px` | Elevated cards, floating panels |
| Micro LG | `rgba(2, 14, 36, 0.2) 0px 1px 2px 0px` | Button lift on hover or focus |
| Micro XL | `rgba(2, 14, 36, 0.1) 0px 0px 0px 1px` | Subtle outline, button focus ring |

The system employs a **layered-micro** elevation strategy: depth is achieved through stacked, near-transparent shadow layers rather than a single bold drop shadow. Each shadow layer contains a micro-opacity shift plus blur radius (1–28px), creating a barely-perceptible 3D lift. This approach maintains visual lightness while signaling interactive and structural depth. Surface color also contributes to hierarchy: slightly darker or warmer backgrounds read as "lifted" even without shadow augmentation.

### Opacity Levels
- **39%** (0.39): Heavy hover tint on secondary elements
- **40%** (0.40): Disabled or muted interactive state
- **50%** (0.50): Semi-transparent overlays, inactive badges
- **62%** (0.62): Medium emphasis on secondary content
- **82%** (0.82): Slightly faded text or background layers
- **95%** (0.95): Near-opaque hover or active states

### Z-index / Layering
- **base: 3** — Default component z-index
- **dropdown: 10** — First-level menu or popover layer
- **dropdown: 40** — Nested or secondary dropdown menu
- **dropdown: 50** — Modal, toast, or top-most interactive layer

Apply z-index conservatively; most interactive layers stay within the 10–50 range. Modals and critical overlays occupy the 50 tier; tooltips and popovers the 10–40 range.

## 7. Do's and Don'ts

### Do
- **Use the `stkEarlRegular` serif font** for display sizes (headings, hero copy). Its distinctive letterforms and tight negative tracking create instant brand recognition.
- **Pair serif headlines with `Inter` body text.** The sans-serif body ensures readability and modern contrast.
- **Employ negative letter-spacing on displays** (e.g., -2.16px for 72px headlines). This is a core visual trait and should not be rounded to zero.
- **Layer shadows carefully.** Use multi-layer shadow definitions exactly as provided; do not flatten or simplify them.
- **Respect the spacing scale.** Always reach for a defined spacing value (`{spacing.xxs}` through `{spacing.band}`); never invent intermediate gaps.
- **Build pill-shaped buttons** (`{rounded.full}` — 9999px) only for secondary or text-variant CTAs. Primary buttons use `{rounded.md}` (12px).
- **Maintain 1.5 line height on body text** at 16px or larger. Smaller sizes (14px and below) compress slightly to 1.38–1.43.
- **Color-block for depth.** Use background-color shifts (e.g., from `{colors.canvas}` to `rgba(16, 16, 16, 0.04)`) to signal interactivity or elevation, not shadow alone.
- **Keep navigation links a muted gray** (`{colors.faint}` — `#4E4E4E`) until hover, then elevate to navy (`{colors.primary}`).
- **Scale typography responsively.** Headings shrink from 72px (1440px) to 40px (375px). Body copy holds at 16px across all breakpoints.

### Don't
- **Do not use script or display fonts for body text.** `stkEarlRegular` is reserved for headlines and hero copy only.
- **Do not remove or soften negative letter-spacing on display sizes.** It is integral to the brand voice.
- **Do not flatten or simplify multi-layer shadows.** Each shadow layer contributes optical depth; omit them and surfaces become flat.
- **Do not create radius values outside the published scale** (`0px`, 4.39745px, 7.03592px, 12px, 14px, 9999px). Use the nearest scale value.
- **Do not mix primary and secondary button radius logic.** Primary buttons round to 12px; pill buttons round to 9999px. Do not create intermediate values.
- **Do not reduce line-height below 1 on body text,** except on headlines where 1.0 is standard. Body copy must remain 1.38 or higher for legibility.
- **Do not invent new colors or semantic status ramps.** The site declares no error/warning/success palette. Use text + icon for status messaging.
- **Do not change button text color on hover or state shift** unless explicitly provided (e.g., opacity or background color changes). Text color remains stable.
- **Do not force rounded corners on full-bleed containers or hero sections.** They render as flat (0px) to frame the layout clearly.
- **Do not break the spacing scale for visual "tweaks."** Always choose a defined unit; spacing exists to maintain vertical rhythm and predictability.
- **Do not assume dark mode exists.** The extraction captured one theme only. Do not ship a derived or calculated dark palette as a brand feature.

## 8. Responsive Behavior

### Breakpoints
| Breakpoint | Viewport | Content Column | Grid Columns | Nav Links Visible | Largest Heading | Body Size | Section Padding-X |
|---|---|---|---|---|---|---|---|
| Mobile | 375px | 327px | 2 | 0 (menu toggle visible) | 40px | 16px | 24px |
| Tablet | 768px | 704px | 4 | 0 (menu toggle visible) | 44px | 16px | 32px |
| Desktop | 1024px | 758px | 4 | 7 | 53px | 16px | 88px |
| Large | 1280px | 1078px | 5 | 7 | 66px | 16px | 110px |
| XL | 1440px | 1078px | 5 | 7 | 72px | 16px | 124px |

**Breakpoint rationale:**
- **375px → 768px (Mobile → Tablet):** Content column nearly doubles; grid expands to 4 columns; section padding grows; largest heading scales from 40px to 44px.
- **768px → 1024px (Tablet → Desktop):** Navigation collapses to toggle at ≤768px and expands to 7 visible links at ≥1024px. Content column marginally increases; heading reaches 53px.
- **1024px → 1280px (Desktop → Large):** Content column jumps from 758px to 1078px (capped); heading scales to 66px; grid expands to 5 columns; section padding-x increases to 110px.
- **1280px → 1440px:** Content column stays capped at 1078px; heading reaches full size (72px); section padding-x maxes at 124px. Viewport growth absorbs into outer margins.

### Touch Targets
- **Minimum interactive height:** 36px (small buttons, links)
- **Recommended interactive height:** 42–44px (standard buttons, nav items)
- **Minimum interactive width:** 44px (icon buttons, small toggles)
- **Recommended interactive width:** 80–120px (text buttons, CTAs)
- **Padding around touch target:** Ensure `{spacing.md}` (`16px`) of clear space between adjacent interactive elements to prevent accidental taps.

### Collapsing Strategy
- **2 → 4 → 4 → 5 columns:** Grid reflows intelligently; single-column layouts at mobile (375px) become two-column, then four-column on tablet (768px), holding steady until desktop (1024px) where a fifth column appears at ≥1280px breakpoints.
- **Navigation hamburger trigger:** Menu collapses to a toggle at ≤768px (tablet). At 1024px and above, primary navigation links display inline (7 items visible).
- **Content padding expansion:** Horizontal section padding grows from 24px (mobile) → 32px (tablet) → 88px (desktop) → 110–124px (large/XL) to maintain comfortable margins and prevent text width from becoming unwieldy on ultra-wide viewports.
- **Heading size scaling:** Hero and display headings compress from 72px (1440px) through 40px (375px) in responsive jumps; body text stays at 16px to preserve reading comfort. This ensures headlines remain impactful while content remains accessible on all screens.
- **Floating/fixed UI (modals, popovers):** Constrain to viewport minus `{spacing.xl}` (`24px`) padding on mobile; on desktop, use fixed positioning with calculated margins. Z-index remains stable (10–50 tier) across all breakpoints.

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA / Brand:** Primary (`#020E24`) — navy; use for all primary action buttons, brand mark, and active navigation
- **Background / Canvas:** Canvas (`#FFFDF9`) — warm off-white; page background and primary surface
- **Body Text / Heading:** Primary (`#020E24`) — navy; headings, large body, and contrast-heavy copy
- **Secondary Text / Muted:** Muted (`#1D1C1D`) — dark gray; captions, labels, and supporting information
- **Tertiary Text / Faint:** Faint (`#4E4E4E`) — medium gray; placeholder, disabled, and low-emphasis text
- **Borders / Hairline:** Hairline (`#3C3C3C`) — dark gray; 1px dividers, input borders, outline strokes
- **Decorative / Accent:** Accent Decorative (`#4A154B`) — deep purple; no active role; optional gradient overlays only

### Iteration Guide
1. **Typography hierarchy is non-negotiable.** Display text uses `stkEarlRegular` serif; body and UI use `Inter` sans-serif. Do not swap or consolidate.
2. **Negative letter-spacing on displays** (e.g., -2.16px, -1.8px, -1.32px) must be preserved exactly. This tracking is a core brand trait.
3. **Spacing always comes from the scale** (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `28px`, `32px`, `36px`, `40px`). Never invent intermediate values.
4. **Button radii depend on variant:** Primary buttons = 12px (`{rounded.md}`); secondary and text buttons = 9999px (`{rounded.full}`). Do not mix.
5. **Shadows are multi-layered.** Always apply the full shadow stack (e.g., `rgba(82, 72, 70, 0.04) 0px 1px 2px 0px, rgba(82, 72, 70, 0.12) 0px 8px 24px -10px`). Do not flatten or simplify.
6. **Color-blocking creates depth.** Use background-color transitions (e.g., hover: `rgba(16, 16, 16, 0.04)`) instead of relying solely on shadow.
7. **Navigation links are muted gray** (`#4E4E4E`) by default; hover turns them navy (`#020E24`). Never use a different color ramp.
8. **Responsive breakpoints:** Mobile 375px, Tablet 768px, Desktop 1024px, Large 1280px, XL 1440px. Viewport-triggered changes (grid columns, padding, heading size) must occur at these exact boundaries.
9. **Z-index layering:** Base = 3, dropdown = 10–40, modal = 50. Keep interactions within this range; do not invent new stacking contexts.
10. **Line height discipline:** Body text (all sizes) = 1.5 line height; headlines = 1.0–1.05; captions = 1.28–1.5 (size-dependent). Do not deviate.

## 10. Known Gaps

- **Interaction states:** Only explicit state data extracted (`:hover`, `:focus-visible` opacity and border/background changes). Missing: `:active`, `:disabled`, `:read-only`, `:invalid` states. Implement disabled buttons with reduced opacity (0.40–0.50) and cursor-not-allowed; implement active states as a darker or saturated version of the default color.
- **Semantic color ramp:** The site declares no error, success, warning, or info colors. Status messaging should be implemented via text labels and icon support (e.g., red text + ⚠ icon for error) rather than a dedicated color palette.
- **Dark mode / theme variants:** The extraction captured one light theme only. No dark-mode stylesheet or theme toggle was observed. Do not assume or derive a dark palette; if dark mode is required, it must be captured from a separate live measurement.
- **Unassigned colors:** Four colors measured but not bound to a specific product role (`{colors.accent-1}` `#4A154B`, `{colors.neutral-1}` `#454245`, `{colors.neutral-2}` `#616061`, `{colors.neutral-3}` `#000000`). These are treated as decorative or fallback; the first serves in an optional gradient, the latter three have no measured use and should not be relied upon in new components.
- **Animation / transition timing:** No `transition` or `animation` properties were extracted. Assume all state changes (hover, focus) occur instantly or with a brief 0.15–0.2s ease default unless CSS explicitly specifies otherwise.
- **Authenticated surfaces / protected routes:** The extraction captured the public landing page only. Logged-in dashboard, account settings, and internal tools were not analyzed. Their design patterns may differ.
- **Form validation states:** No explicit input validation styling (e.g., error outline, success checkmark) was measured. Implement via text messaging + border-color override or rely on native browser validation.
- **Accessibility (WCAG):** Color contrast ratios, focus indicators, and ARIA labels were not formally measured. Ensure all interactive elements meet WCAG AA contrast (≥4.5:1 for normal text, ≥3:1 for large text) and have visible focus rings (2px outline with sufficient contrast).
- **Print styles:** No print-specific CSS was observed. Assume responsive layout adapts to print media; if print design is critical, capture it separately.
- **Right-to-left (RTL) support:** No RTL text or logical property overrides were detected. Implement RTL explicitly if required for international audiences.