/**
 * Elimina todos los workspaces y sus archivos (screenshot, avatares y banners ICP).
 * Uso: node scripts/delete-all-workspaces.js
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { all } = await import("../src/db/workspaceDb.js");
const { deleteWorkspaceBySlug } = await import(
  "../src/controllers/workspace.controller.js"
);

const rows = await all("SELECT slug FROM workspaces", []);
if (rows.length === 0) {
  console.log("No hay workspaces para eliminar.");
  process.exit(0);
}

let deleted = 0;
let failed = 0;
for (const row of rows) {
  const result = await deleteWorkspaceBySlug(row.slug);
  if (result.deleted) {
    console.log("Eliminado:", row.slug);
    deleted++;
  } else {
    console.error("Error eliminando", row.slug, ":", result.error);
    failed++;
  }
}

console.log(`\nListo. Eliminados: ${deleted}, fallos: ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
