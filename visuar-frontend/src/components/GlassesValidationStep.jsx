import { useState, useCallback } from "react";
import { Glasses, Sun, Eye, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { requiresBareEyes, allowsGlassesWithWarning } from "../utils/testCatalog";
import { CORRECTION_MODE, setCorrectionMode } from "../utils/correctionMode";
import { EyeRestReminder } from "./EyeRestReminder";

const MAX_AUTO_CHECKS = 2;

export function GlassesValidationStep({
  testId,
  visionResult,
  isDarkMode,
  onContinue,
  mirrorPreview,
}) {
  const [checkCount, setCheckCount] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [showGlassesModal, setShowGlassesModal] = useState(false);

  const bareRequired = requiresBareEyes(testId);
  const glassesAllowed = allowsGlassesWithWarning(testId);

  const glassesDetected = Boolean(visionResult?.glasses_detected);
  const sunglassesDetected = Boolean(visionResult?.sunglasses_detected);
  const faceOk = Boolean(visionResult?.face_detected);
  const bothEyesVisible = visionResult?.both_eyes_visible !== false;

  const eyewearDetected = glassesDetected || sunglassesDetected;

  const runCheck = useCallback(() => {
    setCheckCount((c) => c + 1);
    if (checkCount + 1 >= MAX_AUTO_CHECKS && eyewearDetected) {
      setShowManual(true);
    }
  }, [checkCount, eyewearDetected]);

  const proceedUncorrected = () => {
    setCorrectionMode(CORRECTION_MODE.UNCORRECTED);
    onContinue(CORRECTION_MODE.UNCORRECTED);
  };

  const proceedCorrected = () => {
    setCorrectionMode(CORRECTION_MODE.CORRECTED);
    onContinue(CORRECTION_MODE.CORRECTED);
  };

  const handleManualYes = () => {
    setShowManual(false);
    if (bareRequired) {
      return;
    }
    if (glassesAllowed) {
      setShowGlassesModal(true);
    }
  };

  const handleManualNo = () => {
    setShowManual(false);
    proceedUncorrected();
  };

  const handlePrimaryContinue = () => {
    if (!faceOk || !bothEyesVisible) return;

    if (eyewearDetected && bareRequired) {
      runCheck();
      return;
    }

    if (eyewearDetected && glassesAllowed) {
      setShowGlassesModal(true);
      return;
    }

    proceedUncorrected();
  };

  if (showGlassesModal && glassesAllowed) {
    return (
      <div className="space-y-6 text-center max-w-lg mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Glasses detected
        </h2>
        <p className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
          Do you want to continue? Results will be labelled as corrected vision (tested with glasses or contacts).
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setShowGlassesModal(false);
              proceedUncorrected();
            }}
            className="w-full py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-white"
          >
            Remove glasses and test natural vision
          </button>
          <button
            type="button"
            onClick={proceedCorrected}
            className={`w-full py-3 rounded-xl font-bold border-2 ${
              isDarkMode ? "border-slate-600 text-white" : "border-slate-300 text-slate-800"
            }`}
          >
            Continue with glasses
          </button>
        </div>
      </div>
    );
  }

  if (showManual) {
    return (
      <div className="space-y-6 text-center max-w-lg mx-auto">
        <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Are you wearing glasses or contact lenses?
        </h2>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={handleManualYes}
            className="px-8 py-3 rounded-xl font-bold bg-slate-600 text-white"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={handleManualNo}
            className="px-8 py-3 rounded-xl font-bold bg-cyan-500 text-white"
          >
            No
          </button>
        </div>
        {bareRequired && (
          <p className={`text-sm ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>
            This test estimates your natural eyesight number. Please remove glasses or contacts before starting.
          </p>
        )}
      </div>
    );
  }

  const blocked = eyewearDetected && bareRequired;

  return (
    <div className="space-y-6">
      <EyeRestReminder isDarkMode={isDarkMode} />
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-50"}`}>
          <Glasses className="w-6 h-6 text-cyan-500" />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Before your test
          </h2>
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Please remove glasses, sunglasses, or contact lenses for the most accurate natural eyesight estimate.
          </p>
        </div>
      </div>

      {mirrorPreview && (
        <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg">
          {mirrorPreview}
        </div>
      )}

      <ul className={`space-y-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
        <StatusRow ok={faceOk} label="Face detected" icon={Eye} isDarkMode={isDarkMode} />
        <StatusRow ok={bothEyesVisible} label="Both eyes visible" icon={Eye} isDarkMode={isDarkMode} />
        <StatusRow
          ok={!glassesDetected}
          label={glassesDetected ? "Glasses detected" : "No glasses detected"}
          icon={Glasses}
          isDarkMode={isDarkMode}
          warn={glassesDetected}
        />
        <StatusRow
          ok={!sunglassesDetected}
          label={sunglassesDetected ? "Sunglasses detected" : "No sunglasses detected"}
          icon={Sun}
          isDarkMode={isDarkMode}
          warn={sunglassesDetected}
        />
      </ul>

      {blocked && (
        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200"}`}>
          <p className={`text-sm font-medium ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
            Glasses detected. Please remove them before starting because this test estimates your natural eyesight number.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {blocked ? (
          <button
            type="button"
            onClick={runCheck}
            className="w-full py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" /> I removed them, check again
          </button>
        ) : (
          <button
            type="button"
            disabled={!faceOk}
            onClick={handlePrimaryContinue}
            className="w-full py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-white disabled:opacity-40"
          >
            Continue to test
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className={`text-sm underline ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}
        >
          Camera check not working? Confirm manually
        </button>
      </div>
    </div>
  );
}

function StatusRow({ ok, label, icon: Icon, isDarkMode, warn }) {
  const color = warn ? "text-amber-500" : ok ? "text-green-500" : "text-red-500";
  return (
    <li className="flex items-center gap-2">
      {ok && !warn ? (
        <CheckCircle2 className={`w-5 h-5 ${color}`} />
      ) : (
        <Icon className={`w-5 h-5 ${color}`} />
      )}
      <span>{label}</span>
    </li>
  );
}
