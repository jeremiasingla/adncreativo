/**
 * Base URL del backend. Por defecto: backend en Vercel.
 * VITE_API_URL="" = rutas relativas (proxy de Vite en dev).
 */
const env = import.meta.env.VITE_API_URL;
export const API_BASE =
  env === "" ? "" : (env || "https://adncreativo-backend.vercel.app");

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE.startsWith("http") ? `${API_BASE.replace(/\/$/, "")}${p}` : p;
}
