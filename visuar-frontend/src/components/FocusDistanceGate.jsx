import { getFocusConfig } from "../utils/nearFarFocus";

/**
 * Step 3 overlay: user must hold target distance for 2 seconds before test resumes.
 */
export function FocusDistanceGate({
  focusMode,
  visionResult,
  holdProgress,
  distanceOk,
  isDarkMode,
  title,
}) {
  const cfg = getFocusConfig(focusMode);
  const pct = Math.round(holdProgress * 100);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md rounded-3xl p-6">
      <div
        className={`max-w-md w-full rounded-2xl p-8 text-center shadow-2xl ${
          isDarkMode ? "bg-slate-900 border border-slate-600" : "bg-white border border-slate-200"
        }`}
      >
        <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          {title || `Adjust distance — ${cfg.label}`}
        </h3>
        <p className={`text-sm mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          {cfg.instruction}
        </p>
        <p className={`text-xs mb-4 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
          {cfg.accommodation} Target: <strong>{cfg.targetCm} cm</strong> ({cfg.minCm}–{cfg.maxCm} cm).
        </p>

        {visionResult?.distance_cm != null && (
          <p
            className={`text-lg font-mono font-bold mb-4 ${
              distanceOk
                ? isDarkMode
                  ? "text-green-400"
                  : "text-green-600"
                : isDarkMode
                  ? "text-amber-400"
                  : "text-amber-600"
            }`}
          >
            Camera: {visionResult.distance_cm} cm
            {distanceOk ? " ✓" : ""}
          </p>
        )}

        <div
          className={`h-3 rounded-full overflow-hidden mb-2 ${
            isDarkMode ? "bg-slate-700" : "bg-slate-200"
          }`}
        >
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          {distanceOk
            ? `Hold steady… ${pct}% (${Math.max(0, Math.ceil((1 - holdProgress) * 2))}s)`
            : "Move until distance is in range, then hold for 2 seconds"}
        </p>
      </div>
    </div>
  );
}
