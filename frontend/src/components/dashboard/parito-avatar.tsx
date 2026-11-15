import Image from "next/image";

/** Parito, the existing mascot artwork. Size variants keep its full silhouette visible. */
export default function ParitoAvatar({ size = "compact" }: {
  size?: "compact" | "large" | "chat" | "hero";
}) {
  return <span className={"pareto-avatar" + (size === "compact" ? "" : " pareto-avatar--" + size)}
    aria-hidden="true">
    <Image src="/mascot/pareto-mascot.svg" alt="" width={240} height={225} unoptimized />
  </span>;
}
