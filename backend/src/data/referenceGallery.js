/**
 * Galería de referencias: ya no se usa lista estática.
 * Las referencias se guardan en Postgres (reference_gallery) y la imagen en Vercel Blob.
 * Añadí referencias con POST /vision/reference-gallery (image + generation_prompt).
 */
export const REFERENCE_GALLERY = [];
