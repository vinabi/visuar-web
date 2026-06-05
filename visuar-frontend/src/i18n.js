import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslations from "./locales/en/translation.json";
import urTranslations from "./locales/ur/translation.json";
import catalogEn from "./locales/catalog-en.json";
import catalogUr from "./locales/catalog-ur.json";

/** Deep-merge catalog into base so nested keys (e.g. dashboard.*) are not wiped. */
function deepMergeTranslations(base, catalog) {
  const result = { ...base };
  for (const key of Object.keys(catalog)) {
    const baseVal = base[key];
    const catalogVal = catalog[key];
    if (
      catalogVal !== null &&
      typeof catalogVal === "object" &&
      !Array.isArray(catalogVal) &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMergeTranslations(baseVal, catalogVal);
    } else {
      result[key] = catalogVal;
    }
  }
  return result;
}

const resources = {
  en: { translation: deepMergeTranslations(enTranslations, catalogEn) },
  ur: { translation: deepMergeTranslations(urTranslations, catalogUr) },
};

function applyDocumentLanguage(lng) {
  const lang = lng?.startsWith("ur") ? "ur" : "en";
  document.documentElement.lang = lang;
  // Keep LTR layout for all languages — only translate text, do not mirror the UI.
  document.documentElement.dir = "ltr";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "language", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "language",
    },
  });

i18n.on("languageChanged", applyDocumentLanguage);
applyDocumentLanguage(i18n.language);

export default i18n;
