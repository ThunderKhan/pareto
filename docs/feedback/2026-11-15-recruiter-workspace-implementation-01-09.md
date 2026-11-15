# Pareto recruiter workspace — implementation ledger (#01–#09)

**Work authorized:** 15 November 2026, following the original feedback capture.
**Source:** [UX feedback, round 01, items 01–10](./2026-11-15-recruiter-workspace-ui-feedback-round-01-10.md).
**Branch:** `main` only. No feature branch or pull request.

## Sequential implementation

| Feedback | Implemented in code | Main result |
| --- | --- | --- |
| #01 | Yes | No decorative arrows on dashboard CTAs; removed redundant top-bar label |
| #02 | Yes | Removed search-page marketing heading, paragraphs, and under-composer slogan |
| #03 | Yes | Fresh search composer centered; active search shows bottom composer and internal results scrolling |
| #04 | Yes | Personalized greeting and real confirmed-search history, including empty/error states |
| #05 | Yes | Browser title is exactly `Pareto` on landing, auth, and dashboard routes |
| #06 | Yes | Shared STK Earl/Inter typography, landing-derived workspace tokens, reusable app controls |
| #07 | Yes | Real Light/Dark/System theme controls, persistent user metadata, pre-interactive theme initialization, authored dark palette |
| #08 | Yes | Duplicate “My profile” item removed; bottom account menu preserved |
| #09 | Implemented in repository; external verification pending | Persisted job title/workspace/membership role, TOTP MFA, current session/other-session revocation, theme, actual in-app notification preferences |

**#10 (Parito avatar):** Implemented in the Frontend 03 follow-up. Shared Parito mascot avatar appears in the sidebar account control and on the profile page; live signed-in visual verification is still pending.

## Important account-settings design constraints

- **Organization and roles:** An authenticated recruiter may create one company workspace in PostgreSQL, becoming its server-assigned `OWNER`. Owners may rename their workspace. Membership roles (`OWNER`, `ADMIN`, `RECRUITER`, `VIEWER`) exist as database assignments. There is no user-selectable role dropdown, and no account metadata can grant role privileges.
- **Sharing is not implemented:** Existing candidate/search data is still scoped to each Supabase user's own `ownerId`. Company workspace membership does **not** grant access to another recruiter's candidate records. An invitation/team-sharing workflow and explicitly scoped queries are separate work.
- **Company identity:** Workspace/company name is user-declared, not verified legal affiliation. The UI says so.
- **Notifications:** Only the two supported types are offered: a new confirmed search and a refined confirmed search. Real in-app events are inserted atomically with the confirmed search; database preferences control delivery. There is no fake email preference or scheduled email job.
- **TOTP 2FA:** Uses Supabase Auth `mfa.enroll`, `challengeAndVerify`, `listFactors`, and `unenroll`; protected dashboard/API access checks authenticator assurance and denies an MFA-pending session. TOTP availability must be enabled on the actual Supabase project. Recovery codes are not supplied by Supabase; test recovery policy before enforcing MFA for real recruiters.
- **Sessions:** The provider's normal user-facing JavaScript API does not expose a list of all devices. The security UI shows whether **this browser** is authenticated and supports `signOut({scope:"others"})` to revoke refresh tokens on other devices. No invented devices/IPs/last-seen values appear. Remote access JWTs can remain valid until expiry.
- **Account email** remains read-only in the profile UI. A verified change-email flow is not part of this review round.

## Deployment / environment requirement

The connected Supabase account available in this session did **not** list a project named Pareto. Therefore the new database migration was **committed but not applied to any production Supabase database**. Do not run it against unrelated existing projects.

Once Pareto's own database is available and backed up, deploy the migration through the existing Prisma workflow:

```powershell
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm dev
```

Verify the `DATABASE_URL` points to **Pareto's** PostgreSQL and not another product. Follow `docs/RELEASE-SETUP.md` for Supabase and AI-provider environment variables. No keys belong in Git or the browser.

Supabase Auth configuration and live verification:
1. Enable app-based TOTP MFA in the Pareto Supabase project.
2. Use a dedicated recruiter account to enroll and verify an authenticator.
3. Sign out, then sign in again: verify that dashboard and APIs are blocked until the MFA challenge succeeds.
4. Test same-browser session, other-device revocation, and factor removal.
5. Create a workspace and confirm its Owner role is **server assigned**; test a second account cannot rename it or see the first user's notifications.
6. Save a job title and theme. Refresh and sign back in to confirm real persistence.
7. Enable/disable notification preferences and confirm new/refined candidate searches to verify actual in-app delivery.

## Automated verification

Existing CI runs migrations and seeds PostgreSQL, builds Prisma types, runs lint/TypeScript/backend integration tests, the public/security browser suite, production build, and Docker checks. New automated coverage includes:
- Owner-only company renaming and workspace uniqueness.
- Owner-scoped notifications and preferences that suppress delivery.
- Signed-out account and notification API denial.
- Browser tab title and initial light/dark saved preference.

The optional real recruiter test remains credential-dependent and is not equivalent to standard CI. A clean code build does not prove live Supabase MFA, database deployment, or actual browser theme contrast. Review those in the deployment environment.

**Design principle:** The landing page is the visual reference, not a new redesign target.

## Frontend 03 follow-up — feedback #10

- Reused `frontend/public/mascot/pareto-mascot.svg` without generating new artwork or changing the landing page.
- Replaced the recruiter's initials in the bottom account control with a reusable mascot component and showed the same avatar beside the account settings heading.
- Added light/dark framing, mobile sizing, and a face-focused crop; kept the accessible identity name and email in the account menu.
- Added an authenticated Playwright assertion for both placements and a public mascot asset smoke test.
- Candidate initials in search results and the library were left unchanged; those belong to other people, not the logged-in recruiter.
- Live Supabase, MFA, database migration, and signed-in browser-appearance checks remain external verification tasks.
