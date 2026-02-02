import fs from "fs";
import path from "path";
import crypto from "crypto";
import { uploadToBlob, useBlob } from "./blobStorage.js";

const ICP_AVATARS_DIR = process.env.ICP_AVATARS_DIR || path.join(process.cwd(), "storage", "icp-avatars");
const ICP_HEROES_DIR = process.env.ICP_HEROES_DIR || path.join(process.cwd(), "storage", "icp-heroes");

/**
 * Guarda una imagen ICP (avatar o banner) desde data URL base64.
 * En Vercel (BLOB_READ_WRITE_TOKEN) sube a Blob y devuelve la URL; si no, guarda en disco.
 * @param {string} dataUrl - data:image/png;base64,...
 * @param {string} workspaceSlug - slug del workspace (para subcarpeta opcional)
 * @param {"avatar"|"hero"} type - tipo de imagen
 * @returns {Promise<string|null>} - URL (blob) o path del archivo o null
 */
export async function saveIcpImage(dataUrl, workspaceSlug, type) {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const filename = workspaceSlug ? `${workspaceSlug}-${id}.png` : `${id}.png`;

  if (useBlob) {
    const blobPath = type === "avatar" ? `icp-avatars/${filename}` : `icp-heroes/${filename}`;
    const url = await uploadToBlob(buffer, blobPath, "image/png");
    return url;
  }

  const dir = type === "avatar" ? ICP_AVATARS_DIR : ICP_HEROES_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

/**
 * Elimina todas las imágenes ICP (avatars y heroes) de un workspace.
 * Busca archivos cuyo nombre comienza con "{slug}-".
 */
export function deleteIcpImagesForWorkspace(slug) {
  if (!slug || typeof slug !== "string") return { deleted: 0 };
  const prefix = slug + "-";
  let deleted = 0;
  for (const dir of [ICP_AVATARS_DIR, ICP_HEROES_DIR]) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith(prefix) && (file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".webp"))) {
        try {
          fs.unlinkSync(path.join(dir, file));
          deleted++;
        } catch (_) {}
      }
    }
  }
  return { deleted };
}

export { ICP_AVATARS_DIR, ICP_HEROES_DIR };
