import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", labelKey: "languages.en", flag: "US" },
  { code: "ur", labelKey: "languages.ur", flag: "🇵🇰" },
];

export function LanguageSelector({ className = "", isDarkMode = false }) {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem("language", langCode);
  };

  const selectClass = `appearance-none backdrop-blur-sm border rounded-lg px-4 py-2 pr-10 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer transition-colors ${
    isDarkMode
      ? "bg-slate-800/50 border-slate-600 text-slate-100"
      : "bg-white/80 border-slate-200 text-slate-700 hover:bg-white"
  }`;

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-2">
        <Globe className={`w-5 h-5 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} />
        <select
          value={i18n.language?.startsWith("ur") ? "ur" : "en"}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className={selectClass}
          aria-label={t("settings.language")}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {t(lang.labelKey)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
