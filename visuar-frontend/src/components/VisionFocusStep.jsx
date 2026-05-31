import { Eye } from "lucide-react";
import { VISION_FOCUS } from "../utils/visionFocus";

const OPTIONS = [
  {
    value: VISION_FOCUS.FAR,
    title: "Far away things look blurry",
    subtitle: "board, TV, road signs",
  },
  {
    value: VISION_FOCUS.NEAR,
    title: "Nearby things look blurry",
    subtitle: "phone, book, laptop",
  },
  {
    value: VISION_FOCUS.BOTH,
    title: "Both near and far look blurry",
    subtitle: null,
  },
  {
    value: VISION_FOCUS.UNSURE,
    title: "Not sure",
    subtitle: "Short screener will recommend the best tests",
  },
];

export function VisionFocusStep({ value, onChange, onContinue, isDarkMode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-50"}`}>
          <Eye className="w-6 h-6 text-cyan-500" />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Where do you notice blur the most?
          </h2>
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Your selection helps us choose tests. It is not a diagnosis.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              value === opt.value
                ? "border-cyan-500 bg-cyan-500/10"
                : isDarkMode
                  ? "border-slate-600 hover:border-cyan-500/50"
                  : "border-slate-200 hover:border-cyan-300"
            }`}
          >
            <p className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{opt.title}</p>
            {opt.subtitle && (
              <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{opt.subtitle}</p>
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
        Continue
      </button>
    </div>
  );
}
