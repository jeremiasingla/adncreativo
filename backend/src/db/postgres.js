/**
 * Siempre usa Neon Postgres. Connection string: DATABASE_URL (Neon) o POSTGRES_URL.
 */
import pg from "pg";
const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL o POSTGRES_URL es obligatorio (Neon Postgres). Configuralo en el entorno."
  );
}

export const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export async function query(sql, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

let workspacesTableInitialized = false;

/** Crea la tabla workspaces en Postgres si no existe (Neon/Vercel). */
export async function initPostgresWorkspaces() {
  if (workspacesTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        slug TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        branding TEXT NOT NULL,
        screenshot_path TEXT,
        created_at BIGINT NOT NULL,
        knowledge_base TEXT,
        customer_profiles TEXT,
        headlines TEXT,
        creatives TEXT,
        campaigns TEXT
      )
    `);
    workspacesTableInitialized = true;
  } catch (err) {
    console.warn("⚠️ initPostgresWorkspaces:", err.message);
  }
}
