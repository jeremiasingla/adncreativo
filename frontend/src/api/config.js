/**
 * Base URL del backend. Se configura desde VITE_API_URL en Vercel.
 * VITE_API_URL="" = rutas relativas (proxy de Vite en dev).
 */
const env = import.meta.env.VITE_API_URL;
const apiBase = env === "" || typeof env === "undefined" ? "/api" : env;
export const API_BASE = apiBase;

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE.startsWith("http") ? `${API_BASE.replace(/\/$/, "")}${p}` : p;
}
