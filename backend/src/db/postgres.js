/**
 * Siempre usa Neon Postgres. Connection string: DATABASE_URL (Neon) o POSTGRES_URL.
 */
import pg from "pg";
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

    await initReferenceGalleryTable();

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
        if (currentType === 'integer') {
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
