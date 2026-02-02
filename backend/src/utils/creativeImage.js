import fs from "fs";
import path from "path";
import crypto from "crypto";

const CREATIVES_DIR = process.env.CREATIVES_DIR || path.join(process.cwd(), "storage", "creatives");

/**
 * Guarda una imagen de creativo desde data URL base64.
 * @param {string} dataUrl - data:image/png;base64,...
 * @param {string} workspaceSlug - slug del workspace
 * @param {string} [suffix] - sufijo opcional para el nombre (ej. headline hash)
 * @returns {{ filepath: string, urlPath: string } | null} - path absoluto y URL path o null
 */
export function saveCreativeImage(dataUrl, workspaceSlug, suffix = "") {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  if (!fs.existsSync(CREATIVES_DIR)) {
    fs.mkdirSync(CREATIVES_DIR, { recursive: true });
  }

  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const filename = workspaceSlug
    ? `${workspaceSlug}-${suffix ? suffix + "-" : ""}${id}.png`
    : `${id}.png`;
  const filepath = path.join(CREATIVES_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  const urlPath = `/creatives/${path.basename(filepath)}`;
  return { filepath, urlPath };
}

export { CREATIVES_DIR };
