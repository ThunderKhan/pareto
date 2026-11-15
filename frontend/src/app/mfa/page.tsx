import MfaChallenge from "@/components/auth/mfa-challenge";
import "./mfa.css";

function safeNext(value: string | undefined) {
  return value && (value === "/dashboard" || /^\/dashboard\/(?!\/)/.test(value))
    ? value : "/dashboard";
}

export default async function MfaPage({ searchParams }: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <MfaChallenge next={safeNext(params.next)} />;
}
