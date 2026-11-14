import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SignOutButton from "../../components/auth/sign-out";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) redirect("/login?next=/dashboard");
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet) {
        try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Session refresh may be deferred from a read-only Server Component. */ }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login?next=/dashboard");

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a href="/" className="dashboard-logo">p. <span>pareto.</span></a>
        <nav aria-label="Dashboard navigation">
          <a href="/dashboard">Overview</a>
          <a href="/dashboard/search">Candidate search</a>
        </nav>
        <div className="dashboard-profile"><span>{data.user.email}</span><SignOutButton /></div>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-top"><strong>Recruitment workspace</strong><span>Private dashboard</span></header>
        {children}
      </div>
    </div>
  );
}
