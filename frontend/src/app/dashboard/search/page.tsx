import SearchWorkspace from "@/components/search/workspace";

export default async function DashboardSearchPage({ searchParams }: {
  searchParams: Promise<{ session?: string; reference?: string }>;
}) {
  const params = await searchParams;
  const session = typeof params.session === "string" ? params.session : undefined;
  const reference = !session && typeof params.reference === "string" ? params.reference : undefined;
  return <main className="pareto-main pareto-main--search">
    <SearchWorkspace key={session ?? reference ?? "new"} initialSession={session} initialReference={reference}/>
  </main>;
}
