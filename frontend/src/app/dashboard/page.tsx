import Link from "next/link";
import { recruiter } from "@/lib/auth";
import { redirect } from "next/navigation";
import { recentSearches } from "@pareto/backend/search/server";

export default async function DashboardPage() {
  const user = await recruiter();
  if (!user) redirect("/login?next=/dashboard");
  const first = user.user_metadata?.first_name;
  const firstName = typeof first === "string" ? first.trim() : "";
  let recent: Awaited<ReturnType<typeof recentSearches>> = [];
  let historyError = false;

  try {
    recent = await recentSearches(user.id);
  } catch (error) {
    // A database outage must not be represented as an empty search history.
    console.error("Recruiter history is currently unavailable", error);
    historyError = true;
  }

  return <main className="pareto-main pareto-main--overview">
    <header className="pareto-overview-header">
      <div>
        <h1 className="pareto-page-title">{firstName ? `Welcome back, ${firstName}.` : "Welcome back."}</h1>
      </div>
      <Link href="/dashboard/search" className="pareto-overview-new">New candidate search</Link>
    </header>

    <section className="pareto-overview-history" aria-labelledby="overview-recent">
      <div className="pareto-overview-history__heading">
        <h2 id="overview-recent">Recent searches</h2>
      </div>
      {historyError ? <p className="pareto-overview-history__empty" role="alert">
        Your recent searches couldn&rsquo;t be loaded. Please try again in a moment.
      </p> : recent.length ? <ul className="pareto-overview-history__list">
        {recent.map(session => <li key={session.id}>
          <Link href={"/dashboard/search?session=" + encodeURIComponent(session.id)}
            className="pareto-overview-history__item">
            <span className="pareto-overview-history__name">{session.title}</span>
            <span className="pareto-overview-history__meta">
              <time dateTime={session.createdAt}>{new Date(session.createdAt).toLocaleDateString("en", {
                month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
              })}</time>
              <span>Revision {session.version}</span>
            </span>
          </Link>
        </li>)}
      </ul> : <div className="pareto-overview-history__empty">
        <h3>No searches yet.</h3>
        <p>Confirmed candidate searches will appear here when you create them.</p>
      </div>}
    </section>
  </main>;
}
