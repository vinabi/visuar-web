import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { CONFIDENCE } from "../utils/finalEstimate";
import { DIOPTER_ESTIMATE_DISCLAIMER } from "../utils/diopterEstimate";

const SAFETY_NOTE = DIOPTER_ESTIMATE_DISCLAIMER;

function formatD(d) {
  if (d == null || Number.isNaN(d)) return "—";
  return `${d > 0 ? "+" : ""}${d.toFixed(2)} D`;
}

function EyeSessionRow({ label, eye, isDarkMode }) {
  const d = eye?.sessionAverageDiopterD ?? eye?.singleDiopterD;
  const count = eye?.testCount ?? 0;
  const conf = eye?.confidence ?? CONFIDENCE.LOW;

  return (
    <div className={`rounded-xl p-4 ${isDarkMode ? "bg-slate-800/60" : "bg-white border border-slate-200"}`}>
      <p className={`text-xs font-bold uppercase mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`text-lg font-black ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
        Approximate eyesight number: {formatD(d)}
      </p>
      <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        Based on: {count} test{count !== 1 ? "s" : ""}
      </p>
      <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        Confidence: <strong>{conf}</strong>
      </p>
    </div>
  );
}

export function SessionEstimatePanel({
  estimate,
  isDarkMode,
  onViewFullResult,
  showContinue = true,
}) {
  if (!estimate?.leftEye && !estimate?.rightEye) return null;

  const panel = isDarkMode
    ? "bg-slate-900/90 border border-slate-700"
    : "bg-white border border-slate-200 shadow-lg";

  return (
    <div className={`rounded-2xl p-6 max-w-lg w-full mx-auto ${panel}`}>
      <h3 className={`text-xl font-bold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        Current screening estimate
      </h3>
      <p className={`text-xs mb-4 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
        Estimated diopter screening result — not an exact prescription.
      </p>

      <div className="grid gap-3 mb-4">
        <EyeSessionRow label="Left Eye" eye={estimate.leftEye} isDarkMode={isDarkMode} />
        <EyeSessionRow label="Right Eye" eye={estimate.rightEye} isDarkMode={isDarkMode} />
      </div>

      {estimate.singleTestWarning && (
        <div
          className={`flex gap-2 p-3 rounded-xl mb-4 text-sm ${
            isDarkMode ? "bg-amber-500/10 text-amber-200" : "bg-amber-50 text-amber-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          <p>
            This estimate is based on only one test. Complete more tests in this session for a more
            reliable approximate eyesight number.
          </p>
        </div>
      )}

      {!estimate.singleTestWarning && estimate.multiTestMessage && (
        <p className={`text-sm mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          {estimate.multiTestMessage}
        </p>
      )}

      {estimate.disagree && (
        <p className={`text-sm mb-4 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
          Your screening results do not fully agree (confidence Mixed or Low). Complete more tests in
          this session or retake an unclear test.
        </p>
      )}

      <p className={`text-xs mb-4 leading-relaxed ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
        {estimate.singleDiopterExplanation}
      </p>

      <p
        className={`text-xs mb-4 p-3 rounded-xl leading-relaxed ${
          isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-600"
        }`}
      >
        {SAFETY_NOTE}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {showContinue && (
          <Link
            to="/test-selection"
            className={`flex-1 text-center py-3 rounded-xl font-bold ${
              isDarkMode
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            Continue recommended tests
          </Link>
        )}
        <button
          type="button"
          onClick={onViewFullResult}
          className="flex-1 py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-white"
        >
          View full result
        </button>
      </div>
    </div>
  );
}
