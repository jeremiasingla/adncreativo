import { put } from "@vercel/blob";

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

export const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
