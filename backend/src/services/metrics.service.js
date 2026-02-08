/**
 * Métricas de generación de imágenes (creativos, welcome campaign, etc.).
 * Solo lectura vía getImageMetrics(); escritura vía recordImageGeneration().
 */

/** Eventos de generación de imagen (en memoria; se pierden al reiniciar). */
const imageEvents = [];

/** Eventos de llamadas LLM (en memoria). */
const llmEvents = [];

/** Estimación USD por tamaño (FLUX / OpenRouter; fallback cuando no viene cost en usage). */
const SIZE_TO_ESTIMATED_USD = {
  "1024x1024": 0.04,
  "1024x1536": 0.08,
  "1536x1024": 0.08,
  "1024x1792": 0.08,
  "1792x1024": 0.08,
};

/**
 * Registra una llamada LLM con su costo real de OpenRouter
 * @param {object} opts
 * @param {string} opts.model - Modelo usado
 * @param {number} opts.promptTokens - Tokens del prompt
 * @param {number} opts.completionTokens - Tokens de la respuesta
 * @param {number} opts.totalCost - Costo total en USD
 * @param {number} opts.durationMs - Duración en ms
 * @param {string} [opts.source] - Origen: "branding" | "profiles" | "headlines" | "creative_image"
 * @param {string} [opts.workspaceSlug] - Slug del workspace relacionado
 */
export function recordLLMRequest({
  model,
  promptTokens,
  completionTokens,
  totalCost,
  durationMs,
  source = "unknown",
  workspaceSlug = null,
}) {
  llmEvents.push({
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    totalCost,
    durationMs,
    source,
    workspaceSlug,
    timestamp: new Date().toISOString(),
  });
  if (process.env.NODE_ENV !== "production" || process.env.LOG_METRICS === "1") {
    console.log(
      `[Metrics] LLM Request - ${source} | Model: ${model} | Tokens: ${promptTokens + completionTokens} | Cost: $${totalCost.toFixed(4)} | Duration: ${durationMs}ms`,
    );
  }
}

/**
 * Registra una generación de imagen.
 * @param {object} opts
 * @param {string} opts.model - Modelo usado (ej. black-forest-labs/flux.2-max).
 * @param {string} opts.size - Tamaño o aspect ratio (ej. 1024x1536, 4:5, 1:1).
 * @param {string} [opts.aspectRatio] - Aspect ratio solicitado (ej. 4:5).
 * @param {number} opts.durationMs - Tiempo de generación en ms.
 * @param {string} [opts.source] - Origen: "creative" | "welcome" | "profile".
 * @param {number} [opts.estimatedUsd] - Costo estimado o real
 */
export function recordImageGeneration({
  model,
  size,
  aspectRatio,
  durationMs,
  source = "creative",
  estimatedUsd = null,
}) {
  const cost = estimatedUsd ?? SIZE_TO_ESTIMATED_USD[size] ?? 0.08;
  imageEvents.push({
    model,
    size,
    aspectRatio: aspectRatio ?? null,
    durationMs,
    estimatedUsd: cost,
    imageCount: 1,
    source,
    timestamp: new Date().toISOString(),
  });
  console.log(
    `[Metrics] Image Gen - ${source} | Model: ${model} | Size: ${size} | Cost: $${cost.toFixed(4)} | Duration: ${durationMs}ms`,
  );
}

/**
 * Devuelve métricas de LLM para el admin.
 * @returns {object} Resumen y lista de eventos.
 */
export function getLLMMetrics() {
  const totalRequests = llmEvents.length;
  const totalCost = llmEvents.reduce((s, e) => s + e.totalCost, 0);
  const totalTokens = llmEvents.reduce((s, e) => s + e.totalTokens, 0);
  const totalDurationMs = llmEvents.reduce((s, e) => s + e.durationMs, 0);

  const byModel = {};
  const bySource = {};
  const byWorkspace = {};

  for (const e of llmEvents) {
    // Por modelo
    if (!byModel[e.model])
      byModel[e.model] = { requests: 0, cost: 0, tokens: 0 };
    byModel[e.model].requests++;
    byModel[e.model].cost += e.totalCost;
    byModel[e.model].tokens += e.totalTokens;

    // Por origen
    if (!bySource[e.source])
      bySource[e.source] = { requests: 0, cost: 0, tokens: 0 };
    bySource[e.source].requests++;
    bySource[e.source].cost += e.totalCost;
    bySource[e.source].tokens += e.totalTokens;

    // Por workspace
    if (e.workspaceSlug) {
      if (!byWorkspace[e.workspaceSlug])
        byWorkspace[e.workspaceSlug] = { requests: 0, cost: 0, tokens: 0 };
      byWorkspace[e.workspaceSlug].requests++;
      byWorkspace[e.workspaceSlug].cost += e.totalCost;
      byWorkspace[e.workspaceSlug].tokens += e.totalTokens;
    }
  }

  return {
    note: "Costos reales de OpenRouter basados en usage reportado",
    summary: {
      totalRequests,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      totalDurationMs,
      totalDurationFormatted: formatDuration(totalDurationMs),
      avgCostPerRequest:
        totalRequests > 0
          ? Math.round((totalCost / totalRequests) * 10000) / 10000
          : 0,
      byModel: Object.fromEntries(
        Object.entries(byModel).map(([k, v]) => [
          k,
          { ...v, cost: Math.round(v.cost * 10000) / 10000 },
        ]),
      ),
      bySource: Object.fromEntries(
        Object.entries(bySource).map(([k, v]) => [
          k,
          { ...v, cost: Math.round(v.cost * 10000) / 10000 },
        ]),
      ),
      byWorkspace: Object.fromEntries(
        Object.entries(byWorkspace).map(([k, v]) => [
          k,
          { ...v, cost: Math.round(v.cost * 10000) / 10000 },
        ]),
      ),
    },
    events: [...llmEvents].reverse().slice(0, 50), // Últimos 50 eventos
  };
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
    note: "Modelos de imagen (FLUX / OpenRouter) no usan tokens; se registra tamaño, tiempo y costo estimado USD por imagen.",
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

/**
 * Devuelve métricas combinadas (LLM + Images)
 */
export function getAllMetrics() {
  const llm = getLLMMetrics();
  const images = getImageMetrics();
  const totalCost = llm.summary.totalCost + images.summary.totalEstimatedUsd;

  return {
    totalCost: Math.round(totalCost * 10000) / 10000,
    remaining: Math.round((4.63 - totalCost) * 100) / 100, // Actualizar con balance real
    llm,
    images,
  };
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m} m ${s % 60} s`;
  return `${s} s`;
}

/**
 * Limpia todas las métricas almacenadas (LLM e imágenes)
 */
export function clearAllMetrics() {
  const clearedLLMCount = llmEvents.length;
  const clearedImageCount = imageEvents.length;

  llmEvents.length = 0;
  imageEvents.length = 0;

  console.log(
    `[Metrics] Cleared all metrics - LLM events: ${clearedLLMCount}, Image events: ${clearedImageCount}`,
  );

  return {
    clearedLLMEvents: clearedLLMCount,
    clearedImageEvents: clearedImageCount,
    message: "All metrics cleared successfully",
  };
}
