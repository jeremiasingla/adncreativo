/**
 * Imprime N sales angles de un workspace (por slug).
 * Uso: node scripts/print-sales-angles.js <workspace-slug> [cantidad]
 * Por defecto cantidad = 2.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const slug = process.argv[2] || "metododetailer-s-workspace-1770357795";
const count = Math.max(1, parseInt(process.argv[3], 10) || 2);

const { get } = await import("../src/db/workspaceDb.js");

const row = await get(
  "SELECT sales_angles FROM workspaces WHERE slug = ?",
  [slug],
);
if (!row) {
  console.error("Workspace no encontrado:", slug);
  process.exit(1);
}

let angles = [];
if (row.sales_angles != null && row.sales_angles !== "") {
  try {
    angles = JSON.parse(row.sales_angles);
  } catch (e) {
    console.error("Error al parsear sales_angles:", e.message);
    process.exit(1);
  }
}

if (!Array.isArray(angles) || angles.length === 0) {
  console.error("No hay sales angles para", slug);
  process.exit(1);
}

const toPrint = angles.slice(0, count);
console.log("--- Sales angles para", slug, "(mostrando", toPrint.length, "de", angles.length, ") ---\n");
toPrint.forEach((angle, i) => {
  console.log("--- Ángulo", i + 1, "---");
  console.log(JSON.stringify(angle, null, 2));
  console.log("");
});
