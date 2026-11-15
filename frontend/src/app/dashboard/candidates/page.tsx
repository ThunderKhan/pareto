import CandidateLibrary from "@/components/dashboard/candidate-library";

export default function CandidatesPage() {
  return <main className="pareto-main">
    <p className="pareto-page-eyebrow">Candidate database</p>
    <h1 className="pareto-page-title">Candidates.</h1>
    <p className="pareto-page-lede">Explore the candidate profiles available to your account. Open a profile to examine its documented attributes or search for similar candidates.</p>
    <CandidateLibrary />
  </main>;
}
