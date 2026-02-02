import React, { useState, useRef } from "react";
import { HexColorPicker } from "react-colorful";

function IconPencil({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function IconLink({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconX({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function IconTrash2({ className = "w-4 h-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconUpload({ className = "w-8 h-8" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m17 8-5-5-5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}
function IconPlus({ className = "w-6 h-6" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

const cardBase =
  "bg-gradient-to-br from-slate-200/60 via-slate-100/40 to-card rounded-2xl cursor-pointer transition-colors group relative border border-border flex flex-col overflow-hidden";
const cardLogo =
  "bg-gradient-to-br from-slate-200/80 via-slate-100/50 to-card rounded-2xl cursor-pointer transition-colors group relative border border-border flex flex-col overflow-hidden";
const pencilBtn =
  "absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10";
const pencilBtnSm =
  "absolute top-3 right-3 md:top-4 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10";

const colorSwatchStyle = (bg) => ({
  backgroundColor: bg,
  boxShadow:
    "rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px",
});

/** Resuelve URL de logo/imagen: si es relativa, la hace absoluta al origin. */
function resolveAssetUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  )
    return url;
  if (url.startsWith("/")) return window.location.origin + url;
  return url;
}

/** Convierte color a hex para input (rgb(r,g,b) -> #RRGGBB, hex queda igual). */
function colorToHex(value) {
  if (!value || typeof value !== "string") return "#000000";
  const trimmed = value.trim();
  if (trimmed.startsWith("#") && /^#[0-9A-Fa-f]{6}$/.test(trimmed))
    return trimmed;
  const rgb = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) {
    const r = Math.max(0, Math.min(255, parseInt(rgb[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgb[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgb[3], 10)));
    return (
      "#" +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }
  return trimmed.startsWith("#") ? trimmed : "#000000";
}

const DEFAULT_COLORS = [
  { key: "primary", label: "primario", fallback: "rgb(95, 180, 232)" },
  { key: "secondary", label: "secundario", fallback: "rgb(75, 85, 99)" },
  { key: "accent", label: "acento", fallback: "rgb(46, 204, 113)" },
  { key: "background", label: "fondo", fallback: "rgb(0, 0, 0)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "🇬🇧 English" },
  { value: "de", label: "🇩🇪 Alemán" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Francés" },
  { value: "it", label: "🇮🇹 Italiano" },
  { value: "pt", label: "🇵🇹 Portugués" },
  { value: "nl", label: "🇳🇱 Neerlandés" },
  { value: "sv", label: "🇸🇪 Sueco" },
  { value: "da", label: "🇩🇰 Danés" },
  { value: "no", label: "🇳🇴 Noruego" },
  { value: "fi", label: "🇫🇮 Finlandés" },
  { value: "pl", label: "🇵🇱 Polaco" },
  { value: "cs", label: "🇨🇿 Checo" },
  { value: "sk", label: "🇸🇰 Eslovaco" },
  { value: "hu", label: "🇭🇺 Húngaro" },
  { value: "ro", label: "🇷🇴 Rumano" },
  { value: "bg", label: "🇧🇬 Búlgaro" },
  { value: "uk", label: "🇺🇦 Ucraniano" },
  { value: "ru", label: "🇷🇺 Ruso" },
  { value: "el", label: "🇬🇷 Griego" },
  { value: "tr", label: "🇹🇷 Turco" },
  { value: "ja", label: "🇯🇵 Japonés" },
  { value: "ko", label: "🇰🇷 Coreano" },
  { value: "zh", label: "🇨🇳 Chino" },
  { value: "th", label: "🇹🇭 Tailandés" },
  { value: "vi", label: "🇻🇳 Vietnamita" },
  { value: "id", label: "🇮🇩 Indonesio" },
  { value: "ar", label: "🇸🇦 Árabe" },
  { value: "he", label: "🇮🇱 Hebreo" },
];

const FORMALITY_OPTIONS = [
  {
    value: "formal",
    label: "Formal",
    desc: "Respetuoso, profesional (usted, Sie, Vous)",
  },
  {
    value: "informal",
    label: "Informal",
    desc: "Cercano, amigable (tú, du, tu)",
  },
  { value: "neutral", label: "Neutral", desc: "Según el contexto" },
];

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "Nunito",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Sora",
  "Outfit",
  "Urbanist",
  "Bricolage Grotesque",
  "Poetsen One",
  "Instrument Serif",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
];

// Mismos estilos que el sidebar: gradient, sombras, tipografía (14px, 600, line-height 20px, letter-spacing -0.16px, Inter Tight)
const popupButtonPrimary =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold leading-5 tracking-[-0.16px] font-sans text-center ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer bg-gradient-to-b from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] border border-primary/50";
const popupButtonIcon =
  "inline-flex items-center justify-center size-10 rounded-xl text-sm font-semibold leading-5 tracking-[-0.16px] font-sans ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground text-muted-foreground cursor-pointer";

const MODAL_CLOSE_MS = 200;

export default function BrandingView({ branding }) {
  const b = branding || {};
  const companyNameFromBranding = b.companyName || "—";
  const [companyNameOverride, setCompanyNameOverride] = useState(undefined);
  const companyName =
    companyNameOverride === undefined
      ? companyNameFromBranding
      : companyNameOverride;
  const websiteUrl = b.websiteUrl || "";
  const displayUrl = websiteUrl
    ? (() => {
        try {
          const u = new URL(websiteUrl);
          return u.hostname + u.pathname;
        } catch {
          return websiteUrl;
        }
      })()
    : "";
  const logoUrlFromBranding = resolveAssetUrl(b.logo);
  const [logoOverride, setLogoOverride] = useState(undefined);
  const logoDisplayUrl =
    logoOverride === undefined ? logoUrlFromBranding : logoOverride;
  const headlineFromBranding = b.headline || "";
  const [headlineOverride, setHeadlineOverride] = useState(undefined);
  const headline =
    headlineOverride === undefined ? headlineFromBranding : headlineOverride;
  const colors = b.colors || {};
  const fonts = b.fonts || {};
  const fontPrimaryFromBranding = fonts.primary || "Montserrat";
  const fontHeadingFromBranding =
    fonts.heading || fonts.primary || "Montserrat";
  const [fontsOverride, setFontsOverride] = useState(undefined);
  const fontPrimary = fontsOverride?.primary ?? fontPrimaryFromBranding;
  const fontHeading = fontsOverride?.heading ?? fontHeadingFromBranding;
  const imagesFromBranding = Array.isArray(b.images)
    ? b.images.map(resolveAssetUrl).filter(Boolean)
    : [];
  const [imagesOverride, setImagesOverride] = useState(undefined);
  const displayedImages = imagesOverride ?? imagesFromBranding;
  const brandImages = displayedImages.slice(0, 6);
  const moreImages = displayedImages.slice(6, 10);
  const moreCount = Math.max(0, displayedImages.length - 6);

  const [editIdentityOpen, setEditIdentityOpen] = useState(false);
  const [editIdentityClosing, setEditIdentityClosing] = useState(false);
  const [editIdentityCompanyName, setEditIdentityCompanyName] = useState("");

  const openEditIdentity = () => {
    setEditIdentityCompanyName(companyName === "—" ? "" : companyName);
    setEditIdentityOpen(true);
  };
  const closeEditIdentity = () => {
    setEditIdentityClosing(true);
    setTimeout(() => {
      setEditIdentityClosing(false);
      setEditIdentityOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const saveIdentity = () => {
    setCompanyNameOverride(editIdentityCompanyName.trim() || undefined);
    closeEditIdentity();
  };

  const [editLogoOpen, setEditLogoOpen] = useState(false);
  const [editLogoClosing, setEditLogoClosing] = useState(false);
  const [editLogoDraft, setEditLogoDraft] = useState(null);
  const [editLogoUrlInput, setEditLogoUrlInput] = useState("");
  const fileInputRef = useRef(null);

  const [colorsOverride, setColorsOverride] = useState(undefined);
  const resolvedColors = colorsOverride ?? colors;
  const [editColorsOpen, setEditColorsOpen] = useState(false);
  const [editColorsClosing, setEditColorsClosing] = useState(false);
  const [editColorsDraft, setEditColorsDraft] = useState({});
  const [selectedColorKey, setSelectedColorKey] = useState("primary");

  const openEditColors = () => {
    const base = colorsOverride ?? colors;
    setEditColorsDraft({
      primary: colorToHex(base.primary || DEFAULT_COLORS[0].fallback),
      secondary: colorToHex(base.secondary || DEFAULT_COLORS[1].fallback),
      accent: colorToHex(base.accent || DEFAULT_COLORS[2].fallback),
      background: colorToHex(base.background || DEFAULT_COLORS[3].fallback),
    });
    setSelectedColorKey("primary");
    setEditColorsOpen(true);
  };
  const closeEditColors = () => {
    setEditColorsClosing(true);
    setTimeout(() => {
      setEditColorsClosing(false);
      setEditColorsOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const saveColors = () => {
    setColorsOverride(editColorsDraft);
    closeEditColors();
  };
  const updateColorsDraft = (key, hex) => {
    const normalized = hex.trim().startsWith("#")
      ? hex.trim()
      : "#" + hex.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
      setEditColorsDraft((prev) => ({ ...prev, [key]: normalized }));
    }
  };

  const openEditLogo = () => {
    setEditLogoDraft(logoDisplayUrl);
    setEditLogoUrlInput("");
    setEditLogoOpen(true);
  };
  const closeEditLogo = () => {
    setEditLogoClosing(true);
    setTimeout(() => {
      setEditLogoClosing(false);
      setEditLogoOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setEditLogoDraft(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const addLogoFromUrl = () => {
    const url = editLogoUrlInput.trim();
    if (!url) return;
    try {
      new URL(url);
      setEditLogoDraft(url);
      setEditLogoUrlInput("");
    } catch (_) {}
  };
  const saveLogo = () => {
    setLogoOverride(editLogoDraft);
    closeEditLogo();
  };
  const removeLogoInModal = () => setEditLogoDraft(null);

  const [editHeadlineOpen, setEditHeadlineOpen] = useState(false);
  const [editHeadlineClosing, setEditHeadlineClosing] = useState(false);
  const [editHeadlineDraft, setEditHeadlineDraft] = useState("");
  const openEditHeadline = () => {
    setEditHeadlineDraft(headline || "");
    setEditHeadlineOpen(true);
  };
  const closeEditHeadline = () => {
    setEditHeadlineClosing(true);
    setTimeout(() => {
      setEditHeadlineClosing(false);
      setEditHeadlineOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const saveHeadline = () => {
    setHeadlineOverride(editHeadlineDraft.trim() || undefined);
    closeEditHeadline();
  };

  const languageFromBranding = b.language || "es";
  const formalityFromBranding = b.formality || "neutral";
  const [languageOverride, setLanguageOverride] = useState(undefined);
  const [formalityOverride, setFormalityOverride] = useState(undefined);
  const currentLanguageCode = languageOverride ?? languageFromBranding;
  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === currentLanguageCode)?.label ??
    "🇪🇸 Español";
  const currentFormality = formalityOverride ?? formalityFromBranding;

  const [editLanguageOpen, setEditLanguageOpen] = useState(false);
  const [editLanguageClosing, setEditLanguageClosing] = useState(false);
  const [editLanguageDraftLang, setEditLanguageDraftLang] = useState("es");
  const [editLanguageDraftFormality, setEditLanguageDraftFormality] =
    useState("neutral");
  const openEditLanguage = () => {
    setEditLanguageDraftLang(currentLanguageCode);
    setEditLanguageDraftFormality(currentFormality);
    setEditLanguageOpen(true);
  };
  const closeEditLanguage = () => {
    setEditLanguageClosing(true);
    setTimeout(() => {
      setEditLanguageClosing(false);
      setEditLanguageOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const saveLanguage = () => {
    setLanguageOverride(editLanguageDraftLang);
    setFormalityOverride(editLanguageDraftFormality);
    closeEditLanguage();
  };

  const [editFontsOpen, setEditFontsOpen] = useState(false);
  const [editFontsClosing, setEditFontsClosing] = useState(false);
  const [editFontsDraftHeading, setEditFontsDraftHeading] =
    useState("Montserrat");
  const [editFontsDraftPrimary, setEditFontsDraftPrimary] =
    useState("Montserrat");
  const openEditFonts = () => {
    setEditFontsDraftHeading(fontHeading);
    setEditFontsDraftPrimary(fontPrimary);
    setEditFontsOpen(true);
  };
  const closeEditFonts = () => {
    setEditFontsClosing(true);
    setTimeout(() => {
      setEditFontsClosing(false);
      setEditFontsOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const saveFonts = () => {
    setFontsOverride({
      heading: editFontsDraftHeading || fontHeadingFromBranding,
      primary: editFontsDraftPrimary || fontPrimaryFromBranding,
    });
    closeEditFonts();
  };

  const [editImagesOpen, setEditImagesOpen] = useState(false);
  const [editImagesClosing, setEditImagesClosing] = useState(false);
  const [editImagesDraft, setEditImagesDraft] = useState([]);
  const [editImagesUrlInput, setEditImagesUrlInput] = useState("");
  const imagesFileInputRef = useRef(null);
  const openEditImages = () => {
    setEditImagesDraft([...displayedImages]);
    setEditImagesUrlInput("");
    setEditImagesOpen(true);
  };
  const closeEditImages = () => {
    setEditImagesClosing(true);
    setTimeout(() => {
      setEditImagesClosing(false);
      setEditImagesOpen(false);
    }, MODAL_CLOSE_MS);
  };
  const saveImages = () => {
    setImagesOverride(editImagesDraft.length ? editImagesDraft : undefined);
    closeEditImages();
  };
  const addImagesFromFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!files.length) return;
    let added = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setEditImagesDraft((prev) => [...prev, reader.result]);
        added++;
      };
      reader.readAsDataURL(file);
    });
  };
  const addImageFromUrl = () => {
    const url = editImagesUrlInput.trim();
    if (!url) return;
    try {
      new URL(url);
      setEditImagesDraft((prev) => [...prev, url]);
      setEditImagesUrlInput("");
    } catch (_) {}
  };
  const removeImageAtIndex = (index) => {
    setEditImagesDraft((prev) => prev.filter((_, i) => i !== index));
  };
  const handleImagesDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addImagesFromFiles(e.dataTransfer.files);
  };
  const handleImagesDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="h-full p-4 md:p-6 pt-2">
          <div className="w-full h-full relative">
            <div className="h-full overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:auto-rows-[180px] p-2">
                {/* Nombre + URL */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditIdentity}
                  onKeyDown={(e) => e.key === "Enter" && openEditIdentity()}
                  className={`order-1 md:order-2 md:col-span-2 ${cardBase} p-8 justify-center`}
                  style={{ opacity: 1 }}
                >
                  <div
                    className={pencilBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-semibold text-foreground font-instrument-serif leading-tight">
                    {companyName}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground mt-3">
                    <IconLink className="shrink-0" />
                    <span className="truncate text-base">
                      {displayUrl || "—"}
                    </span>
                  </div>
                </div>

                {/* Logo */}
                {logoDisplayUrl ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openEditLogo}
                    onKeyDown={(e) => e.key === "Enter" && openEditLogo()}
                    className={`order-2 md:order-1 aspect-square md:aspect-auto md:col-span-2 md:row-span-2 ${cardLogo} p-4 md:p-6`}
                    style={{
                      opacity: 1,
                      boxShadow: "rgba(0, 0, 0, 0.15) 0px 0px 0px 0px",
                    }}
                  >
                    <div
                      className={pencilBtn}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconPencil className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-h-0 flex items-center justify-center w-full overflow-hidden">
                      <img
                        alt="Logo de la empresa"
                        className="max-w-full max-h-full object-contain rounded-xl"
                        src={logoDisplayUrl}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="mt-4 hidden md:block">
                      <h3 className="font-instrument-serif text-xl text-foreground font-medium">
                        Logo
                      </h3>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openEditLogo}
                    onKeyDown={(e) => e.key === "Enter" && openEditLogo()}
                    className={`order-2 md:order-1 aspect-square md:aspect-auto md:col-span-2 md:row-span-2 ${cardLogo} p-4 md:p-6`}
                  >
                    <div className="flex-1 min-h-0 flex items-center justify-center w-full gap-2">
                      <IconPlus className="w-6 h-6 shrink-0 text-current" />
                      <span>Agregar logo</span>
                    </div>
                    <div className="mt-4 hidden md:block">
                      <h3 className="font-instrument-serif text-xl font-medium text-inherit">
                        Logo
                      </h3>
                    </div>
                  </div>
                )}

                {/* Modal Edit Logo */}
                {(editLogoOpen || editLogoClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editLogoClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditLogo}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel bg-card rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto ${
                          editLogoClosing ? "modal-closing" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-logo-title"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3
                              id="edit-logo-title"
                              className="text-xl font-semibold text-foreground font-instrument-serif"
                            >
                              Editar Logo
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Subí una imagen o pegá la URL de tu logo
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={closeEditLogo}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="relative group">
                            <div className="bg-muted rounded-xl p-6 flex items-center justify-center min-h-[120px]">
                              {editLogoDraft ? (
                                <img
                                  alt="Logo actual"
                                  className="max-h-24 max-w-full object-contain"
                                  src={editLogoDraft}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  Sin logo
                                </span>
                              )}
                            </div>
                            {editLogoDraft && (
                              <button
                                type="button"
                                onClick={removeLogoInModal}
                                className="absolute top-2 right-2 inline-flex items-center justify-center size-10 rounded-xl text-sm font-semibold leading-5 tracking-[-0.16px] font-sans text-center transition-all opacity-0 group-hover:opacity-100 hover:opacity-100"
                                style={{
                                  backgroundColor:
                                    "oklab(0.618814 0.213973 0.103287 / 0.1)",
                                  color: "rgb(244, 33, 46)",
                                }}
                                aria-label="Quitar logo"
                              >
                                <IconTrash2 />
                              </button>
                            )}
                          </div>
                          <label
                            htmlFor="edit-logo-file"
                            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all"
                          >
                            <input
                              id="edit-logo-file"
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoFile}
                            />
                            <div className="flex flex-col items-center gap-2">
                              <IconUpload className="text-muted-foreground" />
                              <p className="text-sm font-medium text-foreground">
                                Reemplazar logo
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Hacé clic para elegir archivo
                              </p>
                            </div>
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <input
                                type="url"
                                placeholder="O pegá la URL del logo..."
                                value={editLogoUrlInput}
                                onChange={(e) =>
                                  setEditLogoUrlInput(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" && addLogoFromUrl()
                                }
                                className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={addLogoFromUrl}
                              disabled={!editLogoUrlInput.trim()}
                              className={`${popupButtonPrimary} h-10 px-5 disabled:opacity-50 disabled:pointer-events-none`}
                            >
                              Agregar
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={saveLogo}
                          className={`w-full mt-6 h-10 px-5 ${popupButtonPrimary}`}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Modal Edit Identity */}
                {(editIdentityOpen || editIdentityClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editIdentityClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditIdentity}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel bg-card rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto ${
                          editIdentityClosing ? "modal-closing" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-identity-title"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <h3
                            id="edit-identity-title"
                            className="text-xl font-semibold text-foreground font-instrument-serif"
                          >
                            Editar Identidad
                          </h3>
                          <button
                            type="button"
                            onClick={closeEditIdentity}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Nombre de la Empresa
                            </label>
                            <input
                              type="text"
                              value={editIdentityCompanyName}
                              onChange={(e) =>
                                setEditIdentityCompanyName(e.target.value)
                              }
                              placeholder="Ingresá el nombre de la empresa"
                              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={saveIdentity}
                            className={`w-full mt-6 h-10 px-5 ${popupButtonPrimary}`}
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Modal Edit Colors */}
                {(editColorsOpen || editColorsClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editColorsClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditColors}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel bg-card rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto ${
                          editColorsClosing ? "modal-closing" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-colors-title"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <h3
                            id="edit-colors-title"
                            className="text-xl font-semibold text-foreground font-instrument-serif"
                          >
                            Editar Colores
                          </h3>
                          <button
                            type="button"
                            onClick={closeEditColors}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div className="flex flex-col gap-5">
                          <div className="grid grid-cols-4 gap-3 justify-items-center">
                            {DEFAULT_COLORS.map(({ key, label }) => {
                              const isSelected = selectedColorKey === key;
                              return (
                                <div
                                  key={key}
                                  className="flex flex-col items-center gap-2"
                                >
                                  <button
                                    type="button"
                                    onClick={() => setSelectedColorKey(key)}
                                    className={`w-14 h-14 rounded-xl border-2 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                                      isSelected
                                        ? "border-primary scale-105 shadow-md ring-2 ring-primary/30"
                                        : "border-border hover:scale-105"
                                    }`}
                                    style={{
                                      backgroundColor:
                                        editColorsDraft[key] || "#000000",
                                    }}
                                    aria-label={label}
                                    aria-pressed={isSelected}
                                  />
                                  <input
                                    type="text"
                                    value={editColorsDraft[key] || ""}
                                    onChange={(e) =>
                                      updateColorsDraft(key, e.target.value)
                                    }
                                    className="w-full bg-transparent text-muted-foreground text-xs font-mono text-center uppercase outline-none border-0 focus:ring-0"
                                    placeholder="#000000"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex flex-col items-center pt-4 border-t border-border">
                            <div
                              className="w-full rounded-lg overflow-hidden"
                              style={{ height: 200 }}
                            >
                              <HexColorPicker
                                color={
                                  editColorsDraft[selectedColorKey] || "#000000"
                                }
                                onChange={(hex) =>
                                  updateColorsDraft(selectedColorKey, hex)
                                }
                                style={{ width: "100%", height: "100%" }}
                              />
                            </div>
                            <div className="mt-4 w-full">
                              <label className="block text-sm font-medium text-muted-foreground mb-2 capitalize">
                                {DEFAULT_COLORS.find(
                                  (c) => c.key === selectedColorKey
                                )?.label ?? selectedColorKey}
                              </label>
                              <input
                                type="text"
                                value={editColorsDraft[selectedColorKey] || ""}
                                onChange={(e) =>
                                  updateColorsDraft(
                                    selectedColorKey,
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground font-mono text-lg uppercase text-center focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={saveColors}
                            className={`w-full mt-2 h-10 px-5 ${popupButtonPrimary}`}
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Headline */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditHeadline}
                  onKeyDown={(e) => e.key === "Enter" && openEditHeadline()}
                  className={`order-3 md:order-5 md:col-span-3 ${cardBase} p-6`}
                  style={{ opacity: 1 }}
                >
                  <div
                    className={pencilBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 flex items-center min-h-0">
                    <p className="text-foreground text-lg leading-relaxed line-clamp-3 font-instrument-serif whitespace-pre-line">
                      {headline || "—"}
                    </p>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-instrument-serif text-xl text-foreground font-medium">
                      Titular
                    </h3>
                  </div>
                </div>

                {/* Modal Edit Headline */}
                {(editHeadlineOpen || editHeadlineClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editHeadlineClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditHeadline}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel bg-card rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto ${
                          editHeadlineClosing ? "modal-closing" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-headline-title"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <h3
                            id="edit-headline-title"
                            className="text-xl font-semibold text-foreground font-instrument-serif"
                          >
                            Editar Titular
                          </h3>
                          <button
                            type="button"
                            onClick={closeEditHeadline}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Texto del Titular
                          </label>
                          <textarea
                            rows={4}
                            value={editHeadlineDraft}
                            onChange={(e) =>
                              setEditHeadlineDraft(e.target.value)
                            }
                            placeholder="Ingresá un titular atractivo..."
                            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={saveHeadline}
                          className={`w-full mt-6 h-10 px-5 ${popupButtonPrimary}`}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Colors */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditColors}
                  onKeyDown={(e) => e.key === "Enter" && openEditColors()}
                  className={`order-4 md:order-3 md:col-span-2 md:row-span-2 ${cardBase} p-4 md:p-5 group relative`}
                  style={{ opacity: 1 }}
                >
                  <div
                    className={pencilBtnSm}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="grid grid-cols-4 md:grid-cols-2 gap-2 w-full max-w-full md:max-w-[240px]">
                      {DEFAULT_COLORS.map(({ key, label, fallback }) => {
                        const value = resolvedColors[key] || fallback;
                        const title = value ? `${label}: ${value}` : label;
                        return (
                          <div
                            key={key}
                            className="aspect-square rounded-xl border border-border"
                            title={title}
                            style={colorSwatchStyle(value || "transparent")}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-4">
                    <h3 className="font-instrument-serif text-lg md:text-xl text-foreground font-medium">
                      Colores
                    </h3>
                  </div>
                </div>

                {/* Typography */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditFonts}
                  onKeyDown={(e) => e.key === "Enter" && openEditFonts()}
                  className={`order-5 md:order-4 md:col-span-2 ${cardBase} p-6`}
                  style={{ opacity: 1 }}
                >
                  <div
                    className={pencilBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="flex items-end justify-center gap-8">
                      <div className="text-center">
                        <span
                          className="text-5xl md:text-6xl text-foreground font-medium block leading-none"
                          style={{ fontFamily: `"${fontHeading}", sans-serif` }}
                        >
                          Aa
                        </span>
                        <p
                          className="text-xs text-muted-foreground mt-2 truncate max-w-[100px]"
                          style={{ fontFamily: `"${fontHeading}", sans-serif` }}
                        >
                          {fontHeading}
                        </p>
                      </div>
                      <div className="text-center">
                        <span
                          className="text-5xl md:text-6xl text-muted-foreground block leading-none"
                          style={{ fontFamily: `"${fontPrimary}", sans-serif` }}
                        >
                          Aa
                        </span>
                        <p
                          className="text-xs text-muted-foreground mt-2 truncate max-w-[100px]"
                          style={{ fontFamily: `"${fontPrimary}", sans-serif` }}
                        >
                          {fontPrimary}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4">
                    <h3 className="font-instrument-serif text-xl text-foreground font-medium">
                      Tipografía
                    </h3>
                  </div>
                </div>

                {/* Modal Edit Fonts */}
                {(editFontsOpen || editFontsClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editFontsClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditFonts}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel bg-card rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto ${
                          editFontsClosing ? "modal-closing" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-fonts-title"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <h3
                            id="edit-fonts-title"
                            className="text-xl font-semibold text-foreground font-instrument-serif"
                          >
                            Editar Fuentes
                          </h3>
                          <button
                            type="button"
                            onClick={closeEditFonts}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div className="space-y-5">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Fuente para Títulos
                            </label>
                            <select
                              value={editFontsDraftHeading}
                              onChange={(e) =>
                                setEditFontsDraftHeading(e.target.value)
                              }
                              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            >
                              <option value="">Elegir una fuente</option>
                              {FONT_OPTIONS.map((name) => (
                                <option
                                  key={name}
                                  value={name}
                                  style={{
                                    fontFamily: name.includes(" ")
                                      ? `"${name}"`
                                      : name,
                                  }}
                                >
                                  {name}
                                </option>
                              ))}
                            </select>
                            <div
                              className="mt-3 p-4 bg-muted rounded-xl text-center text-2xl font-bold text-foreground"
                              style={{
                                fontFamily: (() => {
                                  const f =
                                    editFontsDraftHeading || "Montserrat";
                                  return f.includes(" ") || f.includes("Serif")
                                    ? `"${f}", sans-serif`
                                    : `${f}, sans-serif`;
                                })(),
                              }}
                            >
                              {companyName === "—"
                                ? "Nombre de la Marca"
                                : companyName}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Fuente para Cuerpo
                            </label>
                            <select
                              value={editFontsDraftPrimary}
                              onChange={(e) =>
                                setEditFontsDraftPrimary(e.target.value)
                              }
                              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            >
                              <option value="">Elegir una Fuente</option>
                              {FONT_OPTIONS.map((name) => (
                                <option
                                  key={name}
                                  value={name}
                                  style={{
                                    fontFamily: name.includes(" ")
                                      ? `"${name}"`
                                      : name,
                                  }}
                                >
                                  {name}
                                </option>
                              ))}
                            </select>
                            <div
                              className="mt-3 p-4 bg-muted rounded-xl text-center text-foreground"
                              style={{
                                fontFamily: (() => {
                                  const f =
                                    editFontsDraftPrimary || "Montserrat";
                                  return f.includes(" ") || f.includes("Serif")
                                    ? `"${f}", sans-serif`
                                    : `${f}, sans-serif`;
                                })(),
                              }}
                            >
                              The quick brown fox jumps over the lazy dog
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={saveFonts}
                          className={`w-full mt-6 h-10 px-5 ${popupButtonPrimary}`}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Images */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditImages}
                  onKeyDown={(e) => e.key === "Enter" && openEditImages()}
                  className={`order-6 md:order-6 md:col-span-3 ${cardBase} p-4 md:p-6 h-[140px] md:h-auto`}
                  style={{ opacity: 1 }}
                >
                  <div
                    className={pencilBtnSm}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 flex items-center gap-2 overflow-hidden min-h-0">
                    {brandImages.map((src, i) => (
                      <div
                        key={i}
                        className="h-full aspect-square rounded-xl overflow-hidden bg-muted shrink-0"
                        title=""
                      >
                        <img
                          alt={`Imagen de marca ${i + 1}`}
                          className="w-full h-full object-cover"
                          src={src}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                    {moreCount > 0 && (
                      <div className="h-full aspect-square rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-xl overflow-hidden">
                          {moreImages.map((src, i) => (
                            <div key={i} className="overflow-hidden">
                              <img
                                alt=""
                                className="w-full h-full object-cover blur-[2px] scale-110"
                                src={src}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            +{moreCount}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 md:mt-4">
                    <h3 className="font-instrument-serif text-lg md:text-xl text-foreground font-medium">
                      Imágenes
                    </h3>
                  </div>
                </div>

                {/* Modal Edit Images */}
                {(editImagesOpen || editImagesClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editImagesClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditImages}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto max-h-[90vh] flex flex-col ${
                          editImagesClosing ? "modal-closing" : ""
                        }`}
                        style={{
                          backgroundColor: "rgb(247, 248, 248)",
                          color: "rgb(15, 20, 25)",
                          fontSize: 16,
                          lineHeight: 24,
                          fontWeight: 400,
                          letterSpacing: "-0.16px",
                          fontFamily:
                            '"Inter Tight", "Inter Tight Fallback", ui-sans-serif, sans-serif, system-ui',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-images-title"
                      >
                        <div className="flex justify-between items-start mb-4 shrink-0">
                          <div>
                            <h3
                              id="edit-images-title"
                              className="text-xl font-semibold text-foreground font-instrument-serif"
                            >
                              Gestionar Imágenes
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Subí imágenes para usar en los recursos de tu
                              marca
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={closeEditImages}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => imagesFileInputRef.current?.click()}
                            onDragOver={handleImagesDragOver}
                            onDragLeave={handleImagesDragOver}
                            onDrop={handleImagesDrop}
                            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <input
                              ref={imagesFileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                addImagesFromFiles(e.target.files);
                                e.target.value = "";
                              }}
                            />
                            <IconPlus className="w-10 h-10 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium text-foreground">
                              Arrastrá y soltá imágenes acá
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              o hacé clic para elegir
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                              <input
                                type="url"
                                placeholder="O pegá la URL de una imagen..."
                                value={editImagesUrlInput}
                                onChange={(e) =>
                                  setEditImagesUrlInput(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" && addImageFromUrl()
                                }
                                className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={addImageFromUrl}
                              disabled={!editImagesUrlInput.trim()}
                              className={`${popupButtonPrimary} h-10 px-5 disabled:opacity-50 disabled:pointer-events-none`}
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                            {editImagesDraft.map((src, i) => (
                              <div
                                key={i}
                                className="aspect-square rounded-xl overflow-hidden bg-muted shrink-0 relative group"
                                title=""
                              >
                                <img
                                  alt={`Imagen de marca ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  src={src}
                                  loading="lazy"
                                  decoding="async"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImageAtIndex(i)}
                                  className="absolute top-1 right-1 size-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Eliminar"
                                >
                                  <IconTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={saveImages}
                          className={`w-full mt-6 h-10 px-5 shrink-0 ${popupButtonPrimary}`}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Language */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openEditLanguage}
                  onKeyDown={(e) => e.key === "Enter" && openEditLanguage()}
                  className={`order-7 md:order-7 md:col-span-2 ${cardBase} p-6`}
                  style={{ opacity: 1 }}
                >
                  <div
                    className={pencilBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-muted/50">
                        <span className="text-3xl">
                          {currentLanguageLabel.slice(0, 4)}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-foreground">
                          {currentLanguageLabel.slice(5).trim() ||
                            currentLanguageLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4">
                    <h3 className="font-instrument-serif text-xl text-foreground font-medium">
                      Idioma
                    </h3>
                  </div>
                </div>

                {/* Modal Edit Language */}
                {(editLanguageOpen || editLanguageClosing) && (
                  <>
                    <div
                      className={`modal-backdrop fixed inset-0 z-40 backdrop-blur-sm ${
                        editLanguageClosing ? "modal-closing" : ""
                      }`}
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244, 248, 249, 0.92) 0%, rgba(240, 247, 249, 0.92) 50%, rgba(242, 248, 250, 0.92) 100%)",
                      }}
                      aria-hidden
                      onClick={closeEditLanguage}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4 overflow-y-auto">
                      <div
                        className={`modal-panel bg-card rounded-2xl p-6 w-full max-w-lg shadow-lg border border-border pointer-events-auto my-auto ${
                          editLanguageClosing ? "modal-closing" : ""
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-language-title"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <h3
                            id="edit-language-title"
                            className="text-xl font-semibold text-foreground font-instrument-serif"
                          >
                            Editar Idioma
                          </h3>
                          <button
                            type="button"
                            onClick={closeEditLanguage}
                            className={popupButtonIcon}
                            aria-label="Cerrar"
                          >
                            <IconX />
                          </button>
                        </div>
                        <div className="space-y-5">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Idioma del Contenido
                            </label>
                            <p className="text-xs text-muted-foreground mb-3">
                              Los anuncios, pies de foto y sugerencias se
                              generarán en este idioma.
                            </p>
                            <select
                              value={editLanguageDraftLang}
                              onChange={(e) =>
                                setEditLanguageDraftLang(e.target.value)
                              }
                              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            >
                              {LANGUAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Nivel de formalidad
                            </label>
                            <p className="text-xs text-muted-foreground mb-3">
                              Elegí cómo dirigirte a tu audiencia.
                            </p>
                            <div className="space-y-2">
                              {FORMALITY_OPTIONS.map((opt) => (
                                <label
                                  key={opt.value}
                                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors border-border hover:border-primary/50 ${
                                    editLanguageDraftFormality === opt.value
                                      ? "border-primary bg-primary/5"
                                      : ""
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="formality"
                                    value={opt.value}
                                    checked={
                                      editLanguageDraftFormality === opt.value
                                    }
                                    onChange={() =>
                                      setEditLanguageDraftFormality(opt.value)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-foreground">
                                      {opt.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {opt.desc}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={saveLanguage}
                          className={`w-full mt-6 h-10 px-5 ${popupButtonPrimary}`}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
