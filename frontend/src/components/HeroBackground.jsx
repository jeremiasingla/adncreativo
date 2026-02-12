import React, { memo, useState, useEffect, useRef } from "react";
import { HalftoneDots } from "@paper-design/shaders-react";
import HeroOrb from "./HeroOrb";

/**
 * Hero background cinemático: manos IA + humana (ya con halftone aplicado).
 *
 * Las imágenes ai.webp y human.webp ya vienen con el efecto halftone.
 * El shader HalftoneDots se aplica solo al fondo blanco como textura sutil.
 *
 * Capas:
 *  1. Fondo blanco con halftone sutil
 *  2. Imagen AI (entra desde la izquierda)
 *  3. Imagen Human (entra desde la derecha)
 *  4. Gradientes de desvanecimiento
 *  5. Velo blanco sutil
 */

const HAND_AI_SRC = "/images/ai.webp";
const HAND_HUMAN_SRC = "/images/human.webp";

function HeroBackground() {
  const [loaded, setLoaded] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const containerRef = useRef(null);

  // Precargar imágenes
  useEffect(() => {
    let cancelled = false;
    const srcs = [HAND_AI_SRC, HAND_HUMAN_SRC];
    let count = 0;

    srcs.forEach((src) => {
      const img = new Image();
      img.src = src;
      const done = () => {
        count++;
        if (count === srcs.length && !cancelled) setLoaded(true);
      };
      img.onload = done;
      img.onerror = done;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Disparar animación después de cargar
  useEffect(() => {
    if (!loaded) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReduced) {
      setAnimateIn(true);
      return;
    }

    const raf = requestAnimationFrame(() => setAnimateIn(true));
    return () => cancelAnimationFrame(raf);
  }, [loaded]);

  const slideTransition = animateIn
    ? "transform 1.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease-out"
    : "none";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* 1. Fondo blanco con halftone sutil como textura */}
      <div className="absolute inset-0">
        <HalftoneDots
          style={{ width: "100%", height: "100%" }}
          colorBack="#ffffff"
          colorFront="#000000"
          originalColors={false}
          type="gooey"
          grid="hex"
          inverted={false}
          size={0.13}
          radius={0.71}
          contrast={0.42}
          grainMixer={0.12}
          grainOverlay={0.12}
          grainSize={0.45}
          scale={1.16}
          fit="cover"
        />
      </div>

      {/* 2. Mano AI (halftone pre-aplicado) - entra desde la izquierda */}
      <div
        className="absolute inset-0 pointer-events-none hero-hand"
        style={{
          opacity: loaded ? 1 : 0,
          transform: animateIn ? "translateX(0)" : "translateX(-40%)",
          transition: slideTransition,
          mixBlendMode: "multiply",
        }}
      >
        <img
          src={HAND_AI_SRC}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "auto",
            maxHeight: "100%",
            objectFit: "contain",
            objectPosition: "bottom center",
          }}
        />
      </div>

      {/* 3. Mano humana (halftone pre-aplicado) - entra desde la derecha */}
      <div
        className="absolute inset-0 pointer-events-none hero-hand"
        style={{
          opacity: loaded ? 1 : 0,
          transform: animateIn ? "translateX(0)" : "translateX(40%)",
          transition: slideTransition,
          mixBlendMode: "multiply",
        }}
      >
        <img
          src={HAND_HUMAN_SRC}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "auto",
            maxHeight: "100%",
            objectFit: "contain",
            objectPosition: "bottom center",
          }}
        />
      </div>

      {/* 4. Gradientes de desvanecimiento */}
      <div
        className="absolute inset-y-0 left-0 w-40 pointer-events-none"
        style={{
          background: "linear-gradient(to right, #ffffff 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-40 pointer-events-none"
        style={{
          background: "linear-gradient(to left, #ffffff 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #ffffff 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.85) 40%, transparent 100%)",
        }}
      />

      {/* 5. Velo blanco sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(255,255,255,0.25)" }}
      />

      {/* 6. Orbe de partículas (centro) */}
      <HeroOrb />
    </div>
  );
}

export default memo(HeroBackground);
