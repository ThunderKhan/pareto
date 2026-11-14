"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Only the public homepage mounts Lenis; candidate lists and forms scroll natively.
const DESKTOP_POINTER = "(min-width: 1200px) and (hover: hover) and (pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function HomepageSmoothScroll() {
  useEffect(() => {
    const pointer = window.matchMedia(DESKTOP_POINTER);
    const reducedMotion = window.matchMedia(REDUCED_MOTION);
    let instance: Lenis | null = null;

    const sync = () => {
      if (!pointer.matches || reducedMotion.matches) {
        instance?.destroy();
        instance = null;
        return;
      }

      if (instance) return;

      instance = new Lenis({
        autoRaf: true,
        // A controlled glide, avoiding the delayed feel of a long easing curve.
        lerp: 0.14,
        smoothWheel: true,
        syncTouch: false,
        gestureOrientation: "vertical",
        // Existing section scroll-margin-top offsets the sticky nav;
        // adding a second Lenis offset would double the visible gap.
        anchors: true,
      });
    };

    sync();
    pointer.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);

    return () => {
      pointer.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
      instance?.destroy();
      instance = null;
    };
  }, []);

  return null;
}
