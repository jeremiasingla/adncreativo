import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = process.env.DB_PATH || "./storage/app.db";
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      slug TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      branding TEXT NOT NULL,
      screenshot_path TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );
  `);
  // Migración: añadir columna role si la tabla ya existía sin ella
  try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  } catch (_) {
    // La columna ya existe
  }
  // Migración: añadir user_id a workspaces
  try {
    db.exec("ALTER TABLE workspaces ADD COLUMN user_id INTEGER REFERENCES users(id)");
  } catch (_) {
    // La columna ya existe
  }
  // Migración: añadir knowledge_base a workspaces
  try {
    db.exec("ALTER TABLE workspaces ADD COLUMN knowledge_base TEXT");
  } catch (_) {
    // La columna ya existe
  }
  // Migración: añadir customer_profiles a workspaces (JSON array)
  try {
    db.exec("ALTER TABLE workspaces ADD COLUMN customer_profiles TEXT");
  } catch (_) {
    // La columna ya existe
  }
  // Migración: añadir headlines a workspaces (JSON array de titulares/ganchos para creativos)
  try {
    db.exec("ALTER TABLE workspaces ADD COLUMN headlines TEXT");
  } catch (_) {
    // La columna ya existe
  }
  // Migración: añadir creatives a workspaces (JSON array de { headline, imagePrompt, imageUrl })
  try {
    db.exec("ALTER TABLE workspaces ADD COLUMN creatives TEXT");
  } catch (_) {
    // La columna ya existe
  }
  // Migración: añadir campaigns a workspaces (JSON: { campaigns: [ { id, name, adSets: [ { id, name, ads: [...] } ] } ] })
  try {
    db.exec("ALTER TABLE workspaces ADD COLUMN campaigns TEXT");
  } catch (_) {
    // La columna ya existe
  }
  // Asegurar que jeremiasingla@gmail.com sea admin
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run("jeremiasingla@gmail.com");
}

initDb();
