import { apiUrl } from "./config.js";

/**
 * fetch con credentials (cookies). Si la respuesta es 401, intenta POST /auth/refresh
 * una vez, reintenta la petición y devuelve la respuesta. Si el refresh falla, redirige a /login.
 */
export async function fetchWithAuth(input, init = {}) {
  const url =
    typeof input === "string" && input.startsWith("/")
      ? apiUrl(input)
      : input;
  const opts = {
    ...init,
    credentials: init.credentials ?? "include",
  };
  let res = await fetch(url, opts);

  if (res.status === 401 && typeof window !== "undefined") {
    const refreshRes = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    if (refreshRes.ok) {
      res = await fetch(url, opts);
    }
    if (res.status === 401) {
      try {
        sessionStorage.setItem("auth_return_path", window.location.pathname);
      } catch (_) {}
      const from = encodeURIComponent(window.location.pathname);
      window.location.href = from ? `/login?from=${from}` : "/login";
      return null;
    }
  }
  return res;
}
