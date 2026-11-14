import type { Metadata } from "next";
import HomepageV2 from "../components/marketing/home-v2";
import { Bitter, Inter } from "next/font/google";

// Homepage-only, build-time self-hosted OFL fonts. No OpenTag font assets are copied.
const displayFont = Bitter({ subsets: ["latin"], style: "normal", display: "swap", variable: "--font-pareto-v2-display" });
const uiFont = Inter({ subsets: ["latin"], style: "normal", display: "swap", variable: "--font-pareto-v2-ui" });

export const metadata: Metadata = {
  title: "Pareto — Find the right people. Understand every match.",
  description: "Describe your hiring brief, confirm the criteria, and understand the evidence behind candidate matches.",
};

export default function HomePage() {
  return <HomepageV2 fontClasses={`${displayFont.variable} ${uiFont.variable}`} />;
}
