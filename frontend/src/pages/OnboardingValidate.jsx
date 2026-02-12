import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchWithAuth } from "../api/fetchWithAuth";
import BrandingView from "../components/BrandingView";
import WebsiteUrlInput from "../components/WebsiteUrlInput";

const heroBackground = (
  <>
    <div className="absolute inset-0 bg-white" aria-hidden />
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% 100%, rgba(191,219,254,0.45) 0%, rgba(147,197,253,0.2) 35%, rgba(129,140,248,0.06) 55%, transparent 70%)",
      }}
    />
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        opacity: 0.06,
      }}
    />
  </>
);

const STEPS = [
  "Extrayendo colores de marca",
  "Aprendiendo tu tono de voz",
  "Analizando tu sitio",
  "Creando tu espacio",
];

function getDisplayUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname + u.pathname;
  } catch {
    return url;
  }
}

function normalizeUrl(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function buildValidateUrl(websiteUrl, state) {
  const url = (websiteUrl || "").trim();
  const normalized = url.startsWith("http") ? url : url ? `https://${url}` : "";
  if (!normalized) return "/onboarding/step/validate";
  const base = `/onboarding/step/validate?websiteUrl=${encodeURIComponent(
    normalized
  )}`;
  return state ? `${base}&state=${state}` : base;
}

export default function OnboardingValidate() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const websiteUrl = searchParams.get("websiteUrl")?.trim() || null;
  const state = searchParams.get("state") || "";
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [retryUrl, setRetryUrl] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!websiteUrl) {
      navigate("/", { replace: true });
      return;
    }
    const url = websiteUrl.startsWith("http")
      ? websiteUrl
      : `https://${websiteUrl}`;

    if (state === "branding" && !result) {
      startedRef.current = false;
      navigate(buildValidateUrl(websiteUrl, "creating"), { replace: true });
      return;
    }
    if (state !== "creating" && state !== "branding") {
      navigate(buildValidateUrl(websiteUrl, "creating"), { replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const screenshotRes = await fetchWithAuth("/workspaces/screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!screenshotRes) {
          setLoading(false);
          return;
        }
        const screenshotData = await screenshotRes.json().catch(() => ({}));
        if (!screenshotRes.ok) {
          setError(screenshotData.error || "No se pudo capturar el sitio.");
          setRetryUrl(url);
          setLoading(false);
          return;
        }
        setScreenshotUrl(screenshotData.screenshotUrl || null);
        const slug = screenshotData.slug;
        if (!slug) {
          setLoading(false);
          return;
        }

        const newRes = await fetchWithAuth("/workspaces/new", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, screenshotSlug: slug }),
        });
        if (!newRes) {
          setLoading(false);
          return;
        }
        const newData = await newRes.json().catch(() => ({}));
        if (!newRes.ok) {
          setError(newData.error || "No se pudo crear el espacio.");
          setRetryUrl(url);
          setLoading(false);
          return;
        }
        setResult(newData.data || {});
        navigate(buildValidateUrl(websiteUrl, "branding"), { replace: true });
      } catch (err) {
        setError("Error de conexión.");
        setRetryUrl(url);
      } finally {
        setLoading(false);
      }
    })();
  }, [websiteUrl, state, navigate]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 3000);
    return () => clearInterval(t);
  }, [loading]);

  if (!websiteUrl) return null;

  const normalizedWebsiteUrl = websiteUrl.startsWith("http")
    ? websiteUrl
    : `https://${websiteUrl}`;
  const displayUrl = getDisplayUrl(normalizedWebsiteUrl);

  const handleTryAgain = (e) => {
    e.preventDefault();
    const url = normalizeUrl(retryUrl || normalizedWebsiteUrl);
    if (!url) return;
    startedRef.current = false;
    setError(null);
    setScreenshotUrl(null);
    setResult(null);
    setRetryUrl("");
    setLoading(true);
    navigate(buildValidateUrl(url, "creating"), { replace: true });
  };

  const showWebsiteNotFound = !!error;
  const showBrandingView = state === "branding" && result;

  return (
    <div className="min-h-screen bg-white">
      {showBrandingView ? (
        <>
          {/* Fondo: fixed para no ocupar espacio en el flujo y no empujar el contenido */}
          <div className="fixed inset-0 z-0" aria-hidden>
            {heroBackground}
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none"
              aria-hidden
            />
          </div>
          <div
            className="relative z-10 min-h-screen flex flex-col items-center justify-start py-8 px-4"
            style={{
              paddingTop:
                "max(2rem, calc(env(safe-area-inset-top, 0px) + 2rem))",
              paddingBottom:
                "max(2rem, calc(env(safe-area-inset-bottom, 0px) + 2rem))",
            }}
          >
            <div className="text-center mb-6">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground font-instrument-serif mb-3">
                Tu ADN de marca
              </h1>
              <p className="text-lg text-muted-foreground">
                Hacé clic en cualquier sección para personalizar tu identidad de
                marca
              </p>
            </div>
            <div className="w-full max-w-6xl mb-6">
              <div className="w-full h-full relative">
                <div className="h-full overflow-y-auto">
                  <div className="rounded-2xl border border-border bg-card shadow-inner overflow-hidden">
                    <BrandingView branding={result?.branding} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 mt-2 w-full max-w-6xl px-4">
              <p className="text-muted-foreground text-sm text-center">
                A continuación usaremos tu ADN de negocio para generar campañas
                en redes.
              </p>
              <button
                type="button"
                onClick={() => result?.slug && navigate(`/${result.slug}`)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer bg-gradient-to-b from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-[0_2px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.1)] border border-primary/50 h-10 px-8 py-3 text-lg w-full [&_svg]:size-5 [&_svg]:shrink-0"
              >
                Continuar
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
                  className="ml-2"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <section className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="min-h-screen relative flex items-center justify-center p-6 w-full">
            <div className="fixed inset-0 z-0" aria-hidden>
              {heroBackground}
            </div>
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none z-0"
              aria-hidden
            />
            <div
              className="relative z-10 w-full flex flex-col items-center max-w-2xl mx-auto"
              style={{
                paddingTop:
                  "max(4rem, calc(env(safe-area-inset-top, 0px) + 4rem))",
                paddingBottom:
                  "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))",
              }}
            >
              {showWebsiteNotFound && (
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium mb-6 transition-colors self-start"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Volver al inicio
                </Link>
              )}

              <div className="w-full overflow-hidden max-w-xl">
                {showWebsiteNotFound ? (
                  <div className="bg-gradient-to-br from-slate-200/60 via-slate-100/40 to-card rounded-2xl p-8 shadow-lg border border-border">
                    <div className="text-center mb-8">
                      <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100">
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
                          className="w-8 h-8 text-red-600"
                          aria-hidden
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" x2="12" y1="8" y2="12" />
                          <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-bold text-foreground font-instrument-serif mb-4">
                        Sitio no encontrado
                      </h1>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        No pudimos acceder a{" "}
                        <span className="font-semibold text-foreground break-all">
                          {normalizedWebsiteUrl}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-sm mt-2">
                        No pudimos alcanzar tu sitio. Revisá la URL e intentá de
                        nuevo.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-foreground">
                        Probá con otra URL:
                      </p>
                      <div className="w-full max-w-md mx-auto relative rounded-xl p-1 transition-all duration-300 glass-prompt-wrap hover:scale-[1.005]">
                        <WebsiteUrlInput
                          value={retryUrl}
                          onChange={(e) => setRetryUrl(e.target.value)}
                          onSubmit={handleTryAgain}
                          placeholder={t("home.placeholderUrl")}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Podés ingresar una URL de sitio web o de perfil de
                        Instagram
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-slate-200/60 via-slate-100/40 to-card rounded-2xl p-8 shadow-lg border border-border">
                    <div className="text-center mb-8">
                      <h1 className="text-3xl md:text-4xl font-bold text-foreground font-instrument-serif mb-4">
                        Generando tu{" "}
                        <span className="italic">ADN de negocio</span>
                      </h1>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Estamos investigando y analizando tu negocio.
                        <br />
                        Puede tardar varios minutos. Podés volver más tarde.
                      </p>
                    </div>

                    <div className="flex justify-center mb-6">
                      <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm"
                        aria-live="polite"
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
                          className="w-4 h-4 text-foreground animate-pulse shrink-0"
                          aria-hidden
                        >
                          <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
                          <path d="M20 2v4" />
                          <path d="M22 4h-4" />
                          <circle cx="4" cy="20" r="2" />
                        </svg>
                        <span className="text-foreground text-sm font-medium">
                          {loading ? STEPS[stepIndex] : "Listo"}
                        </span>
                      </div>
                    </div>

                    {screenshotUrl && (
                      <div className="relative rounded-xl overflow-hidden bg-card border border-border shadow-inner mb-6">
                        <div className="aspect-[4/3] relative">
                          <img
                            src={screenshotUrl}
                            alt={`Captura del sitio ${displayUrl}`}
                            loading="lazy"
                            decoding="async"
                            className="absolute inset-0 w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
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
                        className="w-4 h-4 shrink-0"
                        aria-hidden
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span className="text-sm truncate">{displayUrl}</span>
                    </div>

                    {loading && (
                      <div className="flex items-center justify-center gap-3 mt-6">
                        <div className="relative w-5 h-5">
                          <svg
                            className="w-5 h-5 animate-spin text-muted-foreground"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <circle
                              className="opacity-20"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="3"
                              fill="none"
                            />
                            <path
                              className="opacity-80"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              d="M12 2a10 10 0 0 1 10 10"
                            />
                          </svg>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          Unos 2 minutos restantes
                        </span>
                      </div>
                    )}

                    {!loading && result && (
                      <div className="text-center pt-2 mt-6">
                        <button
                          type="button"
                          onClick={() => navigate("/")}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold h-14 px-6 bg-gradient-to-b from-primary via-primary to-primary/80 text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0.5 border border-primary/50 transition-all"
                        >
                          Volver al inicio
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
