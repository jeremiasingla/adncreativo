/**
 * Elimina todos los workspaces de un usuario específico y sus archivos asociados.
 * Uso: node scripts/delete-user-workspaces.js <user-id>
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const userId = process.argv[2];
if (!userId) {
  console.error("Uso: node scripts/delete-user-workspaces.js <user-id>");
  process.exit(1);
}

const { all } = await import("../src/db/workspaceDb.js");
const { deleteWorkspaceBySlug } = await import(
  "../src/controllers/workspace.controller.js"
);

const rows = await all("SELECT slug FROM workspaces WHERE user_id = ?", [userId]);
if (rows.length === 0) {
  console.log(`No hay workspaces para el usuario ${userId}.`);
  process.exit(0);
}

console.log(`Encontrados ${rows.length} workspaces para eliminar...`);

let deleted = 0;
let failed = 0;
for (const row of rows) {
  const result = await deleteWorkspaceBySlug(row.slug);
  if (result.deleted) {
    console.log("✓ Eliminado:", row.slug);
    deleted++;
  } else {
    console.error("✗ Error eliminando", row.slug, ":", result.error);
    failed++;
  }
}

console.log(`\nListo. Eliminados: ${deleted}, fallos: ${failed}.`);
process.exit(failed > 0 ? 1 : 0);
