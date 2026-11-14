# Pareto authentication redesign

**Scope:** `/signup` and `/login` share `frontend/src/components/auth/auth-form.tsx`. The frontend landing page, dashboard, backend and authorization model are unchanged.

## Design sources
- User-provided screenshots of OpenTag sign-in/sign-up: sparse header and centered account journey.
- User-provided 21st.dev `AuthSectionOne` component: bordered white form panel, two-column composition, field proportions, dark primary action and an animated `GrainGradient` artwork surface.
- Pareto's own approved identity: ivory, deep navy, cobalt-blue accents, original document mascot and Georgia display typography.

Adaptation is original code. The requested animated `GrainGradient` is from [Paper Design](https://shaders.paper.design/grain-gradient), installed as a pinned dependency `@paper-design/shaders-react@0.0.82` (Apache-2.0).

## Functionality
- Email/password sign-in retains `supabase.auth.signInWithPassword`.
- Signup uses `supabase.auth.signUp`, requires first and last name as user metadata `first_name`, `last_name`, and preserves email confirmation and the `next` redirect.
- Login uses only email and password (or Google). First and last names are collected on signup, not requested or updated during login.
- Google OAuth is wired into both screens through `signInWithOAuth({provider:'google'})`, preserving the existing callback route. The Google provider **must be enabled** in the actual Supabase project for a completed OAuth flow; visual implementation alone cannot configure the provider.
- The functional `/forgot-password` link remains on the login page. Note that the underlying password-recovery page currently states the reset feature is not active.
- No Apple button is shown because the project has no configured Apple OAuth integration. No fake Windows download, dead legal URLs or unsupported consent controls are added.
- The form uses scoped `components/auth/auth.css` design tokens and legible mobile inputs (16px minimum) to avoid automatic iOS zoom. Password toggles announce their pressed state; keyboard focus remains visible.
- The large right-side canvas renders Paper's GrainGradient at `speed=1.2`, recolored blue/navy. The original Pareto mascot appears as a supporting visual. The unnecessary top tagline, supporting paragraph, auth footer, back link, and privacy reassurance are removed.
- At ordinary desktop viewport sizes the two panels fit the screen without page scrolling. Short and narrow viewports may scroll to keep inputs accessible; neither controls nor errors are clipped.
- Below 960px or with reduced motion, the shader is not mounted; CSS provides a static gradient. This keeps mobile layouts responsive and honors accessibility preferences.

## Configuration
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env.local`. Enable Google in Supabase Authentication > Providers and register the application callback/redirect URLs. Keep provider secrets in Supabase; never in `NEXT_PUBLIC_*` variables.

## Checks
`pnpm install --frozen-lockfile` followed by lint, typecheck, Playwright e2e and production build (through GitHub Actions). Additional e2e coverage checks the two modes, form semantics, source links, modal breakpoint, static shader fallback and reduced motion. External OAuth completion requires actual Supabase configuration and cannot be proven by a static browser test.
