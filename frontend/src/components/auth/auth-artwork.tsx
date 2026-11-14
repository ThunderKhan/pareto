"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";

const AuthGrain = dynamic(() => import("./auth-grain"), { ssr: false });
const motionQuery = "(min-width: 960px) and (prefers-reduced-motion: no-preference)";

export default function AuthArtwork({ mode }: { mode: "login" | "signup" }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(motionQuery);
    const sync = () => setAnimate(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return <aside className="auth-art" aria-label="Pareto recruitment intelligence">
    <div className="auth-art__fallback" aria-hidden="true" />
    {animate && <div className="auth-art__shader-wrap" aria-hidden="true"><AuthGrain /></div>}
    <div className="auth-art__scrim" aria-hidden="true" />
    <div className="auth-art__content">
      <h2>{mode === "signup" ? <>Look beyond<br/><em>the résumé.</em></> : <>Find clarity<br/><em>in every match.</em></>}</h2>
      <div className="auth-art__bottom">
        <Image
          src="/mascot/pareto-mascot.svg"
          alt="Pareto mascot waving with a candidate profile"
          width={120}
          height={113}
          unoptimized
        />
        <div className="auth-art__bottom-text">
          <span className="auth-art__bottom-overline">Pareto · Recruitment intelligence</span>
          <strong>Good hiring deserves good reasons.</strong>
        </div>
      </div>
    </div>
  </aside>;
}
