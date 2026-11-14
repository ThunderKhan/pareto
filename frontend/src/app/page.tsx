import type { Metadata } from "next";
import HomepageV2 from "../components/marketing/home-v2";
import { Inter } from "next/font/google";

// Inter stays self-hosted through Next.js; STK Earl is served from local WOFF2 files in home-v2.css.
const uiFont = Inter({ subsets: ["latin"], style: "normal", display: "swap", variable: "--font-pareto-v2-ui" });

export const metadata: Metadata = {
  title: "Pareto | Find the right people. Understand every match.",
  description: "Describe your hiring brief, confirm the criteria, and understand the evidence behind candidate matches.",
};

export default function HomePage() {
  return <HomepageV2 fontClasses={uiFont.variable} />;
}
