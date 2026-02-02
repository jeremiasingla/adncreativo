import { getImageMetrics } from "../services/metrics.service.js";

/**
 * GET /admin/metrics
 * Devuelve métricas de generación de imágenes (solo admin).
 */
export function getMetrics(req, res) {
  try {
    const metrics = getImageMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("❌ Error getting metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
