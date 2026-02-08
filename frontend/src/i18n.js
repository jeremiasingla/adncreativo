import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";

const STORAGE_KEY = "adncreativo_lang";

function getStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function getBrowserLanguage() {
  const nav = typeof navigator !== "undefined" ? navigator : { language: "es" };
  const lang = nav.language || nav.userLanguage || "es";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("es")) return "es";
  return "es";
}

function getInitialLanguage() {
  const stored = getStoredLanguage();
  const fromStorage = stored && stored.startsWith("en") ? "en" : stored && stored.startsWith("es") ? "es" : null;
  if (fromStorage) return fromStorage;
  return getBrowserLanguage();
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: getInitialLanguage(),
  fallbackLng: "es",
  interpolation: {
    escapeValue: false,
  },
  react: {
    bindI18n: "languageChanged",
    useSuspense: true,
  },
});

export function setLanguage(lng) {
  const normalized = lng && lng.startsWith("en") ? "en" : "es";
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {}
  i18n.changeLanguage(normalized);
}

export default i18n;
