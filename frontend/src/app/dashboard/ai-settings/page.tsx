import { recruiter } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AiProviderSettings from "@/components/dashboard/ai-provider-settings";
export default async function AiConnectionsPage(){
  const user=await recruiter();
  if(!user)redirect("/login?next=/dashboard/ai-settings");
  return <main className="pareto-main">
    <div className="pareto-profile-intro">
      <div><p className="pareto-page-eyebrow">Account settings</p>
        <h1 className="pareto-page-title">AI connections.</h1>
        <p className="pareto-page-lede">Manage provider keys, usage and preferred billing source.</p>
        <Link href="/dashboard/profile">Back to profile settings</Link>
      </div>
    </div>
    <AiProviderSettings/>
  </main>;
}
