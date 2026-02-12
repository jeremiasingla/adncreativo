import React, { memo, useMemo } from "react";

/**
 * Orbe de partículas en 3D: forman una esfera y luego se expanden.
 * Inspirado en el efecto de partículas con rotateY/rotateZ + translateX.
 * Colores en tonos rojos (paleta Aura).
 */

const TOTAL = 300;
const ORB_SIZE = 52;
const PARTICLE_SIZE = 2;
const TIME = "14s";
const BASE_HUE = 8; // rojo
const HUE_RANGE = 36;

function HeroOrb() {
  const particles = useMemo(() => {
    return Array.from({ length: TOTAL }, (_, i) => ({
      id: i,
      z: Math.random() * 360,
      y: Math.random() * 360,
      hue: (HUE_RANGE / TOTAL) * i + BASE_HUE,
    }));
  }, []);

  const keyframesCSS = useMemo(() => {
    return particles
      .map(
        (p) => `
@keyframes hero-orb-orbit-${p.id} {
  0% { opacity: 0; }
  20% { opacity: 1; }
  30% {
    transform: rotateZ(-${p.z}deg) rotateY(${p.y}deg) translateX(${ORB_SIZE}px) rotateZ(${p.z}deg);
  }
  80% {
    transform: rotateZ(-${p.z}deg) rotateY(${p.y}deg) translateX(${ORB_SIZE}px) rotateZ(${p.z}deg);
    opacity: 1;
  }
  100% {
    transform: rotateZ(-${p.z}deg) rotateY(${p.y}deg) translateX(${ORB_SIZE * 3}px) rotateZ(${p.z}deg);
    opacity: 0;
  }
}`
      )
      .join("");
  }, [particles]);

  return (
    <div className="hero-orb-container">
      <style dangerouslySetInnerHTML={{ __html: keyframesCSS }} />
      <div className="hero-orb-wrap">
        {particles.map((p) => (
          <div
            key={p.id}
            className="hero-orb-particle"
            style={{
              animation: `hero-orb-orbit-${p.id} ${TIME} infinite`,
              animationDelay: `${p.id * 0.01}s`,
              backgroundColor: `hsla(${p.hue}, 85%, 52%, 0.95)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(HeroOrb);
