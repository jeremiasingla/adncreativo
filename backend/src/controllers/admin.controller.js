import {
  getAllMetrics,
  getLLMMetrics,
  getImageMetrics,
  clearAllMetrics,
} from "../services/metrics.service.js";
import { query, initPostgresUsers, initUserSessions } from "../db/postgres.js";
import bcrypt from "bcryptjs";
import geoip from "geoip-lite";

/**
 * Transforma un usuario de nuestra BD al formato standard para el Admin Dashboard.
 * Mantiene compatibilidad con la estructura que espera el frontend actual.
 */
function toAdminUserFormat(user) {
  const nameParts = (user.name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(" ") || null;
  const rawId = String(user.id ?? "");
  const baseId = rawId.replace(/^user_/, "");

  // Genera un ID con prefijo user_ si no lo tiene
  const userId = rawId.startsWith("user_") ? rawId : `user_${rawId}`;

  return {
    id: userId,
    object: "user",
    username: null,
    first_name: firstName,
    last_name: lastName,
    locale: null,
    image_url: user.image_url || null,
    has_image: !!user.image_url,
    primary_email_address_id: user.email ? `idn_${baseId}` : null,
    primary_phone_number_id: null,
    primary_web3_wallet_id: null,
    password_enabled: user.password ? true : false,
    two_factor_enabled: false,
    totp_enabled: false,
    backup_code_enabled: false,
    email_addresses: user.email
      ? [
        {
          id: `idn_${baseId}`,
          object: "email_address",
          email_address: user.email,
          reserved: false,
          verification: {
            object: "verification",
            status: "verified",
            strategy: "admin",
            attempts: null,
            expire_at: null,
          },
          linked_to: [],
          matches_sso_connection: false,
          created_at: user.created_at || Date.now(),
          updated_at: user.updated_at || user.created_at || Date.now(),
        },
      ]
      : [],
    phone_numbers: [],
    web3_wallets: [],
    passkeys: [],
    external_accounts: [],
    saml_accounts: [],
    enterprise_accounts: [],
    password_last_updated_at: null,
    public_metadata: {},
    private_metadata: {},
    unsafe_metadata: {},
    external_id: null,
    last_sign_in_at: user.last_login_at || null,
    banned: false,
    locked: false,
    lockout_expires_in_seconds: null,
    verification_attempts_remaining: 100,
    created_at: user.created_at || Date.now(),
    updated_at: user.updated_at || user.created_at || Date.now(),
    delete_self_enabled: true,
    bypass_client_trust: false,
    create_organization_enabled: true,
    last_active_at: user.last_login_at || null,
    mfa_enabled_at: null,
    mfa_disabled_at: null,
    legal_accepted_at: null,
    requires_password_reset: false,
    deprovisioned: false,
    profile_image_url: user.image_url || null,
    // Campos extra nuestros (para admin)
    role: user.role || "user",
    last_login_ip: user.last_login_ip || null,
    last_login_user_agent: user.last_login_user_agent || null,
    workspace_count: user.workspace_count ?? 0,
  };
}

function normalizeIp(ip) {
  if (!ip) return null;
  const clean = String(ip).split(",")[0].trim();
  if (clean.startsWith("::ffff:")) return clean.replace("::ffff:", "");
  return clean;
}

function getLocationLabel(ip) {
  const clean = normalizeIp(ip);
  if (!clean) return null;
  if (clean === "::1" || clean.startsWith("127.")) return null;
  const geo = geoip.lookup(clean);
  if (!geo) return null;
  const city = geo.city || "";
  const country = geo.country || "";
  if (city && country) return `${city}, ${country}`;
  return city || country || null;
}

/**
 * GET /admin/metrics
 * Devuelve métricas completas (LLM + Images, solo admin).
 */
export function getMetrics(req, res) {
  getAllMetrics()
    .then((metrics) => {
      res.json({ success: true, data: metrics });
    })
    .catch((error) => {
      console.error("❌ Error getting metrics:", error.message);
      res.status(500).json({ success: false, error: "Internal server error" });
    });
}

/**
 * GET /admin/metrics/llm
 * Devuelve solo métricas LLM (solo admin).
 */
export function getLLMMetricsEndpoint(req, res) {
  try {
    const metrics = getLLMMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("❌ Error getting LLM metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /admin/metrics/images
 * Devuelve solo métricas de imágenes (solo admin).
 */
export function getImageMetricsEndpoint(req, res) {
  try {
    const metrics = getImageMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error("❌ Error getting image metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * DELETE /admin/metrics
 * Elimina todas las métricas almacenadas (solo admin).
 */
export function clearMetrics(req, res) {
  try {
    const result = clearAllMetrics();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error clearing metrics:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /admin/users
 * Lista usuarios registrados (solo admin).
 */
export async function listUsers(req, res) {
  try {
    await initPostgresUsers();
    const result = await query(
      `SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.password,
        u.image_url,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.last_login_ip,
        u.last_login_user_agent,
        (SELECT COUNT(*) FROM workspaces w WHERE w.user_id = u.id) AS workspace_count
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 200`,
    );
    const users = (result.rows || []).map(toAdminUserFormat);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("❌ Error listing users:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /admin/users/:id
 * Devuelve detalle de usuario y sus workspaces (solo admin).
 */
export async function getUserDetail(req, res) {
  try {
    await initPostgresUsers();
    await initUserSessions();
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, error: "invalid_user_id" });

    // Permite buscar con o sin prefijo user_
    const rawId = String(id);
    const cleanId = rawId.replace(/^user_/, "");
    const userRes = await query(
      "SELECT id, email, name, role, password, image_url, created_at, updated_at, last_login_at, last_login_ip, last_login_user_agent FROM users WHERE id = $1 OR id = $2",
      [rawId, cleanId],
    );
    const user = userRes.rows?.[0];
    if (!user)
      return res.status(404).json({ success: false, error: "not_found" });

    const workspacesRes = await query(
      `SELECT id, slug, url, created_at
       FROM workspaces
       WHERE user_id = $1 OR user_id = $2
       ORDER BY created_at DESC`,
      [rawId, cleanId],
    );

    const sessionsRes = await query(
      `SELECT id, user_id, ip, user_agent, first_seen_at, last_seen_at
       FROM user_sessions
       WHERE user_id = $1 OR user_id = $2
       ORDER BY last_seen_at DESC
       LIMIT 20`,
      [rawId, cleanId],
    );

    const sessions = (sessionsRes.rows || []).map((session) => ({
      ...session,
      location: getLocationLabel(session.ip),
    }));

    res.json({
      success: true,
      data: {
        user: toAdminUserFormat(user),
        workspaces: workspacesRes.rows || [],
        sessions,
      },
    });

  } catch (error) {
    console.error("❌ Error getting user detail:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * PUT /admin/users/:id/password
 * Resets a user's password (admin only).
 */
export async function resetUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!id)
      return res.status(400).json({ success: false, error: "invalid_user_id" });
    if (!password || password.length < 8)
      return res
        .status(400)
        .json({ success: false, error: "password_too_short", min: 8 });

    const hashed = await bcrypt.hash(password, 10);
    const updatedAt = Date.now();
    const rawId = String(id);
    const cleanId = rawId.replace(/^user_/, "");
    const result = await query(
      "UPDATE users SET password = $1, updated_at = $2 WHERE id = $3 OR id = $4",
      [hashed, updatedAt, rawId, cleanId],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: "not_found" });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error resetting password:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * GET /admin/users/:id/activity
 * Returns daily activity counts for the last 365 days (workspaces created + sessions).
 */
export async function getUserActivity(req, res) {
  try {
    await initPostgresUsers();
    await initUserSessions();
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, error: "invalid_user_id" });

    const rawId = String(id);
    const cleanId = rawId.replace(/^user_/, "");

    // Last 365 days range
    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    // Workspaces created per day
    const workspacesRes = await query(
      `SELECT
         DATE(TO_TIMESTAMP(created_at / 1000.0)) AS day,
         COUNT(*)::int AS count
       FROM workspaces
       WHERE (user_id = $1 OR user_id = $2)
         AND created_at >= $3
       GROUP BY day
       ORDER BY day`,
      [rawId, cleanId, oneYearAgo],
    );

    // Sessions activity per day (based on last_seen_at)
    const sessionsRes = await query(
      `SELECT
         DATE(TO_TIMESTAMP(last_seen_at / 1000.0)) AS day,
         COUNT(*)::int AS count
       FROM user_sessions
       WHERE (user_id = $1 OR user_id = $2)
         AND last_seen_at >= $3
       GROUP BY day
       ORDER BY day`,
      [rawId, cleanId, oneYearAgo],
    );

    // Merge into a single map { "YYYY-MM-DD": totalCount }
    const activityMap = {};
    for (const row of workspacesRes.rows || []) {
      const key =
        row.day instanceof Date
          ? row.day.toISOString().slice(0, 10)
          : String(row.day);
      activityMap[key] = (activityMap[key] || 0) + row.count;
    }
    for (const row of sessionsRes.rows || []) {
      const key =
        row.day instanceof Date
          ? row.day.toISOString().slice(0, 10)
          : String(row.day);
      activityMap[key] = (activityMap[key] || 0) + row.count;
    }

    res.json({ success: true, data: activityMap });
  } catch (error) {
    console.error("❌ Error getting user activity:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * PUT /admin/users/:id/role
 * Changes a user's role (admin only).
 */
export async function changeUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!id)
      return res.status(400).json({ success: false, error: "invalid_user_id" });
    if (!role || !["user", "admin"].includes(role))
      return res.status(400).json({ success: false, error: "invalid_role" });

    const updatedAt = Date.now();
    const rawId = String(id);
    const cleanId = rawId.replace(/^user_/, "");
    const result = await query(
      "UPDATE users SET role = $1, updated_at = $2 WHERE id = $3 OR id = $4",
      [role, updatedAt, rawId, cleanId],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ success: false, error: "not_found" });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error changing role:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
