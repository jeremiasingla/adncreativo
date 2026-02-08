import React, { memo, useState, useEffect } from "react";
import { GrainGradient } from "@paper-design/shaders-react";

/**
 * Fondo del hero con Paper Shaders: GrainGradient claro y celeste eléctrico.
 * Memoizado para evitar re-renders. Reduce speed/noise si el usuario pide menos movimiento.
 * @see https://shaders.paper.design/
 */
function HeroBackground() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      >
        <GrainGradient
          colorBack="#f0f9ff"
          colors={["#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9"]}
          softness={0.7}
          intensity={reduceMotion ? 0.2 : 0.35}
          noise={reduceMotion ? 0.2 : 0.45}
          shape="wave"
          speed={reduceMotion ? 0 : 0.08}
          fit="cover"
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </div>
      {/* Capa para bajar opacidad del celeste (el grain queda debajo, sin tocar) */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background: "rgba(240, 249, 255, 0.32)",
          mixBlendMode: "normal",
        }}
      />
      {/* Suave resplandor celeste desde abajo */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(56, 189, 248, 0.14) 0%, rgba(14, 165, 233, 0.07) 40%, transparent 65%)",
        }}
      />
      {/* Transición hacia el contenido */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white pointer-events-none" />
    </div>
  );
}

export default memo(HeroBackground);
