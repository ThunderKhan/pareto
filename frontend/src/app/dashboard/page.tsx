import Link from "next/link";
import { ArrowRight, MagnifyingGlass, UserCircle } from "@phosphor-icons/react/dist/ssr";

export default function DashboardPage() {
  return <main className="pareto-main">
    <p className="pareto-page-eyebrow">Workspace overview</p>
    <h1 className="pareto-page-title">Find the right people.</h1>
    <p className="pareto-page-lede">Turn a hiring brief into criteria you can review, confirm, and explain. Every result is grounded in candidate records.</p>
    <section className="pareto-overview-hero" aria-labelledby="pareto-overview-start">
      <div>
        <h2 id="pareto-overview-start">A clearer way to search.</h2>
        <p>Describe a role in your own words, inspect the proposed requirements, then decide when to run the search.</p>
      </div>
      <Link href="/dashboard/search">Start candidate search <ArrowRight size={17} aria-hidden="true"/></Link>
    </section>
    <div className="pareto-overview-grid">
      <Link href="/dashboard/candidates" className="pareto-overview-link">
        <MagnifyingGlass size={25} aria-hidden="true" />
        <h3>Browse your candidates</h3>
        <p>Find a candidate by name or choose a reference profile for similarity matching.</p>
      </Link>
      <Link href="/dashboard/profile" className="pareto-overview-link">
        <UserCircle size={25} aria-hidden="true" />
        <h3>Your recruiter profile</h3>
        <p>Update your name, view your account email, and manage password security.</p>
      </Link>
    </div>
  </main>;
}
