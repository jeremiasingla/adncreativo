/**
 * Consulta los headlines de un workspace por consola.
 * Uso: node scripts/fetch-headlines.js [slug]
 * Con login: SLUG=mi-slug EMAIL=tu@email.com PASSWORD=tucontraseña node scripts/fetch-headlines.js
 *
 * Si no pasás EMAIL/PASSWORD, hace GET sin auth (fallará 401 a menos que quites auth del endpoint).
 * Mejor: usá la consola del navegador estando logueado (ver README o comentarios arriba).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
const slug = process.env.SLUG || process.argv[2] || "tu-workspace-slug";
const email = process.env.EMAIL;
const password = process.env.PASSWORD;

async function login() {
  if (!email || !password) return null;
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.error("Login failed:", res.status, await res.text());
    return null;
  }
  const cookies = res.headers.get("set-cookie");
  return cookies || null;
}

async function fetchHeadlines(cookieHeader) {
  const headers = { "Content-Type": "application/json" };
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  const res = await fetch(`${baseUrl}/workspaces/${encodeURIComponent(slug)}/headlines`, {
    method: "GET",
    headers,
  });
  return res.json();
}

(async () => {
  console.log("Slug:", slug);
  console.log("Base URL:", baseUrl);
  const cookie = await login();
  if (!cookie && (email || password)) {
    console.error("Necesitás EMAIL y PASSWORD para login. Ejemplo:");
    console.error('  SLUG=mi-slug EMAIL=tu@email.com PASSWORD=xxx node scripts/fetch-headlines.js');
    process.exit(1);
  }
  const data = await fetchHeadlines(cookie);
  console.log("\n--- Response ---");
  console.log(JSON.stringify(data, null, 2));
  if (data.success && data.data?.headlines) {
    console.log("\n--- Headlines (" + data.data.total + ") ---");
    data.data.headlines.forEach((h, i) => console.log(`${i + 1}. ${h}`));
  }
})();
