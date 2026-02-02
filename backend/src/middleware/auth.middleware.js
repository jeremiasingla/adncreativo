import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { JWT_SECRET } from "../config/auth.config.js";

export function authMiddleware(req, res, next) {
  // Try cookie first (preferred), then fallback to Authorization header
  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const row = db
      .prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ?")
      .get(payload.id);
    if (!row) return res.status(401).json({ error: "unauthorized" });
    req.user = { id: row.id, email: row.email, name: row.name, role: row.role || "user" };
    next();
  } catch (err) {
    return res.status(401).json({ error: "unauthorized" });
  }
}
