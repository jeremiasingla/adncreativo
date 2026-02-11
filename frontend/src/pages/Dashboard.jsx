import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../contexts/AuthContext";
import { fetchWithAuth } from "../api/fetchWithAuth";
import WebsiteUrlInput from "../components/WebsiteUrlInput";
import HeroBackground from "../components/HeroBackground";

gsap.registerPlugin();

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ChevronRightIcon({ className }) {
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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  const fullName =
    user?.name?.trim() || user?.email?.split("@")[0] || "Usuario";
  const displayName = fullName.split(/\s+/)[0] || fullName;

  useEffect(() => {
    if (!pageRef.current) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const heroTitle = pageRef.current.querySelector(
        "[data-gsap='hero-title']"
      );
      const heroSubtitle = pageRef.current.querySelector(
        "[data-gsap='hero-subtitle']"
      );
      const heroInput = pageRef.current.querySelector(
        "[data-gsap='hero-input']"
      );
      if (heroTitle && heroSubtitle && heroInput && !prefersReducedMotion) {
        gsap.from([heroTitle, heroSubtitle, heroInput], {
          opacity: 0,
          y: 20,
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out",
          delay: 0.15,
        });
      }
    }, pageRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/workspaces");
        if (!res) return;
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setWorkspaces(json.data);
        }
      } catch (_) {
        if (!cancelled) setWorkspaces([]);
      } finally {
        if (!cancelled) setWorkspacesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const raw = websiteUrl?.trim();
    if (!raw) return;
    const url = normalizeUrl(raw);
    navigate(`/onboarding/step/validate?websiteUrl=${encodeURIComponent(url)}`);
  };

  return (
    <div ref={pageRef} className="bg-white">
      {/* Hero Section – mismo background que Home (gradiente celeste) */}
      <section className="relative min-h-screen w-full lg:min-h-0 lg:h-[100dvh] flex flex-col items-center justify-center isolate bg-white">
        <HeroBackground />
        <div
          className="relative z-10 min-h-screen w-full lg:h-[100dvh] flex flex-col items-center justify-center"
          style={{
            paddingTop:
              "max(10rem, calc(env(safe-area-inset-top, 0px) + 10rem))",
            paddingBottom:
              "max(4rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))",
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center mt-8 sm:mt-12 lg:mt-0">
            <h1
              data-gsap="hero-title"
              className="text-5xl sm:text-6xl md:text-7xl font-bold mb-3 sm:mb-4 text-black leading-tight font-serif text-center transition-[800ms] ease-out"
              style={{ opacity: 1, transform: "translate(0px, 0px)" }}
            >
              <em>Bienvenido de nuevo, {displayName}!</em>
            </h1>
            <p
              data-gsap="hero-subtitle"
              className="text-lg sm:text-xl md:text-2xl text-black mb-6 sm:mb-8 transition-[800ms] ease-out"
              style={{ opacity: 1, transform: "translate(0px, 0px)" }}
            >
              Ingresá tu sitio web para crear contenido acorde con tu marca o
              seleccioná un espacio de trabajo.
            </p>
          </div>

          <div
            data-gsap="hero-input"
            className="w-full px-4 sm:px-6 mb-8 sm:mb-12 lg:mb-0"
          >
            <div
              className="max-w-md mx-auto transition-[800ms] ease-out"
              style={{ opacity: 1, transform: "translate(0px, 0px)" }}
            >
              <WebsiteUrlInput
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onSubmit={handleSubmit}
                className="max-w-md mx-auto"
              />
            </div>
          </div>

          {/* Your Workspaces – cards como en la referencia */}
          {!workspacesLoading && workspaces.length > 0 && (
            <div
              className="max-w-7xl mx-auto px-6 w-full mt-16"
              style={{
                transition: "800ms ease-out",
                opacity: 1,
                transform: "translate(0px, 0px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sans text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Tus espacios de trabajo
                </h2>
                <span className="font-sans text-sm text-muted-foreground">
                  {workspaces.length}{" "}
                  {workspaces.length === 1 ? "espacio" : "espacios"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {workspaces.map((ws) => (
                  <div key={ws.id} style={{ opacity: 1, transform: "none" }}>
                    <div
                      className="group relative flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-gradient-to-b hover:from-accent/50 hover:to-accent/30 hover:-translate-y-1 active:translate-y-0.5 active:scale-[0.99] transition-[transform,box-shadow,background] duration-300 ease-out cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/${ws.slug}`)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && navigate(`/${ws.slug}`)
                      }
                    >
                      <div className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 p-1">
                        <div className="w-full h-full rounded-lg flex items-center justify-center text-white font-semibold text-lg overflow-hidden bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
                          {ws.logoUrl || ws.screenshotUrl ? (
                            <img
                              src={ws.logoUrl || ws.screenshotUrl}
                              alt={ws.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="text-foreground text-sm font-semibold">
                              {(ws.name || "W").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-sans font-semibold text-foreground truncate">
                          {ws.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {workspaces.map((ws) => (
                    <div key={ws.id} style={{ opacity: 1, transform: "none" }}>
                      <div
                        className="group relative flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-gradient-to-b hover:from-accent/50 hover:to-accent/30 hover:-translate-y-1 active:translate-y-0.5 active:scale-[0.99] transition-[transform,box-shadow,background] duration-300 ease-out cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/${ws.slug}`)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && navigate(`/${ws.slug}`)
                        }
                      >
                        <div className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 p-1">
                          <div className="w-full h-full rounded-lg flex items-center justify-center text-white font-semibold text-lg overflow-hidden bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
                            {ws.logoUrl || ws.screenshotUrl ? (
                              <img
                                src={ws.logoUrl || ws.screenshotUrl}
                                alt={ws.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span className="text-foreground text-sm font-semibold">
                                {(ws.name || "W").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-sans font-semibold text-foreground truncate">
                            {ws.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChevronRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
