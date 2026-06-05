import { useTranslation } from "react-i18next";
import { useReadingAssist, READING_ASSIST_MODES } from "../context/ReadingAssistContext";

const OPTIONS = [
  { id: READING_ASSIST_MODES.OFF, labelKey: "settings.readingAssistOff", descKey: "settings.readingAssistOffDesc" },
  { id: READING_ASSIST_MODES.LARGE, labelKey: "settings.readingAssistLarge", descKey: "settings.readingAssistLargeDesc" },
];

export function ReadingAssistPicker({ isDarkMode }) {
  const { t } = useTranslation();
  const { mode, setMode } = useReadingAssist();
  const active = OPTIONS.find((o) => o.id === mode) ?? OPTIONS[0];

  const selectClass = `w-full appearance-none rounded-xl border px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 cursor-pointer transition-colors ${
    isDarkMode
      ? "bg-slate-800/50 border-slate-600 text-slate-100"
      : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
  }`;

  return (
    <div>
      <label htmlFor="reading-assist-mode" className="sr-only">
        {t("settings.readingAssist")}
      </label>
      <select
        id="reading-assist-mode"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className={selectClass}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
      <p
        className={`text-sm mt-2 leading-relaxed ${
          isDarkMode ? "text-slate-400" : "text-slate-600"
        }`}
      >
        {t(active.descKey)}
      </p>
    </div>
  );
}
