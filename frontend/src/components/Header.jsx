import React from "react";
import ReactDOM from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { setLanguage } from "../i18n";

const innerNavInitial = {
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "none",
  border: "1px solid transparent",
  gap: 0,
  padding: 0,
  backgroundColor: "rgba(255, 255, 255, 0)",
};

const innerNavScrolled = {
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow:
    "rgba(0, 0, 0, 0.1) 0px 8px 32px, rgba(255, 255, 255, 0.3) 0px 1px 0px inset, rgba(0, 0, 0, 0.05) 0px -1px 0px inset",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  gap: 0,
  padding: "6px 12px",
  backgroundColor: "rgba(255, 255, 255, 0.12)",
};

const HEADER_LANGUAGE_OPTIONS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export default function Header({ onOpenSignIn }) {
  const { pathname } = useLocation();
  const { t, i18n: i18nInstance } = useTranslation();
  const { user, logout } = useAuth();
  const isHome = pathname === "/";
  const isPricing = pathname === "/pricing";
  const currentLang = i18nInstance.language?.startsWith("en") ? "en" : "es";
  const currentLangLabel = HEADER_LANGUAGE_OPTIONS.find((o) => o.code === currentLang)?.label ?? "Español";
  const [scrolled, setScrolled] = React.useState(false);
  const [showUserPopup, setShowUserPopup] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [popupPosition, setPopupPosition] = React.useState({ top: 0, right: 0 });
  const avatarButtonRef = React.useRef(null);
  const popupRef = React.useRef(null);
  const languageButtonRef = React.useRef(null);
  const languageDropdownRef = React.useRef(null);

  const updatePopupPosition = React.useCallback(() => {
    if (avatarButtonRef.current) {
      const rect = avatarButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  React.useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 0);
        ticking = false;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (showUserPopup && avatarButtonRef.current) {
      updatePopupPosition();
      window.addEventListener("scroll", updatePopupPosition, true);
      window.addEventListener("resize", updatePopupPosition);
      return () => {
        window.removeEventListener("scroll", updatePopupPosition, true);
        window.removeEventListener("resize", updatePopupPosition);
      };
    }
  }, [showUserPopup, updatePopupPosition]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showUserPopup &&
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(e.target)
      ) {
        setShowUserPopup(false);
      }
      if (
        languageOpen &&
        languageButtonRef.current &&
        languageDropdownRef.current &&
        !languageButtonRef.current.contains(e.target) &&
        !languageDropdownRef.current.contains(e.target)
      ) {
        setLanguageOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape" && showUserPopup) setShowUserPopup(false);
      if (e.key === "Escape" && languageOpen) setLanguageOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showUserPopup, languageOpen]);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Usuario";

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const innerNavStyle = scrolled ? innerNavScrolled : innerNavInitial;
  const [edgeMarginPxState, setEdgeMarginPxState] = React.useState(() => {
    if (typeof window === "undefined") return 0;
    const vw50 = window.innerWidth * 0.5;
    return Math.max(0, Math.min(350, -400 + vw50));
  });
  React.useEffect(() => {
    let ticking = false;
    const update = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const vw50 = window.innerWidth * 0.5;
        setEdgeMarginPxState(Math.max(0, Math.min(350, -400 + vw50)));
        ticking = false;
      });
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const marginEnds = scrolled ? 0 : edgeMarginPxState;

  return (
    <>
      <header className="fixed left-0 right-0 z-50 px-6 py-2" style={{ top: 40 }}>
        <div className="md:hidden flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 p-0 h-auto hover:bg-transparent relative z-10 cursor-pointer"
            aria-label={t("nav.goHome")}
          >
            <img
              alt="Aura Studio"
              loading="lazy"
              width={scrolled ? 112 : 140}
              height={scrolled ? 32 : 40}
              decoding="async"
              className={`object-contain vibiz-logo w-auto transition-all duration-300 ${scrolled ? "h-8" : "h-10"}`}
              style={{ color: "transparent" }}
              src="/images/aura-red.svg"
            />
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer h-10 w-10 p-2.5 rounded-full transition-all duration-500 backdrop-blur-xl border relative z-[60] active:scale-95 bg-white/10 text-white border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
            style={{
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label={t("nav.toggleMenu")}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden>
              <path d="M4 5h16" />
              <path d="M4 12h16" />
              <path d="M4 19h16" />
            </svg>
          </button>
        </div>

        <div className="hidden md:flex justify-center">
          <div
            className="flex items-center rounded-full nav-bar-transition"
            style={innerNavStyle}
          >
            <div
              className="flex justify-start nav-bar-margin-transition"
              style={{ marginRight: marginEnds }}
            >
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 p-0 h-auto hover:bg-transparent cursor-pointer"
                aria-label={t("nav.goHome")}
              >
                <img
                  alt="Aura Studio"
                  loading="lazy"
                  width={scrolled ? 100 : 125}
                  height={scrolled ? 32 : 40}
                  decoding="async"
                  className={`object-contain vibiz-logo w-auto transition-all duration-300 ${scrolled ? "h-8" : "h-10"}`}
                  style={{ color: "transparent" }}
                  src="/images/aura-red.svg"
                />
              </Link>
            </div>
            <nav className="flex items-center gap-1 mx-4">
              <Link
                to="/"
                className={
                  isHome
                    ? "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-accent/50 hover:to-accent/30 hover:translate-y-[-1px] active:translate-y-[1px] h-8 px-3 rounded-full"
                    : "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:bg-accent hover:text-accent-foreground h-8 px-3 rounded-full"
                }
              >
                {t("nav.home")}
              </Link>
              <Link
                to="/pricing"
                className={
                  isPricing
                    ? "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer border bg-gradient-to-b from-background to-muted/30 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] hover:from-accent/50 hover:to-accent/30 hover:translate-y-[-1px] active:translate-y-[1px] h-8 px-3 rounded-full"
                    : "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer hover:bg-accent hover:text-accent-foreground h-8 px-3 rounded-full"
                }
              >
                {t("nav.pricing")}
              </Link>
            </nav>
            <div
              className="flex items-center justify-end gap-3 nav-bar-margin-transition"
              style={{ marginLeft: marginEnds }}
            >
              <div className="relative">
                <button
                  ref={languageButtonRef}
                  type="button"
                  onClick={() => setLanguageOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 cursor-pointer hover:bg-accent transition-colors"
                  aria-label={t("common.language")}
                  aria-expanded={languageOpen}
                  aria-haspopup="listbox"
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
                    className="lucide lucide-globe shrink-0 transition-colors w-4 h-4"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  <span className="hidden sm:inline">{currentLangLabel}</span>
                </button>
                {languageOpen && (
                  <div
                    ref={languageDropdownRef}
                    role="listbox"
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 py-1 min-w-[120px] bg-white rounded-lg shadow-lg border border-border z-50"
                  >
                    {HEADER_LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.code}
                        role="option"
                        aria-selected={currentLang === opt.code}
                        type="button"
                        onClick={() => {
                          setLanguage(opt.code);
                          setLanguageOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${currentLang === opt.code ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {user ? (
                <button
                  ref={avatarButtonRef}
                  type="button"
                  onClick={() => setShowUserPopup((prev) => !prev)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-8 w-8 flex items-center justify-center bg-neutral-200 text-neutral-700 text-xs font-medium"
                  aria-label={t("nav.userMenu")}
                  aria-expanded={showUserPopup}
                >
                  {(user?.name?.trim() || user?.email || "U").slice(0, 1).toUpperCase()}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="btn-signin-header inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer h-8 px-3 rounded-full"
                >
                  {t("common.signIn")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showUserPopup &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label={t("nav.userMenu")}
            tabIndex={-1}
            className="fixed min-w-[240px] bg-white rounded-xl shadow-xl border border-border overflow-hidden"
            style={{
              top: popupPosition.top,
              right: popupPosition.right,
              zIndex: 9999,
              animation: "fadeInUp 0.25s ease-out",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div className="cl-userButtonPopoverMain">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-neutral-200 text-neutral-700 flex items-center justify-center text-sm font-medium">
                  {(user?.name?.trim() || user?.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-neutral-900 truncate">
                    {displayName}
                  </div>
                  <div className="text-[13px] text-neutral-500 truncate">
                    {user?.email || ""}
                  </div>
                </div>
              </div>
              <div role="menu" className="border-t border-border py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowUserPopup(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-current">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M2.6 2.604A2.045 2.045 0 0 1 4.052 2h3.417c.544 0 1.066.217 1.45.604.385.387.601.911.601 1.458v.69c0 .413-.334.75-.746.75a.748.748 0 0 1-.745-.75v-.69a.564.564 0 0 0-.56-.562H4.051a.558.558 0 0 0-.56.563v7.875a.564.564 0 0 0 .56.562h3.417a.558.558 0 0 0 .56-.563v-.671c0-.415.333-.75.745-.75s.746.335.746.75v.671c0 .548-.216 1.072-.6 1.459a2.045 2.045 0 0 1-1.45.604H4.05a2.045 2.045 0 0 1-1.45-.604A2.068 2.068 0 0 1 2 11.937V4.064c0-.548.216-1.072.6-1.459Zm8.386 3.116a.743.743 0 0 1 1.055 0l1.74 1.75a.753.753 0 0 1 0 1.06l-1.74 1.75a.743.743 0 0 1-1.055 0 .753.753 0 0 1 0-1.06l.467-.47H5.858A.748.748 0 0 1 5.112 8c0-.414.334-.75.746-.75h5.595l-.467-.47a.753.753 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                  {t("common.signOut")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
