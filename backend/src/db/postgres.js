/**
 * Siempre usa Neon Postgres. Connection string: DATABASE_URL (Neon) o POSTGRES_URL.
 */
import pg from "pg";
import crypto from "crypto";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (process.env.NODE_ENV !== "production") {
  if (connectionString) {
    console.log("[postgres] DATABASE_URL configured");
  } else {
    console.log("[postgres] DATABASE_URL not set");
  }
}
if (!connectionString) {
  console.warn(
    "⚠️ DATABASE_URL no configurado. Postgres está deshabilitado. Algunas funciones no estarán disponibles.",
  );
}

export const pool = connectionString
  ? new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  })
  : null;

export async function query(sql, params) {
  if (!pool) {
    throw new Error("Postgres no está configurado (DATABASE_URL faltante)");
  }
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

let usersTableInitialized = false;
let workspacesTableInitialized = false;
let workspacesMigrationDone = false;
let userSessionsTableInitialized = false;

/** Crea la tabla users en Postgres si no existe (Neon/Vercel). Debe ejecutarse antes de initPostgresWorkspaces. */
export async function initPostgresUsers() {
  if (!pool) return;
  try {
    if (!usersTableInitialized) {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          created_at BIGINT NOT NULL,
          last_login_at BIGINT,
          last_login_ip TEXT,
          last_login_user_agent TEXT
        )
      `);
      usersTableInitialized = true;
    }
    await ensureUserColumns();
  } catch (err) {
    console.warn("⚠️ initPostgresUsers:", err.message);
  }
}

export async function initUserSessions() {
  if (!pool || userSessionsTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_key TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        first_seen_at BIGINT NOT NULL,
        last_seen_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);
    await query(
      `CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_user_device_key
       ON user_sessions (user_id, device_key)`,
    );
    userSessionsTableInitialized = true;
  } catch (err) {
    console.warn("⚠️ initUserSessions:", err.message);
  }
}

function buildDeviceKey(ip, userAgent) {
  const raw = `${ip || "unknown"}|${userAgent || "unknown"}`;
  return crypto.createHash("sha1").update(raw).digest("hex");
}

export async function recordUserSession({ userId, ip, userAgent, now }) {
  if (!userId) return;
  const ts = now || Date.now();
  const deviceKey = buildDeviceKey(ip, userAgent);
  try {
    await initPostgresUsers();
    await initUserSessions();
    await query(
      `INSERT INTO user_sessions
        (user_id, device_key, ip, user_agent, first_seen_at, last_seen_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, device_key)
       DO UPDATE SET
         ip = EXCLUDED.ip,
         user_agent = EXCLUDED.user_agent,
         last_seen_at = EXCLUDED.last_seen_at`,
      [userId, deviceKey, ip || null, userAgent || null, ts, ts, ts],
    );
  } catch (err) {
    console.warn("⚠️ recordUserSession:", err.message);
  }
}

async function ensureUserColumns() {
  const columns = [
    { name: "last_login_at", type: "BIGINT" },
    { name: "last_login_ip", type: "TEXT" },
    { name: "last_login_user_agent", type: "TEXT" },
    { name: "updated_at", type: "BIGINT" },
    { name: "image_url", type: "TEXT" },
  ];
  for (const col of columns) {
    try {
      const info = await query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = $1`,
        [col.name],
      );
      if (!info.rows || info.rows.length === 0) {
        await query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
      }
    } catch (err) {
      console.warn("⚠️ ensureUserColumns:", err.message);
    }
  }
}

/** Crea la tabla workspaces en Postgres si no existe (Neon/Vercel). */
export async function initPostgresWorkspaces() {
  if (!pool || workspacesTableInitialized) return;
  try {
    await initPostgresUsers();

    // Crear tabla si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        branding TEXT NOT NULL,
        screenshot_path TEXT,
        created_at BIGINT NOT NULL,
        knowledge_base TEXT,
        customer_profiles TEXT,
        headlines TEXT,
        creatives TEXT,
        campaigns TEXT,
        clerk_org_id TEXT
      )
    `);

    workspacesTableInitialized = true;

    await initReferenceGalleryTable();
    await initAdminStatsTables();

    // Ejecutar migraciones DESPUÉS de que la tabla existe
    if (!workspacesMigrationDone) {
      await runWorkspaceMigrations();
      workspacesMigrationDone = true;
    }
  } catch (err) {
    console.warn("⚠️ initPostgresWorkspaces:", err.message);
  }
}

let referenceGalleryTableInitialized = false;

/** Crea la tabla reference_gallery en Postgres si no existe. Global para todos los proyectos (sin user_id/workspace_id). Imagen en Blob, URL y prompt en DB. */
export async function initReferenceGalleryTable() {
  if (!pool || referenceGalleryTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS reference_gallery (
        id TEXT PRIMARY KEY,
        image_url TEXT NOT NULL,
        category TEXT,
        generation_prompt TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);
    referenceGalleryTableInitialized = true;
    await migrateReferenceGalleryDropTitle();
  } catch (err) {
    console.warn("⚠️ initReferenceGalleryTable:", err.message);
  }
}

let adminStatsTablesInitialized = false;

/**
 * Crea las tablas necesarias para las métricas del admin dashboard.
 * - llm_request_logs
 * - image_generation_logs
 * - user_credits
 * - payments
 * - subscriptions
 */
export async function initAdminStatsTables() {
  if (!pool || adminStatsTablesInitialized) return;
  try {
    // 1. Logs de requests LLM
    await query(`
      CREATE TABLE IF NOT EXISTS llm_request_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        feature_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'success',
        latency_ms INTEGER,
        tokens_used INTEGER,
        credits_cost INTEGER DEFAULT 1,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_llm_logs_created ON llm_request_logs(created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_llm_logs_user ON llm_request_logs(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_llm_logs_status ON llm_request_logs(status)`);

    // 2. Logs de generación de imágenes
    await query(`
      CREATE TABLE IF NOT EXISTS image_generation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        feature_name TEXT NOT NULL DEFAULT 'image_generation',
        status TEXT NOT NULL DEFAULT 'success',
        latency_ms INTEGER,
        credits_cost INTEGER DEFAULT 5,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_img_logs_created ON image_generation_logs(created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_img_logs_user ON image_generation_logs(user_id)`);

    // 3. Créditos de usuario
    await query(`
      CREATE TABLE IF NOT EXISTS user_credits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'purchase' | 'bonus' | 'consumption' | 'expiration'
        amount INTEGER NOT NULL, -- positivo = ingreso, negativo = consumo
        balance_after INTEGER NOT NULL,
        description TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_credits_user ON user_credits(user_id)`);

    // 4. Pagos / Transacciones
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'recharge' | 'subscription' | 'refund'
        amount_cents INTEGER NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL, -- 'succeeded' | 'failed' | 'pending' | 'refunded'
        provider TEXT,
        provider_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at)`);

    // 5. Suscripciones
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL UNIQUE,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL, -- 'active' | 'canceled' | 'past_due'
        amount_cents INTEGER NOT NULL,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    adminStatsTablesInitialized = true;
  } catch (err) {
    console.warn("⚠️ initAdminStatsTables:", err.message);
  }
}


async function migrateReferenceGalleryDropTitle() {
  try {
    const col = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'reference_gallery' AND column_name = 'title'
    `);
    if (col.rows && col.rows.length > 0) {
      await query(`ALTER TABLE reference_gallery DROP COLUMN IF EXISTS title`);
    }
  } catch (e) {
    console.warn("[migrateReferenceGalleryDropTitle]", e.message);
  }
}

/** Ejecuta migraciones necesarias en la tabla workspaces. */
async function runWorkspaceMigrations() {
  try {
    // Verificar y convertir user_id si es necesario
    try {
      const columnInfo = await query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'workspaces' AND column_name = 'user_id'
      `);

      if (columnInfo.rows && columnInfo.rows[0]) {
        const currentType = columnInfo.rows[0].data_type.toLowerCase();

        // Si es integer, convertir a text
        if (currentType === "integer") {
          if (process.env.NODE_ENV !== "production") {
            console.log("[postgres] Migrating user_id from integer to text...");
          }
          try {
            await query(`
              ALTER TABLE workspaces 
              DROP CONSTRAINT IF EXISTS workspaces_user_id_fkey
            `);
          } catch (fkErr) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[postgres] FK drop skipped:", fkErr.message);
            }
          }
          await query(`
            ALTER TABLE workspaces 
            ALTER COLUMN user_id TYPE TEXT USING user_id::text
          `);
        }
      }
    } catch (migErr) {
      console.warn("[DEBUG] user_id migration:", migErr.message);
    }

    // Verificar y agregar clerk_org_id si no existe
    try {
      const clerkOrgIdInfo = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'workspaces' AND column_name = 'clerk_org_id'
      `);

      if (!clerkOrgIdInfo.rows || clerkOrgIdInfo.rows.length === 0) {
        await query(`
          ALTER TABLE workspaces 
          ADD COLUMN clerk_org_id TEXT
        `);
      }
    } catch (clerkOrgIdErr) {
      console.warn("[DEBUG] clerk_org_id migration:", clerkOrgIdErr.message);
    }

    // sales_angles: JSON array de ángulos de venta (category, title, description, hook, visual)
    try {
      const salesAnglesInfo = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'workspaces' AND column_name = 'sales_angles'
      `);
      if (!salesAnglesInfo.rows || salesAnglesInfo.rows.length === 0) {
        await query(`
          ALTER TABLE workspaces 
          ADD COLUMN sales_angles TEXT
        `);
      }
    } catch (salesAnglesErr) {
      console.warn("[DEBUG] sales_angles migration:", salesAnglesErr.message);
    }
  } catch (err) {
    console.warn("[DEBUG] Migration error:", err.message);
  }
}
