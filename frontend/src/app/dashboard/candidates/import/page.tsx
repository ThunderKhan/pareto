import Link from "next/link";
import ResumeImports from "@/components/dashboard/imports/workspace";

export const dynamic = "force-dynamic";

export default function ImportResumesPage() {
  return <main className="pareto-main pareto-main--imports">
    <p className="pareto-page-eyebrow">Candidate database / private ingestion</p>
    <div className="import-page-header">
      <div><h1 className="pareto-page-title">Import resumes.</h1>
        <p className="pareto-page-lede">Every document has a traceable processing state. Unknown fields remain unknown until a recruiter verifies their source.</p></div>
      <Link href="/dashboard/candidates" className="import-page-back">Back to candidates</Link>
    </div>
    <ResumeImports/>
  </main>;
}
