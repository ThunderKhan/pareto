import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="dashboard-main">
      <p className="eyebrow">WORKSPACE OVERVIEW</p>
      <h1>Welcome to Pareto.</h1>
      <p>Recruitment intelligence with transparent criteria and evidence-backed candidate results.</p>
      <div className="dashboard-start">
        <p className="eyebrow">START HERE</p>
        <h2>Find candidates with clarity.</h2>
        <p>Describe a role, review the structured requirements, and make a deliberate search.</p>
        <Link href="/dashboard/search" className="button button--dark">Start candidate search →</Link>
      </div>
    </main>
  );
}
