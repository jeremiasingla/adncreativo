import React, { memo } from "react";

/**
 * Fondo del hero: gradiente celeste claro sin shaders.
 */
function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #f0f9ff 0%, #e0f2fe 25%, #bae6fd 50%, #7dd3fc 75%, #38bdf8 100%)",
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
