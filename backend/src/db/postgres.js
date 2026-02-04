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
let workspacesMigrationDone = false;

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
    
    // Ejecutar migraciones DESPUÉS de que la tabla existe
    if (!workspacesMigrationDone) {
      await runWorkspaceMigrations();
      workspacesMigrationDone = true;
    }
  } catch (err) {
    console.warn("⚠️ initPostgresWorkspaces:", err.message);
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
        if (currentType === 'integer') {
          console.log("[DEBUG] Migrating user_id from integer to text...");
          
          // Primero, remover la foreign key constraint si existe
          try {
            await query(`
              ALTER TABLE workspaces 
              DROP CONSTRAINT IF EXISTS workspaces_user_id_fkey
            `);
            console.log("[DEBUG] Foreign key constraint dropped");
          } catch (fkErr) {
            console.debug("[DEBUG] FK drop skipped:", fkErr.message);
          }
          
          // Ahora convertir el tipo
          await query(`
            ALTER TABLE workspaces 
            ALTER COLUMN user_id TYPE TEXT USING user_id::text
          `);
          console.log("[DEBUG] user_id migrated to TEXT successfully");
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
        console.log("[DEBUG] Adding clerk_org_id column...");
        await query(`
          ALTER TABLE workspaces 
          ADD COLUMN clerk_org_id TEXT
        `);
        console.log("[DEBUG] clerk_org_id column added successfully");
      }
    } catch (clerkOrgIdErr) {
      console.warn("[DEBUG] clerk_org_id migration:", clerkOrgIdErr.message);
    }
  } catch (err) {
    console.warn("[DEBUG] Migration error:", err.message);
  }
}
