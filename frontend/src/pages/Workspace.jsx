import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import BrandingView from "../components/BrandingView";
import { CenteredLoadingSpinner } from "../components/LoadingSpinner";
import { fetchWithAuth } from "../api/fetchWithAuth";

function IconHouse({ className }) {
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
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
function IconChevronRight({ className }) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function IconChevronLeft({ className }) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function IconCopy({ className }) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
function IconChevronDown({ className }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconRatio({ className }) {
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
      <rect width="12" height="20" x="6" y="2" rx="2" />
      <rect width="20" height="12" x="2" y="6" rx="2" />
    </svg>
  );
}
function IconCheck({ className }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function IconImage({ className }) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
function IconDownload({ className }) {
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
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}
function IconPalette({ className }) {
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
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}
function IconUsers({ className }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}
function IconBookOpen({ className }) {
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
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}
function IconPencil({ className }) {
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
function IconX({ className }) {
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
function IconSave({ className }) {
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
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
function IconInfo({ className }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function IconPlus({ className }) {
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
function IconUser({ className }) {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconArrowLeft({ className }) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
function IconMapPin({ className }) {
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
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconDollarSign({ className }) {
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
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconGraduationCap({ className }) {
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
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}
function IconTarget({ className }) {
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
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconTrendingUp({ className }) {
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
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </svg>
  );
}
function IconSparkles({ className }) {
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
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  );
}
function IconMessageSquare({ className }) {
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
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

const BREADCRUMB_SEGMENTS = {
  "": { label: "Inicio", Icon: IconHouse },
  creatives: { label: "Creativos", Icon: IconImage },
  branding: { label: "Branding", Icon: IconPalette },
  "base-de-conocimiento": { label: "Base de Conocimiento", Icon: IconBookOpen },
  "customer-profiles": { label: "Perfiles de Clientes", Icon: IconUsers },
};

function normalizeApiProfileToUI(p) {
  return {
    id: p.id,
    name: p.name ?? "",
    shortName: (p.name ?? "").split(",")[0]?.trim() || (p.name ?? ""),
    subtitle: p.title ?? "",
    description: p.description ?? "",
    ageRange: p.demographics?.age ?? "",
    location: p.demographics?.location ?? "",
    income: p.demographics?.income ?? "",
    avatar: p.avatarUrl ?? "",
    heroImage: p.heroImageUrl ?? null,
    education: p.demographics?.education ?? "",
    preferredChannels: Array.isArray(p.channels) ? p.channels : [],
    painPoints: Array.isArray(p.painPoints) ? p.painPoints : [],
    goals: Array.isArray(p.goals) ? p.goals : [],
  };
}

export default function Workspace() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug;
  const splat = params["*"] ?? "";
  const profileId = splat.startsWith("customer-profiles/")
    ? splat.slice("customer-profiles/".length)
    : undefined;
  const creativeId = splat.startsWith("creative/")
    ? splat.slice("creative/".length)
    : undefined;
  const location = useLocation();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [workspaceBranding, setWorkspaceBranding] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [knowledgeBaseEditing, setKnowledgeBaseEditing] = useState(false);
  const [knowledgeBaseContent, setKnowledgeBaseContent] = useState("");
  const knowledgeBaseContentBeforeEdit = useRef("");
  const [customerProfilesFromApi, setCustomerProfilesFromApi] = useState([]);
  const [creativesList, setCreativesList] = useState([]);
  const [creativesLoading, setCreativesLoading] = useState(false);
  const [creativesGenerating, setCreativesGenerating] = useState(false);
  const [aspectRatioMenuOpen, setAspectRatioMenuOpen] = useState(false);
  const aspectRatioMenuRef = useRef(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [knowledgeBaseLoading, setKnowledgeBaseLoading] = useState(false);
  const [customerProfilesLoading, setCustomerProfilesLoading] = useState(false);

  /** Id estable para un creativo (para la ruta /workspace/creative/:id). */
  const getCreativeId = (creative, index) => {
    if (creative?.id) return creative.id;
    if (creative?.imageUrl) {
      const basename = creative.imageUrl
        .replace(/.*\//, "")
        .replace(/\.(png|jpg|jpeg|webp)$/i, "");
      if (basename) return basename;
    }
    return String(index);
  };

  /** Opciones del menú Aspect Ratio: portrait, luego landscape, con etiqueta y dimensiones del icono (w×h en px, base 16). */
  const ASPECT_RATIO_MENU_OPTIONS = [
    { ratio: "1:1", label: "Square (1:1)", icon: "check" },
    { ratio: "2:3", label: "Portrait (2:3)", w: 10.6667, h: 16 },
    { ratio: "3:4", label: "Portrait (3:4)", w: 12, h: 16 },
    { ratio: "4:5", label: "Social (4:5)", w: 12.8, h: 16 },
    { ratio: "9:16", label: "Mobile (9:16)", w: 9, h: 16 },
    { ratio: "3:2", label: "Landscape (3:2)", w: 16, h: 10.6667 },
    { ratio: "4:3", label: "Landscape (4:3)", w: 16, h: 12 },
    { ratio: "5:4", label: "Classic (5:4)", w: 16, h: 12.8 },
    { ratio: "16:9", label: "Widescreen (16:9)", w: 16, h: 9 },
    { ratio: "21:9", label: "Cinematic (21:9)", w: 16, h: 6.85714 },
  ];
  const ASPECT_RATIO_PORTRAIT_COUNT = 5; // 1:1, 2:3, 3:4, 4:5, 9:16

  /** Mapeo aspect ratio → plataforma para la grilla de creativos (facebook_feed, instagram_portrait, etc.). */
  const getPlatformFromAspectRatio = (aspectRatio) => {
    const r = (aspectRatio || "4:5").trim();
    if (r === "1:1") return "facebook_feed";
    if (r === "4:5" || r === "3:4" || r === "2:3") return "instagram_portrait";
    if (r === "9:16") return "instagram_story";
    if (r === "4:3" || r === "3:2" || r === "5:4") return "landscape_4_3";
    if (r === "16:9" || r === "21:9") return "linkedin";
    return "instagram_portrait";
  };

  const parts = location.pathname.split("/").filter(Boolean);
  const segment = parts[0] === workspaceSlug ? (parts[1] ?? "") : "";
  const segmentForDisplay =
    segment === "creative" ? "creatives" : segment || "creatives";
  const isCreativeDetail = Boolean(segment === "creative" && creativeId);

  /** Refetch creatives from API (para mostrar nuevos ni bien estén disponibles). */
  const refetchCreatives = React.useCallback(async () => {
    if (!workspaceSlug) return;
    try {
      const res = await fetchWithAuth(
        `/workspaces/${encodeURIComponent(workspaceSlug)}`,
      );
      if (!res) return;
      const json = await res.json().catch(() => ({}));
      if (json.success && json.data) {
        const raw = json.data.creatives ?? [];
        setCreativesList(Array.isArray(raw) ? raw : []);
      }
    } catch (_) {}
  }, [workspaceSlug]);

  useEffect(() => {
    if (segmentForDisplay !== "creatives" || !workspaceSlug) {
      setCreativesList([]);
      return;
    }
    let cancelled = false;
    setCreativesLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuth(
          `/workspaces/${encodeURIComponent(workspaceSlug)}`,
        );
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success && json.data) {
          const raw = json.data.creatives ?? [];
          setCreativesList(Array.isArray(raw) ? raw : []);
        } else if (!cancelled) {
          setCreativesList([]);
        }
      } catch (_) {
        if (!cancelled) setCreativesList([]);
      } finally {
        if (!cancelled) setCreativesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, segmentForDisplay]);

  /** Al volver a la pestaña, refrescar creativos para mostrar los que se hayan agregado. */
  useEffect(() => {
    if (segmentForDisplay !== "creatives" || !workspaceSlug) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchCreatives();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [workspaceSlug, segmentForDisplay, refetchCreatives]);

  /** Polling mientras el welcome campaign puede estar generando (0–2 creativos): actualizar lista sin recargar. */
  const welcomePollStartRef = React.useRef(null);
  useEffect(() => {
    if (
      segmentForDisplay !== "creatives" ||
      !workspaceSlug ||
      creativesList.length >= 3
    ) {
      if (segmentForDisplay !== "creatives") welcomePollStartRef.current = null;
      return;
    }
    if (welcomePollStartRef.current === null)
      welcomePollStartRef.current = Date.now();
    const POLL_MS = 4000;
    const MAX_POLL_MS = 120000;
    const id = setInterval(() => {
      if (Date.now() - welcomePollStartRef.current > MAX_POLL_MS) {
        clearInterval(id);
        return;
      }
      refetchCreatives();
    }, POLL_MS);
    refetchCreatives();
    return () => {
      clearInterval(id);
    };
  }, [
    workspaceSlug,
    segmentForDisplay,
    refetchCreatives,
    creativesList.length,
  ]);

  /** Cerrar menú de aspect ratio al cambiar de creativo o al hacer clic fuera. */
  useEffect(() => {
    setAspectRatioMenuOpen(false);
  }, [creativeId]);

  useEffect(() => {
    if (!aspectRatioMenuOpen) return;
    const handleClickOutside = (e) => {
      if (
        aspectRatioMenuRef.current &&
        !aspectRatioMenuRef.current.contains(e.target)
      ) {
        setAspectRatioMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aspectRatioMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/workspaces");
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success && Array.isArray(json.data)) {
          const found = json.data.find((ws) => ws.slug === workspaceSlug);
          setWorkspace(found || { name: workspaceSlug, slug: workspaceSlug });
        } else if (!cancelled) {
          setWorkspace({ name: workspaceSlug, slug: workspaceSlug });
        }
      } catch (_) {
        if (!cancelled)
          setWorkspace({ name: workspaceSlug, slug: workspaceSlug });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug]);

  useEffect(() => {
    if (segmentForDisplay !== "branding" || !workspaceSlug) {
      setWorkspaceBranding(null);
      setBrandingLoading(false);
      return;
    }
    let cancelled = false;
    setBrandingLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuth(
          `/workspaces/${encodeURIComponent(workspaceSlug)}`,
        );
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success && json.data?.branding) {
          setWorkspaceBranding(json.data.branding);
        } else {
          setWorkspaceBranding(null);
        }
      } catch (_) {
        if (!cancelled) setWorkspaceBranding(null);
      } finally {
        if (!cancelled) setBrandingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, segmentForDisplay]);

  useEffect(() => {
    if (segmentForDisplay !== "base-de-conocimiento" || !workspaceSlug) {
      setKnowledgeBaseLoading(false);
      return;
    }
    let cancelled = false;
    setKnowledgeBaseLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuth(
          `/workspaces/${encodeURIComponent(workspaceSlug)}`,
        );
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success && json.data) {
          const content = json.data.knowledgeBase ?? "";
          setKnowledgeBaseContent(content);
          knowledgeBaseContentBeforeEdit.current = content;
        }
      } catch (_) {
      } finally {
        if (!cancelled) setKnowledgeBaseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, segmentForDisplay]);

  useEffect(() => {
    if (
      (segmentForDisplay !== "customer-profiles" && !profileId) ||
      !workspaceSlug
    ) {
      setCustomerProfilesFromApi([]);
      setCustomerProfilesLoading(false);
      return;
    }
    let cancelled = false;
    setCustomerProfilesLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuth(
          `/workspaces/${encodeURIComponent(workspaceSlug)}`,
        );
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success && json.data) {
          const raw = json.data.customerProfiles ?? [];
          const normalized = Array.isArray(raw)
            ? raw.map(normalizeApiProfileToUI)
            : [];
          setCustomerProfilesFromApi(normalized);
        } else {
          setCustomerProfilesFromApi([]);
        }
      } catch (_) {
        if (!cancelled) setCustomerProfilesFromApi([]);
      } finally {
        if (!cancelled) setCustomerProfilesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, segmentForDisplay, profileId]);

  const customerProfilesList = customerProfilesFromApi;
  const profile = profileId
    ? (customerProfilesList.find((p) => p.id === profileId) ?? null)
    : null;

  const currentSegment =
    BREADCRUMB_SEGMENTS[segmentForDisplay] ?? BREADCRUMB_SEGMENTS[""];
  const { label: currentLabel, Icon: CurrentIcon } = currentSegment;
  const isProfileDetail = Boolean(profileId && profile);

  return (
    <div
      className="flex flex-col md:flex-row overflow-hidden md:p-2 md:gap-2"
      style={{
        height: "100dvh",
        minHeight: "-webkit-fill-available",
        background:
          "linear-gradient(135deg, rgb(244, 248, 249) 0%, rgb(240, 247, 249) 50%, rgb(242, 248, 250) 100%)",
      }}
    >
      <WorkspaceSidebar
        workspace={workspace}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <main
        className={`flex-1 flex flex-col overflow-hidden min-h-0 bg-white md:rounded-xl md:border md:border-neutral-200/60 md:shadow-sm ${segmentForDisplay === "customer-profiles" ? "customer-profiles-section font-sans [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans [&_h5]:font-sans [&_h6]:font-sans" : ""}`}
        style={
          segmentForDisplay === "customer-profiles"
            ? { fontFamily: "var(--font-sans)" }
            : undefined
        }
      >
        <div className="shrink-0 h-14 flex items-center justify-between px-6">
          <div className="flex items-center min-w-0 gap-3">
            {isProfileDetail ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      workspaceSlug
                        ? `/${workspaceSlug}/customer-profiles`
                        : "/",
                    )
                  }
                  className="inline-flex items-center justify-center rounded p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Volver"
                >
                  <IconArrowLeft className="w-5 h-5" aria-hidden="true" />
                </button>
                <nav aria-label="breadcrumb">
                  <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
                    <li className="inline-flex items-center gap-1.5">
                      <Link
                        to="/"
                        className="transition-colors flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                      >
                        <IconHouse className="w-4 h-4" aria-hidden="true" />
                        Inicio
                      </Link>
                    </li>
                    <li
                      role="presentation"
                      aria-hidden="true"
                      className="[&>svg]:size-3.5"
                    >
                      <IconChevronRight
                        className="w-4 h-4"
                        aria-hidden="true"
                      />
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                      <Link
                        to={
                          workspaceSlug
                            ? `/${workspaceSlug}/customer-profiles`
                            : "#"
                        }
                        className="transition-colors flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                      >
                        <IconUsers className="w-4 h-4" aria-hidden="true" />
                        Perfiles de Clientes
                      </Link>
                    </li>
                    <li
                      role="presentation"
                      aria-hidden="true"
                      className="[&>svg]:size-3.5"
                    >
                      <IconChevronRight
                        className="w-4 h-4"
                        aria-hidden="true"
                      />
                    </li>
                    <li
                      className="inline-flex items-center gap-1.5 text-neutral-900 font-medium"
                      aria-current="page"
                    >
                      {profile?.shortName ?? profile?.name ?? "Perfil"}
                    </li>
                  </ol>
                </nav>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {!isCreativeDetail && (
                  <nav aria-label="breadcrumb">
                    <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
                      <li className="inline-flex items-center gap-1.5">
                        <Link
                          to="/"
                          className="transition-colors flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 cursor-pointer"
                        >
                          <IconHouse className="w-4 h-4" aria-hidden="true" />
                          Inicio
                        </Link>
                      </li>
                      <li
                        role="presentation"
                        aria-hidden="true"
                        className="[&>svg]:size-3.5"
                      >
                        <IconChevronRight
                          className="w-4 h-4"
                          aria-hidden="true"
                        />
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <span
                          role="link"
                          aria-disabled="true"
                          aria-current="page"
                          className="flex items-center gap-1.5 text-neutral-900 font-medium"
                        >
                          <CurrentIcon className="w-4 h-4" aria-hidden="true" />
                          {currentLabel}
                        </span>
                      </li>
                    </ol>
                  </nav>
                )}
              </div>
            )}
          </div>
          {isProfileDetail && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 h-8 rounded-lg px-3 text-sm font-semibold border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:translate-y-[-1px] transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:w-4 [&_svg]:h-4"
              >
                <IconPencil className="w-4 h-4" aria-hidden="true" />
                Editar
              </button>
              <button
                type="button"
                title="Chat con IA"
                className="inline-flex items-center justify-center gap-2 h-8 rounded-lg px-3 text-sm font-semibold border bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:w-4 [&_svg]:h-4"
              >
                <IconMessageSquare className="w-4 h-4" aria-hidden="true" />
                Agente
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {isProfileDetail && profile && (
            <div
              className="flex-1 min-h-0 flex flex-col overflow-hidden font-sans"
              style={{
                margin: 0,
                backgroundColor: "rgb(255, 255, 255)",
                color: "rgb(15, 20, 25)",
                fontSize: 16,
                lineHeight: 24,
                fontWeight: 400,
                letterSpacing: "-0.16px",
                textAlign: "start",
                fontFamily: "var(--font-sans)",
              }}
            >
              <div
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-4 md:p-6"
                style={{
                  paddingBottom:
                    "calc(2rem + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <div className="max-w-4xl mx-auto">
                  <div
                    className="relative rounded-2xl overflow-hidden bg-neutral-100 mb-8"
                    style={{ aspectRatio: "21/9", minHeight: 200 }}
                  >
                    {profile.heroImage ? (
                      <img
                        src={profile.heroImage}
                        alt={`Ambiente de ${profile.name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-300" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-4 left-6 flex items-end gap-4">
                      <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex-shrink-0">
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="pb-1">
                        <h1 className="text-2xl font-bold text-white drop-shadow-md">
                          {profile.name}
                        </h1>
                        <p className="text-white/90 text-sm drop-shadow">
                          {profile.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>
                  <section className="mb-8">
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      Sobre Este Perfil
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {profile.description}
                    </p>
                  </section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                      <section>
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                          <IconUser
                            className="w-5 h-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          Datos Demográficos
                        </h2>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <IconUser
                              className="w-4 h-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span>{profile.ageRange}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconDollarSign
                              className="w-4 h-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span>{profile.income}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <IconMapPin
                              className="w-4 h-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span>{profile.location}</span>
                          </div>
                          {profile.education && (
                            <div className="flex items-center gap-2">
                              <IconGraduationCap
                                className="w-4 h-4 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                              <span>{profile.education}</span>
                            </div>
                          )}
                        </div>
                      </section>
                      <section>
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                          <IconTarget
                            className="w-5 h-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          Canales Preferidos
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {(profile.preferredChannels ?? []).length > 0 ? (
                            (profile.preferredChannels ?? []).map((ch, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted rounded-full"
                              >
                                {ch}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </section>
                    </div>
                    <div className="space-y-6">
                      <section>
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                          <IconTarget
                            className="w-5 h-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          Puntos de Dolor
                        </h2>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {(profile.painPoints ?? []).length > 0 ? (
                            (profile.painPoints ?? []).map((p, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                                <span>{p}</span>
                              </li>
                            ))
                          ) : (
                            <li>—</li>
                          )}
                        </ul>
                      </section>
                      <section>
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
                          <IconTrendingUp
                            className="w-5 h-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          Objetivos
                        </h2>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {(profile.goals ?? []).length > 0 ? (
                            (profile.goals ?? []).map((g, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                                <span>{g}</span>
                              </li>
                            ))
                          ) : (
                            <li>—</li>
                          )}
                        </ul>
                      </section>
                    </div>
                  </div>
                  <section className="rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <IconSparkles
                          className="w-5 h-5 text-primary"
                          aria-hidden="true"
                        />
                        <h2 className="text-lg font-semibold text-foreground">
                          Personas Influyentes
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 h-8 rounded-lg px-3 text-sm font-semibold border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:translate-y-[-1px] transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_svg]:w-4 [&_svg]:h-4"
                      >
                        <IconPlus className="w-4 h-4" aria-hidden="true" />
                        Agregar
                      </button>
                    </div>
                    {(profile.personas ?? []).length > 0 ? (
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {(profile.personas ?? []).map((p, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                            <span>
                              {typeof p === "object" && p != null && "name" in p
                                ? p.name
                                : String(p ?? "")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aún no hay personas definidas. Hacé clic en Agregar o
                        arrastrá una imagen para crear Personas Influyentes.
                      </p>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}
          {!isProfileDetail && segmentForDisplay === "branding" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-auto">
              {brandingLoading ? (
                <CenteredLoadingSpinner />
              ) : (
                <BrandingView branding={workspaceBranding} />
              )}
            </div>
          )}
          {!isProfileDetail && segmentForDisplay === "base-de-conocimiento" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden font-sans">
              {knowledgeBaseLoading ? (
                <CenteredLoadingSpinner />
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                        <div>
                          <h2 className="font-semibold text-neutral-900 font-sans">
                            Base de Conocimiento del Negocio
                          </h2>
                          <p className="text-sm text-neutral-500">
                            Esta información la usa la IA para generar mejor
                            contenido para tu negocio.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {knowledgeBaseEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setKnowledgeBaseContent(
                                    knowledgeBaseContentBeforeEdit.current,
                                  );
                                  setKnowledgeBaseEditing(false);
                                }}
                                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-8 rounded-lg px-3 gap-1.5 border bg-background hover:bg-muted/50 text-neutral-700"
                                aria-label="Cancelar"
                              >
                                <IconX className="w-4 h-4" aria-hidden="true" />
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  knowledgeBaseContentBeforeEdit.current =
                                    knowledgeBaseContent;
                                  setKnowledgeBaseEditing(false);
                                  if (!workspaceSlug) return;
                                  try {
                                    const res = await fetchWithAuth(
                                      `/workspaces/${encodeURIComponent(workspaceSlug)}/knowledge-base`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          knowledgeBase: knowledgeBaseContent,
                                        }),
                                      },
                                    );
                                    if (res?.ok) {
                                      const json = await res
                                        .json()
                                        .catch(() => ({}));
                                      if (
                                        json.data?.knowledgeBase !== undefined
                                      )
                                        knowledgeBaseContentBeforeEdit.current =
                                          json.data.knowledgeBase;
                                    }
                                  } catch (_) {}
                                }}
                                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-8 rounded-lg px-3 gap-1.5 cursor-pointer bg-gradient-to-b from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] hover:translate-y-[-1px] active:translate-y-[1px] border border-primary/50"
                                aria-label="Guardar"
                              >
                                <IconSave
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                                Guardar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                knowledgeBaseContentBeforeEdit.current =
                                  knowledgeBaseContent;
                                setKnowledgeBaseEditing(true);
                              }}
                              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-gradient-to-b hover:from-accent/50 hover:to-accent/30 hover:translate-y-[-1px] active:translate-y-[1px] h-8 rounded-lg px-3 gap-1.5"
                            >
                              <IconPencil
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                      {knowledgeBaseEditing ? (
                        <div className="p-4 min-h-[500px] max-h-[500px] overflow-hidden flex flex-col">
                          <textarea
                            value={knowledgeBaseContent}
                            onChange={(e) =>
                              setKnowledgeBaseContent(e.target.value)
                            }
                            className="flex-1 min-h-0 w-full text-neutral-900 text-sm leading-relaxed font-sans border-0 outline-none focus:outline-none focus:ring-0 resize-none p-0 bg-transparent placeholder:text-neutral-400"
                            placeholder="Escribí o pegá el contenido de la base de conocimiento..."
                            spellCheck="true"
                          />
                        </div>
                      ) : (
                        <div className="p-4 min-h-[500px] max-h-[500px] overflow-y-auto text-neutral-900 text-sm leading-relaxed font-sans">
                          <div className="whitespace-pre-wrap font-normal">
                            {knowledgeBaseContent}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {!isProfileDetail && segmentForDisplay === "creatives" && (
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{
                paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
                backgroundColor: "rgb(255, 255, 255)",
                color: "rgb(15, 20, 25)",
                fontSize: 16,
                lineHeight: 24,
                fontWeight: 400,
                letterSpacing: "-0.16px",
                textAlign: "start",
                fontFamily:
                  '"Inter Tight", "Inter Tight Fallback", ui-sans-serif, sans-serif, system-ui',
              }}
            >
              {isCreativeDetail ? (
                (() => {
                  const selectedCreative = creativesList.find(
                    (c, i) => getCreativeId(c, i) === creativeId,
                  );
                  if (!selectedCreative) {
                    return (
                      <div className="h-full overflow-y-auto p-4 flex items-center justify-center">
                        <div className="py-12 text-center text-muted-foreground">
                          <p className="text-sm mb-4">
                            Creativo no encontrado.
                          </p>
                          <Link
                            to={
                              workspaceSlug
                                ? `/${workspaceSlug}/creatives`
                                : "#"
                            }
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Volver a Creativos
                          </Link>
                        </div>
                      </div>
                    );
                  }
                  const currentIndex = creativesList.findIndex(
                    (c, i) => getCreativeId(c, i) === creativeId,
                  );
                  const totalCount = creativesList.length;
                  const prevCreative =
                    currentIndex > 0 ? creativesList[currentIndex - 1] : null;
                  const nextCreative =
                    currentIndex >= 0 && currentIndex < totalCount - 1
                      ? creativesList[currentIndex + 1]
                      : null;
                  const downloadUrl = selectedCreative.imageUrl.startsWith(
                    "http",
                  )
                    ? selectedCreative.imageUrl
                    : `${window.location.origin}${selectedCreative.imageUrl.startsWith("/") ? "" : "/"}${selectedCreative.imageUrl}`;
                  const aspectRatio = selectedCreative.aspectRatio || "4:5";
                  const platformLabel = getPlatformFromAspectRatio(
                    aspectRatio,
                  ).replace(/_/g, " ");
                  const displayName = selectedCreative.headline
                    ? selectedCreative.headline.slice(0, 20) +
                      (selectedCreative.headline.length > 20 ? "…" : "")
                    : creativeId?.slice(0, 8) || "Creativo";
                  const promptText =
                    selectedCreative.headline ||
                    selectedCreative.imagePrompt ||
                    selectedCreative.generationPrompt ||
                    "";
                  const copyPrompt = () => {
                    if (promptText) navigator.clipboard.writeText(promptText);
                  };
                  return (
                    <div className="flex h-full overflow-hidden flex-1 min-h-0">
                      <div className="flex flex-1 flex-col overflow-hidden min-h-0 bg-white md:rounded-xl md:border md:border-neutral-200/60 md:shadow-sm transition-all ease-out duration-300">
                        <div className="h-full w-full flex relative">
                          <div className="flex-1 flex flex-col min-w-0">
                            <div className="shrink-0 h-14 flex items-center justify-between gap-3 px-4 md:px-6">
                              <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      workspaceSlug
                                        ? `/${workspaceSlug}/creatives`
                                        : "#",
                                    )
                                  }
                                  className="inline-flex items-center justify-center shrink-0 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer hover:bg-accent hover:text-accent-foreground h-10 w-10 rounded-xl"
                                  aria-label="Volver"
                                >
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
                                    className="w-5 h-5"
                                    aria-hidden="true"
                                  >
                                    <path d="m12 19-7-7 7-7" />
                                    <path d="M19 12H5" />
                                  </svg>
                                </button>
                                <nav
                                  aria-label="breadcrumb"
                                  className="hidden md:block min-w-0"
                                >
                                  <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2">
                                    <li className="inline-flex items-center gap-1.5">
                                      <Link
                                        to="/"
                                        className="transition-colors flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900"
                                      >
                                        <IconHouse
                                          className="w-4 h-4 shrink-0"
                                          aria-hidden="true"
                                        />
                                        <span>Inicio</span>
                                      </Link>
                                    </li>
                                    <li role="presentation" aria-hidden="true">
                                      <IconChevronRight
                                        className="w-4 h-4 text-neutral-400 shrink-0"
                                        aria-hidden="true"
                                      />
                                    </li>
                                    <li className="inline-flex items-center gap-1.5">
                                      <Link
                                        to={
                                          workspaceSlug
                                            ? `/${workspaceSlug}/creatives`
                                            : "#"
                                        }
                                        className="transition-colors flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900"
                                      >
                                        <IconImage
                                          className="w-4 h-4 shrink-0"
                                          aria-hidden="true"
                                        />
                                        <span>Creativos</span>
                                      </Link>
                                    </li>
                                    <li role="presentation" aria-hidden="true">
                                      <IconChevronRight
                                        className="w-4 h-4 text-neutral-400 shrink-0"
                                        aria-hidden="true"
                                      />
                                    </li>
                                    <li className="inline-flex items-center gap-1.5 min-w-0">
                                      <span
                                        role="link"
                                        aria-disabled="true"
                                        aria-current="page"
                                        className="text-neutral-900 font-medium truncate"
                                      >
                                        {displayName}
                                      </span>
                                    </li>
                                  </ol>
                                </nav>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!prevCreative}
                                    onClick={() =>
                                      prevCreative &&
                                      navigate(
                                        workspaceSlug
                                          ? `/${workspaceSlug}/creative/${getCreativeId(prevCreative, currentIndex - 1)}`
                                          : "#",
                                      )
                                    }
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold cursor-pointer h-8 w-8 p-0 rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none"
                                    aria-label="Anterior"
                                  >
                                    <IconChevronLeft
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <span className="text-sm font-medium text-foreground min-w-[2.5rem] text-center">
                                    {totalCount
                                      ? `${currentIndex + 1}/${totalCount}`
                                      : "—"}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!nextCreative}
                                    onClick={() =>
                                      nextCreative &&
                                      navigate(
                                        workspaceSlug
                                          ? `/${workspaceSlug}/creative/${getCreativeId(nextCreative, currentIndex + 1)}`
                                          : "#",
                                      )
                                    }
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold cursor-pointer h-8 w-8 p-0 rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:pointer-events-none"
                                    aria-label="Siguiente"
                                  >
                                    <IconChevronRight
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </div>
                                <a
                                  href={downloadUrl}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold cursor-pointer hover:bg-accent hover:text-accent-foreground h-10 w-10 rounded-xl"
                                  aria-label="Descargar imagen"
                                >
                                  <IconDownload
                                    className="w-5 h-5"
                                    aria-hidden="true"
                                  />
                                </a>
                              </div>
                            </div>
                            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                              <div className="md:hidden px-4 pt-3 pb-2 flex-shrink-0">
                                <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <IconMessageSquare
                                      className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span className="text-xs font-medium text-neutral-700 truncate flex-1">
                                      {(selectedCreative.headline || "").slice(
                                        0,
                                        50,
                                      )}
                                      {(selectedCreative.headline || "")
                                        .length > 50
                                        ? "…"
                                        : ""}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={copyPrompt}
                                      className="inline-flex items-center justify-center rounded-xl h-6 w-6 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                      title="Copiar prompt"
                                    >
                                      <IconCopy
                                        className="h-3.5 w-3.5 text-neutral-400"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-auto relative">
                                <div className="relative max-w-full max-h-full">
                                  <img
                                    src={selectedCreative.imageUrl}
                                    alt={
                                      selectedCreative.headline || "Creativo"
                                    }
                                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                                    style={{
                                      maxHeight: "calc(-300px + 100vh)",
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="shrink-0 px-4 md:px-6 py-3 bg-white">
                                <div className="max-w-3xl mx-auto">
                                  <div className="w-full max-w-2xl mx-auto relative rounded-xl p-1 border border-neutral-200/50 bg-white">
                                    <textarea
                                      className="w-full px-3 py-2 text-sm border-0 outline-none resize-none rounded-lg bg-transparent text-foreground placeholder:text-muted-foreground min-h-12"
                                      placeholder="Describí cambios para una nueva versión..."
                                      rows={2}
                                      readOnly
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="hidden md:flex shrink-0 w-72 border-l border-neutral-200 overflow-y-auto flex-col">
                            <div className="shrink-0 h-14 flex items-center px-4 border-b border-neutral-100">
                              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                Propiedades
                              </span>
                            </div>
                            <div className="px-4 py-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-neutral-500">
                                  Aspect Ratio
                                </span>
                                <div
                                  className="relative shrink-0"
                                  ref={aspectRatioMenuRef}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAspectRatioMenuOpen((open) => !open)
                                    }
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-accent/50 hover:to-accent/30 hover:translate-y-[-1px] active:translate-y-[1px] border-neutral-200 rounded-full size-8 sm:w-auto sm:h-auto sm:!px-2 sm:!py-1.5 font-normal text-neutral-600 h-7 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                                    aria-haspopup="listbox"
                                    aria-expanded={aspectRatioMenuOpen}
                                    aria-label="Cambiar aspect ratio"
                                  >
                                    <IconRatio
                                      className="size-4 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span className="hidden sm:inline">
                                      {aspectRatio}
                                    </span>
                                    <IconChevronDown
                                      className="size-3 opacity-60 hidden sm:inline shrink-0"
                                      aria-hidden="true"
                                    />
                                  </button>
                                  {aspectRatioMenuOpen && (
                                    <div
                                      className="absolute right-0 top-full mt-1 z-50 min-w-[11rem] rounded-lg border border-neutral-200 bg-white py-1 shadow-lg outline-none"
                                      role="menu"
                                      aria-orientation="vertical"
                                      aria-label="Opciones de aspect ratio"
                                      data-slot="dropdown-menu-content"
                                    >
                                      {ASPECT_RATIO_MENU_OPTIONS.map(
                                        (opt, idx) => (
                                          <React.Fragment key={opt.ratio}>
                                            {idx ===
                                              ASPECT_RATIO_PORTRAIT_COUNT && (
                                              <div
                                                role="separator"
                                                aria-orientation="horizontal"
                                                className="my-1 h-px bg-neutral-200"
                                                data-slot="dropdown-menu-separator"
                                              />
                                            )}
                                            <button
                                              type="button"
                                              role="menuitem"
                                              tabIndex={-1}
                                              data-slot="dropdown-menu-item"
                                              onClick={() => {
                                                setCreativesList((prev) => {
                                                  const i = prev.findIndex(
                                                    (c, j) =>
                                                      getCreativeId(c, j) ===
                                                      creativeId,
                                                  );
                                                  if (i < 0) return prev;
                                                  const next = [...prev];
                                                  next[i] = {
                                                    ...next[i],
                                                    aspectRatio: opt.ratio,
                                                  };
                                                  return next;
                                                });
                                                setAspectRatioMenuOpen(false);
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
                                            >
                                              <div className="shrink-0 flex items-center justify-center w-4 h-4">
                                                {opt.icon === "check" ? (
                                                  <IconCheck
                                                    className="w-4 h-4 text-current"
                                                    aria-hidden="true"
                                                  />
                                                ) : (
                                                  <div
                                                    className="border border-current rounded-sm bg-transparent opacity-70"
                                                    style={{
                                                      width: opt.w,
                                                      height: opt.h,
                                                    }}
                                                    aria-hidden="true"
                                                  />
                                                )}
                                              </div>
                                              <span>{opt.label}</span>
                                            </button>
                                          </React.Fragment>
                                        ),
                                      )}
                                      <div
                                        role="separator"
                                        aria-orientation="horizontal"
                                        className="my-1 h-px bg-neutral-200"
                                        data-slot="dropdown-menu-separator"
                                      />
                                      <div className="px-3 py-2">
                                        <button
                                          type="button"
                                          disabled
                                          className="text-sm text-neutral-400 cursor-not-allowed"
                                          data-slot="button"
                                        >
                                          Resize image
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-neutral-500">
                                  Versión
                                </span>
                                <span className="text-sm font-medium text-neutral-900">
                                  {totalCount
                                    ? `${currentIndex + 1} de ${totalCount}`
                                    : "—"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-neutral-500">
                                  Plataforma
                                </span>
                                <span className="text-sm font-medium text-neutral-900">
                                  {platformLabel}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-4 space-y-2 border-t border-neutral-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                  Prompt
                                </span>
                                <button
                                  type="button"
                                  onClick={copyPrompt}
                                  className="inline-flex items-center justify-center rounded-xl h-6 w-6 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  title="Copiar prompt"
                                >
                                  <IconCopy
                                    className="h-3.5 w-3.5 text-neutral-400"
                                    aria-hidden="true"
                                  />
                                </button>
                              </div>
                              <p className="text-sm text-neutral-700 leading-relaxed">
                                {promptText || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-full overflow-y-auto p-4 pb-48 md:pb-40">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold text-foreground">
                          Creativos generados
                          {creativesList.length > 0 && (
                            <span className="text-muted-foreground font-normal ml-1">
                              ({creativesList.length})
                            </span>
                          )}
                        </h2>
                        <button
                          type="button"
                          disabled={creativesGenerating}
                          onClick={async () => {
                            if (!workspaceSlug) return;
                            setCreativesGenerating(true);
                            try {
                              const res = await fetchWithAuth(
                                `/workspaces/${encodeURIComponent(workspaceSlug)}/creatives`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ count: 1 }),
                                },
                              );
                              if (res?.ok) {
                                const json = await res.json().catch(() => ({}));
                                if (
                                  json.success &&
                                  Array.isArray(json.data?.creatives)
                                ) {
                                  setCreativesList(json.data.creatives);
                                }
                                await refetchCreatives();
                              }
                            } catch (_) {}
                            setCreativesGenerating(false);
                          }}
                          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-[1px] h-8 rounded-lg px-3 gap-2"
                        >
                          {creativesGenerating ? (
                            <>
                              <span
                                className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                                aria-hidden="true"
                              />
                              Generando…
                            </>
                          ) : (
                            <>
                              <IconPlus
                                className="w-4 h-4"
                                aria-hidden="true"
                              />
                              Generar 1 creativo
                            </>
                          )}
                        </button>
                      </div>
                      {creativesLoading ? (
                        <CenteredLoadingSpinner />
                      ) : creativesList.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                          <p className="text-sm">
                            Aún no hay creativos. Usá el botón «Generar 1
                            creativo» para crear uno a partir de tus titulares
                            (se generan imágenes en distintos formatos: 4:5,
                            1:1, 9:16, 3:4).
                          </p>
                        </div>
                      ) : (
                        <div
                          className="w-full"
                          style={{
                            columnCount: 4,
                            columnGap: 16,
                          }}
                        >
                          {creativesList.map((creative, index) => {
                            const aspectRatio = creative.aspectRatio || "4:5";
                            const aspectClass =
                              aspectRatio === "16:9"
                                ? "aspect-[16/9]"
                                : aspectRatio === "3:4"
                                  ? "aspect-[3/4]"
                                  : aspectRatio === "1:1"
                                    ? "aspect-square"
                                    : aspectRatio === "9:16"
                                      ? "aspect-[9/16]"
                                      : aspectRatio === "4:3"
                                        ? "aspect-[4/3]"
                                        : aspectRatio === "3:2"
                                          ? "aspect-[3/2]"
                                          : "aspect-[4/5]";
                            const platform =
                              getPlatformFromAspectRatio(aspectRatio);
                            const creativeIdForRoute = getCreativeId(
                              creative,
                              index,
                            );
                            return (
                              <div
                                key={creative.id ?? creative.createdAt ?? index}
                                className="break-inside-avoid"
                                style={{ marginBottom: 16 }}
                              >
                                <Link
                                  to={
                                    workspaceSlug
                                      ? `/${workspaceSlug}/creative/${creativeIdForRoute}`
                                      : "#"
                                  }
                                  className="block"
                                >
                                  <div
                                    data-platform={platform}
                                    data-columns="4"
                                    className={`group/card relative w-full rounded-xl overflow-hidden border border-gray-300 bg-white cursor-pointer ${aspectClass} transition-all duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/25 origin-center`}
                                    style={{
                                      boxShadow:
                                        "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
                                    }}
                                  >
                                    <img
                                      src={creative.imageUrl}
                                      alt={creative.headline || "Creativo"}
                                      className="block w-full h-full object-cover pointer-events-none rounded-xl"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                    <div className="absolute inset-0 pointer-events-none rounded-xl">
                                      <div
                                        className="absolute bottom-2 right-2 pointer-events-auto opacity-0 group-hover/card:opacity-100 transition-opacity duration-200"
                                        onClick={(e) => e.preventDefault()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        <a
                                          href={
                                            creative.imageUrl.startsWith("http")
                                              ? creative.imageUrl
                                              : `${window.location.origin}${creative.imageUrl.startsWith("/") ? "" : "/"}${creative.imageUrl}`
                                          }
                                          download
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/95 text-neutral-800 shadow-lg hover:bg-white hover:scale-105 transition-all"
                                          aria-label="Descargar imagen"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <IconDownload className="w-5 h-5" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {!isProfileDetail && segmentForDisplay === "customer-profiles" && (
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain font-sans"
              style={{
                paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
                fontFamily: "var(--font-sans)",
              }}
            >
              {customerProfilesLoading ? (
                <CenteredLoadingSpinner />
              ) : (
                <div className="p-4 md:p-6">
                  <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                          Perfiles de Clientes ({customerProfilesList.length})
                          <button
                            type="button"
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-help rounded p-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
                            aria-label="Qué es un PCI (Perfil de Cliente Ideal)"
                            title="Perfil de Cliente Ideal"
                          >
                            <span className="text-sm font-normal text-primary">
                              (PCI
                            </span>
                            <IconInfo
                              className="w-4 h-4 text-primary"
                              aria-hidden="true"
                            />
                            <span className="text-sm font-normal text-primary">
                              )
                            </span>
                          </button>
                        </h2>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-gradient-to-b hover:from-accent/50 hover:to-accent/30 hover:translate-y-[-1px] active:translate-y-[1px] h-8 rounded-lg px-3 gap-2"
                        >
                          <IconPlus className="w-4 h-4" aria-hidden="true" />
                          Agregar Perfil
                        </button>
                      </div>
                      <p className="text-muted-foreground text-sm mt-2">
                        Estos perfiles se generaron según lo que entendimos de
                        tu negocio.
                        <br />
                        Usalos para crear{" "}
                        <Link
                          to={`/${workspaceSlug}/creatives`}
                          className="text-primary hover:underline font-medium"
                        >
                          Creativos
                        </Link>{" "}
                        y campañas adaptadas a cada segmento de audiencia.
                      </p>
                    </div>
                    {profileId && !profile ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <p className="text-sm">Perfil no encontrado.</p>
                      </div>
                    ) : customerProfilesList.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <p className="text-sm">
                          No hay perfiles de cliente aún. Se generan al crear el
                          workspace.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {customerProfilesList.map((profile) => (
                          <Link
                            key={profile.id}
                            to={`/${workspaceSlug}/customer-profiles/${profile.id}`}
                            className="relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 text-left w-full hover:shadow-md hover:border-primary/30 group block no-underline text-inherit"
                          >
                            <div className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="relative shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-lg bg-muted">
                                  <img
                                    src={profile.avatar}
                                    alt={profile.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                                    {profile.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {profile.subtitle}
                                  </p>
                                </div>
                                <IconChevronRight
                                  className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="mt-4">
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                  {profile.description}
                                </p>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-muted rounded-full">
                                  <IconUser
                                    className="w-3 h-3"
                                    aria-hidden="true"
                                  />
                                  {profile.ageRange}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted rounded-full">
                                  {profile.location}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-muted rounded-full">
                                  {profile.income}
                                </span>
                              </div>
                              <div className="mt-4 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                <span>Ver Detalle</span>
                                <IconChevronRight
                                  className="w-4 h-4"
                                  aria-hidden="true"
                                />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
