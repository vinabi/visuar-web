import { Eye, AlertTriangle } from "lucide-react";
import { correctionModeLabel } from "../utils/correctionMode";
import { CONFIDENCE, enrichLegacyEyeEstimate } from "../utils/finalEstimate";
import { DIOPTER_ESTIMATE_DISCLAIMER } from "../utils/diopterEstimate";

function formatDiopter(d) {
  if (d == null || Number.isNaN(d)) return "—";
  return `${d > 0 ? "+" : ""}${d.toFixed(2)} D`;
}

function EyeScreeningCard({ label, eye: rawEye, isDarkMode }) {
  const eye = enrichLegacyEyeEstimate(rawEye);
  const panel = isDarkMode
    ? "bg-slate-800/40 border border-slate-700/40"
    : "bg-slate-50 border border-slate-200";

  const approxD = eye.sessionAverageDiopterD ?? eye.singleDiopterD;
  const showCylinder = eye.cylinderD != null && Math.abs(eye.cylinderD) >= 0.25;

  return (
    <div className={`rounded-2xl p-5 ${panel}`}>
      <h4 className={`font-bold mb-3 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        <Eye className="w-4 h-4 text-cyan-500" /> {label}
      </h4>

      {approxD != null && (
        <p
          className={`text-lg font-black mb-3 ${
            isDarkMode ? "text-cyan-400" : "text-cyan-600"
          }`}
        >
          Approximate eyesight number: {formatDiopter(approxD)}
        </p>
      )}

      <ul className={`space-y-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
        {eye.distanceAcuity && (
          <li>
            Distance vision: <strong>{eye.distanceAcuity}</strong>
          </li>
        )}
        {eye.nearAcuity && (
          <li>
            Near vision: <strong>{eye.nearAcuity}</strong>
          </li>
        )}
        {eye.sphereD != null && (
          <li>
            Sphere: <strong>{formatDiopter(eye.sphereD)}</strong>
          </li>
        )}
        <li>
          Cylinder:{" "}
          <strong>
            {showCylinder ? formatDiopter(eye.cylinderD) : "Not detected"}
          </strong>
        </li>
        <li>
          Axis:{" "}
          <strong>
            {showCylinder && eye.axis != null ? `${eye.axis}°` : "—"}
          </strong>
        </li>
        <li>
          Test mode:{" "}
          <strong>
            {eye.correctionMode === "corrected" ? "With glasses" : "Without glasses"}
          </strong>
        </li>
        <li>
          Screening confidence: <strong>{eye.confidence || CONFIDENCE.LOW}</strong>
        </li>
        {(eye.testCount ?? 0) > 0 && (
          <li>
            Session tests used: <strong>{eye.testCount}</strong>
          </li>
        )}
      </ul>
    </div>
  );
}

export function ScreeningResultCards({ estimate, isDarkMode }) {
  if (!estimate?.leftEye && !estimate?.rightEye) return null;

  const modeLabel = correctionModeLabel(estimate.correctionMode);

  return (
    <div className="space-y-4 mb-6">
      <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        {DIOPTER_ESTIMATE_DISCLAIMER}
      </p>

      {estimate.singleDiopterExplanation && (
        <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
          {estimate.singleDiopterExplanation}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {estimate.leftEye && (
          <EyeScreeningCard label="Left Eye" eye={estimate.leftEye} isDarkMode={isDarkMode} />
        )}
        {estimate.rightEye && (
          <EyeScreeningCard label="Right Eye" eye={estimate.rightEye} isDarkMode={isDarkMode} />
        )}
      </div>
      <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>{modeLabel}</p>

      {estimate.singleTestWarning && (
        <div
          className={`flex gap-3 p-4 rounded-xl ${
            isDarkMode ? "bg-amber-500/10 border border-amber-500/30" : "bg-amber-50 border border-amber-200"
          }`}
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className={`text-sm ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
            This estimate is based on only one test, so confidence is limited. Complete more tests for a more reliable approximate eyesight number.
          </p>
        </div>
      )}

      {!estimate.singleTestWarning && (estimate.testsUsed?.length || 0) >= 2 && (
        <p className={`text-sm ${isDarkMode ? "text-green-400" : "text-green-700"}`}>
          This estimate combines {estimate.testsUsed.join(", ")} — screening confidence may be higher, but this is still not a medical prescription.
        </p>
      )}

      {estimate.disagree && (
        <div
          className={`p-4 rounded-xl ${isDarkMode ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}
        >
          <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
            Your test results do not fully agree. Retake the unclear tests or complete the full refraction battery.
          </p>
        </div>
      )}

      <p
        className={`text-xs leading-relaxed p-3 rounded-lg ${
          isDarkMode ? "bg-slate-800/60 text-slate-400" : "bg-slate-100 text-slate-600"
        }`}
      >
        VISUAR is a screening tool, not a medical prescription. Please visit an eye care professional before buying glasses or changing your prescription.
      </p>
    </div>
  );
}

export function BilingualAIExplanation({ ai, isDarkMode }) {
  if (!ai) return null;
  const screening = ai.screening || ai;

  return (
    <div className="space-y-6 mt-8">
      <h3 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        AI explanation
      </h3>

      {screening.summary_en && (
        <div>
          <p className={`text-xs font-semibold uppercase mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            English
          </p>
          <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>{screening.summary_en || ai.summary}</p>
        </div>
      )}

      {(screening.summary_ur || ai.summary_ur) && (
        <div>
          <p className={`text-xs font-semibold uppercase mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            اردو
          </p>
          <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
            {screening.summary_ur || ai.summary_ur}
          </p>
        </div>
      )}

      {(screening.safety_note_en || ai.safety_note_en) && (
        <p className={`text-sm italic ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          {screening.safety_note_en || ai.safety_note_en}
        </p>
      )}
      {(screening.safety_note_ur || ai.safety_note_ur) && (
        <p className={`text-sm italic ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          {screening.safety_note_ur || ai.safety_note_ur}
        </p>
      )}
    </div>
  );
}
