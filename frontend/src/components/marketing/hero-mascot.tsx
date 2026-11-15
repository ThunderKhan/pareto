"use client";

import { useEffect, useRef } from "react";

/**
 * Standalone Pareto character: the shared no-resume mascot redrawn as inline SVG
 * so its pupils can follow a pointer without rerendering the whole homepage.
 * Motion is deliberately limited to fine pointers and honors reduced motion.
 */
export function HeroMascot() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pupils = pupilsRef.current;
    if (!root || !pupils) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const reset = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      pupils.setAttribute("transform", "translate(0 0)");
    };

    const look = (event: PointerEvent) => {
      if (reduced.matches || !finePointer.matches || event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const box = root.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = Math.max(-4.5, Math.min(4.5, (pointerX - (box.left + box.width / 2)) / 38));
        const y = Math.max(-3.5, Math.min(3.5, (pointerY - (box.top + box.height / 2)) / 42));
        pupils.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      });
    };

    window.addEventListener("pointermove", look, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("mouseleave", reset);
    reduced.addEventListener("change", reset);
    finePointer.addEventListener("change", reset);
    return () => {
      reset();
      window.removeEventListener("pointermove", look);
      window.removeEventListener("blur", reset);
      document.removeEventListener("mouseleave", reset);
      reduced.removeEventListener("change", reset);
      finePointer.removeEventListener("change", reset);
    };
  }, []);

  return (
    <span className="v2-hero-mascot" ref={rootRef} aria-hidden="true">
      <svg viewBox="0 0 240 225" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <defs>
          <linearGradient id="parito-hero-blue" x1="58" y1="39" x2="185" y2="184" gradientUnits="userSpaceOnUse">
            <stop stopColor="#387CF6"/>
            <stop offset=".53" stopColor="#467BEB"/>
            <stop offset="1" stopColor="#2C67D6"/>
          </linearGradient>
          <linearGradient id="parito-hero-fold" x1="145" y1="42" x2="182" y2="83" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EAF2FF"/>
            <stop offset="1" stopColor="#AFCBFF"/>
          </linearGradient>
        </defs>
        <ellipse className="v2-hero-mascot__shadow" cx="124" cy="212" rx="59" ry="7" fill="#152B56" opacity=".10"/>
        <g className="v2-hero-mascot__leg v2-hero-mascot__leg--left">
          <path d="M97 165L93 191" stroke="#071632" strokeWidth="12" strokeLinecap="round"/>
          <path d="M82 195Q91 192 102 197" stroke="#071632" strokeWidth="13" strokeLinecap="round"/>
        </g>
        <g className="v2-hero-mascot__leg v2-hero-mascot__leg--right">
          <path d="M144 165L154 191" stroke="#071632" strokeWidth="12" strokeLinecap="round"/>
          <path d="M148 196Q160 192 170 196" stroke="#071632" strokeWidth="13" strokeLinecap="round"/>
        </g>
        <g className="v2-hero-mascot__figure">
          <path d="M70 117Q52 123 52 141" stroke="#071632" strokeWidth="12" strokeLinecap="round"/>
          <circle cx="52" cy="145" r="8" fill="#3978E8"/>
          <path d="M174 111Q190 101 196 77" stroke="#071632" strokeWidth="12" strokeLinecap="round"/>
          <circle cx="197" cy="74" r="9" fill="#3978E8"/>
          <path d="M85 39H143Q149 39 153 44L179 71Q184 76 184 86V147Q184 177 155 177H86Q58 177 58 148V69Q58 39 85 39Z" fill="url(#parito-hero-blue)" stroke="#2B63CC" strokeWidth="2"/>
          <path d="M145 40V63Q145 81 164 81H182L145 40Z" fill="url(#parito-hero-fold)" stroke="#2E68D4" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M78 64Q82 56 94 55" stroke="#A7C9FF" strokeWidth="5" strokeLinecap="round" opacity=".8"/>
          <path d="M95 94Q100 88 107 94M137 94Q143 88 150 94" stroke="#153B7B" strokeWidth="2.5" strokeLinecap="round"/>
          <ellipse cx="102" cy="116" rx="13.5" ry="15.5" fill="white"/>
          <ellipse cx="147" cy="116" rx="13.5" ry="15.5" fill="white"/>
          <g ref={pupilsRef} className="v2-hero-mascot__pupils" transform="translate(0 0)">
            <circle cx="105" cy="118" r="8" fill="#071632"/>
            <circle cx="150" cy="118" r="8" fill="#071632"/>
            <circle cx="108" cy="114" r="3" fill="white"/>
            <circle cx="153" cy="114" r="3" fill="white"/>
          </g>
          <path d="M110 139Q125 155 141 139Q138 156 126 157Q115 156 110 139Z" fill="#061633"/>
          <path d="M120 153Q126 148 133 153Q128 160 122 156Z" fill="#F47C9A"/>
          <path d="M35 62L38 52L41 62L51 65L41 68L38 78L35 68L25 65Z" fill="#467BEB"/>
          <path d="M202 131L204 123L206 131L214 133L206 135L204 143L202 135L194 133Z" fill="#82A9FF"/>
        </g>
      </svg>
    </span>
  );
}
