import jwt from "jsonwebtoken";
import { query, initPostgresUsers } from "../db/postgres.js";
import { JWT_SECRET } from "../config/auth.config.js";

export async function authMiddleware(req, res, next) {
  await initPostgresUsers();
  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await query(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [payload.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: "unauthorized" });
    req.user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || "user",
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "unauthorized" });
  }
}
