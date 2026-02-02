import React, { useRef, useEffect } from "react";

/**
 * Fondo hero idéntico al de la referencia (ADNCreativo):
 * fixed > paper shader (canvas ruido + resplandor azul) > gradiente to-background
 */
function drawPaperNoise(canvas, container) {
  if (!canvas || !container) return;
  const w = container.offsetWidth || 1024;
  const h = container.offsetHeight || 1024;
  const max = 1920;
  const scale = Math.min(1, max / Math.max(w, h, 1));
  const cw = Math.ceil(w * scale);
  const ch = Math.ceil(h * scale);
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const imageData = ctx.createImageData(cw, ch);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random() * 14;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = Math.floor(250 + n);
  }
  ctx.putImageData(imageData, 0, 0);
}

export default function HeroBackground() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const run = () => {
      drawPaperNoise(canvas, container);
    };

    run();
    const ro = new ResizeObserver(run);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="w-full h-full">
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
            data-paper-shader=""
          >
            <canvas
              ref={canvasRef}
              className="block w-full h-full"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
      {/* Resplandor azul desde abajo (como en la referencia) */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(191,219,254,0.45) 0%, rgba(147,197,253,0.2) 35%, rgba(129,140,248,0.06) 55%, transparent 70%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
    </div>
  );
}
