import Link from "next/link";

export default function DashboardSearchPage() {
  return (
    <main className="dashboard-main">
      <p className="eyebrow">CANDIDATE SEARCH</p>
      <h1>Search with evidence.</h1>
      <p>The next development slice will connect natural-language criteria extraction, recruiter confirmation, and stored candidate matching.</p>
      <div className="dashboard-start">
        <p className="eyebrow">IMPLEMENTATION STATUS</p>
        <h2>Search is not connected yet.</h2>
        <p>To explore a transparent synthetic demonstration now, use the interactive product preview on the public landing page.</p>
        <Link href="/#preview" className="button button--dark">View synthetic example →</Link>
      </div>
    </main>
  );
}
