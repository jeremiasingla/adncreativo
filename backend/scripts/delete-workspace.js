/**
 * Elimina un workspace por slug y todos sus archivos (screenshot, avatares y banners ICP).
 * Uso: node scripts/delete-workspace.js <workspace-slug>
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/delete-workspace.js <workspace-slug>");
  process.exit(1);
}

const { deleteWorkspaceBySlug } = await import("../src/controllers/workspace.controller.js");
const result = deleteWorkspaceBySlug(slug);
if (!result.deleted) {
  console.error(result.error || "No se pudo eliminar el workspace.");
  process.exit(1);
}
console.log("Workspace eliminado:", slug);
