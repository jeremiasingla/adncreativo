import path from "path";
import fs from "fs";
import crypto from "crypto";
import { get, all, run } from "../db/workspaceDb.js";
import { scrapeWithFirecrawl } from "../services/firecrawl.service.js";
import { generateWorkspaceSlug } from "../utils/slug.js";
import { saveScreenshot } from "../utils/screenshot.js";
import {
  refineBrandingWithLLM,
  generateKnowledgeBase,
  generateCustomerProfiles,
  generateHeadlines,
  generateCreativeImagePrompt,
  generateCreativeImageSeedream,
  generateProfileImage,
} from "../services/llm.service.js";
import {
  saveIcpImage,
  deleteIcpImagesForWorkspace,
} from "../utils/icpImage.js";
import { saveCreativeImage } from "../utils/creativeImage.js";

const SCREENSHOT_DIR = path.resolve(
  process.env.SCREENSHOT_DIR ||
    path.join(process.cwd(), "storage", "screenshots"),
);

/** Convierte URL de logo/imagen relativa a absoluta para que OpenRouter pueda cargarla. */
function toAbsoluteImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const base = process.env.API_BASE_URL || "http://localhost:3000";
  return url.startsWith("/") ? base + url : base + "/" + url;
}

/**
 * Construye prompts de avatar y banner con el contexto completo del ICP
 * para que la imagen refleje al personaje (nombre, título, descripción, demografía).
 */
function buildIcpImagePrompts(profile) {
  const name = profile.name ?? "customer";
  const title = profile.title ?? "";
  const description = (profile.description ?? "").trim();
  const age = profile.demographics?.age ?? "adult";
  const gender = (profile.demographics?.gender ?? "person")
    .toString()
    .toLowerCase();
  const location = profile.demographics?.location ?? "";
  const goals = Array.isArray(profile.goals) ? profile.goals.slice(0, 2) : [];
  const personaContext = [name, title, description].filter(Boolean).join(". ");
  const goalsLine =
    goals.length > 0 ? ` Their context: ${goals.join("; ")}.` : "";

  const avatarPrompt = [
    `Professional headshot portrait of ${name}, ${title}.`,
    `This person is a ${gender}, ${age} years old.`,
    personaContext
      ? `${personaContext}`
      : "Friendly, approachable professional.",
    goalsLine,
    "The face and expression must clearly reflect this specific persona (e.g. enthusiast, entrepreneur, professional).",
    "Clean neutral background, high quality portrait, face clearly visible, photorealistic.",
    "Do not include any text, words, letters, or writing in the image. Image only, no text.",
  ]
    .filter(Boolean)
    .join(" ");

  const heroPrompt = [
    `Wide cinematic banner (21:9) representing ${name}, ${title}.`,
    personaContext
      ? `Scene that evokes this persona: ${personaContext}`
      : "Atmospheric professional scene.",
    goalsLine,
    location ? `Setting or vibe: ${location}.` : "",
    "No text or logos in the image. Photorealistic, aspirational mood.",
  ]
    .filter(Boolean)
    .join(" ");

  return { avatarPrompt, heroPrompt };
}

/** Normaliza hex a 6 caracteres minúsculos para comparar. */
function normalizeHex(hex) {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.trim().replace(/^#/, "").toLowerCase();
  if (m.length === 3) return m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
  if (m.length === 6) return m;
  return null;
}

/** True si primary secondary y accent son demasiado parecidos o iguales. */
function areColorsTooSimilar(colors) {
  if (!colors) return false;
  const p = normalizeHex(colors.primary);
  const s = normalizeHex(colors.secondary);
  const a = normalizeHex(colors.accent);
  if (!p && !s && !a) return false;
  const set = new Set([p, s, a].filter(Boolean));
  if (set.size <= 1) return true;
  if (set.size === 2) return true;
  return false;
}

/** Mapeo aspect ratio → platform (facebook_feed, instagram_portrait, linkedin, etc.). */
function getPlatformFromAspectRatio(aspectRatio) {
  const r = (aspectRatio || "4:5").trim();
  if (r === "1:1") return "facebook_feed";
  if (r === "4:5" || r === "3:4" || r === "2:3") return "instagram_portrait";
  if (r === "9:16") return "instagram_story";
  if (r === "4:3" || r === "3:2" || r === "5:4") return "landscape_4_3";
  if (r === "16:9" || r === "21:9") return "linkedin";
  return "instagram_portrait";
}

const WELCOME_AD_NAMES = [
  "Social Proof",
  "Value Proposition",
  "Brand Introduction",
];

/**
 * Convierte un creative (formato interno) en un ad (formato campañas).
 * @param {object} creative - { id, headline, imageUrl, aspectRatio, createdAt, ... }
 * @param {object} branding - { companyName, logo, colors, ... }
 * @param {number} index - Índice del creative (para name por defecto)
 * @param {string} baseUrl - URL base para imageUrl absoluta
 */
function creativeToAd(creative, branding, index, baseUrl) {
  const id = creative.id || `ad-${index}-${crypto.randomUUID()}`;
  const imageUrl = creative.imageUrl?.startsWith("http")
    ? creative.imageUrl
    : baseUrl +
      (creative.imageUrl?.startsWith("/")
        ? creative.imageUrl
        : "/" + creative.imageUrl);
  const headline = creative.headline ?? "";
  const platform = getPlatformFromAspectRatio(creative.aspectRatio);
  const name = WELCOME_AD_NAMES[index] || `Creative ${index + 1}`;
  const companyName = branding?.companyName ?? "";
  const logoUrl = branding?.logo ?? null;
  const defaultCta = "Descubre Cómo";
  return {
    id,
    baseAdId: id,
    name,
    imageUrl,
    versionCount: 1,
    headline,
    body: headline,
    cta: defaultCta,
    description: "",
    linkTitle: "",
    websiteUrl: branding?.websiteUrl ?? "",
    companyName,
    logoUrl,
    headerText: headline,
    headerFont: "Inter",
    headerColor: branding?.colors?.primary ?? "#000000",
    headerSize: 30,
    descriptionFont: "Inter",
    descriptionColor: "#666666",
    descriptionSize: 16,
    callToAction: defaultCta,
    ctaFont: "Inter",
    ctaColor: "#000000",
    ctaSize: 16,
    status: "succeeded",
    platform,
    runId: null,
    accessToken: null,
    createdAt: creative.createdAt ?? new Date().toISOString(),
  };
}

/**
 * Construye la estructura campaigns a partir de la lista de creatives y branding.
 * Una campaña "Welcome Campaign", un adSet "Getting Started", ads = creatives.
 */
function buildCampaignsFromCreatives(creativesList, branding, orgId, baseUrl) {
  if (!Array.isArray(creativesList) || creativesList.length === 0) {
    return { campaigns: [] };
  }
  const campaignId = crypto.randomUUID();
  const adSetId = crypto.randomUUID();
  const ads = creativesList.map((c, i) =>
    creativeToAd(c, branding, i, baseUrl),
  );
  return {
    campaigns: [
      {
        id: campaignId,
        name: "Welcome Campaign",
        adSets: [
          {
            id: adSetId,
            name: "Getting Started",
            ads,
          },
        ],
      },
    ],
  };
}

/** Devuelve solo las campañas del workspace en formato { success, orgId, campaigns }. */
export async function getWorkspaceCampaigns(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "Slug is required" });
    }
    const row = await get(
      `SELECT slug, url, branding, creatives, campaigns FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    let branding = {};
    try {
      branding = JSON.parse(row.branding || "{}");
    } catch (_) {}
    let creativesList = [];
    try {
      if (row.creatives != null && row.creatives !== "")
        creativesList = JSON.parse(row.creatives);
    } catch (_) {}
    if (!Array.isArray(creativesList)) creativesList = [];
    let campaignsData = null;
    try {
      if (row.campaigns != null && row.campaigns !== "")
        campaignsData = JSON.parse(row.campaigns);
    } catch (_) {}
    const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
    if (!campaignsData?.campaigns?.length && creativesList.length > 0) {
      const brandingWithUrl = { ...branding, websiteUrl: row.url };
      campaignsData = buildCampaignsFromCreatives(
        creativesList,
        brandingWithUrl,
        row.slug,
        baseUrl,
      );
    }
    return res.status(200).json({
      success: true,
      orgId: row.slug,
      campaigns: campaignsData?.campaigns ?? [],
    });
  } catch (error) {
    console.error("❌ Error getting workspace campaigns:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Lista workspaces del usuario autenticado. */
export async function listWorkspaces(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const rows = await all(
      `SELECT id, slug, url, branding, screenshot_path, created_at
         FROM workspaces WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
    );

    const workspaces = rows.map((row) => {
      let branding = {};
      try {
        branding = JSON.parse(row.branding || "{}");
      } catch (_) {}
      const screenshotUrl = row.screenshot_path
        ? row.screenshot_path.startsWith("http")
          ? row.screenshot_path
          : `/screenshots/${path.basename(row.screenshot_path)}`
        : null;
      const name =
        branding.companyName ||
        branding.headline ||
        (() => {
          try {
            return new URL(row.url).hostname;
          } catch {
            return "Workspace";
          }
        })();
      return {
        id: row.id,
        slug: row.slug,
        url: row.url,
        name,
        logoUrl: branding.logo || null,
        screenshotUrl,
      };
    });

    return res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    console.error("❌ Error listing workspaces:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Devuelve un workspace por slug con branding completo (solo del usuario actual). */
export async function getWorkspaceBySlug(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "Slug is required" });
    }
    const row = await get(
      `SELECT id, slug, url, branding, screenshot_path, knowledge_base, customer_profiles, headlines, creatives, campaigns, created_at
         FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    let branding = {};
    try {
      branding = JSON.parse(row.branding || "{}");
    } catch (_) {}
    const screenshotUrl = row.screenshot_path
      ? row.screenshot_path.startsWith("http")
        ? row.screenshot_path
        : `/screenshots/${path.basename(row.screenshot_path)}`
      : null;
    const name =
      branding.companyName ||
      branding.headline ||
      (() => {
        try {
          return new URL(row.url).hostname;
        } catch {
          return "Workspace";
        }
      })();
    let creativesList = [];
    try {
      if (row.creatives != null && row.creatives !== "")
        creativesList = JSON.parse(row.creatives);
    } catch (_) {}
    if (!Array.isArray(creativesList)) creativesList = [];
    let campaignsData = null;
    try {
      if (row.campaigns != null && row.campaigns !== "")
        campaignsData = JSON.parse(row.campaigns);
    } catch (_) {}
    const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
    if (!campaignsData?.campaigns?.length && creativesList.length > 0) {
      const brandingWithUrl = { ...branding, websiteUrl: row.url };
      campaignsData = buildCampaignsFromCreatives(
        creativesList,
        brandingWithUrl,
        row.slug,
        baseUrl,
      );
    }
    return res.status(200).json({
      success: true,
      data: {
        id: row.id,
        slug: row.slug,
        url: row.url,
        name,
        logoUrl: branding.logo || null,
        screenshotUrl,
        branding,
        knowledgeBase: row.knowledge_base ?? "",
        customerProfiles: (() => {
          try {
            const raw = row.customer_profiles;
            if (raw == null || raw === "") return [];
            return JSON.parse(raw);
          } catch (_) {
            return [];
          }
        })(),
        headlines: (() => {
          try {
            const raw = row.headlines;
            if (raw == null || raw === "") return [];
            return JSON.parse(raw);
          } catch (_) {
            return [];
          }
        })(),
        creatives: creativesList,
        campaigns: campaignsData?.campaigns ?? [],
        orgId: row.slug,
      },
    });
  } catch (error) {
    console.error("❌ Error getting workspace by slug:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Ejecuta el flujo completo (KB, perfiles, titulares, creativos) bajo demanda. */
export async function runFullWorkspaceGeneration(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "Slug is required" });
    }

    const row = await get(
      `SELECT slug, url, branding
         FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }

    let branding = {};
    try {
      branding = JSON.parse(row.branding || "{}");
    } catch (_) {}

    const companyName = branding.companyName || branding.name || null;
    const headline = branding.headline || null;
    const personality = branding.personality || null;

    await continueWorkspaceCreationInBackground({
      userId,
      slug: row.slug,
      url: row.url,
      companyName,
      headline,
      personality,
      metadata: {
        title: null,
        ogTitle: null,
        description: null,
        ogDescription: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Full generation completed",
      data: { slug: row.slug },
    });
  } catch (error) {
    console.error("❌ Error running full generation:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Devuelve todos los hooks/headlines generados para un workspace. GET /workspaces/:slug/headlines */
export async function getWorkspaceHeadlines(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "Slug is required" });
    }
    const row = await get(
      `SELECT id, headlines FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    let headlines = [];
    try {
      if (row.headlines != null && row.headlines !== "") {
        headlines = JSON.parse(row.headlines);
      }
    } catch (_) {}
    if (!Array.isArray(headlines)) headlines = [];
    return res.status(200).json({
      success: true,
      data: {
        slug: row.slug,
        headlines,
        total: headlines.length,
      },
    });
  } catch (error) {
    console.error("❌ Error getting workspace headlines:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Fuerza la generación de avatar y banner para un perfil de cliente (ICP). */
export async function generateCustomerProfileImages(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug, profileId } = req.params;
    if (!slug || !profileId) {
      return res
        .status(400)
        .json({ success: false, error: "slug and profileId are required" });
    }
    const row = await get(
      `SELECT id, customer_profiles FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    let profiles = [];
    try {
      const raw = row.customer_profiles;
      if (raw != null && raw !== "") profiles = JSON.parse(raw);
    } catch (_) {}
    const index = profiles.findIndex((p) => p.id === profileId);
    if (index === -1) {
      return res
        .status(404)
        .json({ success: false, error: "Profile not found" });
    }
    const profile = profiles[index];
    let avatarUrl = profile.avatarUrl ?? null;
    let heroImageUrl = profile.heroImageUrl ?? null;

    const { avatarPrompt, heroPrompt } = buildIcpImagePrompts(profile);

    try {
      const avatarDataUrl = await generateProfileImage(avatarPrompt, "1:1");
      if (avatarDataUrl) {
        const avatarPath = await saveIcpImage(
          avatarDataUrl,
          `${slug}-${profileId.slice(0, 8)}`,
          "avatar",
        );
        if (avatarPath)
          avatarUrl = avatarPath.startsWith("http")
            ? avatarPath
            : `/icp-avatars/${path.basename(avatarPath)}`;
      }
    } catch (avatarErr) {
      console.warn("⚠️ Avatar generation failed:", avatarErr.message);
      return res.status(502).json({
        success: false,
        error: "Avatar generation failed",
        details: avatarErr.message,
      });
    }

    try {
      const heroDataUrl = await generateProfileImage(heroPrompt, "21:9");
      if (heroDataUrl) {
        const heroPath = await saveIcpImage(
          heroDataUrl,
          `${slug}-${profileId.slice(0, 8)}`,
          "hero",
        );
        if (heroPath)
          heroImageUrl = heroPath.startsWith("http")
            ? heroPath
            : `/icp-heroes/${path.basename(heroPath)}`;
      }
    } catch (heroErr) {
      console.warn("⚠️ Hero/banner generation failed:", heroErr.message);
      return res.status(502).json({
        success: false,
        error: "Hero generation failed",
        details: heroErr.message,
      });
    }

    profiles[index] = {
      ...profile,
      avatarUrl: toAbsoluteImageUrl(avatarUrl),
      heroImageUrl: toAbsoluteImageUrl(heroImageUrl),
    };
    await run(
      `UPDATE workspaces SET customer_profiles = ? WHERE user_id = ? AND slug = ?`,
      [JSON.stringify(profiles), userId, slug],
    );

    return res.status(200).json({
      success: true,
      data: { profile: profiles[index] },
    });
  } catch (error) {
    console.error("❌ Error generating profile images:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Lógica compartida: elimina imágenes ICP del workspace y las regenera con Seedream 4.5. */
export async function regenerateAllCustomerProfileImagesCore(userId, slug) {
  const row = await get(
    `SELECT id, customer_profiles FROM workspaces WHERE user_id = ? AND slug = ?`,
    [userId, slug],
  );
  if (!row) return null;
  let profiles = [];
  try {
    const raw = row.customer_profiles;
    if (raw != null && raw !== "") profiles = JSON.parse(raw);
  } catch (_) {}
  if (profiles.length === 0) return { profiles: [], deleted: 0 };

  const { deleted } = deleteIcpImagesForWorkspace(slug);

  const updatedProfiles = await Promise.all(
    profiles.map(async (profile) => {
      const profileId = profile.id ?? "";
      const { avatarPrompt, heroPrompt } = buildIcpImagePrompts(profile);
      const [avatarDataUrl, heroDataUrl] = await Promise.all([
        generateProfileImage(avatarPrompt, "1:1").catch((err) => {
          console.warn(
            "⚠️ Avatar generation failed for profile:",
            profile.name,
            "| Error:",
            err.message,
          );
          console.warn("⚠️ Avatar prompt was:", avatarPrompt.slice(0, 200));
          return null;
        }),
        generateProfileImage(heroPrompt, "21:9").catch((err) => {
          console.warn(
            "⚠️ Hero/banner generation failed for profile:",
            profile.name,
            "| Error:",
            err.message,
          );
          console.warn("⚠️ Hero prompt was:", heroPrompt.slice(0, 200));
          return null;
        }),
      ]);
      const prefix = `${slug}-${profileId.slice(0, 8)}`;
      const [avatarPath, heroPath] = await Promise.all([
        avatarDataUrl
          ? saveIcpImage(avatarDataUrl, prefix, "avatar")
          : Promise.resolve(null),
        heroDataUrl
          ? saveIcpImage(heroDataUrl, prefix, "hero")
          : Promise.resolve(null),
      ]);
      const avatarUrl = avatarPath
        ? avatarPath.startsWith("http")
          ? avatarPath
          : `/icp-avatars/${path.basename(avatarPath)}`
        : null;
      const heroImageUrl = heroPath
        ? heroPath.startsWith("http")
          ? heroPath
          : `/icp-heroes/${path.basename(heroPath)}`
        : null;
      return {
        ...profile,
        avatarUrl: toAbsoluteImageUrl(avatarUrl),
        heroImageUrl: toAbsoluteImageUrl(heroImageUrl),
      };
    }),
  );

  for (let i = 0; i < updatedProfiles.length; i++) {
    profiles[i] = updatedProfiles[i];
  }

  await run(
    `UPDATE workspaces SET customer_profiles = ? WHERE user_id = ? AND slug = ?`,
    [JSON.stringify(profiles), userId, slug],
  );

  return { profiles, deleted };
}

/** Elimina solo las imágenes (avatar/banner) de los perfiles del workspace y las regenera con Seedream 4.5. Los perfiles se mantienen. */
export async function regenerateAllCustomerProfileImages(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "slug is required" });
    }
    const result = await regenerateAllCustomerProfileImagesCore(userId, slug);
    if (result === null) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Error regenerating all profile images:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Lógica compartida: elimina workspace por slug y sus archivos (screenshot, ICP). */
export async function deleteWorkspaceBySlug(slug) {
  if (!slug || typeof slug !== "string")
    return { deleted: false, error: "slug required" };
  const row = await get(
    "SELECT id, screenshot_path FROM workspaces WHERE slug = ?",
    [slug],
  );
  if (!row) return { deleted: false, error: "Workspace not found" };

  deleteIcpImagesForWorkspace(slug);

  if (row.screenshot_path && !row.screenshot_path.startsWith("http")) {
    const screenshotPath = path.isAbsolute(row.screenshot_path)
      ? row.screenshot_path
      : path.join(SCREENSHOT_DIR, path.basename(row.screenshot_path));
    try {
      if (fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
      }
    } catch (err) {
      console.warn(
        "⚠️ Could not delete screenshot file:",
        screenshotPath,
        err.message,
      );
    }
  }

  const result = await run("DELETE FROM workspaces WHERE slug = ?", [slug]);
  return { deleted: result.changes > 0 };
}

/** Elimina un workspace y todos los archivos asociados (screenshot, avatares y banners ICP). */
export async function deleteWorkspace(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "slug is required" });
    }
    const row = await get(
      `SELECT id, screenshot_path FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }

    deleteIcpImagesForWorkspace(slug);

    if (row.screenshot_path && !row.screenshot_path.startsWith("http")) {
      const screenshotPath = path.isAbsolute(row.screenshot_path)
        ? row.screenshot_path
        : path.join(SCREENSHOT_DIR, path.basename(row.screenshot_path));
      try {
        if (fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
        }
      } catch (err) {
        console.warn(
          "⚠️ Could not delete screenshot file:",
          screenshotPath,
          err.message,
        );
      }
    }

    const result = await run(
      "DELETE FROM workspaces WHERE user_id = ? AND slug = ?",
      [userId, slug],
    );
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    return res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("❌ Error deleting workspace:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/**
 * Genera N creativos (prompt + imagen) para el workspace usando headlines guardados.
 * POST /workspaces/:slug/creatives body: { count?: number } (default 1, máx 10).
 */
export async function generateCreatives(req, res) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    let count = Math.min(Math.max(Number(req.body?.count) || 1, 1), 10);

    const row = await get(
      `SELECT id, branding, headlines, customer_profiles, creatives FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );

    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }

    let headlinesList = [];
    try {
      if (row.headlines != null && row.headlines !== "") {
        headlinesList = JSON.parse(row.headlines);
      }
    } catch (_) {}
    if (!Array.isArray(headlinesList) || headlinesList.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "No hay headlines guardados en este workspace. Genera el workspace completo primero.",
      });
    }

    let branding = {};
    try {
      if (row.branding != null && row.branding !== "")
        branding = JSON.parse(row.branding);
    } catch (_) {}
    const companyName = branding?.companyName ?? "";
    const personality = branding?.personality ?? "";
    const brandingSummary = [companyName, branding?.headline, personality]
      .filter(Boolean)
      .join(". ")
      .slice(0, 500);
    const hasLogoOrImages = !!(
      branding?.logo ||
      (Array.isArray(branding?.images) && branding.images.length > 0)
    );
    const referenceImages = [];
    if (branding?.logo) {
      const logoUrl = toAbsoluteImageUrl(branding.logo);
      if (logoUrl) referenceImages.push({ url: logoUrl });
    }
    if (Array.isArray(branding?.images) && referenceImages.length < 2) {
      for (const img of branding.images.slice(0, 2 - referenceImages.length)) {
        const u = toAbsoluteImageUrl(typeof img === "string" ? img : img?.url);
        if (u) referenceImages.push({ url: u });
      }
    }

    let profiles = [];
    try {
      if (row.customer_profiles != null && row.customer_profiles !== "") {
        profiles = JSON.parse(row.customer_profiles);
      }
    } catch (_) {}

    const CREATIVE_ASPECT_RATIOS = ["4:5", "1:1", "9:16", "3:4"];

    let creativesList = [];
    try {
      if (row.creatives != null && row.creatives !== "")
        creativesList = JSON.parse(row.creatives);
    } catch (_) {}
    if (!Array.isArray(creativesList)) creativesList = [];

    if (!isAdmin && creativesList.length >= MAX_CREATIVES_PER_WORKSPACE_FREE) {
      return res.status(403).json({
        success: false,
        error: `Los usuarios gratuitos pueden tener como máximo ${MAX_CREATIVES_PER_WORKSPACE_FREE} creativos por workspace.`,
      });
    }
    if (!isAdmin) {
      count = Math.min(
        count,
        MAX_CREATIVES_PER_WORKSPACE_FREE - creativesList.length,
      );
      if (count <= 0) {
        return res.status(403).json({
          success: false,
          error: `Los usuarios gratuitos pueden tener como máximo ${MAX_CREATIVES_PER_WORKSPACE_FREE} creativos por workspace.`,
        });
      }
    }

    const modelUsed = "dall-e-3";
    let generated = 0;
    const CREATIVE_CONCURRENCY = 3;

    const generateOneCreative = async (offsetIndex, baseLength) => {
      const headlineIndex = (baseLength + offsetIndex) % headlinesList.length;
      const chosenHeadline = headlinesList[headlineIndex];
      const profileIndex =
        Array.isArray(profiles) && profiles.length > 0
          ? (baseLength + offsetIndex) % profiles.length
          : 0;
      const profile =
        Array.isArray(profiles) && profiles[profileIndex]
          ? profiles[profileIndex]
          : null;
      const clientIdealSummary = profile
        ? `${profile.name ?? ""}, ${profile.title ?? ""}. ${
            profile.description ?? ""
          }. Objetivos: ${(profile.goals || [])
            .slice(0, 2)
            .join("; ")}. Dificultades: ${(profile.painPoints || [])
            .slice(0, 2)
            .join("; ")}`.slice(0, 800)
        : "";
      const aspectRatio =
        CREATIVE_ASPECT_RATIOS[
          (baseLength + offsetIndex) % CREATIVE_ASPECT_RATIOS.length
        ];
      const platform = getPlatformFromAspectRatio(aspectRatio);
      const version = ((baseLength + offsetIndex) % 3) + 1;
      const useLogoThisTime =
        hasLogoOrImages && (baseLength + offsetIndex) % 2 === 0;
      const imagesForThisCreative = useLogoThisTime ? referenceImages : [];
      try {
        const imagePrompt = await generateCreativeImagePrompt({
          headline: chosenHeadline,
          companyName,
          brandingSummary,
          clientIdealSummary,
          brandingColors: branding?.colors ?? {},
          hasLogoOrImages: useLogoThisTime,
          aspectRatio,
        });
        const imageDataUrl = await generateCreativeImageSeedream(
          imagePrompt,
          aspectRatio,
          imagesForThisCreative,
        );
        if (imageDataUrl) {
          const saved = await saveCreativeImage(imageDataUrl, slug, "creativo");
          if (saved?.urlPath) {
            const creativeId = crypto.randomUUID();
            const campaignId = crypto.randomUUID();
            const adsetId = crypto.randomUUID();
            const imagePath = saved.urlPath.startsWith("http")
              ? saved.urlPath.replace(/^https?:\/\//, "").replace(/^[^/]+\//, "")
              : saved.urlPath;
            return {
              id: creativeId,
              adsetId,
              adset_id: adsetId,
              campaignId,
              campaign_id: campaignId,
              orgId: slug,
              org_id: slug,
              baseAdId: creativeId,
              base_ad_id: creativeId,
              headline: chosenHeadline,
              imagePrompt,
              generationPrompt: imagePrompt,
              imageUrl: saved.urlPath,
              image_url: saved.urlPath,
              imagePath,
              image_path: imagePath,
              createdAt: new Date().toISOString(),
              created_at: new Date().toISOString(),
              model: modelUsed,
              aspectRatio,
              aspect_ratio: aspectRatio,
              version,
              platform,
              parentAdId: null,
              parent_ad_id: null,
              isCurrent: false,
              is_current: false,
              name: null,
              description: null,
              body: chosenHeadline,
              cta: "Inicia Ahora",
              videoUrl: null,
              video_url: null,
              videoPath: null,
              video_path: null,
              referenceImageUrl: null,
              reference_image_url: null,
              status: "succeeded",
              replicateJobId: null,
              replicate_job_id: null,
              errorMessage: null,
              error_message: null,
              impressions: 0,
              clicks: 0,
              conversions: 0,
              metadata: {},
              updatedAt: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              createdBy: userId || null,
              created_by: userId || null,
              triggerRunId: null,
              trigger_run_id: null,
              triggerAccessToken: null,
              trigger_access_token: null,
              hasViewed: false,
              has_viewed: false,
              carouselId: null,
              carousel_id: null,
              carouselPosition: null,
              carousel_position: null,
              carouselTotal: null,
              carousel_total: null,
              reminderSentAt: null,
              reminder_sent_at: null,
              metaAdId: null,
              meta_ad_id: null,
              metaCreativeId: null,
              meta_creative_id: null,
              metaStatus: null,
              meta_status: null,
            };
          }
        }
      } catch (err) {
        console.error("[Creative] Error generating creative:", err.message);
      }
      return null;
    };

    for (let start = 0; start < count; start += CREATIVE_CONCURRENCY) {
      const chunkSize = Math.min(CREATIVE_CONCURRENCY, count - start);
      const baseLength = creativesList.length;
      const results = await Promise.all(
        Array.from({ length: chunkSize }, (_, j) =>
          generateOneCreative(start + j, baseLength),
        ),
      );
      for (const creative of results) {
        if (creative) {
          creativesList.push(creative);
          generated++;
          console.log(
            "[Creative] Generated creative",
            generated,
            "for workspace",
            slug,
          );
        }
      }
    }

    const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
    const campaignsPayload = buildCampaignsFromCreatives(
      creativesList,
      branding,
      slug,
      baseUrl,
    );
    await run(
      "UPDATE workspaces SET creatives = ?, campaigns = ? WHERE slug = ?",
      [JSON.stringify(creativesList), JSON.stringify(campaignsPayload), slug],
    );

    return res.status(200).json({
      success: true,
      data: {
        generated,
        total: creativesList.length,
        creatives: creativesList,
        campaigns: campaignsPayload.campaigns,
      },
    });
  } catch (error) {
    console.error("❌ Error generating creatives:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/**
 * Devuelve los creativos del workspace en formato "versions" (compatible con ADNCreativo).
 * GET /workspaces/:slug/creatives/versions?adId=...&orgId=... (adId y orgId opcionales).
 */
export async function getCreativeVersions(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    const adId = req.query?.adId ?? null;
    const orgIdQuery = req.query?.orgId ?? null;

    const row = await get(
      `SELECT id, creatives, campaigns FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );

    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }

    let creativesList = [];
    try {
      if (row.creatives != null && row.creatives !== "") {
        creativesList = JSON.parse(row.creatives);
      }
    } catch (_) {}
    if (!Array.isArray(creativesList)) creativesList = [];

    let campaignsData = null;
    try {
      if (row.campaigns != null && row.campaigns !== "") {
        campaignsData = JSON.parse(row.campaigns);
      }
    } catch (_) {}
    const campaign = campaignsData?.campaigns?.[0] ?? null;
    const adSet = campaign?.adSets?.[0] ?? null;
    const adsByIndex = Array.isArray(adSet?.ads) ? adSet.ads : [];
    const campaignId = campaign?.id ?? null;
    const adsetId = adSet?.id ?? null;

    const baseUrl = process.env.API_BASE_URL || "";
    const orgId = orgIdQuery || slug;

    const versions = creativesList
      .map((c, i) => {
        const id = c.id || `${slug}-creative-${i}`;
        if (
          adId != null &&
          adId !== "" &&
          id !== adId &&
          String(id).indexOf(adId) !== 0
        )
          return null;

        // Si el creative ya tiene la estructura completa, usa los campos existentes
        // sino, construye la estructura (compatibilidad con creativos antiguos)
        const hasCompleteStructure = c.baseAdId && c.adsetId && c.campaignId;

        if (hasCompleteStructure) {
          // Creative con estructura nueva - solo asegurar URLs absolutas
          const imageUrl = c.imageUrl?.startsWith("http")
            ? c.imageUrl
            : baseUrl +
              (c.imageUrl?.startsWith("/")
                ? c.imageUrl
                : "/" + (c.imageUrl || ""));
          
          return {
            ...c,
            imageUrl,
            image_url: imageUrl,
            orgId: orgId || c.orgId,
            org_id: orgId || c.org_id,
            isCurrent: i === creativesList.length - 1,
            is_current: i === creativesList.length - 1,
          };
        }

        // Fallback para creativos antiguos
        const imageUrl = c.imageUrl?.startsWith("http")
          ? c.imageUrl
          : baseUrl +
            (c.imageUrl?.startsWith("/")
              ? c.imageUrl
              : "/" + (c.imageUrl || ""));
        const adFromCampaign = adsByIndex[i];
        const name =
          adFromCampaign?.name ??
          ["Social Proof", "Value Proposition", "Brand Introduction"][i] ??
          null;
        const body = adFromCampaign?.body ?? c.headline ?? null;
        const ctaVal =
          adFromCampaign?.cta ?? adFromCampaign?.callToAction ?? null;
        const platform = getPlatformFromAspectRatio(c.aspectRatio);
        const imagePath = c.imagePath || (c.imageUrl?.startsWith("http")
          ? c.imageUrl.replace(/^https?:\/\//, "").replace(/^[^/]+\//, "")
          : c.imageUrl || null);

        return {
          id,
          adsetId,
          adset_id: adsetId,
          campaignId: campaignId || slug,
          campaign_id: campaignId || slug,
          orgId,
          org_id: orgId,
          baseAdId: id,
          base_ad_id: id,
          version: i + 1,
          parentAdId: null,
          parent_ad_id: null,
          isCurrent: i === creativesList.length - 1,
          is_current: i === creativesList.length - 1,
          name,
          description: null,
          headline: c.headline ?? null,
          body,
          cta: ctaVal,
          imageUrl,
          image_url: imageUrl,
          imagePath,
          image_path: imagePath,
          videoUrl: null,
          video_url: null,
          videoPath: null,
          video_path: null,
          referenceImageUrl: null,
          reference_image_url: null,
          status: "succeeded",
          generationPrompt: c.generationPrompt ?? c.imagePrompt ?? null,
          generation_prompt: c.generationPrompt ?? c.imagePrompt ?? null,
          platform,
          replicateJobId: null,
          replicate_job_id: null,
          errorMessage: null,
          error_message: null,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          metadata: c.metadata || {},
          createdAt: c.createdAt ?? null,
          created_at: c.createdAt ?? null,
          updatedAt: c.updatedAt ?? c.createdAt ?? null,
          updated_at: c.updated_at ?? c.createdAt ?? null,
          createdBy: null,
          created_by: null,
          triggerRunId: null,
          trigger_run_id: null,
          triggerAccessToken: null,
          trigger_access_token: null,
          hasViewed: true,
          has_viewed: true,
          carouselId: null,
          carousel_id: null,
          carouselPosition: null,
          carousel_position: null,
          carouselTotal: null,
          carousel_total: null,
          reminderSentAt: null,
          reminder_sent_at: null,
          metaAdId: null,
          meta_ad_id: null,
          metaCreativeId: null,
          meta_creative_id: null,
          metaStatus: null,
          meta_status: null,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      versions,
      orgId,
      carouselId: null,
      carouselSlides: [],
    });
  } catch (error) {
    console.error("❌ Error getting creative versions:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/**
 * Mismo formato que getCreativeVersions pero con slug = orgId desde query (para GET /creatives/versions?orgId=...&adId=...).
 */
export function getCreativeVersionsByOrgId(req, res) {
  const orgId = req.query?.orgId ?? null;
  if (!orgId) {
    return res.status(400).json({ success: false, error: "orgId is required" });
  }
  req.params = { ...req.params, slug: orgId };
  return getCreativeVersions(req, res);
}

/** Actualiza la base de conocimiento de un workspace (PATCH). */
export async function updateWorkspaceKnowledgeBase(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    const { knowledgeBase } = req.body ?? {};
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, error: "Slug is required" });
    }
    const text = typeof knowledgeBase === "string" ? knowledgeBase : "";
    const result = await run(
      `UPDATE workspaces SET knowledge_base = ? WHERE user_id = ? AND slug = ?`,
      [text, userId, slug],
    );
    if (result.changes === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    return res
      .status(200)
      .json({ success: true, data: { knowledgeBase: text } });
  } catch (error) {
    console.error("❌ Error updating knowledge base:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Solo captura: devuelve screenshotUrl y slug para mostrar la captura antes de completar branding. */
export async function captureWorkspaceScreenshot(req, res) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid URL" });
    }
    const slug = generateWorkspaceSlug(url);
    const screenshotData = await scrapeWithFirecrawl(url, ["screenshot"]);
    const screenshot = screenshotData.screenshot || null;
    const screenshotPath = await saveScreenshot(screenshot, slug);
    const screenshotUrl = screenshotPath
      ? screenshotPath.startsWith("http")
        ? screenshotPath
        : `/screenshots/${path.basename(screenshotPath)}`
      : null;
    return res.status(200).json({ success: true, screenshotUrl, slug });
  } catch (error) {
    console.error("❌ Error capturing screenshot:", error.message);
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;
    if (isAuthError) {
      return res.status(503).json({
        success: false,
        error: "screenshot_service_unavailable",
        message:
          "Servicio de captura no configurado. Configura FIRECRAWL_API_KEY en el backend.",
      });
    }
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/**
 * Continúa la creación del workspace en segundo plano: base de conocimiento,
 * perfiles de cliente (LLM) e imágenes ICP. Se ejecuta tras responder 201 con el branding.
 */
async function continueWorkspaceCreationInBackground(params) {
  const { userId, slug, url, companyName, headline, personality, metadata } =
    params;

  let knowledgeBaseText = "";
  try {
    knowledgeBaseText = await generateKnowledgeBase({
      url,
      branding: { companyName, headline, personality },
      metadata: {
        title: metadata.title,
        ogTitle: metadata.ogTitle,
        description: metadata.description,
        ogDescription: metadata.ogDescription,
      },
    });
    await run("UPDATE workspaces SET knowledge_base = ? WHERE slug = ?", [
      knowledgeBaseText,
      slug,
    ]);
  } catch (kbErr) {
    console.error("⚠️ Knowledge base generation failed:", kbErr.message);
    console.error("[Background] KB error details:", {
      name: kbErr.name,
      message: kbErr.message,
      status: kbErr.response?.status,
    });
    // No retornar; continuar con perfiles y titulares sin KB
    knowledgeBaseText = "";
  }

  let rawProfiles = [];
  try {
    rawProfiles = await generateCustomerProfiles({
      url,
      companyName,
      headline,
      knowledgeBase: knowledgeBaseText,
    });
  } catch (cpErr) {
    console.error("⚠️ Customer profiles (LLM) failed:", cpErr.message);
    console.error("[Background] Profiles error details:", {
      name: cpErr.name,
      message: cpErr.message,
      status: cpErr.response?.status,
    });
    // No retornar; intentar generar headlines igual
    rawProfiles = [];
  }

  if (rawProfiles.length === 0) {
    console.log(
      "[Background] No customer profiles generated, skipping profile images and headlines",
    );
    return;
  }

  try {
    const now = new Date().toISOString();
    const workspaceOrgId = slug ? `ws_${slug}` : "";
    const profileResults = await Promise.all(
      rawProfiles.map(async (p, order) => {
        const profileId = crypto.randomUUID();
        const { avatarPrompt, heroPrompt } = buildIcpImagePrompts(p);
        const [avatarDataUrl, heroDataUrl] = await Promise.all([
          generateProfileImage(avatarPrompt, "1:1").catch((err) => {
            console.warn(
              "⚠️ Avatar generation failed for profile:",
              p.name,
              err.message,
            );
            return null;
          }),
          generateProfileImage(heroPrompt, "21:9").catch((err) => {
            console.warn(
              "⚠️ Hero/banner generation failed for profile:",
              p.name,
              err.message,
            );
            return null;
          }),
        ]);
        const prefix = `${slug}-${profileId.slice(0, 8)}`;
        const [avatarPath, heroPath] = await Promise.all([
          avatarDataUrl
            ? saveIcpImage(avatarDataUrl, prefix, "avatar")
            : Promise.resolve(null),
          heroDataUrl
            ? saveIcpImage(heroDataUrl, prefix, "hero")
            : Promise.resolve(null),
        ]);
        const avatarUrl = avatarPath
          ? avatarPath.startsWith("http")
            ? avatarPath
            : `/icp-avatars/${path.basename(avatarPath)}`
          : null;
        const heroImageUrl = heroPath
          ? heroPath.startsWith("http")
            ? heroPath
            : `/icp-heroes/${path.basename(heroPath)}`
          : null;
        return {
          id: profileId,
          workspaceOrgId,
          name: p.name ?? "",
          title: p.title ?? "",
          avatarUrl,
          heroImageUrl,
          description: p.description ?? "",
          demographics: {
            age: p.demographics?.age ?? null,
            gender: p.demographics?.gender ?? null,
            income: p.demographics?.income ?? null,
            location: p.demographics?.location ?? null,
            education: p.demographics?.education ?? null,
          },
          painPoints: Array.isArray(p.painPoints) ? p.painPoints : [],
          goals: Array.isArray(p.goals) ? p.goals : [],
          channels: Array.isArray(p.channels) ? p.channels : [],
          personas: [],
          order,
          createdAt: now,
          updatedAt: now,
        };
      }),
    );
    const customerProfilesJson = JSON.stringify(profileResults);
    await run("UPDATE workspaces SET customer_profiles = ? WHERE slug = ?", [
      customerProfilesJson,
      slug,
    ]);

    // Generar 100 titulares/headlines para creativos (4U's de Mark Ford, 7-15 palabras).
    let headlinesList = [];
    try {
      const firstProfile = profileResults[0];
      const clientIdealSummary = firstProfile
        ? `${firstProfile.name}, ${firstProfile.title}. ${
            firstProfile.description || ""
          }. Objetivos: ${(firstProfile.goals || [])
            .slice(0, 2)
            .join("; ")}. Dificultades: ${(firstProfile.painPoints || [])
            .slice(0, 2)
            .join("; ")}`.slice(0, 800)
        : "";
      const nicheOrSubniche = [params.companyName, params.headline]
        .filter(Boolean)
        .join(" / ")
        .slice(0, 300);
      const useVoseo =
        profileResults.some((p) =>
          /argentina|uruguay|buenos aires|córdoba|rosario|mendoza|montevideo/i.test(
            String(p.demographics?.location ?? ""),
          ),
        ) ||
        /argentina|uruguay|buenos aires|córdoba|rosario|mendoza|montevideo/i.test(
          knowledgeBaseText.slice(0, 2000),
        );
      headlinesList = await generateHeadlines({
        companyName: params.companyName,
        headline: params.headline,
        knowledgeBaseSummary: knowledgeBaseText.slice(0, 3000),
        clientIdealSummary,
        nicheOrSubniche,
        useVoseo,
      });
      if (headlinesList.length > 0) {
        await run("UPDATE workspaces SET headlines = ? WHERE slug = ?", [
          JSON.stringify(headlinesList),
          slug,
        ]);
        console.log(
          "[Headlines] Saved",
          headlinesList.length,
          "headlines for workspace",
          slug,
        );

        // Campaña de bienvenida: generar 3 creativos automáticamente.
        const brandingSummary = [
          params.companyName,
          params.headline,
          params.personality,
        ]
          .filter(Boolean)
          .join(". ")
          .slice(0, 500);
        let brandingColors = {};
        let referenceImages = [];
        let hasLogoOrImages = false;
        let brandingForCampaigns = {};
        try {
          const brandingRow = await get(
            "SELECT branding FROM workspaces WHERE slug = ?",
            [slug],
          );
          if (brandingRow?.branding) {
            const b = JSON.parse(brandingRow.branding);
            brandingForCampaigns = b;
            brandingColors = b?.colors ?? {};
            hasLogoOrImages = !!(
              b?.logo ||
              (Array.isArray(b?.images) && b.images.length > 0)
            );
            if (b?.logo) {
              const logoUrl = toAbsoluteImageUrl(b.logo);
              if (logoUrl) referenceImages.push({ url: logoUrl });
            }
            if (Array.isArray(b?.images) && referenceImages.length < 2) {
              for (const img of b.images.slice(0, 2 - referenceImages.length)) {
                const u = toAbsoluteImageUrl(
                  typeof img === "string" ? img : img?.url,
                );
                if (u) referenceImages.push({ url: u });
              }
            }
          }
        } catch (_) {}
        const CREATIVE_ASPECT_RATIOS = ["4:5", "1:1", "9:16", "3:4"];
        const WELCOME_CAMPAIGN_COUNT = 3;
        let creativesList = [];
        try {
          const row = await get(
            "SELECT creatives FROM workspaces WHERE slug = ?",
            [slug],
          );
          if (row?.creatives != null && row.creatives !== "")
            creativesList = JSON.parse(row.creatives);
        } catch (_) {}
        const modelUsed = "dall-e-3";
        const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
        const welcomeCreativePromises = [0, 1, 2].map(async (i) => {
          const headlineIndex = i % headlinesList.length;
          const chosenHeadline = headlinesList[headlineIndex];
          const profileIndex =
            profileResults.length > 0 ? i % profileResults.length : 0;
          const profile = profileResults[profileIndex] || null;
          const clientIdealSummary = profile
            ? `${profile.name}, ${profile.title}. ${
                profile.description || ""
              }. Objetivos: ${(profile.goals || [])
                .slice(0, 2)
                .join("; ")}. Dificultades: ${(profile.painPoints || [])
                .slice(0, 2)
                .join("; ")}`.slice(0, 800)
            : "";
          const aspectRatio =
            CREATIVE_ASPECT_RATIOS[i % CREATIVE_ASPECT_RATIOS.length];
          const useLogoThisTime = hasLogoOrImages && i % 2 === 0;
          const imagesForThisCreative = useLogoThisTime ? referenceImages : [];
          try {
            const imagePrompt = await generateCreativeImagePrompt({
              headline: chosenHeadline,
              companyName: params.companyName,
              brandingSummary,
              clientIdealSummary,
              brandingColors,
              hasLogoOrImages: useLogoThisTime,
              aspectRatio,
            });
            const imageDataUrl = await generateCreativeImageSeedream(
              imagePrompt,
              aspectRatio,
              imagesForThisCreative,
              { source: "welcome" },
            );
            if (imageDataUrl) {
              const saved = await saveCreativeImage(
                imageDataUrl,
                slug,
                "creativo",
              );
              if (saved?.urlPath) {
                return {
                  id: crypto.randomUUID(),
                  headline: chosenHeadline,
                  imagePrompt,
                  generationPrompt: imagePrompt,
                  imageUrl: saved.urlPath,
                  createdAt: new Date().toISOString(),
                  model: modelUsed,
                  aspectRatio,
                };
              }
            }
          } catch (creativeErr) {
            console.error(
              "⚠️ Welcome creative",
              i + 1,
              "failed:",
              creativeErr.message,
            );
          }
          return null;
        });
        const welcomeCreatives = (
          await Promise.all(welcomeCreativePromises)
        ).filter(Boolean);
        for (const c of welcomeCreatives) {
          creativesList.push(c);
        }
        if (welcomeCreatives.length > 0) {
          await run("UPDATE workspaces SET creatives = ? WHERE slug = ?", [
            JSON.stringify(creativesList),
            slug,
          ]);
          const campaignsPayload = buildCampaignsFromCreatives(
            creativesList,
            brandingForCampaigns,
            slug,
            baseUrl,
          );
          await run("UPDATE workspaces SET campaigns = ? WHERE slug = ?", [
            JSON.stringify(campaignsPayload),
            slug,
          ]);
          console.log(
            "[Welcome campaign]",
            welcomeCreatives.length,
            "creatives saved for workspace",
            slug,
          );
        }
      }
    } catch (hlErr) {
      console.error("⚠️ Headlines generation failed:", hlErr.message);
    }
  } catch (cpErr) {
    console.error("⚠️ Customer profiles generation failed:", cpErr.message);
  }
}

const MAX_WORKSPACES_FREE = 2;
const MAX_CREATIVES_PER_WORKSPACE_FREE = 3;

export async function createWorkspace(req, res) {
  try {
    const userId = req.user?.id ?? null;
    const isAdmin = req.user?.role === "admin";

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Debes iniciar sesión para crear un workspace.",
      });
    }

    if (!isAdmin && userId) {
      const count = await get(
        "SELECT COUNT(*) as n FROM workspaces WHERE user_id = ?",
        [userId],
      );
      console.log("[createWorkspace] User workspaces count:", {
        userId,
        count: count?.n,
        max: MAX_WORKSPACES_FREE,
        isAdmin,
      });
      if (count && Number(count.n) >= MAX_WORKSPACES_FREE) {
        console.warn("[createWorkspace] User reached max workspaces:", userId);
        return res.status(403).json({
          success: false,
          error: `Los usuarios gratuitos pueden tener como máximo ${MAX_WORKSPACES_FREE} espacios de trabajo. Eliminá uno para crear otro.`,
        });
      }
    }

    const { url, screenshotSlug } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "URL is required",
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid URL",
      });
    }

    const slug = screenshotSlug || generateWorkspaceSlug(url);

    let screenshot = null;
    let screenshotMetadata = {};
    let screenshotPath = null;

    if (screenshotSlug) {
      screenshotPath = path.join(SCREENSHOT_DIR, `${screenshotSlug}.png`);
      if (fs.existsSync(screenshotPath)) {
        const buffer = fs.readFileSync(screenshotPath);
        screenshot = `data:image/png;base64,${buffer.toString("base64")}`;
      }
    } else {
      const screenshotPromise = scrapeWithFirecrawl(url, ["screenshot"]);
      const screenshotData = await screenshotPromise;
      screenshot = screenshotData.screenshot || null;
      screenshotMetadata = screenshotData.metadata || {};
      screenshotPath = await saveScreenshot(screenshot, slug);
    }

    const brandingPromise = scrapeWithFirecrawl(url, ["branding"]);
    const imagesPromise = scrapeWithFirecrawl(url, ["images"]);

    const brandingData = await brandingPromise;
    const branding = brandingData.branding || {};
    const brandingMetadata = brandingData.metadata || {};

    const imagesData = await imagesPromise;
    const allImages = imagesData.images || [];

    const logo = branding?.images?.logo || null;
    const favicon = branding?.images?.favicon || null;
    const ogImage = branding?.images?.ogImage || null;
    const logoAlt = branding?.images?.logoAlt || null;

    const images = Array.from(
      new Set(
        allImages.filter(
          (img) =>
            img &&
            !img.startsWith("data:") &&
            img !== logo &&
            img !== favicon &&
            img !== ogImage,
        ),
      ),
    );

    // Guardar URLs de Firecrawl tal cual; el front las carga/lee directamente
    if (branding.images) {
      delete branding.images;
    }

    const fontFamilies = branding?.typography?.fontFamilies || {};
    const fontPrimary =
      fontFamilies.primary || branding?.fonts?.[0]?.family || null;
    const fontHeading =
      fontFamilies.heading || branding?.fonts?.[1]?.family || null;

    let llmRefined = null;
    const metadata = {
      title: brandingMetadata.title || screenshotMetadata.title || null,
      ogTitle: brandingMetadata.ogTitle || screenshotMetadata.ogTitle || null,
      description:
        brandingMetadata.description || screenshotMetadata.description || null,
      ogDescription:
        brandingMetadata.ogDescription ||
        screenshotMetadata.ogDescription ||
        null,
    };
    const trimForLLM = (str, max = 2000) =>
      typeof str === "string" && str.length > max
        ? str.slice(0, max) + "…"
        : str;
    const brandingForLLM = {
      colors: branding?.colors ?? null,
      companyName: branding?.companyName ?? null,
      name: branding?.name ?? null,
      typography: branding?.typography
        ? { fontFamilies: branding.typography.fontFamilies ?? null }
        : null,
      components: branding?.components
        ? {
            buttonPrimary: branding.components.buttonPrimary ?? null,
            buttonSecondary: branding.components.buttonSecondary ?? null,
            input: branding.components.input ?? null,
          }
        : null,
    };
    const llmInput = {
      url: parsedUrl.href,
      branding: brandingForLLM,
      metadata: {
        ...metadata,
        description: trimForLLM(metadata.description),
        ogDescription: trimForLLM(metadata.ogDescription),
      },
      screenshot,
    };
    console.log("[LLM debug] Calling refineBrandingWithLLM:", {
      url: llmInput.url,
      hasScreenshot: Boolean(screenshot),
    });
    try {
      llmRefined = await refineBrandingWithLLM(llmInput);
      console.log("[LLM debug] refineBrandingWithLLM succeeded");
    } catch (llmError) {
      console.error("⚠️ LLM refinement failed:", llmError.message);
      console.error("[LLM debug] Full error:", {
        name: llmError.name,
        message: llmError.message,
        status: llmError.response?.status,
        responseData: llmError.response?.data
          ? JSON.stringify(llmError.response.data, null, 2)
          : undefined,
        stack: llmError.stack,
      });
    }

    const pickColor = (...values) => values.find((v) => v) || null;

    const useFirecrawlColorsFirst =
      llmRefined?.colors && areColorsTooSimilar(llmRefined.colors);

    const rawColors = useFirecrawlColorsFirst
      ? {
          primary:
            branding?.colors?.primary ?? llmRefined?.colors?.primary ?? null,
          secondary:
            branding?.colors?.secondary ??
            llmRefined?.colors?.secondary ??
            null,
          accent:
            branding?.colors?.accent ?? llmRefined?.colors?.accent ?? null,
          background:
            branding?.colors?.background ??
            llmRefined?.colors?.background ??
            null,
          textPrimary:
            branding?.colors?.textPrimary ??
            llmRefined?.colors?.textPrimary ??
            null,
          textSecondary:
            branding?.colors?.textSecondary ??
            llmRefined?.colors?.textSecondary ??
            null,
        }
      : {
          primary:
            llmRefined?.colors?.primary ?? branding?.colors?.primary ?? null,
          secondary:
            llmRefined?.colors?.secondary ??
            branding?.colors?.secondary ??
            null,
          accent:
            llmRefined?.colors?.accent ?? branding?.colors?.accent ?? null,
          background:
            llmRefined?.colors?.background ??
            branding?.colors?.background ??
            null,
          textPrimary:
            llmRefined?.colors?.textPrimary ??
            branding?.colors?.textPrimary ??
            null,
          textSecondary:
            llmRefined?.colors?.textSecondary ??
            branding?.colors?.textSecondary ??
            null,
        };

    const fallbackPrimary = pickColor(
      rawColors.primary,
      branding?.components?.buttonPrimary?.background,
      rawColors.accent,
      rawColors.textPrimary,
    );

    const fallbackAccent = pickColor(
      rawColors.accent,
      branding?.components?.buttonSecondary?.background,
      rawColors.primary,
    );

    const fallbackSecondary = pickColor(
      rawColors.secondary,
      branding?.components?.buttonSecondary?.background,
      rawColors.accent,
    );

    const fallbackBackground = pickColor(
      rawColors.background,
      branding?.components?.input?.background,
      "#FFFFFF",
    );

    const fallbackTextPrimary = pickColor(
      rawColors.textPrimary,
      branding?.components?.buttonPrimary?.textColor,
      "#000000",
    );

    const fallbackTextSecondary = rawColors.textSecondary ?? null;

    let companyName =
      llmRefined?.companyName ||
      branding.companyName ||
      branding.name ||
      logoAlt ||
      parsedUrl.hostname;
    if (companyName && /^Logo\s+/i.test(String(companyName))) {
      companyName =
        String(companyName)
          .replace(/^Logo\s+/i, "")
          .trim() || companyName;
    }

    let headline = llmRefined?.headline || branding.headline || null;
    if (!headline) {
      const desc =
        brandingMetadata?.description ||
        brandingMetadata?.ogDescription ||
        screenshotMetadata?.description ||
        screenshotMetadata?.ogDescription ||
        "";
      headline = desc
        ? desc.split(/[.!?]/)[0].trim().slice(0, 160) || null
        : null;
    }

    const normalizedBranding = {
      companyName,
      headline,
      websiteUrl: parsedUrl.href,
      confidence: branding?.confidence?.overall ?? null,
      colorScheme: branding.colorScheme || null,
      colors: {
        primary: fallbackPrimary,
        secondary: fallbackSecondary,
        accent: fallbackAccent,
        background: fallbackBackground,
        textPrimary: fallbackTextPrimary,
        textSecondary: fallbackTextSecondary,
      },
      fonts: {
        primary: fontPrimary,
        heading: fontHeading,
      },
      logo,
      personality: branding.personality || null,
      buttons: {
        primary: branding?.components?.buttonPrimary || null,
        secondary: branding?.components?.buttonSecondary || null,
      },
      images,
      language: branding?.language || "es",
      formality: branding?.formality || "neutral",
    };

    const createdAt = Math.floor(Date.now() / 1000);

    // Insertar workspace con branding y responder de inmediato; el resto se hace en segundo plano.
    await run(
      `INSERT INTO workspaces (user_id, slug, url, branding, screenshot_path, knowledge_base, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        slug,
        parsedUrl.href,
        JSON.stringify(normalizedBranding),
        screenshotPath,
        "",
        createdAt,
      ],
    );

    const screenshotUrl = screenshotPath
      ? screenshotPath.startsWith("http")
        ? screenshotPath
        : `/screenshots/${path.basename(screenshotPath)}`
      : null;

    const backgroundParams = {
      userId,
      slug,
      url: parsedUrl.href,
      companyName,
      headline,
      personality: normalizedBranding.personality,
      metadata: {
        title: metadata.title,
        ogTitle: metadata.ogTitle,
        description: metadata.description,
        ogDescription: metadata.ogDescription,
      },
    };

    const shouldRunInline =
      process.env.VERCEL === "1" ||
      process.env.DISABLE_BACKGROUND_JOBS === "1";

    if (shouldRunInline) {
      try {
        await continueWorkspaceCreationInBackground(backgroundParams);
      } catch (err) {
        console.error(
          "❌ Error in workspace inline creation:",
          err.message,
        );
      }
    }

    // Respuesta al cliente: branding y slug siempre disponibles.
    res.status(201).json({
      success: true,
      data: {
        branding: normalizedBranding,
        screenshotUrl,
        slug,
      },
    });

    // En segundo plano cuando no estamos en serverless.
    if (!shouldRunInline) {
      setImmediate(() => {
        continueWorkspaceCreationInBackground(backgroundParams).catch((err) => {
          console.error(
            "❌ Error in workspace background creation:",
            err.message,
          );
        });
      });
    }
  } catch (error) {
    console.error("❌ Error creating workspace:", error.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
