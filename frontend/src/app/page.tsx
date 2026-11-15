import type { Metadata } from "next";
import HomepageV2 from "../components/marketing/home-v2";
import { Inter } from "next/font/google";
import { recruiterAuthState } from "@/lib/auth";
import { redirect } from "next/navigation";

// This entry route is session-dependent, never cached as a public or private HTML response.
export const dynamic = "force-dynamic";

// Inter stays self-hosted through Next.js; STK Earl is served from local WOFF2 files in home-v2.css.
const uiFont = Inter({ subsets: ["latin"], style: "normal", display: "swap", variable: "--font-pareto-v2-ui" });

export const metadata: Metadata = {
  title: "Pareto",
  description: "Describe your hiring brief, confirm the criteria, and understand the evidence behind candidate matches.",
};

export default async function HomePage() {
  // Auth is validated on the server, not inferred from localStorage or unverified cookies.
  // The Proxy refreshes session cookies before this route is rendered.
  const { user, mfaPending } = await recruiterAuthState();
  if (user && mfaPending) redirect("/mfa?next=/dashboard");
  if (user) redirect("/dashboard");
  return <HomepageV2 fontClasses={uiFont.variable} />;
}
