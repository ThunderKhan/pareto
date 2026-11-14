import SearchWorkspace from "@/components/search/workspace";

export default function DashboardSearchPage() {
  return <main className="dashboard-main">
    <h1>Candidate search</h1>
    <p>Describe the role or select a reference profile. Review the criteria before searching your workspace.</p>
    <SearchWorkspace />
  </main>;
}
