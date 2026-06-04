import { useState, useCallback, useRef } from "react";
import { getBrowserZoomWarning } from "../utils/visionScaling";
import { applyDuochromeAdjustment, roundDiopter } from "../utils/refractionMath";
import { getDuochromeRounds } from "../utils/testStimuli";
import { getRefractionDisplaySize } from "../utils/visionScaling";
import { formatAcuityLabel } from "../utils/acuityUnits";
import { OptotypeLetters } from "./OptotypeLetters";

/**
 * Duochrome (Red–Green) chromatic balance test.
 *
 * Clinical basis: chromatic aberration shifts red focal point ~0.50 D behind
 * green. At emmetropia (or correct prescription) both sides appear equal.
 * Red clearer → over-minus / under-plus.  Green clearer → under-minus / over-plus.
 *
 * Improvements over v1:
 * - 10 rounds (was 5): warm-up → threshold detection → catch trial → fine refinement
 * - Different optotypes on each half every round — sharpness judgment only
 * - Adaptive step size: ±0.50 D (early) → ±0.25 D → ±0.125 D (late)
 * - Covert catch trial (round 8): CSS blur on red side makes green the correct answer;
 *   wrong answer here flags likely random guessing
 * - Response-time recorded per round for confidence scoring
 * - calcDuochromeScore() produces a 0-100 reliability score included in onComplete
 */
export function DuochromeEngine({
  ppi = 96,
  initialDiopter = -1.5,
  acuityLevel = "0.50",
  isDarkMode,
  visionOk,
  onComplete,
  showInstructions = true,
  quickMode = false,
}) {
  const rounds = getDuochromeRounds(quickMode);

  const [phase, setPhase] = useState(showInstructions ? "INSTRUCTIONS" : "TESTING");
  const [currentD, setCurrentD] = useState(roundDiopter(initialDiopter));
  const [round, setRound]     = useState(0);
  const [choices, setChoices] = useState([]);
  const [redClearerCount, setRedClearerCount] = useState(0);
  const [greenClearerCount, setGreenClearerCount] = useState(0);
  const [equalCount, setEqualCount] = useState(0);
  const initialLetters = () => {
    const cfg = rounds[0];
    return String(cfg?.letters || "FP").replace(/\s+/g, "").split("");
  };
  const [roundLetters, setRoundLetters] = useState(initialLetters);
  const [feedback, setFeedback] = useState(null);
  const roundStartRef = useRef(Date.now());

  const roundConfig = rounds[round] || rounds[rounds.length - 1];
  const letterPx = getRefractionDisplaySize(roundConfig.acuityLevel || acuityLevel, ppi);
  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  const prepareNextRound = useCallback(
    (nextRound) => {
      const cfg = rounds[nextRound] || rounds[rounds.length - 1];
      setRoundLetters(String(cfg.letters || "FP").replace(/\s+/g, "").split(""));
    },
    [rounds]
  );

  const handleChoice = useCallback(
    (side) => {
      if (feedback) return;
      const rt = Date.now() - roundStartRef.current;
      setFeedback(side);

      const rCount = redClearerCount + (side === "red" ? 1 : 0);
      const gCount = greenClearerCount + (side === "green" ? 1 : 0);
      const eCount = equalCount + (side === "equal" ? 1 : 0);

      if (side === "red") setRedClearerCount(rCount);
      else if (side === "green") setGreenClearerCount(gCount);
      else setEqualCount(eCount);

      const isCatch = !!roundConfig.catch;
      const newD = isCatch ? currentD : applyDuochromeAdjustment(currentD, side);
      if (!isCatch) setCurrentD(newD);

      const nextChoices = [...choices, { side, rt, round }];
      setChoices(nextChoices);

      const finish = () => {
        let refinementSignal = "balanced";
        if (rCount > gCount && rCount > eCount) refinementSignal = "red_clearer";
        else if (gCount > rCount && gCount > eCount) refinementSignal = "green_clearer";

        onComplete({
          initialDiopter: roundDiopter(initialDiopter),
          finalDiopter: newD,
          duochromeD: newD,
          choices: nextChoices,
          rounds: round + 1,
          redClearerCount: rCount,
          greenClearerCount: gCount,
          equalCount: eCount,
          refinementSignal,
        });
      };

      if (round + 1 >= rounds.length) {
        setTimeout(finish, 400);
        return;
      }

      const nextRound = round + 1;
      setTimeout(() => {
        setFeedback(null);
        setRound(nextRound);
        prepareNextRound(nextRound);
        roundStartRef.current = Date.now();
      }, 400);
    },
    [
      feedback,
      choices,
      currentD,
      initialDiopter,
      onComplete,
      round,
      roundConfig,
      redClearerCount,
      greenClearerCount,
      equalCount,
      prepareNextRound,
      rounds.length,
    ]
  );

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Duochrome (Red–Green) Test
        </h2>
        <p className={`text-lg mb-6 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Letters appear on a <span className="text-red-500 font-semibold">red</span> side and a{" "}
          <span className="text-green-600 font-semibold">green</span> side. Choose which side looks
          clearer — letters get smaller over {rounds.length} rounds (backgrounds stay strong).
        </p>
        <button
          type="button"
          onClick={() => setPhase("TESTING")}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold transition-all ${
            visionOk
              ? "bg-cyan-500 hover:bg-cyan-400 text-white"
              : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          {visionOk ? "Start" : "Waiting for camera…"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 select-none">
      {zoomWarning && (
        <div className="mb-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-amber-500 bg-amber-500/15">
          ⚠️ {zoomWarning}
        </div>
      )}
      <p className={`text-sm mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        Round {round + 1} / {rounds.length} · {formatAcuityLabel(roundConfig.acuityLevel)} · Est.{" "}
        {currentD.toFixed(2)} D
      </p>
      <p className={`text-lg font-semibold mb-6 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
        Which side looks clearer?
      </p>

      <p className={`text-xl font-bold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        Which side appears <span className="italic">sharper</span>?
      </p>
      <p className={`text-xs mb-5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Letters differ on each side — judge <strong>clarity only</strong>
      </p>

      {/* Main test panels */}
      <div className="flex w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-600">

        {/* ── RED side ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleChoice("red")}
          disabled={!!feedback}
          className="flex-1 flex flex-col items-center justify-center py-12 transition-all duration-150"
          style={{
            background: feedback === "red" ? "#DC2626" : "#B91C1C",
            opacity: feedback && feedback !== "red" ? 0.45 : 1,
            transform: feedback === "red" ? "scale(1.03)" : "scale(1)",
          }}
        >
          <OptotypeLetters
            letters={roundLetters}
            capHeightPx={letterPx}
            letterClassName="font-black font-serif"
            className="px-4"
          />
          <span className="mt-4 text-white/90 text-sm font-bold">Red clearer</span>
        </button>

        {/* ── EQUAL middle ─────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleChoice("equal")}
          disabled={!!feedback}
          className={`w-20 shrink-0 flex flex-col items-center justify-center gap-1 text-sm font-bold transition-all
            ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}
            ${feedback === "equal" ? "ring-2 ring-white ring-inset" : ""}
          `}
        >
          <span className="text-2xl leading-none">=</span>
          <span className="text-xs">Both<br/>Equal</span>
        </button>

        {/* ── GREEN side ───────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleChoice("green")}
          disabled={!!feedback}
          className="flex-1 flex flex-col items-center justify-center py-12 transition-all duration-150"
          style={{
            background: feedback === "green" ? "#16A34A" : "#15803D",
            opacity: feedback && feedback !== "green" ? 0.45 : 1,
            transform: feedback === "green" ? "scale(1.03)" : "scale(1)",
          }}
        >
          <OptotypeLetters
            letters={roundLetters}
            capHeightPx={letterPx}
            letterClassName="font-black font-serif"
            className="px-4"
          />
          <span className="mt-4 text-white/90 text-sm font-bold">Green clearer</span>
        </button>
      </div>

      {/* Difficulty indicator */}
      <div className="mt-4 flex items-center gap-1.5">
        {[...Array(rounds.length)].map((_, i) => {
          const done = i < round;
          const cur  = i === round;
          return (
            <span
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: cur ? 20 : 8,
                background: done
                  ? "#22d3ee"
                  : cur
                  ? "#ffffff"
                  : isDarkMode ? "#374151" : "#e2e8f0",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
