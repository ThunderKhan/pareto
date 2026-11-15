import SearchWorkspace from "@/components/search/workspace";

export default async function DashboardSearchPage({ searchParams }: {
  searchParams: Promise<{ session?: string; reference?: string }>;
}) {
  const params = await searchParams;
  const session = typeof params.session === "string" ? params.session : undefined;
  const reference = !session && typeof params.reference === "string" ? params.reference : undefined;
  return <main className="pareto-main pareto-main--search">
    <p className="pareto-page-eyebrow">Recruitment intelligence</p>
    <h1 className="pareto-page-title">Candidate search.</h1>
    <p className="pareto-page-lede">Describe who you need, review the criteria, and explore matches with evidence.</p>
    <SearchWorkspace key={session ?? reference ?? "new"} initialSession={session} initialReference={reference}/>
  </main>;
}
