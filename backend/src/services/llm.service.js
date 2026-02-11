import crypto from "crypto";
import axios from "axios";
import { recordLLMRequest, recordImageGeneration } from "./metrics.service.js";

/**
 * Quita bloques markdown ```json ... ``` o ``` ... ``` del texto antes de parsear JSON.
 * @param {string} raw
 * @returns {string}
 */
function stripMarkdownJson(raw) {
  if (!raw || typeof raw !== "string") return raw;
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  return s.trim();
}

/**
 * Reemplaza caracteres de control (U+0000–U+001F) que aparecen dentro de strings JSON por espacio,
 * para evitar "Bad control character in string literal" al hacer JSON.parse.
 * @param {string} str - JSON en texto (p. ej. después de stripMarkdownJson)
 * @returns {string}
 */
function sanitizeJsonControlChars(str) {
  if (!str || typeof str !== "string") return str;
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const code = c.charCodeAt(0);
    if (escape) {
      out += c;
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      out += c;
      escape = true;
      continue;
    }
    if (c === '"' && !escape) {
      inString = !inString;
      out += c;
      continue;
    }
    if (inString && code >= 0 && code <= 31) {
      out += " ";
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Gemma (Google) no admite role "system" ("developer instruction").
 * Para modelos Gemma, fusiona el system en el primer mensaje user.
 * @param {string} model - id del modelo (ej. google/gemma-3-12b-it:free)
 * @param {string} systemText - contenido del system message (opcional)
 * @param {string|Array} userContent - contenido user: string o array multimodal [{ type, text }, { type: "image_url", ... }]
 */
function messagesForModel(model, systemText, userContent) {
  const isGemma = /gemma/i.test(String(model || ""));
  if (isGemma && systemText) {
    if (Array.isArray(userContent)) {
      const textPart = userContent.find((p) => p.type === "text");
      const otherParts = userContent.filter((p) => p.type !== "text");
      const combinedText =
        systemText + "\n\n---\n\nInput:\n" + (textPart?.text ?? "");
      return [
        {
          role: "user",
          content: [{ type: "text", text: combinedText }, ...otherParts],
        },
      ];
    }
    return [
      {
        role: "user",
        content: systemText + "\n\n---\n\nInput:\n" + userContent,
      },
    ];
  }
  const messages = [];
  if (systemText) messages.push({ role: "system", content: systemText });
  messages.push({ role: "user", content: userContent });
  return messages;
}

/**
 * Convierte mensajes construidos para otro modelo a formato válido para `model`.
 * Si model es Gemma y hay rol system, lo fusiona en el primer user (Gemma no admite system).
 */
function normalizeMessagesForModel(messages, model) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  const isGemma = /gemma/i.test(String(model || ""));
  if (!isGemma) return messages;
  const systemMsg = messages.find((m) => m.role === "system");
  const userMsg = messages.find((m) => m.role === "user");
  if (!systemMsg || !userMsg) return messages;
  const combined =
    (typeof systemMsg.content === "string" ? systemMsg.content : "") +
    "\n\n---\n\nInput:\n" +
    (Array.isArray(userMsg.content)
      ? (userMsg.content.find((p) => p.type === "text")?.text ?? "")
      : String(userMsg.content ?? ""));
  return [
    {
      role: "user",
      content:
        typeof userMsg.content === "object" && Array.isArray(userMsg.content)
          ? [
            { type: "text", text: combined },
            ...userMsg.content.filter((p) => p.type !== "text"),
          ]
          : combined,
    },
  ];
}

/**
 * Modelo único para texto/visión (branding, knowledge, perfiles, headlines, ángulos, creativos).
 * Por defecto: gemini-2.0-flash-lite-preview-02-05.
 */
function getTextModel() {
  return "gemini-2.0-flash-lite-preview-02-05";
}

function getKnowledgeBaseModel() {
  return getTextModel();
}

function getProfilesModel() {
  return getTextModel();
}

function getHeadlinesModel() {
  return getTextModel();
}

/**
 * Modelo para tareas creativas: sales angles y prompts de imagen (visual spec).
 * Por defecto: gemini-2.0-flash-lite-preview-02-05.
 */
function getCreativeModel() {
  return "gemini-2.0-flash-lite-preview-02-05";
}

const BRAND_ADAPT_SYSTEM_PROMPT = `You are a Senior Creative Director and Prompt Engineer.
Your goal is to adapt a "Visual DNA" (Creative Spec) from a reference advertisement to a specific brand.

RULES:
1. Replace ANY specific original brands, logos, or unique product features from the reference with the NEW brand's information.
2. Use generic but descriptive terms for the brand's assets:
   - Instead of "Nike logo", use "BRAND LOGO".
   - Instead of "Coca-Cola bottle", use "BRAND PRODUCT".
3. Integrate the new brand's colors and headline into the visual description.
4. Maintain the same camera angle, lighting, mood, and composition as the reference.
5. If the reference is in a different language, translate the visual descriptions to English, but keep the visible AD COPY in the requested content language.
6. The output MUST be a valid JSON object following the IMG-2-JSON-V4 structure.
7. Focus heavily on rewriting 'dalle_flux_natural_prompt' and 'midjourney_prompt' in 'generative_reconstruction'.`;

/** True si el modelo soporta entrada multimodal (imagen). */
function modelSupportsVision(model) {
  const m = String(model || "").toLowerCase();
  return /gemma|gpt-4|claude|vision|multimodal/i.test(m);
}

/**
 * Content language for ad copy: main language of the website.
 * Fallback: Spanish (Argentina). Used so visible ad text is never in the wrong language.
 * @param {{ language?: string } | string} brandingOrLang - branding object with .language or a language code string
 * @returns {string} - e.g. "es-AR", "es", "en"
 */
export function getContentLanguage(brandingOrLang) {
  const raw =
    typeof brandingOrLang === "string"
      ? brandingOrLang
      : brandingOrLang?.language;
  const code = (raw && String(raw).trim()) || "";
  if (code) return code;
  return "es-AR";
}

/** Modelo de respaldo en caso de 429 (rate limit). */
function getTextModelFallback() {
  return "gemini-2.0-flash-lite-preview-02-05";
}

const VERTEX_MODEL_URL = process.env.VERTEX_MODEL_URL;
const VERTEX_API_KEY = process.env.VERTEX_API_KEY;
const VERTEX_IMAGEN_URL = process.env.VERTEX_IMAGEN_URL;
const VERTEX_IMAGEN_MODEL = process.env.VERTEX_IMAGEN_MODEL || "imagen-3.0-generate-001";

/**
 * Genera una imagen corporativa/creativa usando Vertex AI Imagen 3.
 * @param {string} prompt - Prompt en inglés.
 * @param {string} aspectRatio - "1:1", "9:16", "16:9", "4:3", "3:4".
 * @returns {Promise<string|null>} - data URL base64.
 */
async function vertexImagePost(prompt, aspectRatio = "1:1") {
  // Imagen 3 supports specific ratios
  const allowed = ["1:1", "9:16", "16:9", "4:3", "3:4"];
  // Map some common variations
  let ratio = aspectRatio;
  if (ratio === "4:5") ratio = "3:4";
  if (ratio === "21:9") ratio = "16:9";
  if (!allowed.includes(ratio)) ratio = "1:1";

  const url = `${VERTEX_IMAGEN_URL}?key=${VERTEX_API_KEY}`;
  const body = {
    instances: [
      {
        prompt: prompt,
      }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: ratio,
      outputOptions: {
        mimeType: "image/png"
      }
    }
  };

  try {
    const response = await axios.post(url, body);
    const prediction = response.data?.predictions?.[0];
    if (prediction?.bytesBase64Encoded) {
      return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
    }
    console.warn("[LLM] Vertex Imagen: No image in response", response.data);
    return null;
  } catch (err) {
    console.error("[LLM] Vertex Imagen error:", err.response?.data || err.message);
    return null;
  }
}

/**
 * Mapea mensajes formato OpenAI a formato Vertex AI (Gemini).
 */
function mapMessagesToVertex(messages) {
  const contents = [];
  let systemInstruction = null;

  for (const m of messages) {
    if (m.role === "system") {
      systemInstruction = {
        parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
      };
    } else {
      const role = m.role === "assistant" ? "model" : "user";
      const parts = [];
      if (Array.isArray(m.content)) {
        for (const p of m.content) {
          if (p.type === "text") {
            parts.push({ text: p.text });
          } else if (p.type === "image_url") {
            // Vertex requiere base64 directo o GCS. Si es data:image, lo extraemos.
            const url = p.image_url?.url || "";
            if (url.startsWith("data:")) {
              const [header, data] = url.split(",");
              const mimeType = header.split(";")[0].split(":")[1];
              parts.push({
                inlineData: {
                  mimeType,
                  data
                }
              });
            } else {
              // Si no es base64, intentamos pasarlo como texto o ignoramos si Vertex no llega a la URL
              parts.push({ text: `[Image Reference: ${url}]` });
            }
          }
        }
      } else {
        parts.push({ text: String(m.content) });
      }
      contents.push({ role, parts });
    }
  }
  return { contents, systemInstruction };
}

/**
 * POST a Vertex AI. Maneja el stream o respuesta única mapeando a formato OpenAI.
 */
async function vertexChatPost(requestBody) {
  const { contents, systemInstruction } = mapMessagesToVertex(requestBody.messages);

  const vertexBody = {
    contents,
    systemInstruction,
    generationConfig: {
      temperature: requestBody.temperature ?? 0.2,
      maxOutputTokens: requestBody.max_tokens ?? 2048,
      responseMimeType: requestBody.response_format?.type === "json_object" ? "application/json" : "text/plain",
    }
  };

  const url = `${VERTEX_MODEL_URL}?key=${VERTEX_API_KEY}`;

  try {
    const response = await axios.post(url, vertexBody);

    // Si la URL es de stream, los datos vienen en un array de chunks
    let fullText = "";
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_cost: 0 };

    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        fullText += chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (chunk.usageMetadata) {
          usage.prompt_tokens = chunk.usageMetadata.promptTokenCount || usage.prompt_tokens;
          usage.completion_tokens = chunk.usageMetadata.candidatesTokenCount || usage.completion_tokens;
        }
      }
    } else {
      fullText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (response.data.usageMetadata) {
        usage.prompt_tokens = response.data.usageMetadata.promptTokenCount;
        usage.completion_tokens = response.data.usageMetadata.candidatesTokenCount;
      }
    }

    // Adaptar respuesta al formato que espera el resto del código (OpenAI-like)
    return {
      modelUsed: requestBody.model,
      response: {
        data: {
          choices: [{ message: { content: fullText } }],
          usage: {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_cost: 0 // Vertex no devuelve costo directo fácilmente
          }
        }
      }
    };
  } catch (err) {
    console.error("[LLM] Vertex error:", err.response?.data || err.message);
    throw err;
  }
}

export async function refineBrandingWithLLM(input) {
  const model = getTextModel();

  const buildUserContent = (includeScreenshot) => {
    const { screenshot, ...inputWithoutScreenshot } = input;
    const text = JSON.stringify(inputWithoutScreenshot);
    const content = [{ type: "text", text }];
    if (includeScreenshot && screenshot) {
      content.push({
        type: "image_url",
        image_url: { url: screenshot },
      });
    }
    return content;
  };

  const brandingSystemPrompt = `You are a prompt engineer and branding expert. Use the Firecrawl extraction data (see Firecrawl LLM Extract patterns) and the screenshot image to reliably EXTRACT the site's palette and key text. Use XML-style tags in your reasoning/examples to clarify fields, but return ONLY the required JSON as the final output.

IMPORTANT RULES:
- Do not invent or hardcode colors. Return only colors you can identify from the site's HTML/CSS or the screenshot image.
- Prefer colors detected in the screenshot when available. If there is no evidence for a color, return null.
- All color values must be valid HEX (3 or 6 digits, e.g. #FFF or #1A2B3C). If unsure, return null.
- Preserve the original language for the company name and headline: return 'companyName' and 'headline' exactly as they appear on the site or screenshot (do NOT translate them).
- companyName: extract the brand or business name only. If the only source says "Logo X" or "Logo - X", return only "X" (never include the word "Logo" in companyName).
- headline: extract ONLY the short main tagline or hero phrase visible on the site/screenshot (one short sentence, under ~15 words). Do NOT use the long meta description or og:description as headline — those are for fallback elsewhere. If no short tagline is visible, return null.

XML TAG GUIDELINE (for your internal parsing / examples only):
Use tags like <companyName>, <headline>, <colors><primary>, <secondary>, <accent>, <background>, <textPrimary>, <textSecondary></colors> when showing examples or explaining extraction. Example input (from Firecrawl):
<firecrawl>
  <metadata>
    <title>...</title>
    <ogTitle>...</ogTitle>
    <description>...</description>
  </metadata>
  <detectedColors>
    <color role="buttonPrimary">#HEX</color>
    <color role="background">#HEX</color>
  </detectedColors>
</firecrawl>

SPECIFIC COLOR RULES (each role must be a DISTINCT color):
- <primary>: main CTA/button color (e.g. blue or brand color).
- <secondary>: a NEUTRAL gray or muted color for secondary UI — must NOT be the same hex as primary. If the site only has one blue, do not use it for both; use one gray from the page or null for secondary.
- <accent>: a DIFFERENT emphasis color (e.g. green for success, orange) — must NOT equal primary or secondary. If you only see one dominant color, set accent to null.
- <background>: page background; <textPrimary>, <textSecondary>: text colors.
Return null for any role you cannot identify with a clearly distinct hex. Prefer Firecrawl-detected colors from the input when they are distinct.

VALIDATION:
- All returned colors must be valid hex strings or null.
- primary, secondary, and accent must be three DIFFERENT hex values (or null). Never return the same or nearly identical hex for two of them.
- If in doubt, return null for secondary or accent rather than duplicating primary.

OUTPUT (MANDATORY):
Return ONLY a JSON object with this exact structure (no XML, no extra text):
{
  "companyName": string | null,
  "headline": string | null,
  "colors": {
    "primary": string | null,
    "secondary": string | null,
    "accent": string | null,
    "background": string | null,
    "textPrimary": string | null,
    "textSecondary": string | null
  }
}

Example (structure only):
{"companyName":"<original language>","headline":"<original language>","colors":{"primary":"#HEX or null","secondary":"#HEX or null","accent":"#HEX or null","background":"#HEX or null","textPrimary":"#HEX or null","textSecondary":null}}
`;

  const requestBody = (includeScreenshot) => ({
    model,
    temperature: 0,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: messagesForModel(
      model,
      brandingSystemPrompt,
      buildUserContent(includeScreenshot),
    ),
  });


  const hasScreenshot = Boolean(input?.screenshot);
  const { screenshot: _s, ...inputForText } = input;
  const textPayload = JSON.stringify(inputForText);
  const textPayloadLen = textPayload.length;
  const screenshotLen = input?.screenshot ? String(input.screenshot).length : 0;

  if (process.env.NODE_ENV !== "production") {
    console.log("[LLM] Request:", {
      model,
      hasScreenshot,
      textPayloadBytes: textPayloadLen,
      screenshotPayloadBytes: screenshotLen || undefined,
    });
  }

  const startTime = Date.now();
  let response;
  let modelUsed = model;
  const includeScreenshot =
    Boolean(input?.screenshot) && modelSupportsVision(model);

  try {
    const result = await vertexChatPost(
      requestBody(includeScreenshot)
    );
    response = result.response;
    modelUsed = result.modelUsed;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[LLM] Vertex error:", err.message);
    }
    // Si falla con imagen, reintentamos sin imagen (Vertex a veces falla en multimodal si la imagen es pesada)
    if (includeScreenshot) {
      try {
        const result = await vertexChatPost(requestBody(false));
        response = result.response;
        modelUsed = result.modelUsed;
      } catch (retryErr) {
        if (process.env.NODE_ENV !== "production") {
          console.error(
            "[LLM] Retry without screenshot failed:",
            retryErr.message,
          );
        }
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

  if (!response) {
    throw new Error("LLM request failed");
  }

  // Trackear métricas de costo
  const usage = response.data?.usage;
  if (usage) {
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalCost = usage.total_cost || 0;
    recordLLMRequest({
      model: modelUsed,
      promptTokens,
      completionTokens,
      totalCost,
      durationMs: Date.now() - startTime,
      source: "branding",
      workspaceSlug: input?.url ? new URL(input.url).hostname : null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }

  return JSON.parse(sanitizeJsonControlChars(stripMarkdownJson(content)));
}

const IMG_2_JSON_V4_SYSTEM_PROMPT = `**System Role:** You are IMG-2-JSON-V4, a high-fidelity Computer Vision Engine. Your mission is to perform a forensic deconstruction of images into a structured JSON "Visual DNA" packet. Your output is the sole source of truth for 1:1 reconstruction in Flux, Midjourney v6.1, and DALL-E 3.

**Operational Mandates:**
1. **The Spatial Matrix:** Use a 3x3 grid (A1-C3). You must map subjects based on their *center of gravity* and describe depth (Foreground/Midground/Background) within each cell.
2. **Material Science:** Identify surface shaders (e.g., "frosted glass," "brushed aluminum," "anodized plastic") and their Light Transport Properties (Refraction, SSS, Specularity).
3. **Typography & OCR:** If text exists, you MUST extract the exact string, font weight, case (ALL CAPS/Sentence case), and kerning style.
4. **Token Hierarchy:** Order "key_visual_tokens" by influence on the composition (most dominant first). Use professional cinematography and CGI terminology.

**Constraints:**
- STRICT: Output ONLY the JSON object. No markdown code blocks, no preamble, no "Here is the analysis."
- ZERO HALLUCINATION: If a detail is blurry, label it as "low-frequency detail."
- Avoid generic adjectives (e.g., "beautiful"). Use technical ones (e.g., "high-dynamic-range," "cinematic color grade").

**JSON Schema:**
{
  "meta_parameters": {
    "aspect_ratio": "String (--ar X:Y)",
    "stylize_value": "Integer (0-1000)",
    "chaos_level": "Low/Med/High",
    "rendering_engine_vibe": "e.g., Unreal Engine 5, OctaneRender, Kodak Portra 400"
  },
  "technical_analysis": {
    "medium": "Detailed medium (e.g., 3D Isometric Render, Macro Photography)",
    "lighting": {
      "setup": "e.g., Three-point lighting, volumetric god rays",
      "color_temp": "e.g., 5500K Neutral, Warm amber glow"
    },
    "optics": "Focal length (e.g., 35mm), Aperture (e.g., f/1.8), Grain intensity"
  },
  "aesthetic_dna": {
    "palette": ["Hex_Codes"],
    "materials": ["List of textures/surfaces"],
    "typography": {
      "content": "Exact text",
      "style": "Font description (serif/sans/script), color, and placement"
    }
  },
  "composition_grid": {
    "A1_A3_Upper": "Background/Sky/Top-level elements",
    "B1_B3_Center": "Main subject focus and interaction",
    "C1_C3_Lower": "Foreground/Floor/Base contact points"
  },
  "entities": [
    {
      "id": "obj_01",
      "label": "Object name",
      "grid_location": "[RowCol]",
      "visual_dna": "Shape, color, finish, and lighting interaction"
    }
  ],
  "generative_reconstruction": {
    "mj_v6_prompt": "Weighted prompt using --no and --style",
    "flux_natural_prompt": "Highly descriptive, physical-relationship focused paragraph"
  }
}`;

/**
 * Analiza una imagen y devuelve un JSON estructurado (IMG-2-JSON-V4 Visual DNA) para reproducción en Flux / Midjourney v6.1 / DALL-E 3.
 * @param {string} imageUrl - URL de la imagen (data:image/...;base64,... o https://...)
 * @returns {Promise<object>} - Objeto JSON con meta_parameters, technical_analysis, aesthetic_dna, composition_grid, entities, generative_reconstruction
 */
export async function analyzeImageToJson(imageUrl) {
  const model = getCreativeModel();
  if (!imageUrl || typeof imageUrl !== "string") throw new Error("imageUrl is required (data URL or https URL)");

  const userContent = [
    { type: "text", text: "Analyze this image and output exactly one valid JSON object following the schema. No markdown, no preamble, no explanation." },
    { type: "image_url", image_url: { url: imageUrl } },
  ];
  const messages = messagesForModel(model, IMG_2_JSON_V4_SYSTEM_PROMPT, userContent);
  const requestBody = {
    model,
    messages: normalizeMessagesForModel(messages, model),
    response_format: modelSupportsVision(model) ? { type: "json_object" } : undefined,
  };

  const startTime = Date.now();
  const { response, modelUsed } = await vertexChatPost(requestBody);

  const usage = response.data?.usage;
  if (usage) {
    recordLLMRequest({
      model: modelUsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalCost: usage.total_cost || 0,
      durationMs: Date.now() - startTime,
      source: "analyze_image",
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty response");

  return JSON.parse(sanitizeJsonControlChars(stripMarkdownJson(content)));
}

/**
 * Construye el prompt para clonar un anuncio de referencia con la marca del usuario.
 * Usa el Visual DNA (flux_natural_prompt) y añade instrucciones para reemplazar producto/logo por los assets del usuario.
 * @param {object} visualDna - Objeto retornado por analyzeImageToJson (IMG-2-JSON-V4)
 * @param {{ headline?: string, primary?: string, companyName?: string }} [branding] - Opcional: headline, color primario, nombre
 * @returns {{ prompt: string, aspectRatio: string }}
 */
export function buildClonePromptFromDna(visualDna, branding = {}) {
  const recon = visualDna?.generative_reconstruction || {};
  const fluxPrompt =
    recon.flux_natural_prompt ||
    recon.dalle_flux_natural_prompt ||
    (recon.mj_v6_prompt ? recon.mj_v6_prompt.replace(/--ar\s+[\d:]+.*$/i, "").trim() : "");
  const meta = visualDna?.meta_parameters || {};
  let aspectRatio = "4:5";
  if (meta.aspect_ratio) {
    const ar = String(meta.aspect_ratio).replace(/^--ar\s+/i, "").trim();
    if (/^\d+:\d+$/.test(ar)) aspectRatio = ar;
  }
  const brandLine = branding?.companyName
    ? ` Brand: ${branding.companyName}.`
    : "";
  const colorLine =
    branding?.primary && /^#?[0-9A-Fa-f]{3,8}$/.test(String(branding.primary).replace("#", ""))
      ? ` Use brand color ${branding.primary} for key accents where appropriate.`
      : "";
  const prompt = [
    "Recreate this exact composition, lighting, and style:",
    fluxPrompt,
    "CRITICAL: Replace any product or logo visible in the scene with the user's brand assets provided in the reference images (first reference image = logo, second = product). Keep the same camera angle, materials, and mood. Do not include any text, words, or letters in the image unless the original scene had clearly visible text.",
    brandLine,
    colorLine,
  ]
    .filter(Boolean)
    .join(" ");
  return { prompt, aspectRatio };
}

/**
 * Convierte el Visual DNA (IMG-2-JSON-V4) al mismo schema que los creativos (meta_parameters,
 * technical_analysis, aesthetic_dna, composition_grid, entities, generative_reconstruction con
 * midjourney_prompt y dalle_flux_natural_prompt). Así el creativo clonado se guarda con el mismo
 * formato que los generados por ángulos/headlines.
 * @param {object} visualDna - Objeto retornado por analyzeImageToJson (IMG-2-JSON-V4)
 * @param {{ companyName?: string, primary?: string, headline?: string }} [branding] - Opcional
 * @returns {object} - Spec en formato creative (listo para getImagePromptFromStructured)
 */
export function normalizeVisualDnaToCreativeSpec(visualDna, branding = {}) {
  if (!visualDna || typeof visualDna !== "object") {
    return {
      meta_parameters: { aspect_ratio: "4:5", stylize_value: 250, chaos_level: "Med" },
      technical_analysis: { medium: "Commercial Photography", camera_lens: "35mm", depth_of_field: "", lighting_type: "Soft key light", image_quality: "8k" },
      aesthetic_dna: { art_style_reference: "", dominant_colors_hex: [], key_visual_tokens: [], mood: "" },
      composition_grid: { A1_A3_Upper_Third: "", B1_B3_Middle_Third: "", C1_C3_Lower_Third: "" },
      entities: [],
      generative_reconstruction: { midjourney_prompt: "", dalle_flux_natural_prompt: "" },
    };
  }
  const meta = visualDna.meta_parameters || {};
  let aspectRatio = "4:5";
  if (meta.aspect_ratio) {
    const ar = String(meta.aspect_ratio).replace(/^--ar\s+/i, "").trim();
    if (/^\d+:\d+$/.test(ar)) aspectRatio = ar;
  }
  const tech = visualDna.technical_analysis || {};
  const lighting = tech.lighting && typeof tech.lighting === "object"
    ? [tech.lighting.setup, tech.lighting.color_temp].filter(Boolean).join(", ")
    : (tech.lighting_type || tech.lighting || "");
  const optics = typeof tech.optics === "string" ? tech.optics : "";
  const aesthetic = visualDna.aesthetic_dna || {};
  const palette = Array.isArray(aesthetic.palette) ? aesthetic.palette : (aesthetic.dominant_colors_hex || []);
  const materials = Array.isArray(aesthetic.materials) ? aesthetic.materials : [];
  const tokens = aesthetic.key_visual_tokens || materials.slice(0, 8);
  const grid = visualDna.composition_grid || {};
  const entitiesRaw = Array.isArray(visualDna.entities) ? visualDna.entities : [];
  const recon = visualDna.generative_reconstruction || {};
  const mjRaw = recon.mj_v6_prompt || recon.midjourney_prompt || "";
  const midjourney_prompt = typeof mjRaw === "string" && mjRaw.trim()
    ? mjRaw.replace(/\s*--ar\s+[\d:]+\s*/gi, " ").replace(/\s*--v\s+[\d.]+\s*/gi, " ").replace(/\s*--style\s+raw\s*/gi, " ").trim() + ` --ar ${aspectRatio} --v 6.0 --style raw`
    : "";
  let fluxPrompt = recon.flux_natural_prompt || recon.dalle_flux_natural_prompt || "";
  const replaceInstruction =
    " CRITICAL: Replace any product or logo visible in the scene with the user's brand assets provided in the reference images (first reference = logo, second = product). Keep the same camera angle, materials, and mood.";
  if (branding?.companyName || branding?.primary) {
    fluxPrompt = (fluxPrompt || "").trim() + replaceInstruction;
    if (branding.companyName) fluxPrompt += ` Brand: ${branding.companyName}.`;
    if (branding.primary && /^#?[0-9A-Fa-f]{3,8}$/.test(String(branding.primary).replace("#", "")))
      fluxPrompt += ` Use brand color ${branding.primary} for key accents where appropriate.`;
  }
  const dalle_flux_natural_prompt = fluxPrompt.trim() || "Recreate this exact composition, lighting, and style.";

  return {
    meta_parameters: {
      aspect_ratio: aspectRatio,
      stylize_value: typeof meta.stylize_value === "number" ? meta.stylize_value : 250,
      chaos_level: meta.chaos_level || "Med",
    },
    technical_analysis: {
      medium: tech.medium || "Commercial Photography",
      camera_lens: tech.camera_lens || optics || "35mm",
      depth_of_field: tech.depth_of_field || "",
      lighting_type: lighting || tech.lighting_type || "Soft key light",
      image_quality: tech.image_quality || "8k sharp",
    },
    aesthetic_dna: {
      art_style_reference: meta.rendering_engine_vibe || aesthetic.art_style_reference || "",
      dominant_colors_hex: palette,
      key_visual_tokens: tokens,
      mood: aesthetic.mood || "",
    },
    composition_grid: {
      A1_A3_Upper_Third: grid.A1_A3_Upper_Third ?? grid.A1_A3_Upper ?? "",
      B1_B3_Middle_Third: grid.B1_B3_Middle_Third ?? grid.B1_B3_Center ?? "",
      C1_C3_Lower_Third: grid.C1_C3_Lower_Third ?? grid.C1_C3_Lower ?? "",
    },
    entities: entitiesRaw.map((e, i) => ({
      id: e.id || `obj_${String(i + 1).padStart(2, "0")}`,
      label: e.label || "Element",
      prominence_weight: e.prominence_weight ?? 0.7,
      grid_location: e.grid_location || "[B2]",
      visual_description: e.visual_description ?? e.visual_dna ?? "",
      action_pose: e.action_pose ?? "",
      lighting_interaction: e.lighting_interaction ?? "",
    })),
    generative_reconstruction: {
      midjourney_prompt: midjourney_prompt || `/imagine prompt: ${tech.medium || "Commercial"} --ar ${aspectRatio} --v 6.0 --style raw`,
      dalle_flux_natural_prompt,
    },
  };
}

/** Genera la base de conocimiento del negocio a partir de url + branding + metadata (solo texto, sin imagen). */
export async function generateKnowledgeBase(input) {
  const model = getKnowledgeBaseModel();

  const startTime = Date.now();
  const text = JSON.stringify(input);
  const kbSystemPrompt = `You are a business strategist and copywriter.

Your task: Given a website URL and extracted branding data (company name, headline, metadata such as title and description), write a structured "Knowledge Base" document in plain text.

LANGUAGE RULE (CRITICAL):
1) Detect the primary language of the website using, in this order of priority:
   - Website content language (if available)
   - Company name and headline
   - Metadata (title and description)
2) Write the CONTENT of all sections in that detected language.
3) If the language cannot be determined with high confidence, DEFAULT to Spanish.
4) SECTION TITLES MUST ALWAYS BE IN SPANISH, regardless of the detected language.

FORMAT RULES:
- Plain text only (no markdown, no JSON).
- Use the EXACT section titles listed below (in Spanish).
- Each section title must be on its own line, followed by a blank line, then the content.
- Bullet-style lines are allowed only as short separated lines without symbols.

CONTENT GUIDELINES:
- Infer reasonable and realistic details about products, audience, value proposition, and industry based on the brand and metadata.
- Be concise, professional, and business-oriented.
- Do not mention assumptions, inference, or limitations.

REQUIRED SECTIONS (in this exact order and wording):

1) "Descripción de la Empresa"
One or two paragraphs explaining what the company does, its mission, and positioning.

2) "Productos y Servicios"
Key offerings and their main benefits, expressed as short standalone lines if needed.

3) "Público Objetivo"
Description of the ideal customers or users.

4) "Propuesta de Valor"
Clear explanation of why customers choose this company over alternatives.

5) "Voz y Personalidad de la Marca"
Tone, style, and communication characteristics.

6) "Mensajes Clave"
Core talking points the brand consistently communicates.

7) "Contexto de la Industria"
Brief overview of the industry or market in which the company operates.

OUTPUT RULE:
Return ONLY the document text. No preamble, no explanations, no metadata.`;

  const requestBody = {
    model,
    temperature: 0.3,
    max_tokens: 4000,
    messages: messagesForModel(model, kbSystemPrompt, [{ type: "text", text }]),
  };


  const { response, modelUsed } = await vertexChatPost(
    requestBody
  );

  // Trackear métricas de costo
  const usage = response.data?.usage;
  if (usage) {
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalCost = usage.total_cost || 0;
    recordLLMRequest({
      model: modelUsed,
      promptTokens,
      completionTokens,
      totalCost,
      durationMs: Date.now() - startTime,
      source: "knowledgeBase",
      workspaceSlug: input?.url ? new URL(input.url).hostname : null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid knowledge base");
  }

  return content.trim();
}

/** Genera 5 customer profiles (ICP) a partir de la base de conocimiento y branding. */
export async function generateCustomerProfiles(input) {
  const model = getProfilesModel();

  const startTime = Date.now();
  const currentDate = new Date();
  const dateContext = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

  const text = JSON.stringify({
    url: input.url,
    companyName: input.companyName,
    headline: input.headline,
    knowledgeBase: input.knowledgeBase?.slice(0, 12000) ?? "",
  });

  const requestBody = {
    model,
    temperature: 0.4,
    max_tokens: 4000,
    response_format: { type: "json_object" },
    messages: messagesForModel(
      model,
      `You are a senior marketing strategist and customer research expert.

REFERENCE DATE (use for realistic figures): Today is ${dateContext}. All monetary and economic figures must be consistent with this date.

TASK:
Given a business knowledge base and branding inputs (company name, headline, positioning), generate EXACTLY 5 Ideal Customer Profiles (ICPs).

LANGUAGE RULE (CRITICAL):
1) Detect the primary language from the company name and headline.
2) Write ALL text fields in that language.
3) If the language cannot be determined with high confidence, DEFAULT to Spanish.

OUTPUT RULE (STRICT):
- Return ONLY a valid JSON object.
- No markdown, no comments, no explanations, no extra keys.
- The JSON must strictly match the structure and field names below.

REQUIRED JSON STRUCTURE:
{
  "profiles": [
    {
      "name": "Full name with a descriptive persona label (e.g. Carlos, el Emprendedor Ambicioso)",
      "title": "Short role or persona title",
      "description": "One or two concise sentences explaining who this person is and why the business is relevant to them.",
      "demographics": {
        "age": "Age range (e.g. 28-35)",
        "gender": "Male or Female",
        "income": "Realistic annual income range in numbers for the reference date and location (e.g. 32000-48000 in local currency, or USD 32000-48000). Use plausible figures for the persona and market.",
        "location": "Geographic context relevant to the business",
        "education": "Highest or typical education level"
      },
      "painPoints": [
        "Specific and concrete pain point",
        "Specific and concrete pain point",
        "Specific and concrete pain point"
      ],
      "goals": [
        "Clear and realistic goal",
        "Clear and realistic goal",
        "Clear and realistic goal"
      ],
      "channels": [
        "Primary acquisition or communication channel",
        "Secondary channel",
        "Tertiary channel"
      ]
    }
  ]
}

CONTENT RULES:
- Generate EXACTLY 5 profiles.
- Each profile must represent a clearly different persona (e.g. newcomer, side hustler, enthusiast, professional, mentor or leader).
- Vary age ranges, genders, motivations, and maturity levels.
- All profiles must be highly relevant to the specific business and industry described in the knowledge base.
- Avoid generic personas; be concrete and realistic.
- Do NOT repeat names, titles, or dominant motivations across profiles.
- INCOME: Use realistic annual income figures (numeric ranges) consistent with the REFERENCE DATE and the persona's location and role. Examples: "28.000-42.000 EUR", "USD 35.000-52.000", "450.000-680.000 MXN". Avoid outdated or round placeholder figures; use plausible numbers for the current year.

VALIDATION RULE:
If any required field is missing or the count is incorrect, the output is invalid.`,
      [{ type: "text", text }],
    ),
  };


  const { response, modelUsed } = await vertexChatPost(
    requestBody
  );

  // Trackear métricas de costo
  const usage = response.data?.usage;
  if (usage) {
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalCost = usage.total_cost || 0;
    recordLLMRequest({
      model: modelUsed,
      promptTokens,
      completionTokens,
      totalCost,
      durationMs: Date.now() - startTime,
      source: "profiles",
      workspaceSlug: input?.url ? new URL(input.url).hostname : null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid customer profiles");
  }

  const parsed = JSON.parse(
    sanitizeJsonControlChars(stripMarkdownJson(content)),
  );
  const profiles = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
  if (profiles.length < 5) {
    throw new Error(`LLM returned ${profiles.length} profiles, expected 5`);
  }

  return profiles.slice(0, 5);
}

/**
 * Generates 100 headlines/hooks for the sales page and creatives.
 * All internal prompts are in English; output language is contentLanguage (fallback Spanish Argentina).
 */
export async function generateHeadlines(input) {
  const model = getHeadlinesModel();

  const startTime = Date.now();
  const {
    companyName,
    headline,
    knowledgeBaseSummary,
    clientIdealSummary,
    nicheOrSubniche,
    useVoseo,
    contentLanguage: inputContentLanguage,
  } = input;

  const contentLanguage = getContentLanguage(
    inputContentLanguage || input?.branding || "es-AR",
  );
  const voseoRule =
    contentLanguage === "es-AR" && useVoseo
      ? " For Spanish (Argentina): use VOSEO in all headlines (e.g. empezá, aprendé, mirá, tené, hacé, descubrí, sumate). Do NOT use tuteo (empieza, aprende, mira, ten, haz)."
      : contentLanguage.startsWith("es") && !useVoseo
        ? " For Spanish: use tuteo (empieza, aprende, mira, ten, haz, etc.)."
        : "";

  const text = JSON.stringify({
    companyName: companyName || "the business",
    headline: headline || "",
    knowledgeBaseSummary: (knowledgeBaseSummary || "").slice(0, 3000),
    clientIdealSummary: clientIdealSummary || "",
    nicheOrSubniche: nicheOrSubniche || "",
    contentLanguage,
    useVoseo: Boolean(useVoseo),
  });

  const requestBody = {
    model,
    temperature: 0.7,
    max_tokens: 12000,
    response_format: { type: "json_object" },
    messages: messagesForModel(
      model,
      `You are a world-class copywriter specializing in ad hooks and creatives. Your task is to produce exactly 100 headlines that work as VISUAL HOOKS: short, punchy, scroll-stopping text for ads (Instagram, Facebook, etc.).

MANDATORY RULES:
- Return EXACTLY 100 headlines in a JSON object with the key "headlines" (array of strings).
- Each headline is a HOOK: 5–12 words, suitable as large text on a visual ad. Follow the 4 U's: Useful, Urgent, Unique, Ultra-specific.
- One clear promise, a gripping question, or a bold claim. No generic phrases.
- Speak to the main benefit; address objections; inspire action. Promise concrete results when relevant.
- CONTENT LANGUAGE (CRITICAL): Write ALL headlines in the language specified in the input as contentLanguage. If contentLanguage is "es-AR" or "es", write in Spanish. If "en", write in English. Never output ad copy in a different language. Default if missing: Spanish (Argentina).
${voseoRule}
- Output ONLY a valid JSON object with this structure, no markdown or extra text:
{"headlines": ["headline 1", "headline 2", ... "headline 100"]}`,
      `Generate 100 headlines for this sales page. Business and audience data (contentLanguage and useVoseo are set; output all headlines in the content language):\n${text}`,
    ),
  };


  const { response, modelUsed } = await vertexChatPost(
    requestBody
  );

  // Trackear métricas de costo
  const usage = response.data?.usage;
  if (usage) {
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalCost = usage.total_cost || 0;
    recordLLMRequest({
      model: modelUsed,
      promptTokens,
      completionTokens,
      totalCost,
      durationMs: Date.now() - startTime,
      source: "headlines",
      workspaceSlug: input?.companyName
        ? "headlines-" + input.companyName
        : null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid headlines");
  }

  const parsed = JSON.parse(
    sanitizeJsonControlChars(stripMarkdownJson(content)),
  );
  const headlines = Array.isArray(parsed?.headlines) ? parsed.headlines : [];
  return headlines.filter((h) => typeof h === "string" && h.trim().length > 0);
}

/**
 * Formato de un "Ángulo de Venta" (tarjeta de UI: categoría emocional + hook + descripción visual).
 * @typedef {{ category: string, title: string, description: string, hook: string, visual: string }} SalesAngle
 */

/**
 * Generates Sales Angles (card format: category, title, description, hook, visual).
 * All internal prompts in English. Output: title, description, hook in contentLanguage; visual in English.
 *
 * @param {{ companyName?: string, headline?: string, knowledgeBaseSummary?: string, clientIdealSummary?: string, nicheOrSubniche?: string, useVoseo?: boolean, contentLanguage?: string, branding?: object }} input
 * @returns {Promise<SalesAngle[]>}
 */
export async function generateSalesAngles(input) {
  const model = getCreativeModel();

  const {
    companyName = "",
    headline = "",
    knowledgeBaseSummary = "",
    clientIdealSummary = "",
    nicheOrSubniche = "",
    useVoseo = false,
    contentLanguage: inputContentLanguage,
  } = input;

  const contentLanguage = getContentLanguage(
    inputContentLanguage || input?.branding || "es-AR",
  );
  const voseoRule =
    contentLanguage === "es-AR" && useVoseo
      ? " For Spanish (Argentina) use VOSEO in hook and description (empezá, aprendé, mirá, tené, ganá, etc.)."
      : contentLanguage.startsWith("es") && !useVoseo
        ? " For Spanish use tuteo (empieza, aprende, mira, ten, gana, etc.)."
        : "";

  const systemPrompt = `You are a top-tier social and creative strategist. You generate "Sales Angles": psychological angles for ads that STAND OUT on social (Instagram, Facebook, Threads, LinkedIn). Your goal is scroll-stopping, non-generic content.

ANALYSIS FIRST: For the given business and audience, identify UNIQUE and NON-OBVIOUS angles. Use the audience's real pain points, curiosity gaps, and underused perspectives. Avoid generic advice and overused hooks.

Each angle is a card with:
- category: One label in UPPERCASE: CODICIA, FRUSTRACIÓN, ESPERANZA, ORGULLO, CONFIANZA, MIEDO, URGENCIA, IDENTIDAD, SUPERACIÓN, EFICIENCIA (or similar for the business).
- title: Short name for the angle, in the TARGET CONTENT LANGUAGE (see input contentLanguage).
- description: 1–2 sentences: which problem/emotion it targets and what it offers. In the TARGET CONTENT LANGUAGE.
- hook: ONE punchy phrase for LARGE TEXT in the ad. Must STOP THE SCROLL: provoke curiosity, emotion or surprise without clickbait. Short, bold, pattern-breaking, impossible to ignore. Use power words, urgency or a clear promise of value. In the TARGET CONTENT LANGUAGE. ${voseoRule}
- visual: Scene description in ENGLISH only (for image generation): subject, environment, objects, emotional state. 1–2 sentences.

HOOK GUIDELINES: Create hooks that grab attention in the first line. Think viral hooks: thought-provoking questions, bold statements, numbers or credibility, or a clear solution to a pain. Keep them concise and easy to understand.

CONTENT LANGUAGE (CRITICAL): Write title, description, and hook in the language specified in the input as contentLanguage. If not set, default is Spanish (Argentina). Never output visible ad copy in a different language. The "visual" field must always be in English.

Generate 12–24 varied angles. Output ONLY a JSON object with key "angles" (array of objects with category, title, description, hook, visual). No markdown.`;

  const userText = JSON.stringify({
    companyName: (companyName || "").slice(0, 200),
    headline: (headline || "").slice(0, 300),
    knowledgeBaseSummary: (knowledgeBaseSummary || "").slice(0, 2500),
    clientIdealSummary: (clientIdealSummary || "").slice(0, 800),
    nicheOrSubniche: (nicheOrSubniche || "").slice(0, 200),
    contentLanguage,
    useVoseo: Boolean(useVoseo),
  });

  const requestBody = {
    model,
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: messagesForModel(
      model,
      systemPrompt,
      `Analyze this business and ideal client. Identify unique, non-obvious angles based on their pain points and curiosity gaps. Generate scroll-stopping sales angles. Avoid generic advice. Output title, description, and hook in the target content language (contentLanguage in the JSON below); visual always in English:\n${userText}`,
    ),
  };


  const startTime = Date.now();
  const { response, modelUsed } = await vertexChatPost(
    requestBody
  );
  const usage = response.data?.usage;
  if (usage) {
    recordLLMRequest({
      model: modelUsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalCost: usage.total_cost || 0,
      durationMs: Date.now() - startTime,
      source: "sales_angles",
      workspaceSlug: input?.companyName ? String(input.companyName) : null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid sales angles");
  }

  const jsonStr = sanitizeJsonControlChars(stripMarkdownJson(content));
  const parsed = JSON.parse(jsonStr);
  const raw = Array.isArray(parsed?.angles) ? parsed.angles : [];
  return raw
    .filter(
      (a) =>
        a &&
        typeof a === "object" &&
        typeof (a.hook || "").trim() === "string" &&
        (a.hook || "").trim().length > 0 &&
        typeof (a.visual || "").trim() === "string" &&
        (a.visual || "").trim().length > 0,
    )
    .map((a) => ({
      category: String(a.category || "ANGLE")
        .toUpperCase()
        .slice(0, 32),
      title: String(a.title || "")
        .trim()
        .slice(0, 200),
      description: String(a.description || "")
        .trim()
        .slice(0, 500),
      hook: String(a.hook || "")
        .trim()
        .slice(0, 300),
      visual: String(a.visual || "")
        .trim()
        .slice(0, 800),
    }));
}

/**
 * Genera un prompt estructurado (JSON) para crear una imagen/creativo a partir de un headline.
 * Devuelve objeto con meta_parameters, technical_analysis (incl. depth_of_field cuando aplique), aesthetic_dna (cuando aplique), composition_grid, entities (incl. action_pose cuando aplique), generative_reconstruction.
 * Para FLUX/DALL·E usar generative_reconstruction.dalle_flux_natural_prompt.
 */
export async function generateCreativeImagePrompt(input) {
  const model = getCreativeModel();

  const startTime = Date.now();
  const {
    headline,
    companyName,
    brandingSummary,
    clientIdealSummary,
    brandingColors,
    hasLogoOrImages,
    referenceAssets,
    aspectRatio: inputAspectRatio,
    contentLanguage: inputContentLanguage,
  } = input;
  const contentLanguage = getContentLanguage(
    inputContentLanguage || input?.branding || "es-AR",
  );
  const assets =
    referenceAssets && typeof referenceAssets === "object"
      ? referenceAssets
      : { logo: null, product: null, other: [] };
  const hasLogo = Boolean(assets.logo);
  const hasProduct = Boolean(assets.product);
  const hasOther = Array.isArray(assets.other) && assets.other.length > 0;
  const aspectRatio =
    inputAspectRatio && typeof inputAspectRatio === "string"
      ? inputAspectRatio.trim()
      : "4:5";
  const colors =
    brandingColors && typeof brandingColors === "object" ? brandingColors : {};
  const hexColors = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.background,
    colors.textPrimary,
  ].filter(Boolean);
  const headlineForCopy = (headline || "").trim().toUpperCase();
  const text = JSON.stringify({
    headline: headlineForCopy || (headline || "").trim(),
    companyName: companyName || "",
    brandingSummary: (brandingSummary || "").slice(0, 1500),
    clientIdealSummary: (clientIdealSummary || "").slice(0, 800),
    brandColorsHex: hexColors,
    hasLogoOrImages: Boolean(hasLogoOrImages),
    aspectRatio,
    contentLanguage,
  });

  const creativePromptSystem = `You are an art director. Output a SINGLE JSON object for an advertising image (Meta Ads). Use this schema; include aesthetic_dna, depth_of_field, and action_pose when they add value.

meta_parameters: aspect_ratio (string e.g. 1:1, 16:9), stylize_value (integer 0-1000), chaos_level (Low | Med | High).
technical_analysis: medium, camera_lens, depth_of_field (optional but use when relevant, e.g. f/1.8 or f/4.0 deep focus), lighting_type, image_quality (strings).
aesthetic_dna (optional but recommended): art_style_reference, dominant_colors_hex (array of HEX), key_visual_tokens (array of concrete phrases), mood (one phrase). Include when it strengthens the visual recipe.
composition_grid: A1_A3_Upper_Third, B1_B3_Middle_Third, C1_C3_Lower_Third (strings).
entities: array of { id, label, prominence_weight, grid_location [A1-C3], visual_description, action_pose (optional, pose or state of the element), lighting_interaction }.
generative_reconstruction: midjourney_prompt, dalle_flux_natural_prompt (strings).

Example (match this structure):

{
  "meta_parameters": {
    "aspect_ratio": "1:1",
    "stylize_value": 250,
    "chaos_level": "High"
  },
  "technical_analysis": {
    "medium": "Commercial Editorial Photography",
    "camera_lens": "35mm Wide Angle",
    "depth_of_field": "f/4.0 deep focus with slight background softening",
    "lighting_type": "Teal-and-orange cinematic, monitor-glow, cool ambient",
    "image_quality": "8k sharp, high contrast, clean digital"
  },
  "aesthetic_dna": {
    "art_style_reference": "Tech-noir marketing, corporate editorial, high-stress conceptual",
    "dominant_colors_hex": ["#08121B", "#FFFFFF", "#CC0000", "#1E3A5F"],
    "key_visual_tokens": ["Overwhelmed student", "tangled cables", "crossed-out UI", "bold white sans-serif typography", "cluttered desk", "blue monitor light"],
    "mood": "Frustrated and technologically overwhelmed"
  },
  "composition_grid": {
    "A1_A3_Upper_Third": "Large bold typography in Spanish. A white crest logo in [A1]. Dark, moody background with floating particles and light rays. Headline text in UPPERCASE.",
    "B1_B3_Middle_Third": "Central stressed man, head in hands. Background wall of digital thumbnails with red X marks.",
    "C1_C3_Lower_Third": "Foreground desk with laptops, crumpled paper, chaotic nest of black cables."
  },
  "entities": [
    {
      "id": "obj_01",
      "label": "Frustrated Man",
      "prominence_weight": 0.9,
      "grid_location": "[B2]",
      "visual_description": "Man in dark t-shirt, head buried in hands, slumped posture.",
      "action_pose": "Hiding face in palms, showing extreme fatigue.",
      "lighting_interaction": "Top-down fill with cool rim light from monitors."
    },
    {
      "id": "obj_02",
      "label": "Crossed-out Tutorials",
      "prominence_weight": 0.7,
      "grid_location": "[B1, B3, A2]",
      "visual_description": "Digital video cards labeled AI Tutorial with large red diagonal X marks.",
      "action_pose": "Static background wall display.",
      "lighting_interaction": "Self-illuminated digital glow."
    },
    {
      "id": "obj_03",
      "label": "Tangled Wires",
      "prominence_weight": 0.6,
      "grid_location": "[C2]",
      "visual_description": "Massive nest of black power and data cables on the desk.",
      "action_pose": "Chaotic clutter in the immediate foreground.",
      "lighting_interaction": "Specular highlights on black plastic."
    }
  ],
  "generative_reconstruction": {
    "midjourney_prompt": "/imagine prompt: Commercial photography of a stressed man with head in hands at a cluttered desk, surrounded by laptops and tangled cables. Background wall with video thumbnails with red X marks. Large bold white text at top reads '¿HARTO DE TUTORIALES QUE NO TE LLEVAN A NADA?'. High contrast, cinematic blue lighting --ar 1:1 --v 6.0 --style raw",
    "dalle_flux_natural_prompt": "A high-fidelity ad showing a man overwhelmed at a desk, face in his hands. Desk with silver laptops, papers, chaotic black wires. Behind him, AI Tutorial video screens crossed out with red marks. At the top, bold white text in Spanish in UPPERCASE. Dark cinematic lighting with blue accents."
  }
}

RULES: Use EXACT headline from input (contentLanguage). The headline/hook that appears as visible ad copy MUST be in UPPERCASE in composition_grid (A1_A3_Upper_Third) and in generative_reconstruction (midjourney_prompt and dalle_flux_natural_prompt), e.g. "MI PEOR ERROR CON LA IA", "TE SALVA", "LANZÁ TU NEGOCIO...". aspect_ratio from input; same in --ar. Include aesthetic_dna when it helps the scene; depth_of_field when lens/DOF matters; action_pose per entity when pose matters. No Meta/Facebook/Instagram in image. Output ONLY valid JSON, no markdown.`;

  let referenceImagesRule = "";
  if (hasLogoOrImages && (hasLogo || hasProduct || hasOther)) {
    const parts = [];
    let idx = 1;
    if (hasLogo)
      parts.push(
        `Image ${idx++} = LOGO. If a logo reference image is provided, incorporate the EXACT logo into the design.`,
      );
    if (hasProduct)
      parts.push(
        `Image ${idx++} = PRODUCT. If a product reference image is provided, incorporate the EXACT product into the scene (e.g. mockup, hero).`,
      );
    if (hasOther)
      parts.push(
        `Images ${idx}+ = Other brand visuals. Use as style or subject reference.`,
      );
    referenceImagesRule = `\nREFERENCE IMAGES (the image model will receive them in this order): ${parts.join(" ")} In generative_reconstruction.dalle_flux_natural_prompt, instruct clearly: if a logo is provided, incorporate the EXACT logo; if a product image is provided, incorporate the EXACT product in the scene.`;
  }

  const creativePromptSystemWithRefs =
    creativePromptSystem + referenceImagesRule;

  const requestBody = {
    model,
    temperature: 0.5,
    max_tokens: 2400,
    response_format: { type: "json_object" },
    messages: messagesForModel(
      model,
      creativePromptSystemWithRefs,
      `Generate the full structured prompt JSON for this ad creative. Input:\n${text}`,
    ),
  };


  const { response, modelUsed } = await vertexChatPost(
    requestBody
  );

  const usage = response.data?.usage;
  if (usage) {
    recordLLMRequest({
      model: modelUsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalCost: usage.total_cost || 0,
      durationMs: Date.now() - startTime,
      source: "creative_image_prompt",
      workspaceSlug: input?.companyName ? input.companyName : null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty creative image prompt");
  }

  const parsed = JSON.parse(
    sanitizeJsonControlChars(stripMarkdownJson(content)),
  );
  return parsed;
}

/**
 * Devuelve el prompt completo para el generador de imágenes (Nano Banana Pro, FLUX, etc.).
 * Se envía el JSON estructurado (meta_parameters, technical_analysis, composition_grid, entities, generative_reconstruction) para el generador de imágenes.
 */
export function getImagePromptFromStructured(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload, null, 2);
}

/**
 * Visual Architect (IMG-2-JSON-V3). Output schema includes meta_parameters, technical_analysis (with depth_of_field when relevant), aesthetic_dna (when relevant), composition_grid, entities (with action_pose when relevant), generative_reconstruction.
 */
const VISUAL_ARCHITECT_SYSTEM_PROMPT = `Role: You are a "Creative Director & Visual Architect". Output exactly one JSON object. Include aesthetic_dna, depth_of_field in technical_analysis, and action_pose in entities when they add value.

meta_parameters: aspect_ratio (string e.g. 1:1, 16:9), stylize_value (integer 0-1000), chaos_level (Low | Med | High).
technical_analysis: medium, camera_lens, depth_of_field (use when relevant, e.g. f/1.8 or f/4.0 deep focus), lighting_type, image_quality (strings).
aesthetic_dna (include when relevant): art_style_reference, dominant_colors_hex (array), key_visual_tokens (array of concrete phrases), mood (one phrase).
composition_grid: A1_A3_Upper_Third, B1_B3_Middle_Third, C1_C3_Lower_Third (strings).
entities: array of { id, label, prominence_weight, grid_location [A1-C3], visual_description, action_pose (use when pose/state matters), lighting_interaction }.
generative_reconstruction: midjourney_prompt, dalle_flux_natural_prompt (strings).

Example structure:

{
  "meta_parameters": { "aspect_ratio": "1:1", "stylize_value": 250, "chaos_level": "High" },
  "technical_analysis": {
    "medium": "Commercial Editorial Photography",
    "camera_lens": "35mm Wide Angle",
    "depth_of_field": "f/4.0 deep focus with slight background softening",
    "lighting_type": "Teal-and-orange cinematic, monitor-glow, cool ambient",
    "image_quality": "8k sharp, high contrast, clean digital"
  },
  "aesthetic_dna": {
    "art_style_reference": "Tech-noir marketing, corporate editorial, high-stress conceptual",
    "dominant_colors_hex": ["#08121B", "#FFFFFF", "#CC0000", "#1E3A5F"],
    "key_visual_tokens": ["Overwhelmed student", "tangled cables", "crossed-out UI", "bold white sans-serif typography", "cluttered desk", "blue monitor light"],
    "mood": "Frustrated and technologically overwhelmed"
  },
  "composition_grid": {
    "A1_A3_Upper_Third": "Large bold typography in Spanish. Headline in UPPERCASE (e.g. 'MI PEOR ERROR CON LA IA' / 'TE SALVA'). Logo in [A1]. Dark, moody background.",
    "B1_B3_Middle_Third": "Central stressed man, head in hands. Background wall of digital thumbnails with red X marks.",
    "C1_C3_Lower_Third": "Foreground desk with laptops, crumpled paper, chaotic nest of black cables."
  },
  "entities": [
    { "id": "obj_01", "label": "Frustrated Man", "prominence_weight": 0.9, "grid_location": "[B2]", "visual_description": "Man in dark t-shirt, head buried in hands, slumped posture.", "action_pose": "Hiding face in palms, showing extreme fatigue.", "lighting_interaction": "Top-down fill with cool rim light from monitors." },
    { "id": "obj_02", "label": "Crossed-out Tutorials", "prominence_weight": 0.7, "grid_location": "[B1, B3, A2]", "visual_description": "Digital video cards labeled AI Tutorial with large red diagonal X marks.", "action_pose": "Static background wall display.", "lighting_interaction": "Self-illuminated digital glow." },
    { "id": "obj_03", "label": "Tangled Wires", "prominence_weight": 0.6, "grid_location": "[C2]", "visual_description": "Massive nest of black power and data cables on the desk.", "action_pose": "Chaotic clutter in the immediate foreground.", "lighting_interaction": "Specular highlights on black plastic." }
  ],
  "generative_reconstruction": {
    "midjourney_prompt": "/imagine prompt: Commercial photography of a stressed man with head in hands at a cluttered desk. Large bold white text at top reads '[EXACT HEADLINE IN UPPERCASE]'. High contrast, cinematic blue lighting --ar [RATIO] --v 6.0 --style raw",
    "dalle_flux_natural_prompt": "A high-fidelity ad showing [scene]. At the top, bold white text in [Language] in UPPERCASE reads '[HEADLINE]'. The lighting is dark and cinematic with blue accents."
  }
}

RULES: The headline/hook that appears as visible ad copy MUST be in UPPERCASE in composition_grid (A1_A3_Upper_Third) and in generative_reconstruction (midjourney_prompt and dalle_flux_natural_prompt). A1_A3 describe layout and language only. Include aesthetic_dna when it strengthens the scene; depth_of_field when DOF matters; action_pose per entity when pose matters. midjourney_prompt must include EXACT headline in target language and end with --ar [RATIO] --v 6.0 --style raw. aspect_ratio must match user message. Output ONLY valid JSON, no markdown.`;

/**
 * Placeholders replaced by injectBrandAssetUrls with real logo/product URLs from the app.
 */
const PLACEHOLDER_URL_LOGO = "URL_LOGO";
const PLACEHOLDER_URL_PRODUCT = "URL_PRODUCT";
const PLACEHOLDER_URL_CHARACTER = "URL_CHARACTER";

/**
 * Brand-Aware Visual Identity Orchestrator. Use when reference assets (logo, product) are available.
 * Outputs JSON with brand_identity (asset locking) and reference_links placeholders for injection.
 */
const VISUAL_ARCHITECT_BRAND_AWARE_SYSTEM_PROMPT = `Role: You are a Digital Art Director for an Automated Branding App. Your job is to create advertising scenes based on assets extracted from a website. Your output must be exclusively one JSON object following the Brand-Aware IMG-2-JSON schema. Produce ONLY the JSON object. No introductions, no markdown.

Decision logic (vary by angle):
- Sometimes create "Lifestyle" scenes (person using the product), sometimes "Product Shot" (product only with epic lighting), sometimes "Pain/Problem" (e.g. frustrated person, tutorials theme).
- Asset Locking: If the user provides logo_url or product_url (or says logo/product are available), you MUST set brand_identity.use_reference_logo and/or use_reference_product to true, and use reference_links placeholders URL_LOGO and URL_PRODUCT so the app can inject real URLs. Mark any entity that represents the logo or product with is_reference_locked: true.
- Logo placement: When using the logo, set logo_placement to the grid cell where it goes (e.g. "[A1]"). The app may overlay the exact logo there in post-production for 1:1 fidelity.

Prompt engineering:
- Midjourney: Use image references at the start when available. For product/person use --cref [URL] when relevant. End with --ar [RATIO] --v 6.0 --style raw.
- Flux (dalle_flux_natural_prompt): Describe the product with extreme detail based on the description given. State that it must be "identically reproduced as the reference" or "match the reference image exactly". Headline in target content language.
- Copy: If the ad is in Spanish (or target language), keep the headline short and punchy (hook style).

Typography & mood: Same as standard Visual Architect (headline in composition_grid, mood, psychology of color). Visible ad copy MUST be in the TARGET CONTENT LANGUAGE and in UPPERCASE (e.g. "MI PEOR ERROR CON LA IA", "TE SALVA") in composition_grid and generative_reconstruction.

EXACT JSON SCHEMA (output only this). Include brand_identity always; use_reference_* true only when assets are provided:

{
  "brand_identity": {
    "use_reference_logo": true,
    "use_reference_product": true,
    "use_reference_person": false,
    "logo_placement": "[A1]",
    "reference_links": {
      "logo": "URL_LOGO",
      "product": "URL_PRODUCT",
      "character": null
    }
  },
  "meta_parameters": { "aspect_ratio": "1:1", "stylize_value": 250, "chaos_level": "High" },
  "technical_analysis": { "medium": "Commercial Editorial Photography", "camera_lens": "35mm Wide Angle", "depth_of_field": "f/4.0 deep focus with slight background softening", "lighting_type": "Teal-and-orange cinematic, monitor-glow, cool ambient", "image_quality": "8k sharp, high contrast, clean digital" },
  "aesthetic_dna": { "art_style_reference": "...", "dominant_colors_hex": ["#HEX", ...], "key_visual_tokens": [...], "mood": "..." },
  "composition_grid": { "A1_A3_Upper_Third": "...", "B1_B3_Middle_Third": "...", "C1_C3_Lower_Third": "..." },
  "entities": [
    { "id": "prod_01", "label": "Product name or Logo", "is_reference_locked": true, "prominence_weight": 0.9, "grid_location": "[B2]", "visual_description": "Description of the real product/logo for model context", "action_pose": "...", "lighting_interaction": "..." }
  ],
  "generative_reconstruction": {
    "midjourney_prompt": "/imagine prompt: [Scene]. Large bold text reads '[HEADLINE]'. --ar [RATIO] --v 6.0 --style raw",
    "dalle_flux_natural_prompt": "A high-fidelity ad showing [scene]. The product/logo must be identically reproduced as the reference image. At the top, bold white text reads '[HEADLINE]'. ...",
    "flux_config": "Focus on the physical product provided in the reference, matching labels and form 1:1."
  }
}

Output ONLY the JSON object. Use URL_LOGO and URL_PRODUCT literally in reference_links when use_reference_logo/use_reference_product are true; the app will replace them with real URLs. aspect_ratio must match the user message.`;

/**
 * Injects real logo/product URLs into a spec that contains brand_identity with placeholders.
 * Replaces URL_LOGO, URL_PRODUCT (and URL_CHARACTER) in reference_links and in any string field of the spec.
 *
 * @param {object} spec - Parsed JSON spec (may have brand_identity.reference_links with placeholders).
 * @param {{ logo?: string|null, product?: string|null, other?: string[] } | null} referenceAssets
 * @returns {object} - Spec with reference_links filled and placeholders replaced in prompts.
 */
export function injectBrandAssetUrls(spec, referenceAssets) {
  if (!spec || typeof spec !== "object") return spec;
  const hasLogo = referenceAssets?.logo;
  const hasProduct = referenceAssets?.product;
  if (!hasLogo && !hasProduct) return spec;

  const out = JSON.parse(JSON.stringify(spec));
  if (!out.brand_identity) out.brand_identity = {};
  if (!out.brand_identity.reference_links)
    out.brand_identity.reference_links = {};
  out.brand_identity.use_reference_logo = Boolean(hasLogo);
  out.brand_identity.use_reference_product = Boolean(hasProduct);
  out.brand_identity.reference_links.logo = hasLogo
    ? referenceAssets.logo
    : null;
  out.brand_identity.reference_links.product = hasProduct
    ? referenceAssets.product
    : null;
  out.brand_identity.reference_links.character =
    out.brand_identity.reference_links.character ?? null;

  const replaceInString = (s) => {
    if (typeof s !== "string") return s;
    let t = s;
    if (hasLogo) t = t.split(PLACEHOLDER_URL_LOGO).join(referenceAssets.logo);
    if (hasProduct)
      t = t.split(PLACEHOLDER_URL_PRODUCT).join(referenceAssets.product);
    return t;
  };
  const walk = (obj) => {
    if (obj == null) return;
    if (typeof obj === "string") return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === "string") obj[i] = replaceInString(item);
        else walk(item);
      });
      return;
    }
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") obj[key] = replaceInString(obj[key]);
      else if (typeof obj[key] === "object" && obj[key] !== null)
        walk(obj[key]);
    }
  };
  walk(out);
  return out;
}

/**
 * Expands a simple idea into a full visual spec (IMG-2-JSON-V3). All internal prompts in English.
 * Visible headline/copy in the image must be in contentLanguage (default Spanish Argentina).
 *
 * @param {string} idea - Simple idea in any language.
 * @param {string} [aspectRatio] - e.g. "4:5", "16:9", "1:1". Default "4:5".
 * @param {{ contentLanguage?: string } | string} [options] - Optional. contentLanguage for visible ad text; or pass a string as contentLanguage.
 * @returns {Promise<object>} - Spec with meta_parameters, technical_analysis (depth_of_field when relevant), aesthetic_dna (when relevant), composition_grid, entities (action_pose when relevant), generative_reconstruction.
 */
export async function expandIdeaToVisualSpec(
  idea,
  aspectRatio = "4:5",
  options = {},
) {
  const model = getCreativeModel();

  const contentLanguage =
    typeof options === "string"
      ? getContentLanguage(options)
      : getContentLanguage(
        options?.contentLanguage ?? options?.branding ?? "es-AR",
      );

  const startTime = Date.now();
  const ratio =
    typeof aspectRatio === "string" && aspectRatio.trim()
      ? aspectRatio.trim()
      : "4:5";
  const userMessage = [
    `Idea: ${idea.trim()}`,
    "Style: High-impact advertising (subscription, product or emotional campaign). Apply Problem/Solution or Emotional State logic (frustration vs solution, empowerment, urgency, trust).",
    `Target content language for ad copy: ${contentLanguage}. The visible headline and any ad copy in the image MUST be written in this language. If ${contentLanguage} is es-AR or es, write the headline in Spanish. If en, write in English. Never show ad text in a different language. Default is Spanish (Argentina).`,
    "Include a concrete headline proposal in composition_grid (A1_A3_Upper_Third) and in generative_reconstruction, in the target content language. The visible headline MUST be in UPPERCASE.",
    `Use aspect_ratio "${ratio}" in meta_parameters and in midjourney_prompt (--ar ${ratio} --v 6.0 --style raw). Output ONLY the JSON object, no extra text.`,
  ].join(" ");

  const requestBody = {
    model,
    temperature: 0.5,
    max_tokens: 2400,
    messages: messagesForModel(
      model,
      VISUAL_ARCHITECT_SYSTEM_PROMPT,
      userMessage,
    ),
    response_format: { type: "json_object" },
  };


  const { response, modelUsed } = await vertexChatPost(
    requestBody
  );

  const usage = response.data?.usage;
  if (usage) {
    recordLLMRequest({
      model: modelUsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalCost: usage.total_cost || 0,
      durationMs: Date.now() - startTime,
      source: "expand_idea_visual_spec",
      workspaceSlug: null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid visual spec");
  }

  const parsed = JSON.parse(
    sanitizeJsonControlChars(stripMarkdownJson(content)),
  );
  if (!parsed.meta_parameters) parsed.meta_parameters = {};
  parsed.meta_parameters.aspect_ratio =
    parsed.meta_parameters.aspect_ratio || ratio;
  const mid = parsed.generative_reconstruction?.midjourney_prompt;
  if (typeof mid === "string") {
    let m = mid
      .replace(/\s*--ar\s+[\d:]+\s*/gi, " ")
      .replace(/\s*--v\s+[\d.]+\s*/gi, " ")
      .replace(/\s*--style\s+raw\s*/gi, " ")
      .trim();
    parsed.generative_reconstruction.midjourney_prompt =
      (m.startsWith("/imagine prompt:") ? m : `/imagine prompt: ${m}`) +
      ` --ar ${ratio} --v 6.0 --style raw`;
  }
  return parsed;
}

/**
 * Converts a Sales Angle (hook + visual + category) into a visual spec (IMG-2-JSON-V3). When referenceAssets (logo, product) are provided, uses Brand-Aware schema with asset locking and injects real URLs after the LLM response.
 *
 * @param {SalesAngle} angle - { category, title, description, hook, visual }.
 * @param {string} [aspectRatio] - "4:5" | "1:1" | "16:9". Default "4:5".
 * @param {{ referenceAssets?: { logo?: string|null, product?: string|null }, productDescription?: string, contentLanguage?: string } | null} [options]
 * @returns {Promise<object>} - Spec with meta_parameters, brand_identity (if assets), technical_analysis (depth_of_field when relevant), aesthetic_dna (when relevant), composition_grid, entities (action_pose when relevant), generative_reconstruction.
 */
export async function expandAngleToVisualSpec(
  angle,
  aspectRatio = "4:5",
  options = null,
) {
  const model = getCreativeModel();

  const hookRaw = (angle?.hook || "").trim();
  const hook = hookRaw ? hookRaw.toUpperCase() : "";
  const visual = (angle?.visual || "").trim();
  const category = (angle?.category || "").trim();
  const title = (angle?.title || "").trim();
  if (!hook || !visual) {
    throw new Error(
      "expandAngleToVisualSpec requires angle.hook and angle.visual",
    );
  }

  const opts = options && typeof options === "object" ? options : {};
  const referenceAssets =
    opts.referenceAssets && typeof opts.referenceAssets === "object"
      ? opts.referenceAssets
      : null;
  const hasLogo = Boolean(referenceAssets?.logo);
  const hasProduct = Boolean(referenceAssets?.product);

  const useBrandAware = hasLogo || hasProduct;
  const systemPrompt = useBrandAware
    ? VISUAL_ARCHITECT_BRAND_AWARE_SYSTEM_PROMPT
    : VISUAL_ARCHITECT_SYSTEM_PROMPT;

  const ratio =
    typeof aspectRatio === "string" && aspectRatio.trim()
      ? aspectRatio.trim()
      : "4:5";
  const parts = [
    `Sales angle to convert into visual spec (user message in English):`,
    `- Emotional category: ${category || "AD"}. Angle title: ${title || "—"}.`,
    `- HEADLINE that MUST appear in the image in UPPERCASE (this is the hook; already in correct language and uppercase — do NOT translate): "${hook}"`,
    `- Visual scene (describe the image accordingly; use English in generative_reconstruction): ${visual}`,
    `Style: High-impact ad. Mood must reflect this angle (${category}).`,
    `Include the exact headline in UPPERCASE "${hook}" in composition_grid (A1_A3_Upper_Third) and in generative_reconstruction (midjourney_prompt and dalle_flux_natural_prompt). The visible text in the image must be exactly this headline in uppercase; do not translate it.`,
  ];
  if (useBrandAware) {
    parts.push(
      `Reference assets available: ${hasLogo ? "logo" : ""} ${hasProduct ? "product" : ""}. Set brand_identity.use_reference_logo=${hasLogo}, use_reference_product=${hasProduct}. Use reference_links.logo="${PLACEHOLDER_URL_LOGO}" and reference_links.product="${PLACEHOLDER_URL_PRODUCT}" (the app will inject real URLs). For entities that are the logo or product, set is_reference_locked: true. In dalle_flux_natural_prompt state that the product/logo must be "identically reproduced as the reference".`,
    );
    if (opts.productDescription)
      parts.push(
        `Product description for context: ${String(opts.productDescription).slice(0, 300)}.`,
      );
  }
  parts.push(
    `Use aspect_ratio "${ratio}" in meta_parameters and in midjourney_prompt (--ar ${ratio} --v 6.0 --style raw). Output ONLY the JSON object, no extra text.`,
  );
  const userMessage = parts.join(" ");

  const requestBody = {
    model,
    temperature: 0.5,
    max_tokens: 2400,
    messages: messagesForModel(model, systemPrompt, userMessage),
    response_format: { type: "json_object" },
  };

  const startTime = Date.now();
  const { response, modelUsed } = await vertexChatPost(requestBody);

  const usage = response.data?.usage;
  if (usage) {
    recordLLMRequest({
      model: modelUsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalCost: usage.total_cost || 0,
      durationMs: Date.now() - startTime,
      source: "expand_angle_visual_spec",
      workspaceSlug: null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid visual spec from angle");
  }

  let parsed = JSON.parse(sanitizeJsonControlChars(stripMarkdownJson(content)));
  if (referenceAssets && (referenceAssets.logo || referenceAssets.product)) {
    parsed = injectBrandAssetUrls(parsed, referenceAssets);
  }
  if (!parsed.meta_parameters) parsed.meta_parameters = {};
  parsed.meta_parameters.aspect_ratio =
    parsed.meta_parameters.aspect_ratio || ratio;
  const mid = parsed.generative_reconstruction?.midjourney_prompt;
  if (typeof mid === "string") {
    let m = mid
      .replace(/\s*--ar\s+[\d:]+\s*/gi, " ")
      .replace(/\s*--v\s+[\d.]+\s*/gi, " ")
      .replace(/\s*--style\s+raw\s*/gi, " ")
      .trim();
    parsed.generative_reconstruction.midjourney_prompt =
      (m.startsWith("/imagine prompt:") ? m : `/imagine prompt: ${m}`) +
      ` --ar ${ratio} --v 6.0 --style raw`;
  }
  return parsed;
}

/**
 * Refines a Creative Spec (Visual DNA) by adapting it to a specific brand identity.
 *
 * @param {object} spec - Original Visual DNA (from reference).
 * @param {object} branding - Brand identity object { companyName, primaryColor, headline, contentLanguage }.
 * @returns {Promise<object>} - Refined Visual DNA.
 */
export async function refineCreativeSpecWithBranding(spec, branding) {
  const model = getCreativeModel();
  const startTime = Date.now();

  const userMessage = [
    `Original Spec: ${JSON.stringify(spec)}`,
    `New Brand Name: ${branding?.companyName || "Generic Brand"}`,
    `Brand Color: ${branding?.primary || "No specific color"}`,
    `Mandatory Headline: ${branding?.headline || "No specific headline"}`,
    `Content Language: ${branding?.contentLanguage || "es-AR"}`,
    "Refine the spec to strip away original brand elements and replace them with this brand's identity.",
  ].join("\n");

  const requestBody = {
    model,
    temperature: 0.3,
    max_tokens: 3000,
    messages: [
      { role: "system", content: BRAND_ADAPT_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
  };

  const { response, modelUsed } = await vertexChatPost(requestBody);

  const usage = response.data?.usage;
  if (usage) {
    recordLLMRequest({
      model: modelUsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalCost: 0,
      durationMs: Date.now() - startTime,
      source: "refine_creative_spec",
      workspaceSlug: null,
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Failed to refine creative spec");

  return JSON.parse(sanitizeJsonControlChars(stripMarkdownJson(content)));
}

/**
 * Construye el prompt final para Midjourney a partir del spec de Inferencia Semántica.
 * Concatena: [Medium] + [Subject/Environment] + [Lighting] + [Technical tags] + --ar [ratio] --v 6.0
 *
 * @param {object} spec - Objeto devuelto por expandIdeaToVisualSpec.
 * @param {string} [aspectRatio] - Override del ratio (ej. "4:5").
 * @returns {string} - Prompt listo para Midjourney.
 */
export function buildMidjourneyPromptFromSpec(spec, aspectRatio) {
  if (spec == null) return "";
  const mid = spec.generative_reconstruction?.midjourney_prompt;
  if (typeof mid === "string" && mid.trim()) {
    const ratio = aspectRatio || spec.meta_parameters?.aspect_ratio || "4:5";
    let out = mid
      .replace(/\s*--ar\s+[\d:]+\s*/gi, " ")
      .replace(/\s*--v\s+[\d.]+\s*/gi, " ")
      .replace(/\s*--style\s+raw\s*/gi, " ")
      .trim();
    return `${out} --ar ${ratio} --v 6.0 --style raw`;
  }
  const tech = spec.technical_analysis || {};
  const aesthetic = spec.aesthetic_dna || {};
  const parts = [
    tech.medium,
    tech.lighting_type,
    aesthetic.mood,
    (aesthetic.key_visual_tokens || []).slice(0, 5).join(", "),
  ].filter(Boolean);
  const ratio = aspectRatio || spec.meta_parameters?.aspect_ratio || "4:5";
  return `/imagine prompt: ${parts.join(". ")} --ar ${ratio} --v 6.0 --style raw`;
}

/**
 * Devuelve el prompt natural para Flux/DALL-E a partir del spec de Inferencia Semántica.
 *
 * @param {object} spec - Objeto devuelto por expandIdeaToVisualSpec.
 * @returns {string} - Narrativa en inglés para Flux o DALL-E.
 */
export function getFluxPromptFromSpec(spec) {
  if (spec == null) return "";
  const flux = spec.generative_reconstruction?.dalle_flux_natural_prompt;
  if (typeof flux === "string" && flux.trim()) return flux.trim();
  const tech = spec.technical_analysis || {};
  const aesthetic = spec.aesthetic_dna || {};
  const parts = [
    tech.medium,
    tech.lighting_type,
    tech.camera_lens,
    aesthetic.mood,
    (aesthetic.key_visual_tokens || []).slice(0, 5).join(", "),
  ].filter(Boolean);
  return parts.join(". ");
}


/** Convierte una URL de imagen en data URL base64. */
async function fetchImageAsDataUrl(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const contentType = res.headers["content-type"] || "image/png";
  const base64 = Buffer.from(res.data).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

/** Instrucción fija para que el modelo no dibuje el logo de Meta. */
const NO_META_LOGO_SUFFIX =
  '\n\nIMPORTANT: Do NOT include the Meta logo, Facebook logo, Instagram logo, or any Meta/Facebook/Instagram branding (e.g. "from Meta", infinity symbol, watermarks) in the image. The ad is for use on Meta platforms but the image itself must not show Meta\'s branding.';

/**
 * Construye lista ordenada de URLs y prefijo de prompt para referencia.
 * Solo se envían logo y/o producto (máximo 2 imágenes); no se envían "other".
 * @param {{ logo?: string|null, product?: string|null, other?: string[] } | null} referenceAssets
 * @returns {{ urls: string[], promptPrefix: string }}
 */
function buildReferenceAssetsOrder(referenceAssets) {
  const urls = [];
  const labels = [];
  if (!referenceAssets || typeof referenceAssets !== "object") {
    return { urls: [], promptPrefix: "" };
  }
  if (referenceAssets.logo) {
    urls.push(referenceAssets.logo);
    labels.push(
      "1) LOGO: if provided, incorporate the EXACT logo into the design",
    );
  }
  if (referenceAssets.product) {
    urls.push(referenceAssets.product);
    labels.push(
      `${urls.length}) PRODUCT: if provided, incorporate the EXACT product into the scene`,
    );
  }
  const promptPrefix =
    urls.length > 0
      ? `Reference images in order: ${labels.join(". ")}. Then generate the following scene:\n\n`
      : "";
  return { urls, promptPrefix };
}

/**
 * Genera una imagen creativa con Vertex AI Imagen 3 (ideal para Meta Ads / Instagram).
 * @param {string} prompt - Prompt en inglés para la imagen
 * @param {string} [aspectRatio] - "4:5" | "3:4" | "1:1" | "9:16" | "16:9" etc.
 * @param {{ logo?: string|null, product?: string|null, other?: string[] } | { url: string }[] | null} [referenceAssetsOrImages] - Si es objeto { logo, product, other } se envían en ese orden con roles; si es array se mantiene compatibilidad.
 * @param {{ source?: string }} [opts] - opts.source para métricas: "creative" | "welcome"
 * @returns {Promise<string|null>} - data URL base64 (data:image/png;base64,...) o null
 */
export async function generateCreativeImageSeedream(
  prompt,
  aspectRatio = "4:5",
  referenceAssetsOrImages = null,
  opts = {},
) {
  const metricSource = opts?.source || "creative";
  const fullPrompt = (prompt || "").trim() + NO_META_LOGO_SUFFIX;

  console.log(
    "[Creative image] Vertex Imagen 3 | Aspect:",
    aspectRatio,
  );

  const startTime = Date.now();
  const imageDataUrl = await vertexImagePost(fullPrompt, aspectRatio);
  const durationMs = Date.now() - startTime;

  if (imageDataUrl) {
    recordImageGeneration({
      model: VERTEX_IMAGEN_MODEL,
      size: aspectRatio,
      aspectRatio: aspectRatio,
      durationMs,
      source: metricSource,
      estimatedUsd: 0,
    });
  }

  return imageDataUrl;
}

/** @deprecated Usar generateCreativeImageSeedream. Conservado por compatibilidad. */
export async function generateCreativeImageNanoBananaPro(
  prompt,
  aspectRatio = "1:1",
) {
  return generateCreativeImageSeedream(prompt, aspectRatio || "4:5");
}

const DEBUG_ICP_IMAGE =
  process.env.DEBUG_ICP_IMAGE === "1" || process.env.DEBUG_ICP_IMAGE === "true";

/**
 * Genera una imagen para ICP (avatar o hero/banner).
 * Si OPENROUTER_ICP_IMAGE_MODEL es "dicebear"|"placeholder"|"free": usa avatares/banners gratis (DiceBear + Picsum).
 * Si no: usa Vertex AI Imagen 3 (consume créditos).
 * @param {string} prompt - Descripción en texto para la imagen
 * @param {string} aspectRatio - "1:1" (avatar) o "21:9" (hero/banner)
 * @returns {Promise<string|null>} - data URL base64 (data:image/png;base64,...) o null
 */
export async function generateProfileImage(prompt, aspectRatio = "1:1") {
  console.log("[ICP image] Vertex Imagen 3 | Aspect:", aspectRatio);

  const startTime = Date.now();
  const imageDataUrl = await vertexImagePost(prompt, aspectRatio);
  const durationMs = Date.now() - startTime;

  if (imageDataUrl) {
    recordImageGeneration({
      model: VERTEX_IMAGEN_MODEL,
      size: aspectRatio,
      aspectRatio,
      durationMs,
      source: "profiles",
      estimatedUsd: 0,
    });
  }

  return imageDataUrl;
}
