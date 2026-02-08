/**
 * Genera y guarda sales angles para un workspace por slug.
 * Uso: node scripts/generate-sales-angles.js <workspace-slug>
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const slug = process.argv[2];
if (!slug) {
  console.error("Uso: node scripts/generate-sales-angles.js <workspace-slug>");
  process.exit(1);
}

const { get, run } = await import("../src/db/workspaceDb.js");
const { generateSalesAngles } = await import("../src/services/llm.service.js");

const row = await get(
  "SELECT user_id, branding, knowledge_base, customer_profiles FROM workspaces WHERE slug = ?",
  [slug],
);
if (!row) {
  console.error("Workspace no encontrado:", slug);
  process.exit(1);
}

let branding = {};
let knowledgeBaseSummary = "";
let clientIdealSummary = "";
try {
  if (row.branding != null && row.branding !== "") branding = JSON.parse(row.branding);
} catch (_) {}
try {
  if (row.knowledge_base != null && row.knowledge_base !== "") {
    const kb = JSON.parse(row.knowledge_base);
    knowledgeBaseSummary =
      typeof kb.summary === "string"
        ? kb.summary
        : (kb.content && typeof kb.content === "string" ? kb.content : "") || "";
  }
} catch (_) {}
try {
  if (row.customer_profiles != null && row.customer_profiles !== "") {
    const profiles = JSON.parse(row.customer_profiles);
    const first = Array.isArray(profiles) && profiles[0] ? profiles[0] : null;
    if (first) {
      clientIdealSummary = [
        first.name,
        first.title,
        first.description,
        (first.goals || []).slice(0, 2).join("; "),
        (first.painPoints || []).slice(0, 2).join("; "),
      ]
        .filter(Boolean)
        .join(". ")
        .slice(0, 800);
    }
  }
} catch (_) {}

console.log("Generando sales angles para", slug, "...");
const angles = await generateSalesAngles({
  companyName: branding?.companyName ?? "",
  headline: branding?.headline ?? "",
  knowledgeBaseSummary,
  clientIdealSummary,
  nicheOrSubniche: branding?.nicheOrSubniche ?? "",
  useVoseo: Boolean(branding?.useVoseo),
  contentLanguage: branding?.language || "es-AR",
  branding,
});

await run("UPDATE workspaces SET sales_angles = ? WHERE user_id = ? AND slug = ?", [
  JSON.stringify(angles),
  row.user_id,
  slug,
]);
console.log("OK. Guardados", angles.length, "sales angles para", slug);
process.exit(0);
