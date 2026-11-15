import { recruiter } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/dashboard/profile-editor";
import ParitoAvatar from "@/components/dashboard/parito-avatar";

export default async function RecruiterProfilePage() {
  const user = await recruiter();
  if (!user) redirect("/login?next=/dashboard/profile");

  return <main className="pareto-main">
    <div className="pareto-profile-intro">
      <ParitoAvatar size="large" />
      <div>
        <p className="pareto-page-eyebrow">Account settings</p>
        <h1 className="pareto-page-title">Your profile.</h1>
        <p className="pareto-page-lede">Keep your recruiter details current and your account secure.</p>
      </div>
    </div>
    <ProfileEditor email={user.email ?? ""}
      firstName={typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : ""}
      lastName={typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : ""}
      themePreference={typeof user.user_metadata?.theme_preference === "string" ? user.user_metadata.theme_preference : "system"}
    />
  </main>;
}
