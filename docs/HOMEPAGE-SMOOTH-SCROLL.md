# Landing-page smooth scrolling

The public homepage now uses [Lenis](https://github.com/darkroomengineering/lenis) **1.3.27** (MIT) for restrained desktop wheel smoothing. The package is pinned with its npm integrity in the existing pnpm lockfile.

## Scope and safeguards

- The component `HomepageSmoothScroll` is mounted **only** by the marketing homepage. Login, recruiter search, dashboards, forms and candidate lists retain native scroll behavior.
- Enhancement is enabled for screens at least **1200px** wide, with a fine hover pointer and **no reduced-motion preference**. Mobile/touch and smaller layouts retain native scroll behavior, including the carousel's scroll snapping.
- It starts and stops as device capabilities or motion preferences change, and cleans up event listeners and the Lenis instance on unmount.
- Lenis settings: `autoRaf: true`, `lerp: 0.14`, `smoothWheel: true`, `syncTouch: false`, `gestureOrientation: "vertical"`, `anchors: true`. Existing CSS `scroll-margin-top: 82px` keeps anchors visible below the sticky header without a duplicate offset.
- The mobile-navigation overlay uses `data-lenis-prevent` for nested scrolling.
- Lenis's recommended CSS is imported by the app layout; it only takes effect while Lenis attaches its own classes. Without JavaScript, CSS anchor navigation still works. Reduced motion forces `html { scroll-behavior: auto }`.
- The existing scroll-linked trust timeline still listens to normal browser scroll events. No extra parallax, scroll hijacking, or scroll snapping was introduced.

## Verification

Playwright checks homepage activation, anchor visibility below the sticky navigation, dynamic compact-screen disablement, reduced-motion on/off behavior and absence of Lenis on `/login`. The pre-existing suite checks the sticky timeline and mobile carousel. Full pnpm lockfile and Docker verification are handled by GitHub Actions.

If users experience noticeable scroll lag on slower desktops, adjust `lerp` or remove the enhancement; scroll input responsiveness takes precedence over decorative smoothness.
