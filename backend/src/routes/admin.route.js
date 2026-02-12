import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  getMetrics,
  getLLMMetricsEndpoint,
  getImageMetricsEndpoint,
  clearMetrics,
  listUsers,
  getUserDetail,
  getUserActivity,
  resetUserPassword,
  changeUserRole,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/admin/metrics", authMiddleware, requireAdmin, getMetrics);
router.get("/admin/users", authMiddleware, requireAdmin, listUsers);
router.get("/admin/users/:id", authMiddleware, requireAdmin, getUserDetail);
router.get(
  "/admin/users/:id/activity",
  authMiddleware,
  requireAdmin,
  getUserActivity,
);
router.put(
  "/admin/users/:id/password",
  authMiddleware,
  requireAdmin,
  resetUserPassword,
);
router.put(
  "/admin/users/:id/role",
  authMiddleware,
  requireAdmin,
  changeUserRole,
);
router.get(
  "/admin/metrics/llm",
  authMiddleware,
  requireAdmin,
  getLLMMetricsEndpoint,
);
router.get(
  "/admin/metrics/images",
  authMiddleware,
  requireAdmin,
  getImageMetricsEndpoint,
);
router.delete("/admin/metrics", authMiddleware, requireAdmin, clearMetrics);

export default router;
