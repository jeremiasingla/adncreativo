import axios from "axios";
import { recordLLMRequest, recordImageGeneration } from "./metrics.service.js";

export async function refineBrandingWithLLM(input) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-nano";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

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

  const requestBody = (includeScreenshot) => ({
    model,
    temperature: 0,
    max_tokens: 600,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a prompt engineer and branding expert. Use the Firecrawl extraction data (see Firecrawl LLM Extract patterns) and the screenshot image to reliably EXTRACT the site's palette and key text. Use XML-style tags in your reasoning/examples to clarify fields, but return ONLY the required JSON as the final output.

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
`,
      },
      {
        role: "user",
        content: buildUserContent(includeScreenshot),
      },
    ],
  });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const hasScreenshot = Boolean(input?.screenshot);
  const { screenshot: _s, ...inputForText } = input;
  const textPayload = JSON.stringify(inputForText);
  const textPayloadLen = textPayload.length;
  const screenshotLen = input?.screenshot ? String(input.screenshot).length : 0;

  console.log("[LLM debug] Request:", {
    model,
    hasScreenshot,
    textPayloadBytes: textPayloadLen,
    screenshotPayloadBytes: screenshotLen || undefined,
  });

  const startTime = Date.now();
  let response;
  try {
    response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      requestBody(true),
      { headers },
    );
    console.log("[LLM debug] OpenRouter OK, status:", response.status);
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    console.error("[LLM debug] OpenRouter error:", {
      message: err.message,
      status,
      statusText: err.response?.statusText,
      body: body ? JSON.stringify(body, null, 2) : "(no body)",
    });
    if (status === 400 && body) {
      console.error("⚠️ OpenRouter 400 details:", JSON.stringify(body, null, 2));
    }
    if (status === 400 && input?.screenshot) {
      console.log("[LLM debug] Retrying without screenshot...");
      try {
        response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          requestBody(false),
          { headers },
        );
        console.log("[LLM debug] Retry without screenshot OK, status:", response?.status);
      } catch (retryErr) {
        console.error("[LLM debug] Retry failed:", {
          message: retryErr.message,
          status: retryErr.response?.status,
          body: retryErr.response?.data ? JSON.stringify(retryErr.response.data, null, 2) : "(no body)",
        });
        throw retryErr;
      }
    } else {
      throw err;
    }
  }

  if (!response) {
    throw new Error("LLM request failed");
  }

  console.log(
    "🧪 OpenRouter response:",
    JSON.stringify(response.data, null, 2),
  );

  // Trackear métricas de costo
  const usage = response.data?.usage;
  if (usage) {
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalCost = usage.total_cost || 0;
    recordLLMRequest({
      model,
      promptTokens,
      completionTokens,
      totalCost,
      durationMs: Date.now() - startTime,
      source: "branding",
      workspaceSlug: input?.url ? new URL(input.url).hostname : null
    });
  }

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }

  return JSON.parse(content);
}

/** Genera la base de conocimiento del negocio a partir de url + branding + metadata (solo texto, sin imagen). */
export async function generateKnowledgeBase(input) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-nano";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const text = JSON.stringify(input);
  const requestBody = {
    model,
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      {
        role: "system",
        content: `You are a business strategist and copywriter. Given a website URL and extracted branding data (company name, headline, metadata like title and description), write a structured "Knowledge Base" document in plain text (no markdown headers, no JSON). Use the exact section titles below, each on its own line followed by a blank line and then the paragraph(s). Write in the same language as the company name and headline (e.g. Spanish if they are in Spanish). Infer reasonable content for products, audience, value proposition, etc. based on the brand and metadata; be concise but professional.

Required sections in this order:
1) "Company Overview" - one or two paragraphs about the company mission and what they do.
2) "Products/Services" - key offerings and benefits (bullet-style lines are ok).
3) "Target Audience" - who they serve.
4) "Value Proposition" - why customers choose them.
5) "Brand Voice & Personality" - tone and how they communicate.
6) "Key Messages" - main talking points.
7) "Industry Context" - brief industry/market context.

Output ONLY the document text, no preamble or explanation.`,
      },
      {
        role: "user",
        content: [{ type: "text", text }],
      },
    ],
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    requestBody,
    { headers },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid knowledge base");
  }

  return content.trim();
}

/** Genera 5 customer profiles (ICP) a partir de la base de conocimiento y branding. */
export async function generateCustomerProfiles(input) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-nano";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

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
    messages: [
      {
        role: "system",
        content: `You are a marketing strategist. Given a business knowledge base and branding (company name, headline), generate exactly 5 Ideal Customer Profiles (ICPs) as a JSON object.

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "profiles": [
    {
      "name": "Full name with descriptor, e.g. Carlos, the Ambitious Newcomer",
      "title": "Short role label, e.g. Aspiring Detailer Entrepreneur",
      "description": "One or two sentences describing this persona and why they care about the business.",
      "demographics": {
        "age": "age range e.g. 28-35",
        "gender": "Male or Female",
        "income": "e.g. $25,000-40,000",
        "location": "e.g. Urban areas, Argentina",
        "education": "e.g. Bachelor's degree"
      },
      "painPoints": ["string", "string", "string"],
      "goals": ["string", "string", "string"],
      "channels": ["string", "string", "string"]
    }
  ]
}

Rules:
- Exactly 5 profiles. Diversify: different ages, genders, situations (e.g. newcomer, side hustler, enthusiast, professional, mentor).
- Use the same language as the company name/headline (e.g. Spanish if the brand is in Spanish).
- Each profile must have name, title, description, demographics (all 5 fields), painPoints (3 items), goals (3 items), channels (3 items).
- Be specific to the business and industry from the knowledge base.`,
      },
      {
        role: "user",
        content: [{ type: "text", text }],
      },
    ],
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    requestBody,
    { headers },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid customer profiles");
  }

  const parsed = JSON.parse(content);
  const profiles = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
  if (profiles.length < 5) {
    throw new Error(`LLM returned ${profiles.length} profiles, expected 5`);
  }

  return profiles.slice(0, 5);
}

/**
 * Genera 100 titulares/headlines para la página de ventas y creativos.
 * Usa el prompt tipo copywriter profesional, 4U's de Mark Ford, 7-15 palabras.
 */
export async function generateHeadlines(input) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-nano";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const {
    companyName,
    headline,
    knowledgeBaseSummary,
    clientIdealSummary,
    nicheOrSubniche,
    useVoseo,
  } = input;

  const voseoRule = useVoseo
    ? `
VOSEO (público argentino/uruguayo): Si el público es argentino o uruguayo, OBLIGATORIO usá VOSEO en todos los titulares. Ejemplos: "empezá", "aprendé", "mirá", "tené", "hacé", "sabé", "andá", "vení", "decime", "probá", "mejorá", "cambiá", "sumate", "descubrí". NO uses tuteo (empieza, aprende, mira, ten, haz, etc.) en ese caso.`
    : `
TUTEO (resto de hispanohablantes): Si el público no es argentino/uruguayo, usá tuteo: "empieza", "aprende", "mira", "ten", "haz", etc.`;

  const text = JSON.stringify({
    companyName: companyName || "el negocio",
    headline: headline || "",
    knowledgeBaseSummary: (knowledgeBaseSummary || "").slice(0, 3000),
    clientIdealSummary: clientIdealSummary || "",
    nicheOrSubniche: nicheOrSubniche || "",
    useVoseo: Boolean(useVoseo),
  });

  const requestBody = {
    model,
    temperature: 0.7,
    max_tokens: 12000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres un copywriter profesional de clase mundial especializado en hooks para anuncios y creativos. Tu tarea es desarrollar exactamente 100 titulares/headlines que funcionen como GANCHOS VISUALES: texto grande, impactante y llamativo que detenga el scroll y obligue a leer.

Reglas obligatorias:
- Devuelve EXACTAMENTE 100 headlines en un JSON con la clave "headlines" que sea un array de strings.
- Cada headline es un HOOK: corto, punchy, que funcione como texto grande en un anuncio (Instagram, Facebook, etc.). Prioriza frases de 5 a 12 palabras que se lean de un vistazo.
- Sigue las 4U's de Mark Ford: Útil, Urgente, Único, Ultra-específico.
- Debe ser el tipo de frase que se pone en GRANDE en un creativo: una promesa clara, una pregunta que enganche, o una afirmación audaz. Nada genérico.
- Habla del gran beneficio; rebate objeciones; inspira a actuar. Promete resultados concretos cuando tenga sentido.
- Usa el mismo idioma que el headline y la empresa (ej. español si la marca está en español).
- Evita titulares largos o que no funcionen como texto principal de un anuncio visual.
${voseoRule}

Ejemplos con voseo (Argentina/Uruguay): "Empezá ahora", "Aprendé en 10 días", "Mirá cómo funciona", "Descubrí el método", "Sumate al cambio".
Ejemplos con tuteo (resto): "Empieza ahora", "Aprende en 10 días", "Mira cómo funciona".

Output: ÚNICAMENTE un objeto JSON con esta estructura, sin markdown ni texto extra:
{"headlines": ["titular 1", "titular 2", ... "titular 100"]}`,
      },
      {
        role: "user",
        content: `Genera 100 titulares para esta página de ventas. Datos del negocio y cliente ideal (si useVoseo es true, todos los titulares en español deben usar voseo: empezá, aprendé, mirá, etc.):\n${text}`,
      },
    ],
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    requestBody,
    { headers },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty or invalid headlines");
  }

  const parsed = JSON.parse(content);
  const headlines = Array.isArray(parsed?.headlines) ? parsed.headlines : [];
  return headlines.filter((h) => typeof h === "string" && h.trim().length > 0);
}

/**
 * Genera un prompt para crear una imagen/creativo a partir de un headline,
 * teniendo en cuenta el tipo de público, branding y producto.
 */
export async function generateCreativeImagePrompt(input) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4.1-nano";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const { headline, companyName, brandingSummary, clientIdealSummary, brandingColors, hasLogoOrImages, aspectRatio: inputAspectRatio } = input;
  const aspectRatio = inputAspectRatio && typeof inputAspectRatio === "string" ? inputAspectRatio.trim() : "4:5";
  const colors = brandingColors && typeof brandingColors === "object" ? brandingColors : {};
  const colorList = [
    colors.primary && `primary: ${colors.primary}`,
    colors.secondary && `secondary: ${colors.secondary}`,
    colors.accent && `accent: ${colors.accent}`,
    colors.background && `background: ${colors.background}`,
    colors.textPrimary && `text: ${colors.textPrimary}`,
  ]
    .filter(Boolean)
    .join(", ");
  const text = JSON.stringify({
    headline: headline || "",
    companyName: companyName || "",
    brandingSummary: (brandingSummary || "").slice(0, 1500),
    clientIdealSummary: (clientIdealSummary || "").slice(0, 800),
    brandColors: colorList || null,
    hasLogoOrImages: Boolean(hasLogoOrImages),
    aspectRatio,
  });

  const logoInstruction = hasLogoOrImages
    ? `Include a line instructing: "Include the brand logo from the reference image exactly and prominently (e.g. top corner or center). Do not alter or redraw the logo—reproduce it as in the reference."`
    : "Do not mention a logo or reference images.";

  const requestBody = {
    model,
    temperature: 0.5,
    max_tokens: 1200,
    messages: [
      {
        role: "system",
        content: `You are an art director writing image generation prompts for Meta Ads. Your output must be ONE complete prompt in ENGLISH, structured EXACTLY like this template. Output ONLY the prompt, no intro or explanation.

Structure to follow (use these section titles and keep the same order):

1. Opening line (one sentence): "Create a high-impact, scroll-stopping advertising image for Meta Ads."

2. Main subject (1-2 sentences): Hyper-realistic, professional photography description of the product/service/scene. Be specific to the niche (e.g. car detailing: flawless paint, mirror finish, premium; other niches: adapt accordingly). Premium, expert, results-focused.

3. Scene: "Scene: [environment description], [background]. Use [brand HEX colors if provided] that reinforce a premium, professional brand identity." When brandColors are provided, list the HEX codes (e.g. "subtle light blue accents (#5FB4E8) and green highlights (#2ECC71)").

4. Lighting: "Lighting: [cinematic/professional style], [mood], high contrast, ultra sharp focus, premium commercial photography quality."

5. Headline block (mandatory):
BIG, BOLD, HIGH-CONTRAST HEADLINE TEXT clearly visible and impossible to ignore:
"[EXACT HEADLINE IN BRAND LANGUAGE - e.g. Spanish]"

Headline should be large, centered or top-focused, clean modern sans-serif typography, premium and bold, optimized for mobile feed viewing and instant attention.

6. Visual hierarchy (tabbed list):
Visual hierarchy:
	1.	Headline hook first (scroll-stop)
	2.	[Main subject/result] second
	3.	Brand premium feel third

7. Mood & positioning: "Mood & positioning: [from brandingSummary/personality - e.g. expert, premium, results-driven, trustworthy]."

8. Target audience: "Target audience: [short summary from clientIdealSummary]."

9. Composition: Adapt to the image format (aspectRatio). Use EXACTLY this wording based on aspectRatio:
- "1:1" → "Composition optimized for Meta Ads performance, square format (1:1), balanced layout, high conversion focus, no people, clean layout, professional advertising aesthetic."
- "4:5" or "3:4" → "Composition optimized for Meta Ads performance, portrait format (aspectRatio), vertical layout ideal for feed, high conversion focus, no people, clean layout, professional advertising aesthetic."
- "9:16" → "Composition optimized for Meta Ads performance, vertical/stories format (9:16), tall layout for Reels/Stories, high conversion focus, no people, clean layout, professional advertising aesthetic."
- "16:9" or "21:9" → "Composition optimized for Meta Ads performance, landscape format (aspectRatio), horizontal layout, high conversion focus, no people, clean layout, professional advertising aesthetic."
Replace "aspectRatio" in the sentence with the actual value (e.g. "4:5", "9:16"). Frame the scene and headline placement for that aspect ratio (e.g. vertical = more headroom for text; square = centered; landscape = wider scene).

CRITICAL - NO META LOGO: The generated image MUST NOT include the Meta logo, Facebook logo, Instagram logo, or any Meta/Facebook/Instagram branding (e.g. "from Meta", icons, watermarks). The creative is for use ON Meta platforms but must not display Meta's branding in the image itself.

${logoInstruction}
When brandColors are provided, use the exact HEX values in the Scene section. The headline in quotes must be the EXACT headline from the input, in the same language (e.g. Spanish).`,
      },
      {
        role: "user",
        content: `Generate the full image prompt following the structure. Use the exact headline and brand context below.\n${text}`,
      },
    ],
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    requestBody,
    { headers },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("LLM returned empty creative image prompt");
  }

  return content.trim().replace(/^["']|["']$/g, "");
}

/** Modelo de OpenAI para imágenes de creativos (Meta Ads, Instagram, etc.). */
const CREATIVE_IMAGE_MODEL = "gpt-image-1.5";

/** Mapeo aspect ratio → size de la API OpenAI (1024x1024 | 1024x1536 | 1536x1024). */
const ASPECT_TO_OPENAI_SIZE = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "3:4": "1024x1536",
  "9:16": "1024x1536",
  "4:3": "1536x1024",
  "16:9": "1536x1024",
  "21:9": "1536x1024",
};

/**
 * Obtiene el buffer de una imagen desde URL o data URL.
 * @param {string} url - URL http(s) o data:image/...;base64,...
 * @returns {Promise<Buffer|null>}
 */
async function fetchImageBuffer(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:")) {
    const base64 = url.replace(/^data:image\/\w+;base64,/, "");
    try {
      return Buffer.from(base64, "base64");
    } catch {
      return null;
    }
  }
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
    return Buffer.from(res.data);
  } catch (err) {
    console.warn("[Creative image] Failed to fetch reference image:", err.message);
    return null;
  }
}

/**
 * Genera una imagen creativa con OpenAI gpt-image-1.5 (ideal para Meta Ads / Instagram).
 * Sin referenceImages: POST /v1/images/generations. Con referenceImages: POST /v1/images/edits.
 * @param {string} prompt - Prompt en inglés para la imagen
 * @param {string} [aspectRatio] - "4:5" | "3:4" | "1:1" | "9:16" | "16:9" etc.
 * @param {{ url: string }[]} [referenceImages] - Logo y/o imágenes de marca para incluir en la imagen
 * @param {{ source?: string }} [opts] - opts.source para métricas: "creative" | "welcome"
 * @returns {Promise<string|null>} - data URL base64 (data:image/png;base64,...) o null
 */
/** Instrucción fija añadida a todo prompt de creativo para que el modelo de imagen no dibuje el logo de Meta. */
const NO_META_LOGO_SUFFIX = "\n\nIMPORTANT: Do NOT include the Meta logo, Facebook logo, Instagram logo, or any Meta/Facebook/Instagram branding (e.g. \"from Meta\", infinity symbol, watermarks) in the image. The ad is for use on Meta platforms but the image itself must not show Meta's branding.";

export async function generateCreativeImageSeedream(prompt, aspectRatio = "4:5", referenceImages = [], opts = {}) {
  const metricSource = opts?.source || "creative";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing (required for gpt-image-1.5 creative images)");
  }

  const fullPrompt = (prompt || "").trim() + NO_META_LOGO_SUFFIX;

  const allowedRatios = ["21:9", "16:9", "9:16", "4:5", "3:4", "4:3", "1:1"];
  const requestedRatio = aspectRatio && allowedRatios.includes(aspectRatio) ? aspectRatio : "4:5";
  const size = ASPECT_TO_OPENAI_SIZE[requestedRatio] || "1024x1536";

  console.log("[Creative image] Model:", CREATIVE_IMAGE_MODEL, "| Aspect:", requestedRatio, "| Size:", size);
  if (referenceImages?.length) {
    console.log("[Creative image] Reference images (logo/brand):", referenceImages.length);
  }

  const hasReferenceImages = Array.isArray(referenceImages) && referenceImages.length > 0 && referenceImages.some((img) => img?.url);

  if (hasReferenceImages) {
    const urls = referenceImages.filter((img) => img?.url).map((img) => img.url);
    const buffers = await Promise.all(urls.map((url) => fetchImageBuffer(url)));
    const validBuffers = buffers.filter(Boolean);
    if (validBuffers.length === 0) {
      console.warn("[Creative image] No valid reference images, falling back to generations (no logo).");
    } else {
      try {
        const form = new FormData();
        form.append("model", CREATIVE_IMAGE_MODEL);
        form.append("prompt", fullPrompt);
        form.append("size", size);
        validBuffers.forEach((buf, i) => {
          form.append("image[]", new Blob([buf], { type: "image/png" }), `image${i}.png`);
        });
        const start = Date.now();
        const res = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
        const durationMs = Date.now() - start;
        const data = await res.json();
        if (res.ok && data?.data?.[0]?.b64_json) {
          recordImageGeneration({
            model: CREATIVE_IMAGE_MODEL,
            size,
            aspectRatio: requestedRatio,
            durationMs,
            source: metricSource,
          });
          return `data:image/png;base64,${data.data[0].b64_json}`;
        }
        const errMsg = data?.error?.message ?? res.statusText;
        console.warn("[Creative image] OpenAI edits error:", res.status, errMsg);
      } catch (err) {
        console.warn("[Creative image] OpenAI edits failed:", err.message);
      }
    }
  }

  const start = Date.now();
  const response = await axios.post(
    "https://api.openai.com/v1/images/generations",
    {
      model: CREATIVE_IMAGE_MODEL,
      prompt: fullPrompt,
      n: 1,
      size,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    },
  );
  const durationMs = Date.now() - start;

  if (response.status !== 200) {
    const msg = response.data?.error?.message ?? response.data?.message ?? response.statusText;
    console.warn("[Creative image] OpenAI generations error:", response.status, msg);
    return null;
  }

  const b64 = response.data?.data?.[0]?.b64_json;
  if (typeof b64 === "string") {
    recordImageGeneration({
      model: CREATIVE_IMAGE_MODEL,
      size,
      aspectRatio: requestedRatio,
      durationMs,
      source: metricSource,
    });
    return `data:image/png;base64,${b64}`;
  }
  return null;
}

/** @deprecated Usar generateCreativeImageSeedream. Conservado por compatibilidad. */
export async function generateCreativeImageNanoBananaPro(prompt, aspectRatio = "1:1") {
  return generateCreativeImageSeedream(prompt, aspectRatio || "4:5");
}

/** Avatares y banners de ICP: Seedream 4.5 vía OpenRouter (modalities: ["image"]). */
const ICP_IMAGE_MODEL = "bytedance-seed/seedream-4.5";
const DEBUG_ICP_IMAGE = process.env.DEBUG_ICP_IMAGE === "1" || process.env.DEBUG_ICP_IMAGE === "true";

/**
 * Genera una imagen para ICP (avatar o banner) con Seedream 4.5 vía OpenRouter.
 * OpenRouter: modalities solo ["image"] para este modelo.
 * @param {string} prompt - Descripción en texto para la imagen
 * @param {string} aspectRatio - "1:1" (avatar) o "21:9" (banner)
 * @returns {Promise<string|null>} - data URL base64 (data:image/png;base64,...) o null
 */
export async function generateProfileImage(prompt, aspectRatio = "1:1") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const requestBody = {
    model: ICP_IMAGE_MODEL,
    modalities: ["image"],
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  if (aspectRatio && (aspectRatio === "21:9" || aspectRatio === "16:9" || aspectRatio === "1:1")) {
    requestBody.image_config = { aspect_ratio: aspectRatio };
  }

  console.log("[ICP image] Request:", {
    model: ICP_IMAGE_MODEL,
    modalities: requestBody.modalities,
    aspectRatio,
    promptLength: prompt?.length ?? 0,
    promptPreview: (prompt || "").slice(0, 80) + "...",
  });

  let response;
  try {
    response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      }
    );
  } catch (err) {
    console.error("[ICP image] Request error:", err.message);
    if (err.response) {
      console.error("[ICP image] Response status:", err.response.status);
      console.error("[ICP image] Response data:", JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }

  console.log("[ICP image] Response status:", response.status);
  if (response.status !== 200) {
    console.error("[ICP image] Error response status:", response.status);
    console.error("[ICP image] Error response data:", JSON.stringify(response.data, null, 2));
    console.error("[ICP image] Error response headers:", JSON.stringify(response.headers, null, 2));
  }

  if (response.status !== 200) {
    const msg = response.data?.error?.message ?? response.data?.message ?? response.statusText;
    const errorDetails = {
      status: response.status,
      message: msg,
      data: response.data,
      model: ICP_IMAGE_MODEL,
      aspectRatio
    };
    console.error("[ICP image] Full error details:", JSON.stringify(errorDetails, null, 2));
    throw new Error(`OpenRouter image: ${response.status} - ${msg}`);
  }

  const message = response.data?.choices?.[0]?.message;
  const images = message?.images;
  if (!Array.isArray(images) || images.length === 0) {
    console.log("[ICP image] No images in response. message keys:", message ? Object.keys(message) : "no message");
    return null;
  }
  const first = images[0];
  const url = first?.image_url?.url ?? first?.imageUrl?.url;
  if (typeof url === "string" && url.startsWith("data:")) {
    console.log("[ICP image] Got image, data URL length:", url.length);
    return url;
  }
  console.log("[ICP image] First image structure:", JSON.stringify(Object.keys(first || {})));
  return null;
}
