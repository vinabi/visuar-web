import { useState, useEffect, useRef, useCallback } from "react";
import { PauseCircle, ArrowDownUp } from "lucide-react";
import { getJaegerSize, getBrowserZoomWarning, isDistanceOkForMode, getSnellenDisplaySize } from "../utils/visionScaling";
import { VIEWING_DISTANCE } from "../utils/viewingDistance";
import { pickOptotypes, snellenPassThreshold } from "../utils/testStimuli";
import { OptotypeLetters } from "./OptotypeLetters";
import { useLetterRowInput } from "../hooks/useLetterRowInput";

const ROUNDS = [
  { mode: "distance", level: "0.33", label: `Distance (${VIEWING_DISTANCE.label})`, type: "snellen" },
  { mode: "near", level: "N10", label: `Near (${VIEWING_DISTANCE.label})`, type: "jaeger" },
  { mode: "distance", level: "0.50", label: `Distance (${VIEWING_DISTANCE.label})`, type: "snellen" },
  { mode: "near", level: "N8", label: `Near (${VIEWING_DISTANCE.label})`, type: "jaeger" },
];

function pickLetters(count = 5) {
  return pickOptotypes(count);
}

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
  const [distanceReady, setDistanceReady] = useState(false);
  const roundStartRef = useRef(Date.now());

  const round = ROUNDS[roundIndex];
  const rowLetters = lettersByRound[roundIndex];
  const passThreshold = snellenPassThreshold(rowLetters.length);
  const distanceOk = visionResult && isDistanceOkForMode(visionResult, round.mode);

  useEffect(() => {
    setDistanceReady(false);
    const t = setInterval(() => {
      if (visionResult && isDistanceOkForMode(visionResult, round.mode)) {
        setDistanceReady(true);
      }
    }, 200);
    return () => clearInterval(t);
  }, [roundIndex, round.mode, visionResult]);

  useEffect(() => {
    setSubmitted(false);
    roundStartRef.current = Date.now();
  }, [roundIndex]);

  const finishRound = useCallback(
    (correctCount) => {
      const entry = {
        round: roundIndex + 1,
        mode: round.mode,
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
        });
      } else {
        setRoundIndex((i) => i + 1);
      }
    },
    [roundIndex, round, roundResults, onTestComplete, passThreshold]
  );

  const finalizeRow = useCallback(
    ({ correctCount, expectedText, userTypedText, wrongCount, positionMatches, accuracyPercent }) => {
      if (submitted || !visionOk || !distanceReady) return;
      setSubmitted(true);
      setTimeout(() => {
        finishRound(correctCount);
      }, 400);
    },
    [submitted, visionOk, distanceReady, finishRound]
  );

  const { displaySlots, filledCount, submitNow, canSubmit, clearTyped } = useLetterRowInput({
    expectedLetters: rowLetters,
    visionOk: visionOk && distanceReady && !submitted,
    submitted,
    onSubmit: finalizeRow,
  });

  const fontSize =
    round.type === "snellen"
      ? getSnellenDisplaySize(round.level, ppi)
      : getJaegerSize(round.level, ppi);

  const canAnswer = visionOk && distanceReady;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 w-full max-w-xl mx-auto relative">
      {!visionOk && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm rounded-3xl">
          <PauseCircle className="w-12 h-12 text-amber-400" />
          <p className="text-amber-300 font-bold">Test Paused</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 text-cyan-400">
        <ArrowDownUp className="w-5 h-5" />
        <span className="font-bold">Near–Far Switching · Round {roundIndex + 1}/{ROUNDS.length}</span>
      </div>

      <p className={`text-center text-sm mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        Cover {coveredEyeLabel} eye
      </p>

      <div
        className={`w-full px-4 py-3 rounded-xl mb-4 text-center font-semibold ${
          distanceOk
            ? isDarkMode
              ? "bg-green-500/15 text-green-400 border border-green-500/30"
              : "bg-green-50 text-green-700 border border-green-200"
            : isDarkMode
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        {distanceOk
          ? `✓ ${round.label} — read the line below`
          : `Move to ${round.label}${visionResult?.distance_cm ? ` (now ${visionResult.distance_cm} cm)` : ""}`}
      </div>

      {round.type === "snellen" ? (
        <OptotypeLetters letters={rowLetters} capHeightPx={fontSize} isDarkMode={isDarkMode} className="mb-6" />
      ) : (
        <div
          className={`font-black tracking-widest flex gap-3 mb-6 ${isDarkMode ? "text-white" : "text-black"}`}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
        >
          {rowLetters.map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
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

      <p className={`text-xs mb-4 text-center ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
        Type any letters A–Z ({filledCount}/{rowLetters.length}). Wrong letters are recorded.
      </p>

      <div className="flex gap-3">
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
  );
}
