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

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
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

// Serve frontend if built (debe ir al final, después de los archivos estáticos de imágenes)
const frontendDist = path.resolve(__dirname, "../../frontend/dist");

app.use(express.static(frontendDist));
// SPA fallback: sirve index.html para rutas de la app (incl. /:workspaceSlug)
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
  (_, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  },
);
app.get("*", (_, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
