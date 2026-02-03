import { put } from "@vercel/blob";
import axios from "axios";

/**
 * Sube un buffer a Vercel Blob si BLOB_READ_WRITE_TOKEN está definido.
 * @param {Buffer} buffer - contenido del archivo
 * @param {string} pathname - ruta lógica en Blob (ej. "screenshots/mi-workspace.png")
 * @param {string} [contentType] - tipo MIME (ej. "image/png")
 * @returns {Promise<string|null>} - URL pública del blob o null si no hay token
 */
export async function uploadToBlob(buffer, pathname, contentType = "image/png") {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { url } = await put(pathname, buffer, { access: "public", contentType });
  return url;
}

/**
 * Descarga una imagen desde una URL y la sube a Vercel Blob.
 * Útil para logos/imágenes de branding que vienen de Firecrawl (URLs externas).
 * @param {string} imageUrl - URL absoluta de la imagen (http/https)
 * @param {string} pathname - ruta lógica en Blob (ej. "logos/workspace-slug-logo.png")
 * @param {string} [contentType] - tipo MIME (default "image/png")
 * @returns {Promise<string|null>} - URL pública del blob o null si falla o no hay token
 */
export async function uploadImageFromUrl(imageUrl, pathname, contentType = "image/png") {
  if (!process.env.BLOB_READ_WRITE_TOKEN || !imageUrl || typeof imageUrl !== "string") return null;
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) return null;
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });
    const buffer = Buffer.from(response.data);
    if (buffer.length === 0) return null;
    return uploadToBlob(buffer, pathname, contentType);
  } catch (err) {
    console.warn("[Blob] uploadImageFromUrl failed:", imageUrl, err.message);
    return null;
  }
}

export const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
