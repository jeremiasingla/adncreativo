import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, refresh, me, logout } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "too_many_requests" }),
});
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: "too_many_requests" }),
});

router.post("/auth/register", registerLimiter, register);
router.post("/auth/login", authLimiter, login);
router.post("/auth/refresh", authLimiter, refresh);
router.post("/auth/logout", logout);
router.get("/auth/me", authMiddleware, me);

export default router;
