/**
 * Siempre usa Neon Postgres. Connection string: DATABASE_URL (Neon) o POSTGRES_URL.
 */
import pg from "pg";
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
console.log(
  "[DEBUG] DATABASE_URL:",
  process.env.DATABASE_URL ? "PRESENTE" : "AUSENTE",
);
console.log(
  "[DEBUG] POSTGRES_URL:",
  process.env.POSTGRES_URL ? "PRESENTE" : "AUSENTE",
);
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

/** Crea la tabla users en Postgres si no existe (Neon/Vercel). Debe ejecutarse antes de initPostgresWorkspaces. */
export async function initPostgresUsers() {
  if (!pool || usersTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at BIGINT NOT NULL
      )
    `);
    usersTableInitialized = true;
  } catch (err) {
    console.warn("⚠️ initPostgresUsers:", err.message);
  }
}

/** Crea la tabla workspaces en Postgres si no existe (Neon/Vercel). */
export async function initPostgresWorkspaces() {
  if (!pool || workspacesTableInitialized) return;
  try {
    await initPostgresUsers();
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
        campaigns TEXT,
        clerk_org_id TEXT
      )
    `);
    workspacesTableInitialized = true;
  } catch (err) {
    console.warn("⚠️ initPostgresWorkspaces:", err.message);
  }
}
