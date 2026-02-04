import jwt from "jsonwebtoken";
import { clerkClient, verifyToken } from "@clerk/clerk-sdk-node";
import { query, initPostgresUsers } from "../db/postgres.js";
import { JWT_SECRET } from "../config/auth.config.js";

export async function authMiddleware(req, res, next) {
  try {
    await initPostgresUsers();
  } catch (err) {
    console.error("❌ authMiddleware initPostgresUsers:", err?.message);
    return res.status(503).json({ error: "service_unavailable" });
  }

  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;
  const clerkSecret = process.env.CLERK_SECRET_KEY;

  if (bearerToken && clerkSecret) {
    try {
      const payload = await verifyToken(bearerToken, {
        secretKey: clerkSecret,
      });
      const clerkUser = await clerkClient.users.getUser(payload.sub);
      req.user = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || null,
        name: clerkUser.fullName || clerkUser.firstName || null,
        role: "user",
      };
      return next();
    } catch (err) {
      console.error("❌ authMiddleware clerk:", err?.message);
      return res.status(401).json({ error: "unauthorized" });
    }
  }

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
    console.error("❌ authMiddleware:", err?.message);
    return res.status(401).json({ error: "unauthorized" });
  }
}
