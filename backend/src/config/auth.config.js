/**
 * Configuración de autenticación. En producción JWT_SECRET y REFRESH_SECRET son obligatorios.
 */
const isProd = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "devrefreshsecret";

if (
  isProd &&
  (JWT_SECRET === "devsecret" || REFRESH_SECRET === "devrefreshsecret")
) {
  console.warn(
    "⚠️ JWT_SECRET o REFRESH_SECRET no configurados. Usando valores por defecto (no seguro en producción)."
  );
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
// En producción frontend y backend están en orígenes distintos (vercel.app); sameSite "none" para que las cookies se envíen
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "strict",
  path: "/",
};

export {
  JWT_SECRET,
  REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  COOKIE_OPTIONS,
};

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 min ms
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days ms
