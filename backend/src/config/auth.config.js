/**
 * Configuración de autenticación. En producción JWT_SECRET y REFRESH_SECRET son obligatorios.
 */
const isProd = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "devrefreshsecret";

if (isProd && (JWT_SECRET === "devsecret" || REFRESH_SECRET === "devrefreshsecret")) {
  console.error("En producción debes definir JWT_SECRET y REFRESH_SECRET en el entorno.");
  process.exit(1);
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict",
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
