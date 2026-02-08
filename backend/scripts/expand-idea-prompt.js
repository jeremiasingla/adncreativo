/**
 * Prueba la Inferencia Semántica Expansiva: expande una idea en un spec visual (IMG-2-JSON-V3).
 *
 * Uso:
 *   node -r dotenv/config scripts/expand-idea-prompt.js "Un programador estresado"
 *   node -r dotenv/config scripts/expand-idea-prompt.js "Un astronauta en un jardín de flores gigantes" 4:5
 *
 * Requiere OPENROUTER_API_KEY en .env.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const idea = process.argv[2] || "Un programador estresado frente a la pantalla a las 3am";
const aspectRatio = process.argv[3] || "4:5";

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("❌ Falta OPENROUTER_API_KEY en .env");
    process.exit(1);
  }

  const { expandIdeaToVisualSpec, buildMidjourneyPromptFromSpec, getFluxPromptFromSpec } = await import(
    "../src/services/llm.service.js"
  );

  console.log("Idea:", idea);
  console.log("Aspect ratio:", aspectRatio);
  console.log("---\n");

  try {
    const spec = await expandIdeaToVisualSpec(idea, aspectRatio);

    console.log("📋 Spec completo (JSON):");
    console.log(JSON.stringify(spec, null, 2));

    const midjourney = buildMidjourneyPromptFromSpec(spec, aspectRatio);
    const flux = getFluxPromptFromSpec(spec);

    console.log("\n🎨 Midjourney prompt:");
    console.log(midjourney);

    console.log("\n🖼️ Flux/DALL-E prompt:");
    console.log(flux);
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.response?.data) {
      console.error("Detalle:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
