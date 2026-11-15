"use client";

/** A restrained interpretation of the supplied MorphOrb concept.
 *  Motion reflects actual request state; it never delays or fabricates model progress. */
export default function SearchOrb({ working = false }: { working?: boolean }) {
  return <span className={"pareto-search-orb" + (working ? " pareto-search-orb--working" : "")} aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--dot": index } as React.CSSProperties} />)}
    <span className="pareto-search-orb__center"/>
  </span>;
}
