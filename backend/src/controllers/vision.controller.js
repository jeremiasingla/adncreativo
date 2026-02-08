import crypto from "crypto";
import { analyzeImageToJson } from "../services/llm.service.js";
import { getAllReferences } from "../db/referenceGalleryDb.js";
import { createReference } from "../db/referenceGalleryDb.js";
import { uploadToBlob, uploadImageFromUrl } from "../utils/blobStorage.js";

/**
 * POST /vision/analyze-image
 * Body: { image?: string, imageUrl?: string }
 * - image: data URL (data:image/png;base64,...) de la imagen a analizar
 * - imageUrl: URL pública (https://...) de la imagen
 * Devuelve el JSON IMG-2-JSON-V4 Visual DNA (meta_parameters, technical_analysis, aesthetic_dna, composition_grid, entities, generative_reconstruction).
 */
export async function analyzeImage(req, res) {
  try {
    const { image, imageUrl } = req.body || {};
    const source = image || imageUrl;
    if (!source || typeof source !== "string") {
      return res.status(400).json({
        success: false,
        error: "Se requiere 'image' (data URL base64) o 'imageUrl' (URL pública) en el body.",
      });
    }
    const trimmed = source.trim();
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        error: "image o imageUrl no puede estar vacío.",
      });
    }
    const json = await analyzeImageToJson(trimmed);
    return res.json({ success: true, data: json });
  } catch (err) {
    const status = err.message?.includes("OPENROUTER_API_KEY")
      ? 503
      : err.message?.includes("required")
        ? 400
        : 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Error al analizar la imagen.",
    });
  }
}

/**
 * GET /vision/reference-gallery
 * Devuelve la lista de referencias desde la DB. Es global: todos los proyectos ven las mismas referencias.
 */
export async function getReferenceGallery(_req, res) {
  try {
    const list = await getAllReferences();
    const data = list.map((r) => ({
      id: r.id,
      imageUrl: r.imageUrl,
      category: r.category ?? "",
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error("getReferenceGallery:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /vision/reference-gallery
 * Crea una referencia: sube la imagen a Vercel Blob y guarda en DB (id, image_url, category, generation_prompt). Sin título.
 * Body: { image?: string, imageUrl?: string, category?: string, generation_prompt: string | object }
 * - image: data URL base64 de la imagen a subir
 * - imageUrl: URL de la imagen (se descarga y se sube a Blob)
 * - generation_prompt: obligatorio; puede ser string (JSON escapado) u objeto (se guarda como JSON stringificado)
 */
export async function createReferenceGalleryItem(req, res) {
  try {
    const { image, imageUrl, category = "", generation_prompt: rawPrompt } = req.body || {};
    if (rawPrompt === undefined || rawPrompt === null) {
      return res.status(400).json({
        success: false,
        error: "Se requiere 'generation_prompt' en el body (string u objeto).",
      });
    }
    const generation_prompt =
      typeof rawPrompt === "object" && rawPrompt !== null
        ? JSON.stringify(rawPrompt)
        : String(rawPrompt).trim();
    if (!generation_prompt) {
      return res.status(400).json({
        success: false,
        error: "generation_prompt no puede estar vacío.",
      });
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    let blobUrl = null;

    if (image && typeof image === "string" && image.trim().startsWith("data:")) {
      const trimmed = image.trim();
      const match = trimmed.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) {
        return res.status(400).json({
          success: false,
          error: "Formato de 'image' inválido (se espera data URL base64).",
        });
      }
      const buffer = Buffer.from(match[2], "base64");
      const contentType = (match[1] || "image/png").split("/")[1] || "png";
      blobUrl = await uploadToBlob(
        buffer,
        `reference-gallery/${id}.${contentType}`,
        match[1] || "image/png",
      );
    } else if (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http")) {
      blobUrl = await uploadImageFromUrl(
        imageUrl.trim(),
        `reference-gallery/${id}.png`,
        "image/png",
      );
    }

    if (!blobUrl) {
      return res.status(400).json({
        success: false,
        error: "Se requiere 'image' (data URL base64) o 'imageUrl' (URL pública) para subir la imagen a Blob.",
      });
    }

    await createReference({
      id,
      imageUrl: blobUrl,
      category: String(category).trim(),
      generationPrompt: generation_prompt.trim(),
      createdAt: now,
    });

    return res.status(201).json({
      success: true,
      data: {
        id,
        imageUrl: blobUrl,
        category: String(category).trim(),
      },
    });
  } catch (err) {
    console.error("createReferenceGalleryItem:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
