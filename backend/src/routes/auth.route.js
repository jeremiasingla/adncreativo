import express from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  refresh,
  me,
  logout,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Detrás de Vercel/proxy: usar X-Forwarded-For para no ignorar el header Forwarded
const keyGenerator = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => res.status(429).json({ error: "too_many_requests" }),
});
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => res.status(429).json({ error: "too_many_requests" }),
});

router.post("/auth/register", registerLimiter, register);
router.post("/auth/login", authLimiter, login);
router.post("/auth/refresh", authLimiter, refresh);
router.post("/auth/logout", logout);
router.get("/auth/me", authMiddleware, me);

export default router;
