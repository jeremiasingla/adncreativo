import { getAllMetrics, getLLMMetrics, getImageMetrics, clearAllMetrics } from "../services/metrics.service.js";

/**
 * GET /admin/metrics
 * Devuelve métricas completas (LLM + Images, solo admin).
 */
export function getMetrics(req, res) {
  try {
    const metrics = getAllMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("❌ Error getting metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /admin/metrics/llm
 * Devuelve solo métricas LLM (solo admin).
 */
export function getLLMMetricsEndpoint(req, res) {
  try {
    const metrics = getLLMMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("❌ Error getting LLM metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /admin/metrics/images
 * Devuelve solo métricas de imágenes (solo admin).
 */
export function getImageMetricsEndpoint(req, res) {
  try {
    const metrics = getImageMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("❌ Error getting image metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * DELETE /admin/metrics
 * Elimina todas las métricas almacenadas (solo admin).
 */
export function clearMetrics(req, res) {
  try {
    const result = clearAllMetrics();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error clearing metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
