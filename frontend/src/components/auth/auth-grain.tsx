"use client";

import { GrainGradient } from "@paper-design/shaders-react";

/** Paper Design's original animated GrainGradient, recolored for Pareto. */
export default function AuthGrain() {
  return <GrainGradient
    speed={1.2}
    scale={1}
    rotation={0}
    offsetX={0}
    offsetY={0}
    softness={0.5}
    intensity={0.5}
    noise={0.25}
    shape="corners"
    colors={["#03132E", "#467BEB", "#93B9F0", "#244B9F"]}
    colorBack="#06142A"
    className="auth-art__shader"
  />;
}
