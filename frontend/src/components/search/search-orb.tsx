"use client";

import ParitoAvatar from "@/components/dashboard/parito-avatar";

/** The original mascot replaces the generic orb. Working state reflects actual requests. */
export default function SearchOrb({ working = false }: { working?: boolean }) {
  return <span className={"pareto-search-orb" + (working ? " pareto-search-orb--working" : "")}
    aria-hidden="true">
    <ParitoAvatar size={working ? "chat" : "hero"} />
  </span>;
}
