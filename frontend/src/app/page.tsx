const planned = [
  "Natural-language candidate search",
  "Human-confirmed search criteria",
  "Explainable candidate matching",
  "Conversational search refinement",
  "Find candidates like a reference profile",
  "Constraint diagnostics and what-if analysis",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
      <div className="mb-9 inline-flex w-fit items-center rounded-full border border-white/15 px-3 py-1 text-xs tracking-wide text-slate-300">
        M0 · Engineering foundation
      </div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
        Recruitment intelligence
      </p>
      <h1 className="text-6xl font-semibold tracking-tight sm:text-8xl">pareto.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
        Discover candidates. Explain the evidence. Explore hiring trade-offs.
      </p>
      <p className="mt-5 max-w-2xl text-sm text-slate-400">
        The application scaffold is ready. Search, authentication, ingestion and AI workflows
        will be implemented in the next milestones. This page does not represent a completed product.
      </p>
      <section className="mt-12 grid gap-3 sm:grid-cols-2">
        {planned.map((item) => (
          <div key={item} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-200">
            <span aria-hidden="true" className="mr-2 text-sky-300">◇</span>
            {item}
          </div>
        ))}
      </section>
      <p className="mt-10 text-xs text-slate-500">System health: /api/health</p>
    </main>
  );
}
