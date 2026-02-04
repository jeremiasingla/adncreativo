console.log("[DEBUG] Starting server.js import");
import express from "express";
console.log("[DEBUG] express imported");
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
console.log("[DEBUG] Basic imports OK");
import workspaceRouter from "./routes/workspace.route.js";
console.log("[DEBUG] workspaceRouter imported");
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
console.log("[DEBUG] Routers and middleware imported");
// TEMPORALMENTE COMENTADO PARA DEBUG:
// import { getCreativeVersionsByOrgId } from "./controllers/workspace.controller.js";
console.log("[DEBUG] workspace.controller SKIPPED (commented for debug)");
import fs from "fs";
import { initPostgresWorkspaces } from "./db/postgres.js";
console.log("[DEBUG] All imports complete");

// Inicializar tablas users y workspaces en Postgres (Neon)
initPostgresWorkspaces().catch((err) =>
  console.warn("⚠️ initPostgresWorkspaces:", err?.message),
);

const app = express();

// CORS completo: permite todos los orígenes con credenciales
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie, X-Requested-With",
  );
  res.setHeader("Access-Control-Expose-Headers", "Set-Cookie");
  if (req.method === "OPTIONS") return res.status(204).end();
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
// TEMPORALMENTE COMENTADO PARA DEBUG:
// app.get("/creatives/versions", authMiddleware, getCreativeVersionsByOrgId);

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
    (_, res) => res.sendFile(path.join(frontendDist, "index.html")),
  );
  app.get("*", (_, res) => res.sendFile(path.join(frontendDist, "index.html")));
} else {
  app.get("/", (_, res) =>
    res.status(404).json({
      error: "Not found",
      message: "Usa la URL del frontend (adncreativo-frontend.vercel.app).",
    }),
  );
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
