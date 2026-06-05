import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Shown before vision tests — encourages a short break after prolonged screen use.
 */
export function EyeRestReminder({ isDarkMode, className = "" }) {
  const { t } = useTranslation();

  return (
    <div
      className={`w-full max-w-2xl mx-auto mb-6 rounded-xl border px-4 py-3 flex gap-3 items-start text-start ${
        isDarkMode
          ? "bg-amber-500/10 border-amber-500/30 text-amber-100"
          : "bg-amber-50 border-amber-200 text-amber-950"
      } ${className}`}
      role="note"
    >
      <Timer
        className={`w-5 h-5 shrink-0 mt-0.5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}
        aria-hidden
      />
      <p className={`text-sm leading-relaxed ${isDarkMode ? "text-amber-100/95" : "text-amber-900"}`}>
        <span className="font-semibold">{t("visionFocus.eyeRestTip")} </span>
        {t("visionFocus.eyeRestBody")}
      </p>
    </div>
  );
}
