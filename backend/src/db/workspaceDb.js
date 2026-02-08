/**
 * Capa de acceso a workspaces: siempre Postgres (Neon).
 * Requiere que initPostgresWorkspaces() se haya ejecutado al arranque (server.js).
 */
import { query } from "./postgres.js";

function toPgPlaceholders(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/** Una sola fila o null. */
export async function get(sql, params = []) {
  const result = await query(toPgPlaceholders(sql), params);
  return result.rows[0] ?? null;
}

/** Array de filas. */
export async function all(sql, params = []) {
  const result = await query(toPgPlaceholders(sql), params);
  return result.rows;
}

/** Ejecutar INSERT/UPDATE/DELETE. Devuelve { changes }. */
export async function run(sql, params = []) {
  const result = await query(toPgPlaceholders(sql), params);
  return { changes: result.rowCount ?? 0 };
}
