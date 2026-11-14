import type { Metadata } from "next";
import HomepageV2 from "../components/marketing/home-v2";

export const metadata: Metadata = {
  title: "Pareto — Find the right people. Understand every match.",
  description: "Describe your hiring brief, confirm the criteria, and understand the evidence behind candidate matches.",
};

export default function HomePage() {
  return <HomepageV2 />;
}
