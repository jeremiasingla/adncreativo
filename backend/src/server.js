import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import workspaceRouter from "./routes/workspace.route.js";
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { getCreativeVersionsByOrgId } from "./controllers/workspace.controller.js";
import fs from "fs";
import { initPostgresWorkspaces } from "./db/postgres.js";

// ADNCreativo Backend v2.0.0 - Vercel deployment fix
dotenv.config();

// Inicializar tablas users y workspaces en Postgres (Neon)
initPostgresWorkspaces().catch((err) =>
  console.warn("⚠️ initPostgresWorkspaces:", err?.message)
);

const app = express();

// CORS: permitir frontend en Vercel (y previews). Sin esto el navegador bloquea peticiones cross-origin.
const FRONTEND_ORIGIN = "https://adncreativo-frontend.vercel.app";
const FRONTEND_ORIGIN_REGEX =
  /^https:\/\/adncreativo-frontend(\-[a-z0-9]+)*\.vercel\.app$/;
function getAllowedOrigin(origin) {
  if (!origin) return FRONTEND_ORIGIN; // Sin Origin (ej. servidor/proxy): permitir front principal
  if (origin === FRONTEND_ORIGIN || FRONTEND_ORIGIN_REGEX.test(origin))
    return origin;
  return null;
}
function setCorsHeaders(req, res) {
  const allow = getAllowedOrigin(req.headers.origin);
  if (allow) {
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }
}
// OPTIONS primero para que el preflight siempre reciba cabeceras CORS
app.options("*", (req, res) => {
  setCorsHeaders(req, res);
  res.status(204).end();
});
const corsOptions = {
  origin: (origin, cb) => {
    const allowed = getAllowedOrigin(origin);
    cb(null, allowed !== null);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Asegurar que todas las respuestas tengan cabeceras CORS (incl. errores 4xx/5xx)
app.use((req, res, next) => {
  setCorsHeaders(req, res);
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Screenshots (para mostrar en onboarding)
const screenshotsDir = path.resolve(__dirname, "../storage/screenshots");
app.use("/screenshots", express.static(screenshotsDir));

// Avatares y banners de perfiles de cliente (ICP)
const icpAvatarsDir = path.resolve(__dirname, "../storage/icp-avatars");
const icpHeroesDir = path.resolve(__dirname, "../storage/icp-heroes");
app.use("/icp-avatars", express.static(icpAvatarsDir));
app.use("/icp-heroes", express.static(icpHeroesDir));

// Versiones de creativos (compatible ADNCreativo) – antes del static para que no capture /creatives/versions
app.get("/creatives/versions", authMiddleware, getCreativeVersionsByOrgId);

// Imágenes de creativos (headlines generados)
const creativesDir = path.resolve(__dirname, "../storage/creatives");
app.use("/creatives", express.static(creativesDir));

app.use("/", workspaceRouter);
app.use("/", authRouter);
app.use("/", adminRouter);

// Serve frontend solo si existe (en Vercel el backend se despliega sin frontend/dist)
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
const frontendExists =
  fs.existsSync(frontendDist) &&
  fs.existsSync(path.join(frontendDist, "index.html"));

if (frontendExists) {
  app.use(express.static(frontendDist));
  app.get(
    [
      "/",
      "/app",
      "/app/*",
      "/login",
      "/register",
      "/onboarding",
      "/onboarding/*",
    ],
    (_, res) => res.sendFile(path.join(frontendDist, "index.html"))
  );
  app.get("*", (_, res) => res.sendFile(path.join(frontendDist, "index.html")));
} else {
  app.get("/", (_, res) =>
    res.status(404).json({
      error: "Not found",
      message: "Usa la URL del frontend (adncreativo-frontend.vercel.app).",
    })
  );
}

export default app;
