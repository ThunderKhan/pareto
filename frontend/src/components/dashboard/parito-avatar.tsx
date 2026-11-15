import Image from "next/image";

/** Parito is Pareto's existing mascot, used for the signed-in recruiter's avatar. */
export default function ParitoAvatar({ size = "compact" }: { size?: "compact" | "large" }) {
  return <span className={"pareto-avatar" + (size === "large" ? " pareto-avatar--large" : "")}
    aria-hidden="true">
    <Image src="/mascot/pareto-mascot.svg" alt="" width={240} height={225} unoptimized />
  </span>;
}
