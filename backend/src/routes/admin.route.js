import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { getMetrics, getLLMMetricsEndpoint, getImageMetricsEndpoint } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/admin/metrics", authMiddleware, requireAdmin, getMetrics);
router.get("/admin/metrics/llm", authMiddleware, requireAdmin, getLLMMetricsEndpoint);
router.get("/admin/metrics/images", authMiddleware, requireAdmin, getImageMetricsEndpoint);

export default router;
