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
  generateSalesAngles,
  generateCreativeImagePrompt,
  getImagePromptFromStructured,
  getFluxPromptFromSpec,
  generateCreativeImageSeedream,
  generateProfileImage,
  expandAngleToVisualSpec,
  analyzeImageToJson,
  normalizeVisualDnaToCreativeSpec,
  refineCreativeSpecWithBranding,
} from "../services/llm.service.js";
import { getReferenceById } from "../db/referenceGalleryDb.js";
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

/** Por el momento no generar avatar/hero en ICP. Activar con DISABLE_ICP_IMAGES=0 para volver a generar. */
function skipIcpImageGeneration() {
  return (process.env.DISABLE_ICP_IMAGES || "1") === "1";
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

/** True si la URL parece ser de una página de producto/landing de ventas. */
function isProductOrLandingUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return (
      /\/products?\//.test(path) ||
      /^\/p\//.test(path) ||
      /\/landing/.test(path) ||
      /\/lp\b/.test(path) ||
      /\/oferta/.test(path) ||
      /\/compra/.test(path)
    );
  } catch (_) {
    return false;
  }
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

/**
 * Plataformas para las que se generan creativos (Meta + LinkedIn + YouTube).
 * Cada una tiene aspect ratio recomendado para ads.
 */
const CREATIVE_PLATFORMS = [
  { platform: "instagram", aspectRatio: "4:5", label: "Instagram" },
  { platform: "threads", aspectRatio: "1:1", label: "Threads" },
  { platform: "linkedin", aspectRatio: "16:9", label: "LinkedIn" },
  { platform: "youtube", aspectRatio: "16:9", label: "YouTube" },
];
const CREATIVE_PLATFORMS_LENGTH = CREATIVE_PLATFORMS.length;

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
  const platformLabel =
    creative.targetPlatformLabel || creative.targetPlatform || platform;
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
    platformLabel,
    targetPlatform: creative.targetPlatform ?? null,
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

/** Devuelve los ángulos de venta del workspace. GET /workspaces/:slug/sales-angles */
export async function getWorkspaceSalesAngles(req, res) {
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
      `SELECT id, sales_angles FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    let angles = [];
    try {
      if (row.sales_angles != null && row.sales_angles !== "") {
        angles = JSON.parse(row.sales_angles);
      }
    } catch (_) {}
    if (!Array.isArray(angles)) angles = [];
    return res.status(200).json({
      success: true,
      data: {
        slug: row.slug,
        angles,
        total: angles.length,
      },
    });
  } catch (error) {
    console.error("❌ Error getting sales angles:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

/** Genera y guarda ángulos de venta para el workspace. POST /workspaces/:slug/sales-angles */
export async function generateWorkspaceSalesAngles(req, res) {
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
      `SELECT id, branding, knowledge_base, customer_profiles FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }
    let branding = {};
    let knowledgeBaseSummary = "";
    let clientIdealSummary = "";
    try {
      if (row.branding != null && row.branding !== "")
        branding = JSON.parse(row.branding);
    } catch (_) {}
    try {
      if (row.knowledge_base != null && row.knowledge_base !== "") {
        const kb = JSON.parse(row.knowledge_base);
        knowledgeBaseSummary =
          typeof kb.summary === "string"
            ? kb.summary
            : (kb.content && typeof kb.content === "string"
                ? kb.content
                : "") || "";
      }
    } catch (_) {}
    try {
      if (row.customer_profiles != null && row.customer_profiles !== "") {
        const profiles = JSON.parse(row.customer_profiles);
        const first =
          Array.isArray(profiles) && profiles[0] ? profiles[0] : null;
        if (first) {
          clientIdealSummary = [
            first.name,
            first.title,
            first.description,
            (first.goals || []).slice(0, 2).join("; "),
            (first.painPoints || []).slice(0, 2).join("; "),
          ]
            .filter(Boolean)
            .join(". ")
            .slice(0, 800);
        }
      }
    } catch (_) {}
    const useVoseo = Boolean(branding?.useVoseo);
    const angles = await generateSalesAngles({
      companyName: branding?.companyName ?? "",
      headline: branding?.headline ?? "",
      knowledgeBaseSummary,
      clientIdealSummary,
      nicheOrSubniche: branding?.nicheOrSubniche ?? "",
      useVoseo,
      contentLanguage: branding?.language || "es-AR",
      branding,
    });
    await run(
      "UPDATE workspaces SET sales_angles = ? WHERE user_id = ? AND slug = ?",
      [JSON.stringify(angles), userId, slug],
    );
    return res.status(200).json({
      success: true,
      data: {
        slug,
        angles,
        total: angles.length,
      },
    });
  } catch (error) {
    console.error("❌ Error generating sales angles:", error.message);
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

    if (skipIcpImageGeneration()) {
      return res.status(200).json({
        success: true,
        data: {
          profile: {
            ...profile,
            avatarUrl: toAbsoluteImageUrl(avatarUrl),
            heroImageUrl: toAbsoluteImageUrl(heroImageUrl),
          },
        },
      });
    }

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

/** Lógica compartida: elimina imágenes ICP del workspace y las regenera con FLUX (OpenRouter). */
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

  if (skipIcpImageGeneration()) {
    return { profiles, deleted: 0 };
  }

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

/** Elimina solo las imágenes (avatar/banner) de los perfiles del workspace y las regenera con FLUX. Los perfiles se mantienen. */
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
    const forAllPlatforms = Boolean(req.body?.forAllPlatforms);
    let count = Math.min(Math.max(Number(req.body?.count) || 1, 1), 10);

    const row = await get(
      `SELECT id, branding, headlines, sales_angles, customer_profiles, creatives FROM workspaces WHERE user_id = ? AND slug = ?`,
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
    let anglesList = [];
    try {
      if (row.sales_angles != null && row.sales_angles !== "") {
        anglesList = JSON.parse(row.sales_angles);
      }
    } catch (_) {}
    if (!Array.isArray(anglesList)) anglesList = [];
    if (!Array.isArray(headlinesList)) headlinesList = [];

    const hasHeadlines = headlinesList.length > 0;
    const hasAngles = anglesList.length > 0;
    // Usar ángulos si el cliente lo pide o si no hay headlines pero sí ángulos
    const useAngles =
      (Boolean(req.body?.useAngles) && hasAngles) ||
      (!hasHeadlines && hasAngles);
    const angleIndices = Array.isArray(req.body?.angleIndices)
      ? req.body.angleIndices
      : null;
    const selectedAngles = useAngles
      ? angleIndices && angleIndices.length > 0
        ? angleIndices.map((i) => anglesList[i]).filter(Boolean)
        : anglesList
      : [];
    if (!useAngles && !hasHeadlines) {
      return res.status(400).json({
        success: false,
        error:
          "No hay headlines ni ángulos de venta. Genera el workspace completo o los ángulos (POST /workspaces/:slug/sales-angles) primero.",
      });
    }
    if (useAngles && selectedAngles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "angleIndices no contiene índices válidos o no hay ángulos.",
      });
    }
    if (forAllPlatforms && !useAngles) {
      return res.status(400).json({
        success: false,
        error: "forAllPlatforms requiere useAngles y ángulos de venta.",
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
    const logoUrl = branding?.logo ? toAbsoluteImageUrl(branding.logo) : null;
    const productUrl = branding?.productImage
      ? toAbsoluteImageUrl(branding.productImage)
      : null;
    const otherUrls = [];
    if (Array.isArray(branding?.images)) {
      const seen = new Set([logoUrl, productUrl].filter(Boolean));
      for (const img of branding.images) {
        const u = toAbsoluteImageUrl(typeof img === "string" ? img : img?.url);
        if (u && !seen.has(u)) {
          seen.add(u);
          otherUrls.push(u);
        }
      }
    }
    const referenceAssets = {
      logo: logoUrl || null,
      product: productUrl || null,
      other: otherUrls,
    };
    const hasLogoOrImages = !!(
      referenceAssets.logo ||
      referenceAssets.product ||
      referenceAssets.other.length > 0
    );

    let profiles = [];
    try {
      if (row.customer_profiles != null && row.customer_profiles !== "") {
        profiles = JSON.parse(row.customer_profiles);
      }
    } catch (_) {}

    const CREATIVE_ASPECT_RATIOS = ["4:5", "1:1", "9:16", "3:4"];

    /** Genera un solo creativo para un ángulo y una plataforma (aspect ratio + targetPlatform). */
    const generateOneCreativeForAngleAndPlatform = async (
      angle,
      platformConfig,
      baseLength,
    ) => {
      const {
        platform: platformSlug,
        aspectRatio,
        label: platformLabel,
      } = platformConfig;
      if (!angle?.hook || !angle?.visual) return null;
      try {
        const spec = await expandAngleToVisualSpec(angle, aspectRatio, {
          referenceAssets: hasLogoOrImages ? referenceAssets : null,
          productDescription:
            branding?.headline || branding?.productDescription || "",
        });
        const promptForImage =
          getFluxPromptFromSpec(spec) || getImagePromptFromStructured(spec);
        const imageDataUrl = await generateCreativeImageSeedream(
          promptForImage,
          aspectRatio,
          hasLogoOrImages ? referenceAssets : null,
        );
        if (!imageDataUrl) return null;
        const saved = await saveCreativeImage(imageDataUrl, slug, "creativo");
        if (!saved?.urlPath) return null;
        const creativeId = crypto.randomUUID();
        const campaignId = crypto.randomUUID();
        const adsetId = crypto.randomUUID();
        const imagePath = saved.urlPath.startsWith("http")
          ? saved.urlPath.replace(/^https?:\/\//, "").replace(/^[^/]+\//, "")
          : saved.urlPath;
        const platform = getPlatformFromAspectRatio(aspectRatio);
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
          headline: angle.hook,
          imagePrompt: spec,
          generationPrompt: spec,
          imageUrl: saved.urlPath,
          image_url: saved.urlPath,
          imagePath,
          image_path: imagePath,
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          model: modelUsed,
          aspectRatio,
          aspect_ratio: aspectRatio,
          version: 1,
          platform,
          targetPlatform: platformSlug,
          targetPlatformLabel: platformLabel,
          parentAdId: null,
          parent_ad_id: null,
          isCurrent: false,
          is_current: false,
          name: null,
          description: null,
          body: angle.hook,
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
          metadata: {
            angleCategory: angle.category,
            angleTitle: angle.title,
            targetPlatform: platformSlug,
          },
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
      } catch (err) {
        console.error("[Creative] Error for", platformSlug, err.message);
        return null;
      }
    };

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
    const maxSlotsFree =
      MAX_CREATIVES_PER_WORKSPACE_FREE - creativesList.length;
    if (!isAdmin) {
      count = forAllPlatforms
        ? Math.min(
            count,
            Math.max(0, Math.floor(maxSlotsFree / CREATIVE_PLATFORMS_LENGTH)),
          )
        : Math.min(count, maxSlotsFree);
      if (count <= 0) {
        return res.status(403).json({
          success: false,
          error: forAllPlatforms
            ? `Límite de creativos alcanzado. Para generar para todas las plataformas necesitás al menos ${CREATIVE_PLATFORMS_LENGTH} slots (${maxSlotsFree} disponibles).`
            : `Los usuarios gratuitos pueden tener como máximo ${MAX_CREATIVES_PER_WORKSPACE_FREE} creativos por workspace.`,
        });
      }
    }

    /** Con forAllPlatforms: count = número de ángulos; total creativos = count × 4 plataformas. */
    const totalToGenerate = forAllPlatforms
      ? count * CREATIVE_PLATFORMS_LENGTH
      : count;

    const modelUsed =
      process.env.OPENROUTER_IMAGE_MODEL || "black-forest-labs/flux.2-max";
    let generated = 0;
    const CREATIVE_CONCURRENCY = 3;

    // Asignación fija de ángulo por índice de creativo (round-robin) para no repetir hasta agotar todos
    const angleIndexForCreative =
      useAngles && !forAllPlatforms
        ? Array.from({ length: count }, (_, i) => i % selectedAngles.length)
        : [];

    const generateOneCreative = async (offsetIndex, baseLength) => {
      const aspectRatio =
        CREATIVE_ASPECT_RATIOS[
          (baseLength + offsetIndex) % CREATIVE_ASPECT_RATIOS.length
        ];
      const platform = getPlatformFromAspectRatio(aspectRatio);
      const version = ((baseLength + offsetIndex) % 3) + 1;

      if (useAngles) {
        // Usar ángulo preasignado por índice para evitar repeticiones en paralelo
        const angleIndex =
          offsetIndex < angleIndexForCreative.length
            ? angleIndexForCreative[offsetIndex]
            : offsetIndex % selectedAngles.length;
        const angle = selectedAngles[angleIndex];
        if (!angle || !angle.hook || !angle.visual) return null;
        try {
          const spec = await expandAngleToVisualSpec(angle, aspectRatio, {
            referenceAssets: hasLogoOrImages ? referenceAssets : null,
            productDescription:
              branding?.headline || branding?.productDescription || "",
          });
          const promptForImage =
            getFluxPromptFromSpec(spec) || getImagePromptFromStructured(spec);
          const imageDataUrl = await generateCreativeImageSeedream(
            promptForImage,
            aspectRatio,
            hasLogoOrImages ? referenceAssets : null,
          );
          if (imageDataUrl) {
            const saved = await saveCreativeImage(
              imageDataUrl,
              slug,
              "creativo",
            );
            if (saved?.urlPath) {
              const creativeId = crypto.randomUUID();
              const campaignId = crypto.randomUUID();
              const adsetId = crypto.randomUUID();
              const imagePath = saved.urlPath.startsWith("http")
                ? saved.urlPath
                    .replace(/^https?:\/\//, "")
                    .replace(/^[^/]+\//, "")
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
                headline: angle.hook,
                imagePrompt: spec,
                generationPrompt: spec,
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
                body: angle.hook,
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
                metadata: {
                  angleCategory: angle.category,
                  angleTitle: angle.title,
                },
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
          console.error(
            "[Creative] Error generating creative from angle:",
            err.message,
          );
        }
        return null;
      }

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
      const useLogoThisTime =
        hasLogoOrImages && (baseLength + offsetIndex) % 2 === 0;
      const assetsForThisCreative = useLogoThisTime ? referenceAssets : null;
      try {
        const creativePromptPayload = await generateCreativeImagePrompt({
          headline: chosenHeadline,
          companyName,
          brandingSummary,
          clientIdealSummary,
          brandingColors: branding?.colors ?? {},
          hasLogoOrImages: useLogoThisTime,
          referenceAssets: assetsForThisCreative,
          aspectRatio,
          contentLanguage: branding?.language || "es-AR",
          branding,
        });
        const promptForImage =
          getFluxPromptFromSpec(creativePromptPayload) ||
          getImagePromptFromStructured(creativePromptPayload);
        const imageDataUrl = await generateCreativeImageSeedream(
          promptForImage,
          aspectRatio,
          assetsForThisCreative,
        );
        if (imageDataUrl) {
          const saved = await saveCreativeImage(imageDataUrl, slug, "creativo");
          if (saved?.urlPath) {
            const creativeId = crypto.randomUUID();
            const campaignId = crypto.randomUUID();
            const adsetId = crypto.randomUUID();
            const imagePath = saved.urlPath.startsWith("http")
              ? saved.urlPath
                  .replace(/^https?:\/\//, "")
                  .replace(/^[^/]+\//, "")
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
              imagePrompt: creativePromptPayload,
              generationPrompt: creativePromptPayload,
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

    if (forAllPlatforms) {
      const anglesToUse = selectedAngles.slice(0, count);
      const tasks = [];
      for (const angle of anglesToUse) {
        for (const platformConfig of CREATIVE_PLATFORMS) {
          tasks.push({ angle, platformConfig });
        }
      }
      const cappedTasks = tasks.slice(0, totalToGenerate);
      for (let i = 0; i < cappedTasks.length; i += CREATIVE_CONCURRENCY) {
        const chunk = cappedTasks.slice(i, i + CREATIVE_CONCURRENCY);
        const results = await Promise.all(
          chunk.map(({ angle, platformConfig }) =>
            generateOneCreativeForAngleAndPlatform(
              angle,
              platformConfig,
              creativesList.length,
            ),
          ),
        );
        for (const creative of results) {
          if (creative) {
            creativesList.push(creative);
            generated++;
            console.log(
              "[Creative] Generated",
              creative.targetPlatformLabel || creative.targetPlatform,
              "creative",
              generated,
              "for workspace",
              slug,
            );
          }
        }
      }
    } else {
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
 * Clona un anuncio de referencia con la marca del workspace.
 * POST /workspaces/:slug/clone-reference body: { referenceId: string }
 * 1) Analiza la imagen de referencia (Visual DNA), 2) Genera un creativo con la misma composición pero logo/producto del workspace.
 */
export async function cloneReference(req, res) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { slug } = req.params;
    const { referenceId } = req.body || {};
    if (!referenceId || typeof referenceId !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Se requiere referenceId en el body." });
    }
    const reference = await getReferenceById(referenceId.trim());
    if (!reference?.imageUrl) {
      return res
        .status(404)
        .json({ success: false, error: "Referencia no encontrada." });
    }

    const row = await get(
      `SELECT id, user_id, branding, creatives FROM workspaces WHERE user_id = ? AND slug = ?`,
      [userId, slug],
    );
    if (!row) {
      return res
        .status(404)
        .json({ success: false, error: "Workspace not found" });
    }

    let creativesList = [];
    try {
      if (row.creatives != null && row.creatives !== "")
        creativesList = JSON.parse(row.creatives);
    } catch (_) {}
    if (!Array.isArray(creativesList)) creativesList = [];

    const MAX_FREE = 3;
    if (!isAdmin && creativesList.length >= MAX_FREE) {
      return res.status(403).json({
        success: false,
        error: `Límite de creativos alcanzado (máx. ${MAX_FREE}). Cloná desde un workspace con menos creativos.`,
      });
    }

    let branding = {};
    try {
      if (row.branding != null && row.branding !== "")
        branding = JSON.parse(row.branding);
    } catch (_) {}

    const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
    const logoUrl = branding?.logo ? toAbsoluteImageUrl(branding.logo) : null;
    const productUrl = branding?.productImage
      ? toAbsoluteImageUrl(branding.productImage)
      : null;
    const otherUrls = [];
    if (Array.isArray(branding?.images)) {
      const seen = new Set([logoUrl, productUrl].filter(Boolean));
      for (const img of branding.images) {
        const u = toAbsoluteImageUrl(typeof img === "string" ? img : img?.url);
        if (u && !seen.has(u)) {
          seen.add(u);
          otherUrls.push(u);
        }
      }
    }
    const referenceAssets = {
      logo: logoUrl || null,
      product: productUrl || null,
      other: otherUrls.slice(0, 3),
    };

    let spec;
    if (
      reference.generationPrompt &&
      typeof reference.generationPrompt === "string"
    ) {
      try {
        const parsed = JSON.parse(reference.generationPrompt);
        if (parsed && typeof parsed === "object" && parsed.meta_parameters) {
          spec = parsed;
        }
      } catch (_) {}
    }

    if (!spec) {
      console.log("[Clone] Analyzing image for Visual DNA...");
      const visualDna = await analyzeImageToJson(reference.imageUrl);
      spec = normalizeVisualDnaToCreativeSpec(visualDna, {
        companyName: branding?.companyName,
        primary: branding?.primary,
        headline: branding?.headline,
      });
    }

    // Refine the spec with branding (Intelligent asset replacement)
    console.log("[Clone] Refining spec with brand identity...");
    try {
      spec = await refineCreativeSpecWithBranding(spec, {
        companyName: branding?.companyName,
        primary: branding?.primary,
        headline: branding?.headline || reference.category || "Clonado",
        contentLanguage: branding?.language || "es-AR",
      });
    } catch (err) {
      console.warn(
        "[Clone] Refinement failed, using original spec with appended instructions:",
        err.message,
      );
      // Fallback: append basic instructions if refinement fails
      if (spec.generative_reconstruction) {
        const repl =
          " CRITICAL: Replace any product/logo/text with the user's brand assets. Use brand colors.";
        spec.generative_reconstruction.dalle_flux_natural_prompt =
          (spec.generative_reconstruction.dalle_flux_natural_prompt || "") +
          repl;
      }
    }
    const aspectRatio = spec.meta_parameters?.aspect_ratio || "4:5";
    const promptForImage =
      getFluxPromptFromSpec(spec) || getImagePromptFromStructured(spec);
    const imageDataUrl = await generateCreativeImageSeedream(
      promptForImage,
      aspectRatio,
      referenceAssets.logo ||
        referenceAssets.product ||
        referenceAssets.other?.length
        ? referenceAssets
        : null,
    );
    if (!imageDataUrl) {
      return res.status(502).json({
        success: false,
        error: "No se pudo generar la imagen. Reintentá más tarde.",
      });
    }
    const saved = await saveCreativeImage(imageDataUrl, slug, "creativo");
    if (!saved?.urlPath) {
      return res.status(500).json({
        success: false,
        error: "Error al guardar la imagen.",
      });
    }

    const creativeId = crypto.randomUUID();
    const campaignId = crypto.randomUUID();
    const adsetId = crypto.randomUUID();
    const imagePath = saved.urlPath.startsWith("http")
      ? saved.urlPath.replace(/^https?:\/\//, "").replace(/^[^/]+\//, "")
      : saved.urlPath;
    const modelUsed =
      process.env.OPENROUTER_IMAGE_MODEL || "black-forest-labs/flux.2-max";
    const creative = {
      id: creativeId,
      adsetId,
      adset_id: adsetId,
      campaignId,
      campaign_id: campaignId,
      orgId: slug,
      org_id: slug,
      baseAdId: creativeId,
      base_ad_id: creativeId,
      headline: reference.category || "Clonado de referencia",
      imagePrompt: spec,
      generationPrompt: spec,
      imageUrl: saved.urlPath,
      image_url: saved.urlPath,
      imagePath,
      image_path: imagePath,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      model: modelUsed,
      aspectRatio,
      aspect_ratio: aspectRatio,
      version: 1,
      platform: getPlatformFromAspectRatio(aspectRatio),
      parentAdId: null,
      parent_ad_id: null,
      isCurrent: false,
      is_current: false,
      referenceId: reference.id,
      reference_image_url: reference.imageUrl,
      metadata: {
        source: "reference_gallery",
        referenceCategory: reference.category,
      },
      status: "succeeded",
    };
    creativesList.push(creative);

    await run("UPDATE workspaces SET creatives = ? WHERE slug = ?", [
      JSON.stringify(creativesList),
      slug,
    ]);

    return res.status(200).json({ success: true, data: creative });
  } catch (error) {
    console.error("❌ Error cloning reference:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Error al clonar la referencia.",
    });
  }
}

/**
 * Genera un solo creativo a partir de un sales angle (por slug, para scripts).
 * @param {string} slug - workspace slug
 * @param {number} [angleIndex=0] - índice del ángulo en sales_angles
 * @returns {Promise<{ ok: boolean, creative?: object, total?: number, error?: string }>}
 */
export async function generateOneCreativeFromAngleBySlug(slug, angleIndex = 0) {
  const row = await get(
    "SELECT user_id, branding, sales_angles, creatives FROM workspaces WHERE slug = ?",
    [slug],
  );
  if (!row) return { ok: false, error: "Workspace not found" };
  let anglesList = [];
  try {
    if (row.sales_angles != null && row.sales_angles !== "")
      anglesList = JSON.parse(row.sales_angles);
  } catch (_) {}
  if (!Array.isArray(anglesList) || anglesList.length === 0)
    return { ok: false, error: "No sales angles" };
  const angle = anglesList[angleIndex] ?? anglesList[0];
  if (!angle || !angle.hook || !angle.visual)
    return { ok: false, error: "Invalid angle (hook and visual required)" };
  let branding = {};
  try {
    if (row.branding != null && row.branding !== "")
      branding = JSON.parse(row.branding);
  } catch (_) {}
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const logoUrl = branding?.logo ? toAbsoluteImageUrl(branding.logo) : null;
  const productUrl = branding?.productImage
    ? toAbsoluteImageUrl(branding.productImage)
    : null;
  const otherUrls = [];
  if (Array.isArray(branding?.images)) {
    const seen = new Set([logoUrl, productUrl].filter(Boolean));
    for (const img of branding.images) {
      const u = toAbsoluteImageUrl(typeof img === "string" ? img : img?.url);
      if (u && !seen.has(u)) {
        seen.add(u);
        otherUrls.push(u);
      }
    }
  }
  const referenceAssets = {
    logo: logoUrl || null,
    product: productUrl || null,
    other: otherUrls.slice(0, 3),
  };
  const hasLogoOrImages = !!(
    referenceAssets.logo ||
    referenceAssets.product ||
    referenceAssets.other.length > 0
  );
  const aspectRatio = "4:5";
  const modelUsed =
    process.env.OPENROUTER_IMAGE_MODEL || "black-forest-labs/flux.2-max";
  let creativesList = [];
  try {
    if (row.creatives != null && row.creatives !== "")
      creativesList = JSON.parse(row.creatives);
  } catch (_) {}
  if (!Array.isArray(creativesList)) creativesList = [];

  try {
    const spec = await expandAngleToVisualSpec(angle, aspectRatio, {
      referenceAssets: hasLogoOrImages ? referenceAssets : null,
      productDescription:
        branding?.headline || branding?.productDescription || "",
    });
    const promptForImage =
      getFluxPromptFromSpec(spec) || getImagePromptFromStructured(spec);
    const imageDataUrl = await generateCreativeImageSeedream(
      promptForImage,
      aspectRatio,
      hasLogoOrImages ? referenceAssets : null,
    );
    if (!imageDataUrl)
      return { ok: false, error: "Image generation returned null" };
    const saved = await saveCreativeImage(imageDataUrl, slug, "creativo");
    if (!saved?.urlPath)
      return { ok: false, error: "saveCreativeImage returned null" };

    const creativeId = crypto.randomUUID();
    const campaignId = crypto.randomUUID();
    const adsetId = crypto.randomUUID();
    const imagePath = saved.urlPath.startsWith("http")
      ? saved.urlPath.replace(/^https?:\/\//, "").replace(/^[^/]+\//, "")
      : saved.urlPath;
    const creative = {
      id: creativeId,
      adsetId,
      adset_id: adsetId,
      campaignId,
      campaign_id: campaignId,
      orgId: slug,
      org_id: slug,
      baseAdId: creativeId,
      base_ad_id: creativeId,
      headline: angle.hook,
      imagePrompt: spec,
      generationPrompt: spec,
      imageUrl: saved.urlPath,
      image_url: saved.urlPath,
      imagePath,
      image_path: imagePath,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      model: modelUsed,
      aspectRatio,
      aspect_ratio: aspectRatio,
      version: 1,
      platform: getPlatformFromAspectRatio(aspectRatio),
      parentAdId: null,
      parent_ad_id: null,
      isCurrent: false,
      is_current: false,
      name: null,
      description: null,
      body: angle.hook,
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
      metadata: { angleCategory: angle.category, angleTitle: angle.title },
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdBy: row.user_id,
      created_by: row.user_id,
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
    creativesList.push(creative);
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
    return { ok: true, creative, total: creativesList.length };
  } catch (err) {
    console.error("[generateOneCreativeFromAngleBySlug]", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Devuelve los creativos del workspace en formato "versions" (compatible con Aura Studio).
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
        const imagePath =
          c.imagePath ||
          (c.imageUrl?.startsWith("http")
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
      "[Background] No customer profiles generated, skipping sales angles and creatives",
    );
    return;
  }

  try {
    const now = new Date().toISOString();
    const workspaceOrgId = slug ? `ws_${slug}` : "";
    const skipImages = skipIcpImageGeneration();
    const profileResults = await Promise.all(
      rawProfiles.map(async (p, order) => {
        const profileId = crypto.randomUUID();
        let avatarUrl = null;
        let heroImageUrl = null;
        if (!skipImages) {
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
          avatarUrl = avatarPath
            ? avatarPath.startsWith("http")
              ? avatarPath
              : `/icp-avatars/${path.basename(avatarPath)}`
            : null;
          heroImageUrl = heroPath
            ? heroPath.startsWith("http")
              ? heroPath
              : `/icp-heroes/${path.basename(heroPath)}`
            : null;
        }
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

    // Flujo: ICP → sales angles → creativos (sin headlines).
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

    // Ángulos de venta (sales angles).
    let anglesList = [];
    try {
      anglesList = await generateSalesAngles({
        companyName: params.companyName,
        headline: params.headline,
        knowledgeBaseSummary: knowledgeBaseText.slice(0, 2500),
        clientIdealSummary,
        nicheOrSubniche,
        useVoseo,
        contentLanguage: params.branding?.language || "es-AR",
        branding: params.branding,
      });
      if (anglesList.length > 0) {
        await run("UPDATE workspaces SET sales_angles = ? WHERE slug = ?", [
          JSON.stringify(anglesList),
          slug,
        ]);
        console.log(
          "[Sales angles] Saved",
          anglesList.length,
          "angles for workspace",
          slug,
        );
      }
    } catch (anglesErr) {
      console.warn("⚠️ Sales angles generation failed:", anglesErr.message);
    }

    // Campaña de bienvenida: 3 creativos a partir de ángulos (angle.hook = headline del creativo).
    if (anglesList.length > 0) {
      const brandingSummary = [
        params.companyName,
        params.headline,
        params.personality,
      ]
        .filter(Boolean)
        .join(". ")
        .slice(0, 500);
      let brandingColors = {};
      let referenceAssetsCampaign = { logo: null, product: null, other: [] };
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
          const logoUrl = b?.logo ? toAbsoluteImageUrl(b.logo) : null;
          const productUrl = b?.productImage
            ? toAbsoluteImageUrl(b.productImage)
            : null;
          const otherUrls = [];
          if (Array.isArray(b?.images)) {
            const seen = new Set([logoUrl, productUrl].filter(Boolean));
            for (const img of b.images) {
              const u = toAbsoluteImageUrl(
                typeof img === "string" ? img : img?.url,
              );
              if (u && !seen.has(u)) {
                seen.add(u);
                otherUrls.push(u);
              }
            }
          }
          const otherCapped = (otherUrls || []).slice(0, 3);
          referenceAssetsCampaign = {
            logo: logoUrl || null,
            product: productUrl || null,
            other: otherCapped,
          };
          hasLogoOrImages = !!(
            referenceAssetsCampaign.logo ||
            referenceAssetsCampaign.product ||
            referenceAssetsCampaign.other.length > 0
          );
        }
      } catch (_) {}
      const CREATIVE_ASPECT_RATIOS = ["4:5", "1:1", "9:16", "3:4"];
      let creativesList = [];
      try {
        const row = await get(
          "SELECT creatives FROM workspaces WHERE slug = ?",
          [slug],
        );
        if (row?.creatives != null && row.creatives !== "")
          creativesList = JSON.parse(row.creatives);
      } catch (_) {}
      const modelUsed =
        process.env.OPENROUTER_IMAGE_MODEL || "black-forest-labs/flux.2-max";
      const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
      // Usar solo ángulos únicos (hasta 3) para no repetir creativos/imágenes por ángulo
      const anglesForWelcome = anglesList.slice(0, 3);
      const welcomeCreativePromises = anglesForWelcome.map(async (angle, i) => {
        const chosenHeadline = angle?.hook ?? "";
        if (!chosenHeadline) return null;
        const profileIndex =
          profileResults.length > 0 ? i % profileResults.length : 0;
        const profile = profileResults[profileIndex] || null;
        const clientIdealSummaryForCreative = profile
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
        const assetsForThisCreative = useLogoThisTime
          ? referenceAssetsCampaign
          : null;
        try {
          const creativePromptPayload = await generateCreativeImagePrompt({
            headline: chosenHeadline,
            companyName: params.companyName,
            brandingSummary,
            clientIdealSummary: clientIdealSummaryForCreative,
            brandingColors,
            hasLogoOrImages: useLogoThisTime,
            referenceAssets: assetsForThisCreative,
            aspectRatio,
            contentLanguage: params.branding?.language || "es-AR",
            branding: params.branding,
          });
          const promptForImage =
            getFluxPromptFromSpec(creativePromptPayload) ||
            getImagePromptFromStructured(creativePromptPayload);
          const imageDataUrl = await generateCreativeImageSeedream(
            promptForImage,
            aspectRatio,
            assetsForThisCreative,
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
                imagePrompt: creativePromptPayload,
                generationPrompt: creativePromptPayload,
                imageUrl: saved.urlPath,
                createdAt: new Date().toISOString(),
                model: modelUsed,
                aspectRatio,
              };
            }
            console.warn(
              "[Welcome campaign] Creative",
              i + 1,
              "image generated but saveCreativeImage returned null",
            );
          } else {
            console.warn(
              "[Welcome campaign] Creative",
              i + 1,
              "image generation returned null",
            );
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
        try {
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
        } catch (dbErr) {
          console.error(
            "⚠️ Failed to persist creatives/campaigns to DB:",
            dbErr.message,
          );
        }
      } else {
        console.warn(
          "[Welcome campaign] No creatives to save for workspace",
          slug,
        );
      }
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

    const scrapeData = await scrapeWithFirecrawl(url, ["branding", "images"]);
    const branding = scrapeData.branding || {};
    const brandingMetadata = scrapeData.metadata || {};
    const allImages = scrapeData.images || [];

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

    // En páginas de producto/landing: identificar imagen del producto (para mockups y creativos)
    let productImage = null;
    if (isProductOrLandingUrl(parsedUrl.href)) {
      productImage = ogImage || (images.length > 0 ? images[0] : null);
      if (productImage) {
        console.log(
          "[createWorkspace] Product/landing URL: using product image for reference",
          productImage.slice(0, 80) + "...",
        );
      }
    }

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

    const tempCompanyName =
      llmRefined?.companyName ||
      branding.companyName ||
      branding.name ||
      logoAlt ||
      parsedUrl.hostname;

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
      productImage: productImage || null,
      personality: branding.personality || null,
      buttons: {
        primary: branding?.components?.buttonPrimary || null,
        secondary: branding?.components?.buttonSecondary || null,
      },
      images,
      language: llmRefined?.language ?? branding?.language ?? "es-AR",
      formality: branding?.formality || "neutral",
    };

    const createdAt = Math.floor(Date.now() / 1000);

    // Insertar workspace con branding
    await run(
      `INSERT INTO workspaces (user_id, slug, url, branding, screenshot_path, knowledge_base, clerk_org_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        slug,
        parsedUrl.href,
        JSON.stringify(normalizedBranding),
        screenshotPath,
        "",
        null,
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
      branding: normalizedBranding,
      metadata: {
        title: metadata.title,
        ogTitle: metadata.ogTitle,
        description: metadata.description,
        ogDescription: metadata.ogDescription,
      },
    };

    const shouldRunInline =
      process.env.VERCEL === "1" || process.env.DISABLE_BACKGROUND_JOBS === "1";

    if (shouldRunInline) {
      try {
        await continueWorkspaceCreationInBackground(backgroundParams);
      } catch (err) {
        console.error("❌ Error in workspace inline creation:", err.message);
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
          if (err.response) {
            console.error("[debug] Response status:", err.response.status);
            console.error(
              "[debug] Response data:",
              JSON.stringify(err.response.data, null, 2),
            );
          }
          if (err.stack) console.error("[debug] Stack:", err.stack);
        });
      });
    }
  } catch (error) {
    // Debug: detalle completo del error
    console.error("❌ Error creating workspace:", error.message);
    if (error.response) {
      console.error("[debug] Response status:", error.response.status);
      console.error(
        "[debug] Response data:",
        JSON.stringify(error.response.data, null, 2),
      );
    }
    if (error.stack) {
      console.error("[debug] Stack:", error.stack);
    }
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      ...(process.env.NODE_ENV !== "production" && {
        debug: {
          message: error.message,
          ...(error.response && {
            status: error.response.status,
            data: error.response.data,
          }),
        },
      }),
    });
  }
}
