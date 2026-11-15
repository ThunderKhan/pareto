import type { Metadata } from "next";
import Script from "next/script";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pareto",
  description: "Explainable recruitment intelligence, built with human oversight.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script id="pareto-theme-init" strategy="beforeInteractive">{`
          (() => {
            try {
              const media = window.matchMedia("(prefers-color-scheme: dark)");
              const apply = () => {
                const raw = window.localStorage.getItem("pareto-theme");
                const preference = raw === "dark" || raw === "light" ? raw : "system";
                document.documentElement.dataset.paretoPreference = preference;
                document.documentElement.dataset.paretoEffectiveTheme =
                  preference === "system" ? (media.matches ? "dark" : "light") : preference;
              };
              apply();
              media.addEventListener("change", apply);
              window.addEventListener("storage", apply);
            } catch {}
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}
