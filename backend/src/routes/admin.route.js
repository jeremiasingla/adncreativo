import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { getMetrics } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/admin/metrics", authMiddleware, requireAdmin, getMetrics);

export default router;
