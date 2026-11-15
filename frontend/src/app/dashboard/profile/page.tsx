import { recruiter } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/dashboard/profile-editor";

export default async function RecruiterProfilePage() {
  const user = await recruiter();
  if (!user) redirect("/login?next=/dashboard/profile");

  return <main className="pareto-main">
    <p className="pareto-page-eyebrow">Account settings</p>
    <h1 className="pareto-page-title">Your profile.</h1>
    <p className="pareto-page-lede">Keep your recruiter details current and your account secure.</p>
    <ProfileEditor email={user.email ?? ""}
      firstName={typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name : ""}
      lastName={typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name : ""}
    />
  </main>;
}
