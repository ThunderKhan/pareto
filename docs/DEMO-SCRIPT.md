# Pareto — live PS1 demonstration (synthetic, reproducible)

**Team:** std::zero · **Freeze:** Sunday, 15 November 2026, 5:00 PM IST · **Presentation window:** 6:00–8:00 PM IST

This script exercises the six organizer requirements through the **protected real application** with the deterministic 48-candidate seed. It is not a transcript or a substitute for actual Gemini/Groq requests. The seeded names and counts are synthetic, not real applicants. Keep this document visible to the presenter; don't copy personal candidate data into slides.

## Before starting

1. Use the reviewed `integration/release-20261114` branch (draft PR #3). Prepare a **dedicated** Pareto Supabase Auth project and one confirmed recruiter account. No unrelated Supabase projects.
2. Configure the two public Supabase settings and at least one **server-only** Gemini/Groq key+model pair in `frontend/.env.local`; configure the disposable PostgreSQL connection in `backend/.env`. Run `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm db:deploy`, then `pnpm db:seed` with `DEMO_OWNER_ID` equal to that exact Supabase recruiter's UUID.
3. Start the site locally with `pnpm dev` and verify `http://localhost:3000/api/health`. A separate Docker Compose setup is documented in the root README. **Do not activate Railway.**
4. Prefer performing the manual `recruiter-live` GitHub Actions gate first. That job runs against its own disposable Postgres instance with the same seed; GitHub secrets never belong in chat. Test Google OAuth separately.
5. Confirm the seed contains **48** profiles; the source candidate `Asha Nair` belongs to the demo recruiter. Have the PDF/PPTX presentation on your machine for the judges; the official private repository must receive it before the freeze.

## On-screen sequence (about 4–6 minutes)

| Step | Presenter action | What should actually happen |
| --- | --- | --- |
| 1. Sign in | Log in with the confirmed Supabase test recruiter and open **Candidate search**. | Authenticated dashboard opens. Unsigned candidate API requests return HTTP 401. |
| 2. Describe | Enter: **Find Senior Java Developers in Hyderabad with 6 to 10 years of experience and Java. They must be able to join within 30 days.** Click **Extract criteria**. | Gemini or Groq proposes draft criteria. Show the actual provider indication. If the model cannot generate valid JSON, it returns an error, not invented results. |
| 3. Inspect | Review role, Hyderabad, experience **72–120 months**, Java (required), notice **≤30 days** (required). | An editable draft is displayed; **no candidate results are queried before confirmation**. |
| 4. Edit + confirm | Change **Maximum (days)** from **30** to **45**. Press **Confirm Search**. | PostgreSQL-backed revision 1; for exactly those five required rules, the seed yields **4 eligible** (Asha, Neel, Meera and Rohan), **1 needs review** (Riya, unknown notice). |
| 5. Explain | Open **Match evidence** for Asha Nair and other near matches. | Asha's 15-day notice is MATCH; Dev Shah's known 60-day notice is FAIL; Riya Sen's unknown notice is UNKNOWN. JavaScript alone never satisfies a Java skill requirement. |
| 6. Refine once | Say: **Require Spring Boot and AWS while keeping all existing requirements.** Review the new draft, then confirm. | Revision 2 adds Spring Boot and AWS, preserving city, role, experience and 45-day notice; seed still yields **4 eligible**. |
| 7. Refine twice | Say: **Now only candidates who can join within 30 days; keep all other requirements.** Review and confirm. | Revision 3 changes only notice: **3 eligible** (Asha, Neel, Rohan); Meera's known 31-day notice now fails and Riya remains unknown. Refreshing the page preserves revision 3. |
| 8. Find like me | Open **Candidate details** for Asha Nair, select **Find candidates like Asha Nair**, inspect her preferred attributes and confirm. | Opens a **new** reference cohort: **47 similarity-ranked other candidates**. Asha herself is excluded, and matched preference counts explain each result. Reference-only profiles are **not** called mandatory-eligible when no required filters exist. |
| 9. Refine reference | Say: **Require AWS skills in the similar candidate cohort** and confirm. | Reference cohort revision 2 keeps Asha excluded and adds a mandatory AWS constraint. With the v1 seed: **21 eligible, 2 need review**, the others fail the required AWS criterion. |
| 10. Sign out | Sign out and try the private candidate endpoint. | Signed-out access is denied with 401; do not expose private recruiter data. |

**Judge-facing explanation:** The LLM **interprets requirements**; only confirmed, typed criteria run against PostgreSQL. The deterministic evaluator produces status/reasons. MATCH, FAIL and UNKNOWN remain distinct. The system never asks an LLM to invent applicant counts.

## When a live provider is unavailable

- Use **Enter criteria manually** to build the five required rules. Enter experience **72** and **120** months, notice **45** days, skill **Java**, role **Senior Java Developer**, and city **Hyderabad**. Confirm: real database/matcher results remain available after a legitimate sign-in.
- Follow-up natural-language interpretation cannot be claimed live while both providers are unavailable. Use **Edit confirmed criteria** and explicit confirmation to demonstrate changing notice and adding skills. Explain that this is the manual fallback, not a simulated LLM response.
- Reference lookup and similarity do **not** need a model key, but still require authenticated access and the actual seeded database. Do not weaken auth checks for the presentation.
- If the local Supabase project itself is unavailable, don't bypass authentication or fabricate a successful recruiter journey. Demonstrate only the public **synthetic marketing preview** and clearly distinguish it from the protected product. Show previously completed CI evidence, explicitly labelled as recorded verification rather than a live run.
- If the model interprets a brief differently, **show and edit what it actually proposed**; never claim fixed results without confirming the matching criteria. The numerical counts above are for the exact stated rules and v1 seed, not guarantees for arbitrary model output.

## Submission and presentation integrity

The organizers require **complete source, updated root README, dependency manifests and final presentation deck** in the assigned private `ai-hackathon-trustume/std-zero` GitHub repository **before 5:00 PM IST**, with live demos during 6:00–8:00 PM IST. The draft PR #3 in the personal public repository is not a substitute for organizer submission.

If the GitHub app still gets 404, ask an organizer to confirm the exact repo and team invitation, grant Write access to the GitHub identity and approve the app's selected-repository installation. **Do not force-push** or replace starter history.

For an unrelated organizer history, safely work in a new submission branch, inspect existing files, and add the verified Pareto tree without deleting their starter files. If the organizer's root must stay unchanged, import Pareto under a clear `pareto/` subdirectory with root run instructions, then open a PR and review file changes. Place the standardized final deck in `presentation/` and verify every required file is present well before freeze. Do not claim the deck is included until it has actually been committed.
