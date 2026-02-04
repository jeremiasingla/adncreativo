import { apiUrl } from "./config.js";

async function getClerkToken() {
  if (typeof window === "undefined") return null;
  const clerk = window.Clerk;
  if (!clerk?.session) return null;
  try {
    return await clerk.session.getToken();
  } catch (_) {
    return null;
  }
}

/**
 * fetch con credentials. Si la respuesta es 401, intenta POST /auth/refresh una vez,
 * reintenta la petición y devuelve la respuesta. Si el refresh falla, hace logout y
 * redirige a /login (recarga la página).
 */
export async function fetchWithAuth(input, init = {}) {
  const url = typeof input === "string" && input.startsWith("/") ? apiUrl(input) : input;
  const token = await getClerkToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const opts = {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  };
  const res = await fetch(url, opts);
  if (res.status === 401 && typeof window !== "undefined") {
    try {
      sessionStorage.setItem("auth_return_path", window.location.pathname);
    } catch (_) {}
    const from = encodeURIComponent(window.location.pathname);
    window.location.href = from ? `/login?from=${from}` : "/login";
    return null;
  }
  return res;
}
