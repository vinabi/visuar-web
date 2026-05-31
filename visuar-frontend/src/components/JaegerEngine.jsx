import { useState, useEffect, useRef, useCallback } from "react";
import { PauseCircle, CheckCircle2, XCircle } from "lucide-react";
import { getJaegerDisplaySize, getBrowserZoomWarning } from "../utils/visionScaling";
import { VIEWING_DISTANCE } from "../utils/viewingDistance";
import {
  NEAR_TEXT_LEVELS,
  getJaegerRowLetters,
  snellenPassThreshold,
} from "../utils/testStimuli";
import { useLetterRowInput } from "../hooks/useLetterRowInput";

export const JAEGER_LEVELS = NEAR_TEXT_LEVELS;

const FEEDBACK_MS = 1400;

function JaegerRow({ level, letters, fontSize, muted, highlight, isDarkMode }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 md:gap-5 py-2 md:py-3 px-2 rounded-xl transition-all ${
        highlight
          ? isDarkMode
            ? "bg-violet-500/15 border-2 border-violet-500/50"
            : "bg-violet-50 border-2 border-violet-400"
          : muted
            ? "opacity-35"
            : ""
      }`}
    >
      <span
        className={`shrink-0 text-[10px] md:text-xs font-bold w-10 text-right ${
          isDarkMode ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {level}
      </span>
      <div
        className={`font-sans font-black tracking-[0.15em] flex gap-2 md:gap-3 ${
          isDarkMode ? "text-white" : "text-black"
        }`}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
      >
        {letters.map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
    </div>
  );
}

export function JaegerEngine({
  ppi,
  jaegerLevel,
  levelIndex,
  onLevelResult,
  isDarkMode,
  visionOk,
  coveredEyeLabel,
  resetToken,
  screenerMode = false,
  quickMode = false,
  jaegerLevels = JAEGER_LEVELS,
}) {
  const effectiveLevel = screenerMode ? "N8" : jaegerLevel;
  const effectiveIndex = screenerMode ? jaegerLevels.indexOf("N8") : levelIndex;
  const rowLetters = getJaegerRowLetters(effectiveLevel, quickMode);
  const lettersPerRow = rowLetters.length;
  const passThreshold = snellenPassThreshold(lettersPerRow);

  const [submitted, setSubmitted] = useState(false);
  const [rowScore, setRowScore] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const rowStartRef = useRef(Date.now());
  const resetGenRef = useRef(0);
  const pendingTimerRef = useRef(null);

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  const prevLevel = effectiveIndex > 0 ? jaegerLevels[effectiveIndex - 1] : null;
  const nextLevel =
    !screenerMode && effectiveIndex < jaegerLevels.length - 1
      ? jaegerLevels[effectiveIndex + 1]
      : null;

  const prevLetters = prevLevel ? getJaegerRowLetters(prevLevel, quickMode) : [];
  const nextLetters = nextLevel ? getJaegerRowLetters(nextLevel, quickMode) : [];

  const finalizeRow = useCallback(
    ({ letters, expectedText, userTypedText, correctCount, wrongCount, positionMatches, accuracyPercent }) => {
      if (submitted || !visionOk) return;
      const passed = correctCount >= passThreshold;
      const myGen = resetGenRef.current;
      setSubmitted(true);
      setRowScore({ correct: correctCount, passed, userTypedText, expectedText });
      setFeedback(passed ? "pass" : "fail");

      pendingTimerRef.current = setTimeout(() => {
        if (myGen !== resetGenRef.current) return;
        onLevelResult(passed, effectiveIndex, {
          expectedText,
          userTypedText,
          correctCount,
          wrongCount,
          positionMatches,
          accuracyPercent,
          rowTimings: [
            {
              correct: passed,
              responseTime: Date.now() - rowStartRef.current,
              level: effectiveLevel,
            },
          ],
        });
      }, FEEDBACK_MS);
    },
    [submitted, visionOk, passThreshold, effectiveLevel, effectiveIndex, onLevelResult]
  );

  const { displaySlots, clearTyped, submitNow, canSubmit, filledCount } = useLetterRowInput({
    expectedLetters: rowLetters,
    visionOk: visionOk && !submitted,
    submitted,
    onSubmit: finalizeRow,
  });

  useEffect(() => {
    resetGenRef.current += 1;
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    setSubmitted(false);
    setRowScore(null);
    setFeedback(null);
    rowStartRef.current = Date.now();
  }, [effectiveLevel, resetToken, screenerMode, lettersPerRow]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 select-none overflow-y-auto relative w-full max-w-2xl mx-auto">
      {!visionOk && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm rounded-3xl">
          <PauseCircle className="w-12 h-12 text-amber-400" />
          <p className="text-amber-300 font-bold text-xl">Test Paused</p>
          <p className="text-slate-400 text-sm text-center max-w-xs">Hold {VIEWING_DISTANCE.labelShort} from the screen.</p>
        </div>
      )}

      {zoomWarning && (
        <div className="mb-3 w-full px-4 py-2 rounded-xl text-xs font-semibold text-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
          ⚠️ {zoomWarning}
        </div>
      )}

      <div
        className={`mb-2 px-4 py-1.5 rounded-full text-sm font-bold ${
          isDarkMode ? "bg-violet-500/15 text-violet-300 border border-violet-500/30" : "bg-violet-50 text-violet-700 border border-violet-200"
        }`}
      >
        {screenerMode ? "Near screener — " : ""}
        {effectiveLevel} — Read the highlighted line
      </div>

      <div className={`mb-4 px-4 py-2 rounded-xl text-sm font-semibold ${isDarkMode ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"}`}>
        👁️ Cover {coveredEyeLabel} eye · {VIEWING_DISTANCE.labelShort} viewing distance
      </div>

      <div className="w-full space-y-1 mb-4">
        {prevLevel && (
          <JaegerRow
            level={prevLevel}
            letters={prevLetters}
            fontSize={getJaegerDisplaySize(prevLevel, ppi)}
            muted
            isDarkMode={isDarkMode}
          />
        )}
        <JaegerRow
          level={effectiveLevel}
          letters={rowLetters}
          fontSize={getJaegerDisplaySize(effectiveLevel, ppi)}
          highlight
          isDarkMode={isDarkMode}
        />
        {nextLevel && (
          <JaegerRow
            level={nextLevel}
            letters={nextLetters}
            fontSize={getJaegerDisplaySize(nextLevel, ppi)}
            muted
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      <div className="flex gap-2 mb-3">
        {displaySlots.map((a, i) => (
          <div
            key={i}
            className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-lg font-bold ${
              submitted
                ? a === rowLetters[i]
                  ? "border-green-500 text-green-500"
                  : "border-red-500 text-red-500"
                : i === filledCount
                  ? "border-violet-400"
                  : isDarkMode
                    ? "border-slate-600 text-slate-400"
                    : "border-slate-200"
            }`}
          >
            {a || "·"}
          </div>
        ))}
      </div>

      {submitted && rowScore && (
        <div className={`flex items-center gap-2 mb-4 text-sm font-bold ${feedback === "pass" ? "text-green-500" : "text-red-500"}`}>
          {feedback === "pass" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {rowScore.correct}/{lettersPerRow} — {rowScore.passed ? "Passed" : "Failed"}
        </div>
      )}

      <p className={`text-xs mb-3 text-center max-w-md ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Type any letters A–Z ({filledCount}/{lettersPerRow}). Wrong letters are recorded.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={submitted || !visionOk}
          onClick={clearTyped}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${
            isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
          }`}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submitNow}
          className="px-6 py-2 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-40"
        >
          Submit row
        </button>
      </div>
    </div>
  );
}
