import { query } from "../db/postgres.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  JWT_SECRET,
  REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  COOKIE_OPTIONS,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
} from "../config/auth.config.js";
import { isValidEmail, normalizeEmail, validatePassword } from "../utils/validateAuth.js";

function setTokens(res, user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, type: "refresh" },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  );
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail))
      return res.status(400).json({ error: "invalid_email" });

    const pw = validatePassword(password);
    if (!pw.ok)
      return res.status(400).json({
        error: pw.error === "password_too_short" ? "password_too_short" : "password_required",
        min: pw.min,
      });

    const existsRes = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existsRes.rowCount > 0) return res.status(409).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const createdAt = Date.now();
    const role = "user";
    const insertRes = await query(
      "INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [normalizedEmail, hashed, name?.trim() || null, role, createdAt]
    );
    const user = {
      id: insertRes.rows[0].id,
      email: normalizedEmail,
      name: name?.trim() || null,
      role,
    };
    setTokens(res, user);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail))
      return res.status(400).json({ error: "invalid_email" });

    const loginRes = await query(
      "SELECT id, email, password, name, role FROM users WHERE email = $1",
      [normalizedEmail]
    );
    const row = loginRes.rows[0];
    if (!row) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || "user",
    };
    setTokens(res, user);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
}

export function refresh(req, res) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: "unauthorized" });
    const payload = jwt.verify(token, REFRESH_SECRET);
    if (payload.type !== "refresh") return res.status(401).json({ error: "unauthorized" });

    const refreshRes = await query(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [payload.id]
    );
    const row = refreshRes.rows[0];
    if (!row) return res.status(401).json({ error: "unauthorized" });

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || "user",
    };
    setTokens(res, user);
    res.json({ user });
  } catch (err) {
    res.clearCookie("accessToken", COOKIE_OPTIONS);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);
    return res.status(401).json({ error: "unauthorized" });
  }
}

export function me(req, res) {
  res.json({ user: req.user || null });
}

export function logout(req, res) {
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, path: "/" });
  res.json({ success: true });
}
