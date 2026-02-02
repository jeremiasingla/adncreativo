/**
 * Métricas de generación de imágenes (creativos, welcome campaign, etc.).
 * Solo lectura vía getImageMetrics(); escritura vía recordImageGeneration().
 */

/** Eventos de generación de imagen (en memoria; se pierden al reiniciar). */
const imageEvents = [];

/** Estimación USD por tamaño (OpenAI DALL·E 3 / gpt-image; standard quality). */
const SIZE_TO_ESTIMATED_USD = {
  "1024x1024": 0.04,
  "1024x1536": 0.08,
  "1536x1024": 0.08,
  "1024x1792": 0.08,
  "1792x1024": 0.08,
};

/**
 * Registra una generación de imagen.
 * @param {object} opts
 * @param {string} opts.model - Modelo usado (ej. gpt-image-1.5, dall-e-3).
 * @param {string} opts.size - Tamaño devuelto por la API (ej. 1024x1536).
 * @param {string} [opts.aspectRatio] - Aspect ratio solicitado (ej. 4:5).
 * @param {number} opts.durationMs - Tiempo de generación en ms.
 * @param {string} [opts.source] - Origen: "creative" | "welcome" | "profile".
 */
export function recordImageGeneration({ model, size, aspectRatio, durationMs, source = "creative" }) {
  const estimatedUsd = SIZE_TO_ESTIMATED_USD[size] ?? 0.08;
  imageEvents.push({
    model,
    size,
    aspectRatio: aspectRatio ?? null,
    durationMs,
    estimatedUsd,
    imageCount: 1,
    source,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Devuelve métricas de imágenes para el admin.
 * @returns {object} Resumen y lista de eventos.
 */
export function getImageMetrics() {
  const totalImages = imageEvents.length;
  const totalEstimatedUsd = imageEvents.reduce((s, e) => s + e.estimatedUsd, 0);
  const totalDurationMs = imageEvents.reduce((s, e) => s + e.durationMs, 0);

  const byModel = {};
  const bySize = {};
  const bySource = {};
  for (const e of imageEvents) {
    byModel[e.model] = (byModel[e.model] || 0) + 1;
    bySize[e.size] = (bySize[e.size] || 0) + 1;
    bySource[e.source] = (bySource[e.source] || 0) + 1;
  }

  return {
    note: "Modelos de imagen (DALL·E / gpt-image) no usan tokens; se registra tamaño, tiempo y costo estimado USD por imagen.",
    summary: {
      totalImages,
      totalEstimatedUsd: Math.round(totalEstimatedUsd * 100) / 100,
      totalDurationMs,
      totalDurationFormatted: formatDuration(totalDurationMs),
      byModel,
      bySize,
      bySource,
    },
    events: [...imageEvents].reverse(),
  };
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m} m ${s % 60} s`;
  return `${s} s`;
}
