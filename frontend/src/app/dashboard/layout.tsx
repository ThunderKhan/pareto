import Link from "next/link";
import { recruiter } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "../../components/auth/sign-out";
 
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await recruiter();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-logo">p. <span>pareto.</span></Link>
        <nav aria-label="Dashboard navigation">
          <a href="/dashboard">Overview</a>
          <a href="/dashboard/search">Candidate search</a>
        </nav>
        <div className="dashboard-profile"><span>{user.email}</span><SignOutButton /></div>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-top"><strong>Recruitment workspace</strong><span>Private dashboard</span></header>
        {children}
      </div>
    </div>
  );
}
