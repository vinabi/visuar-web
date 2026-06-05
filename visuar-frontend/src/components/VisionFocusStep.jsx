import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VISION_FOCUS } from "../utils/visionFocus";
import { EyeRestReminder } from "./EyeRestReminder";

const OPTIONS = [
  { value: VISION_FOCUS.FAR, titleKey: "visionFocus.farTitle", subtitleKey: "visionFocus.farSubtitle" },
  { value: VISION_FOCUS.NEAR, titleKey: "visionFocus.nearTitle", subtitleKey: "visionFocus.nearSubtitle" },
  { value: VISION_FOCUS.BOTH, titleKey: "visionFocus.bothTitle", subtitleKey: null },
  { value: VISION_FOCUS.UNSURE, titleKey: "visionFocus.unsureTitle", subtitleKey: "visionFocus.unsureSubtitle" },
];

export function VisionFocusStep({ value, onChange, onContinue, isDarkMode }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <EyeRestReminder isDarkMode={isDarkMode} />
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-50"}`}>
          <Eye className="w-6 h-6 text-cyan-500" />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {t("visionFocus.title")}
          </h2>
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            {t("visionFocus.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-left p-4 rounded-2xl border-2 transition-colors ${
              value === opt.value
                ? "border-cyan-500 bg-cyan-500/10"
                : isDarkMode
                  ? "border-slate-600 hover:border-cyan-500/50"
                  : "border-slate-200 hover:border-cyan-300"
            }`}
          >
            <p className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{t(opt.titleKey)}</p>
            {opt.subtitleKey && (
              <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t(opt.subtitleKey)}
              </p>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!value}
        onClick={onContinue}
        className="w-full py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-white disabled:opacity-40"
      >
        {t("visionFocus.continue")}
      </button>
    </div>
  );
}
