/**
 * Regenera las imágenes (avatar y banner) de los perfiles de cliente (ICP) de un workspace.
 * Uso: node scripts/regenerate-icp-images.js <workspace-slug>
 * Ejemplo: node scripts/regenerate-icp-images.js comidasenvueltas-s-workspace-1770049665
 *
 * Requiere OPENROUTER_API_KEY en .env (FLUX vía OpenRouter).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/regenerate-icp-images.js <workspace-slug>");
  console.error(
    "Ejemplo: node scripts/regenerate-icp-images.js comidasenvueltas-s-workspace-1770049665"
  );
  process.exit(1);
}

const { get } = await import("../src/db/workspaceDb.js");
const { regenerateAllCustomerProfileImagesCore } = await import(
  "../src/controllers/workspace.controller.js"
);

const row = await get("SELECT user_id FROM workspaces WHERE slug = ?", [slug]);
if (!row) {
  console.error("Workspace no encontrado:", slug);
  process.exit(1);
}

console.log("Regenerando imágenes ICP para workspace:", slug);
const result = await regenerateAllCustomerProfileImagesCore(row.user_id, slug);
if (result === null) {
  console.error("Workspace no encontrado o sin perfiles.");
  process.exit(1);
}
console.log(
  "Listo. Perfiles actualizados:",
  result.profiles.length,
  "| Imágenes eliminadas:",
  result.deleted
);
