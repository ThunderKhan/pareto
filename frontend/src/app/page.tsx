import type { Metadata } from "next";
import ScrollLanding from "../components/marketing/scroll-landing";

export const metadata: Metadata = {
  title: "Pareto — Find the right talent. Know why.",
  description: "Explainable recruitment intelligence. Describe a hiring brief, confirm criteria, and understand the evidence behind each match.",
};

export default function HomePage() {
  return <ScrollLanding />;
}
