import { apiUrl } from "./config.js";

/**
 * fetch con credentials. Si la respuesta es 401, intenta POST /auth/refresh una vez,
 * reintenta la petición y devuelve la respuesta. Si el refresh falla, hace logout y
 * redirige a /login (recarga la página).
 */
export async function fetchWithAuth(input, init = {}) {
  const url = typeof input === "string" && input.startsWith("/") ? apiUrl(input) : input;
  const opts = { ...init, credentials: init.credentials ?? "include" };
  let res = await fetch(url, opts);
  if (res.status === 401) {
    const refreshRes = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    if (refreshRes.ok) {
      res = await fetch(url, opts);
    } else {
      await fetch(apiUrl("/auth/logout"), { method: "POST", credentials: "include" });
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("auth_return_path", window.location.pathname);
        } catch (_) {}
        const from = encodeURIComponent(window.location.pathname);
        window.location.href = from ? `/login?from=${from}` : "/login";
      }
      return null;
    }
  }
  return res;
}
