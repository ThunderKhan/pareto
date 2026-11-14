"use client";

import { useEffect, useRef } from "react";

/**
 * Original Pareto character: the existing profile-card mascot redrawn as inline SVG
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
        <ellipse className="v2-hero-mascot__shadow" cx="121" cy="211" rx="59" ry="8" fill="#D6E3F5" opacity=".85" />
        <g className="v2-hero-mascot__leg v2-hero-mascot__leg--left">
          <path d="M102 163L93 191" stroke="#020E24" strokeWidth="12" strokeLinecap="round"/>
          <path d="M82 195H97" stroke="#020E24" strokeWidth="12" strokeLinecap="round"/>
        </g>
        <g className="v2-hero-mascot__leg v2-hero-mascot__leg--right">
          <path d="M144 164L160 189" stroke="#020E24" strokeWidth="12" strokeLinecap="round"/>
          <path d="M156 194L172 186" stroke="#020E24" strokeWidth="12" strokeLinecap="round"/>
        </g>
        <g className="v2-hero-mascot__figure">
          <path d="M160 94C176 92 185 83 189 69" stroke="#2A5DC2" strokeWidth="12" strokeLinecap="round"/>
          <path d="M188 69C180 62 180 52 184 49C189 45 192 55 194 59C194 49 198 43 203 45C208 47 204 58 204 61C209 53 215 52 218 56C221 60 214 68 210 73C209 81 202 86 191 85Z" fill="#467BEB" stroke="#2A5DC2" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M76 121C61 120 52 130 46 141" stroke="#2A5DC2" strokeWidth="12" strokeLinecap="round"/>
          <path d="M88 44H144C150 44 154 47 158 51L179 73C183 77 185 82 185 89V148C185 165 174 176 157 176H88C71 176 60 165 60 148V72C60 55 71 44 88 44Z" fill="#467BEB" stroke="#2655AF" strokeWidth="3"/>
          <path d="M147 45V66C147 76 152 81 162 81H184" fill="#91B4FF" stroke="#2655AF" strokeWidth="3" strokeLinejoin="round"/>
          <path d="M82 67C89 60 100 59 110 60" stroke="#9DBBFF" strokeWidth="5" strokeLinecap="round" opacity=".7"/>
          <ellipse cx="104" cy="107" rx="13" ry="15" fill="#FFFDF9"/>
          <ellipse cx="145" cy="107" rx="13" ry="15" fill="#FFFDF9"/>
          <g ref={pupilsRef} className="v2-hero-mascot__pupils" transform="translate(0 0)">
            <circle cx="107" cy="109" r="7.5" fill="#020E24"/>
            <circle cx="148" cy="109" r="7.5" fill="#020E24"/>
            <circle cx="110" cy="105" r="2.3" fill="#FFFDF9"/>
            <circle cx="151" cy="105" r="2.3" fill="#FFFDF9"/>
          </g>
          <path d="M116 135C121 144 135 145 140 135" stroke="#020E24" strokeWidth="4" strokeLinecap="round"/>
          <ellipse cx="90" cy="133" rx="6" ry="3" fill="#A7C1FF" opacity=".85"/>
          <ellipse cx="161" cy="132" rx="6" ry="3" fill="#A7C1FF" opacity=".85"/>
          <g transform="rotate(-11 57 150)">
            <rect x="25" y="125" width="67" height="57" rx="9" fill="#FFFDF9" stroke="#B9C9E2" strokeWidth="2.5"/>
            <circle cx="43" cy="145" r="9" fill="#DDE8FD"/>
            <circle cx="43" cy="142" r="3.6" fill="#6C87AE"/>
            <path d="M37 152C39 147 47 147 49 152" stroke="#6C87AE" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M57 139H80M57 148H75M36 164H67" stroke="#93A8C4" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="77" cy="165" r="8" fill="#E5EEFF"/>
            <path d="M73 165L76 168L81 162" stroke="#2A5DC2" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <path d="M41 151C39 155 39 160 44 162" stroke="#2A5DC2" strokeWidth="9" strokeLinecap="round"/>
          <path d="M41 63L42 54M36 59H47" stroke="#86A7E8" strokeWidth="2.6" strokeLinecap="round"/>
        </g>
      </svg>
    </span>
  );
}
