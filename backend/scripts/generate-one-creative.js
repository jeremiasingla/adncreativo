/**
 * Genera 1 creativo a partir de 1 sales angle para un workspace (por slug).
 * Uso: node scripts/generate-one-creative.js <workspace-slug> [angleIndex]
 * angleIndex por defecto 0 (primer ángulo).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/generate-one-creative.js <workspace-slug> [angleIndex]");
  process.exit(1);
}
const angleIndex = Math.max(0, parseInt(process.argv[3], 10) || 0);

const { generateOneCreativeFromAngleBySlug } = await import(
  "../src/controllers/workspace.controller.js"
);

console.log("Generando 1 creativo (angle index", angleIndex, ") para", slug, "...");
const result = await generateOneCreativeFromAngleBySlug(slug, angleIndex);
if (!result.ok) {
  console.error("Error:", result.error);
  process.exit(1);
}
console.log("OK. Creativo generado. Total en workspace:", result.total);
console.log("Headline:", result.creative?.headline);
process.exit(0);
