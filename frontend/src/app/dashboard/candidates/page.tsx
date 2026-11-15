import Link from "next/link";
import CandidateLibrary from "@/components/dashboard/candidate-library";

export default async function CandidatesPage({ searchParams }: {
  searchParams: Promise<{candidate?: string}>;
}) {
  const query = await searchParams;
  return <main className="pareto-main">
    <p className="pareto-page-eyebrow">Candidate database</p>
    <h1 className="pareto-page-title">Candidates.</h1>
    <p className="pareto-page-lede">Explore the candidate profiles available to your account. Open a profile to examine its documented attributes or search for similar candidates.</p>
    <p><Link href="/dashboard/candidates/import" className="import-entry-link">Import resumes →</Link></p>
    <CandidateLibrary initialCandidateId={typeof query.candidate === "string" ? query.candidate : undefined}/>
  </main>;
}
