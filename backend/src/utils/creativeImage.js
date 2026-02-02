import fs from "fs";
import path from "path";
import crypto from "crypto";
import { uploadToBlob, useBlob } from "./blobStorage.js";

const CREATIVES_DIR = process.env.CREATIVES_DIR || path.join(process.cwd(), "storage", "creatives");

/**
 * Guarda una imagen de creativo desde data URL base64.
 * En Vercel (BLOB_READ_WRITE_TOKEN) sube a Blob y devuelve la URL; si no, guarda en disco.
 * @param {string} dataUrl - data:image/png;base64,...
 * @param {string} workspaceSlug - slug del workspace
 * @param {string} [suffix] - sufijo opcional para el nombre (ej. headline hash)
 * @returns {Promise<{ filepath: string, urlPath: string } | null>} - path/urlPath o null
 */
export async function saveCreativeImage(dataUrl, workspaceSlug, suffix = "") {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const filename = workspaceSlug
    ? `${workspaceSlug}-${suffix ? suffix + "-" : ""}${id}.png`
    : `${id}.png`;

  if (useBlob) {
    const url = await uploadToBlob(buffer, `creatives/${filename}`, "image/png");
    return { filepath: url, urlPath: url };
  }

  if (!fs.existsSync(CREATIVES_DIR)) {
    fs.mkdirSync(CREATIVES_DIR, { recursive: true });
  }
  const filepath = path.join(CREATIVES_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  const urlPath = `/creatives/${path.basename(filepath)}`;
  return { filepath, urlPath };
}

export { CREATIVES_DIR };
