import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth.config.js";
import { query } from "../db/postgres.js";

/**
 * Verifica JWT desde cookie accessToken o header Authorization Bearer.
 * Carga el usuario desde Postgres y asigna req.user.
 */
export async function authMiddleware(req, res, next) {
  let token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);
  if (!token) return res.status(401).json({ error: "unauthorized" });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const userId = payload.id;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  try {
    const result = await query(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [userId]
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: "unauthorized" });

    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || "user",
    };
    return next();
  } catch (err) {
    console.error("authMiddleware:", err?.message);
    return res.status(401).json({ error: "unauthorized" });
  }
}
