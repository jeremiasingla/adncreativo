import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import WebsiteUrlInput from "./WebsiteUrlInput";

const FOOTER_LANGUAGE_OPTIONS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
];

export default function Footer({ value = "", onChange = () => {}, onSubmit = (e) => e.preventDefault() }) {
  const { t, i18n } = useTranslation();
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageButtonRef = useRef(null);
  const languageDropdownRef = useRef(null);
  const currentLang = i18n.language?.startsWith("en") ? "en" : "es";
  const currentLangLabel = FOOTER_LANGUAGE_OPTIONS.find((o) => o.code === currentLang)?.label ?? "Español";

  useEffect(() => {
    const handleClickOutside = (e) => {
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [languageOpen]);

  return (
    <footer className="relative w-full overflow-hidden bg-white">
      <div
        className="absolute top-0 left-0 right-0 h-24 sm:h-36 md:h-48 bg-gradient-to-b from-white via-white/50 to-transparent pointer-events-none z-20"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/Footer.png')" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/20"
        aria-hidden
      />

      <div className="relative z-10 pt-20 sm:pt-32 md:pt-40 pb-32 sm:pb-48 md:pb-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-black font-instrument-serif">
            {t("home.cta.title")}
          </h2>
          <p className="text-lg sm:text-xl text-black mb-8 sm:mb-12">
            {t("home.cta.subtitle")}
          </p>
          <div className="max-w-md mx-auto">
            <div className="w-full max-w-2xl mx-auto relative rounded-xl p-1 transition-all duration-300 glass-prompt-wrap hover:scale-[1.005]">
              <WebsiteUrlInput
                value={value}
                onChange={onChange}
                onSubmit={onSubmit}
                placeholder={t("home.placeholderUrl")}
              />
            </div>
          </div>
          <p className="text-black/80 text-xs sm:text-sm mt-4">
            {t("home.footer.disclaimer")}
          </p>
        </div>
      </div>

      <div className="relative z-10 py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
              <a
                href="https://discord.com/invite/N9dGY8gf3y"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/90 hover:text-black transition-colors cursor-pointer"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/vibiz.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/90 hover:text-black transition-colors cursor-pointer"
                aria-label="Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@vibiz.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/90 hover:text-black transition-colors cursor-pointer"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
              <a
                href="https://x.com/vibiz_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/90 hover:text-black transition-colors cursor-pointer"
                aria-label="X (Twitter)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/vibizai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/90 hover:text-black transition-colors cursor-pointer"
                aria-label="LinkedIn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <div className="w-px h-5 bg-black/50" aria-hidden />
              <a href="/privacy" className="text-black/90 hover:text-black transition-colors text-sm">
                {t("home.footer.privacy")}
              </a>
              <a href="/refund-policy" className="text-black/90 hover:text-black transition-colors text-sm">
                {t("home.footer.refundPolicy")}
              </a>
              <div className="w-px h-5 bg-black/50" aria-hidden />
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe shrink-0 w-4 h-4" aria-hidden>
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
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 min-w-[120px] bg-white rounded-lg shadow-lg border border-border z-50"
                  >
                    {FOOTER_LANGUAGE_OPTIONS.map((opt) => (
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
            </div>
            <p className="text-black/90 text-sm">
              {t("home.footer.copyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
