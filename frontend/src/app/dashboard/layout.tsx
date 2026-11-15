import { recruiter } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import { Inter } from "next/font/google";

const uiFont = Inter({ subsets: ["latin"], display: "swap", variable: "--font-pareto-dashboard-ui" });

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await recruiter();
  if (!user) redirect("/login?next=/dashboard");

  const first = user.user_metadata?.first_name;
  const last = user.user_metadata?.last_name;
  return <div className={uiFont.variable}><DashboardShell user={{
    email: user.email ?? "",
    firstName: typeof first === "string" ? first : "",
    lastName: typeof last === "string" ? last : "",
  }}>{children}</DashboardShell></div>;
}
