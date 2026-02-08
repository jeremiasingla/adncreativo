/**
 * Acceso a la tabla reference_gallery (Postgres).
 * Las referencias son globales: no tienen user_id ni workspace_id; todos los proyectos ven la misma galería.
 * Requiere initReferenceGalleryTable() (vía initPostgresWorkspaces en server.js).
 */
import { get, all, run } from "./workspaceDb.js";

/** Todas las referencias (globales para todos los proyectos), ordenadas por created_at desc. */
export async function getAllReferences() {
  const rows = await all(
    `SELECT id, image_url AS "imageUrl", category, generation_prompt AS "generationPrompt", created_at AS "createdAt"
     FROM reference_gallery
     ORDER BY created_at DESC`,
  );
  return rows || [];
}

/** Una referencia por id. */
export async function getReferenceById(id) {
  const row = await get(
    `SELECT id, image_url AS "imageUrl", category, generation_prompt AS "generationPrompt", created_at AS "createdAt"
     FROM reference_gallery
     WHERE id = ?`,
    [id],
  );
  return row;
}

/** Inserta una referencia. id = UUID, image_url, category, generation_prompt, created_at. Sin título. */
export async function createReference({
  id,
  imageUrl,
  category = "",
  generationPrompt,
  createdAt,
}) {
  await run(
    `INSERT INTO reference_gallery (id, image_url, category, generation_prompt, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, imageUrl, category, generationPrompt ?? "", createdAt],
  );
}
