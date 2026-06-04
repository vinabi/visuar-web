import { getStepLabel } from "../utils/visionFocus";

export function AssessmentProgress({ plan, currentIndex, isDarkMode, variant = "complete" }) {
  if (!plan?.length) return null;
  const heading =
    variant === "quick-screener"
      ? `Quick screener · Step ${currentIndex + 1} of ${plan.length}`
      : `Complete assessment · Step ${currentIndex + 1} of ${plan.length}`;
  return (
    <div className={`w-full px-4 py-3 border-b ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        {heading}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {plan.map((step, i) => (
          <span
            key={`${step}-${i}`}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              i === currentIndex
                ? "bg-cyan-500 text-white"
                : i < currentIndex
                  ? isDarkMode
                    ? "bg-green-500/20 text-green-400"
                    : "bg-green-100 text-green-700"
                  : isDarkMode
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-200 text-slate-500"
            }`}
          >
            {getStepLabel(step)}
          </span>
        ))}
      </div>
    </div>
  );
}
