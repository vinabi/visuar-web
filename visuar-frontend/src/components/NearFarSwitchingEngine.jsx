import { useState, useEffect, useRef, useCallback } from "react";
import { PauseCircle, ArrowDownUp } from "lucide-react";
import {
  getSnellenDisplaySize,
  getJaegerDisplaySize,
  getBrowserZoomWarning,
  isDistanceOkForMode,
} from "../utils/visionScaling";
import {
  FOCUS_MODES,
  FOCUS_NEAR_CM,
  FOCUS_FAR_CM,
  getFocusConfig,
  scaleDisplayPxForFocus,
} from "../utils/nearFarFocus";
import { useFocusDistanceHold } from "../hooks/useFocusDistanceHold";
import { FocusDistanceGate } from "./FocusDistanceGate";
import { pickOptotypes, snellenPassThreshold } from "../utils/testStimuli";
import { OptotypeLetters } from "./OptotypeLetters";
import { useLetterRowInput } from "../hooks/useLetterRowInput";

const ROUNDS = [
  {
    mode: FOCUS_MODES.FAR,
    level: "0.33",
    label: `Far / distance (${FOCUS_FAR_CM} cm)`,
    type: "snellen",
    focusCm: FOCUS_FAR_CM,
  },
  {
    mode: FOCUS_MODES.NEAR,
    level: "N10",
    label: `Near (${FOCUS_NEAR_CM} cm)`,
    type: "jaeger",
    focusCm: FOCUS_NEAR_CM,
  },
  {
    mode: FOCUS_MODES.FAR,
    level: "0.50",
    label: `Far / distance (${FOCUS_FAR_CM} cm)`,
    type: "snellen",
    focusCm: FOCUS_FAR_CM,
  },
  {
    mode: FOCUS_MODES.NEAR,
    level: "N8",
    label: `Near (${FOCUS_NEAR_CM} cm)`,
    type: "jaeger",
    focusCm: FOCUS_NEAR_CM,
  },
];

function pickLetters(count = 5) {
  return pickOptotypes(count);
}

/**
 * Near ↔ far accommodation switching using visual angle:
 * 50 cm near (active focus) vs 100 cm far (relaxed focus), scaled optotypes, webcam gate.
 */
export function NearFarSwitchingEngine({
  ppi,
  isDarkMode,
  visionOk,
  visionResult,
  coveredEyeLabel,
  onTestComplete,
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [lettersByRound] = useState(() => ROUNDS.map(() => pickLetters(5)));
  const [submitted, setSubmitted] = useState(false);
  const [roundResults, setRoundResults] = useState([]);
  const [gateActive, setGateActive] = useState(false);
  const [frozenBanner, setFrozenBanner] = useState(false);
  const roundStartRef = useRef(Date.now());

  const round = ROUNDS[roundIndex];
  const rowLetters = lettersByRound[roundIndex];
  const passThreshold = snellenPassThreshold(rowLetters.length);

  const { holdProgress, gateOpen, distanceOk: gateDistanceOk } = useFocusDistanceHold(
    visionResult,
    round.mode,
    gateActive
  );

  useEffect(() => {
    if (roundIndex === 0) {
      setGateActive(true);
      return;
    }
    setSubmitted(false);
    setFrozenBanner(true);
    setGateActive(true);
    const t = setTimeout(() => setFrozenBanner(false), 400);
    return () => clearTimeout(t);
  }, [roundIndex]);

  useEffect(() => {
    if (!gateActive || !gateOpen) return;
    setGateActive(false);
    setFrozenBanner(false);
    roundStartRef.current = Date.now();
  }, [gateActive, gateOpen]);

  useEffect(() => {
    setSubmitted(false);
  }, [roundIndex, gateActive]);

  const finishRound = useCallback(
    (correctCount) => {
      const entry = {
        round: roundIndex + 1,
        mode: round.mode,
        focusCm: round.focusCm,
        level: round.level,
        correct: correctCount,
        switchMs: Date.now() - roundStartRef.current,
      };
      const nextResults = [...roundResults, entry];
      setRoundResults(nextResults);

      if (roundIndex >= ROUNDS.length - 1) {
        const passed = nextResults.filter((r) => r.correct >= passThreshold).length;
        onTestComplete({
          roundResults: nextResults,
          roundsPassed: passed,
          totalRounds: ROUNDS.length,
          nearFarScore: Math.round((passed / ROUNDS.length) * 100),
          nearCm: FOCUS_NEAR_CM,
          farCm: FOCUS_FAR_CM,
        });
      } else {
        setRoundIndex((i) => i + 1);
      }
    },
    [roundIndex, round, roundResults, onTestComplete, passThreshold]
  );

  const finalizeRowWithScore = useCallback(
    ({ correctCount }) => {
      if (submitted || !visionOk || gateActive) return;
      setSubmitted(true);
      setTimeout(() => finishRound(correctCount), 400);
    },
    [submitted, visionOk, gateActive, finishRound]
  );

  const baseFontSize =
    round.type === "snellen"
      ? getSnellenDisplaySize(round.level, ppi)
      : getJaegerDisplaySize(round.level, ppi);

  const fontSize = scaleDisplayPxForFocus(baseFontSize, round.focusCm);

  const { displaySlots, filledCount, submitNow, canSubmit, clearTyped } = useLetterRowInput({
    expectedLetters: rowLetters,
    visionOk: visionOk && !gateActive && !frozenBanner && !submitted,
    submitted,
    onSubmit: finalizeRowWithScore,
  });

  const canAnswer = visionOk && !gateActive && !frozenBanner;
  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );
  const focusCfg = getFocusConfig(round.mode);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 w-full max-w-xl mx-auto relative min-h-[420px]">
      {gateActive && (
        <FocusDistanceGate
          focusMode={round.mode}
          visionResult={visionResult}
          holdProgress={holdProgress}
          distanceOk={gateDistanceOk}
          isDarkMode={isDarkMode}
          title={`Round ${roundIndex + 1}: ${focusCfg.label}`}
        />
      )}

      {frozenBanner && !gateActive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 backdrop-blur-sm rounded-3xl">
          <p className="text-white font-bold text-center px-6">Switching focus mode…</p>
        </div>
      )}

      {!visionOk && !gateActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm rounded-3xl">
          <PauseCircle className="w-12 h-12 text-amber-400" />
          <p className="text-amber-300 font-bold">Test Paused</p>
        </div>
      )}

      {zoomWarning && (
        <div className="mb-2 px-3 py-2 rounded-lg text-xs text-amber-600 bg-amber-50 border border-amber-200">
          {zoomWarning}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 text-cyan-400">
        <ArrowDownUp className="w-5 h-5" />
        <span className="font-bold">
          Near–Far Switching · Round {roundIndex + 1}/{ROUNDS.length}
        </span>
      </div>

      <p className={`text-center text-sm mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        Cover {coveredEyeLabel} eye · {round.label}
      </p>

      <p className={`text-xs mb-3 text-center max-w-sm ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
        {focusCfg.accommodation} Letters scale for {round.focusCm} cm (×
        {(round.focusCm / FOCUS_NEAR_CM).toFixed(1)} vs near baseline).
      </p>

      {!gateActive && (
        <div
          className={`w-full px-4 py-3 rounded-xl mb-4 text-center font-semibold text-sm ${
            isDistanceOkForMode(visionResult, round.mode)
              ? isDarkMode
                ? "bg-green-500/15 text-green-400 border border-green-500/30"
                : "bg-green-50 text-green-700 border border-green-200"
              : isDarkMode
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {isDistanceOkForMode(visionResult, round.mode)
            ? `✓ Distance OK — read the line`
            : `${focusCfg.instruction}${
                visionResult?.distance_cm ? ` (now ${visionResult.distance_cm} cm)` : ""
              }`}
        </div>
      )}

      <div className={gateActive || frozenBanner ? "opacity-30 pointer-events-none" : ""}>
        {round.type === "snellen" ? (
          <OptotypeLetters
            letters={rowLetters}
            capHeightPx={fontSize}
            isDarkMode={isDarkMode}
            className="mb-6"
          />
        ) : (
          <div
            className={`font-black tracking-widest flex gap-3 mb-6 ${
              isDarkMode ? "text-white" : "text-black"
            }`}
            style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
          >
            {rowLetters.map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4 justify-center">
          {displaySlots.map((a, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold ${
                isDarkMode ? "border-slate-600 text-slate-300" : "border-slate-200"
              }`}
            >
              {a || "·"}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            disabled={!canAnswer || submitted}
            onClick={clearTyped}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              isDarkMode ? "bg-slate-700 text-white" : "bg-slate-200"
            }`}
          >
            Clear
          </button>
          <button
            type="button"
            disabled={!canSubmit || !canAnswer}
            onClick={submitNow}
            className="px-6 py-2 rounded-xl font-bold bg-cyan-500 text-white disabled:opacity-40"
          >
            Submit row
          </button>
        </div>
      </div>
    </div>
  );
}
