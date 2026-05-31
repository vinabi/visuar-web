import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PauseCircle, CheckCircle2, XCircle } from "lucide-react";
import { getBrowserZoomWarning, getSnellenChartCapHeightPx } from "../utils/visionScaling";
import { formatAcuityLabel } from "../utils/acuityUnits";
import { OptotypeLetters } from "./OptotypeLetters";
import {
  SNELLEN_ACUITY_LEVELS,
  SCREENER_ACUITY_LEVEL,
  getSnellenRowLetters,
  getSnellenLetterGapRatio,
  snellenPassThreshold,
} from "../utils/testStimuli";
import { useLetterRowInput } from "../hooks/useLetterRowInput";

const FEEDBACK_MS = 1400;

function SnellenRow({ level, letters, fontSize, muted, highlight, isDarkMode, compact }) {
  const label = formatAcuityLabel(level);
  return (
    <div
      className={`flex items-center gap-2 md:gap-3 ${compact ? "py-0" : "py-0.5"} px-2 rounded-xl transition-all ${
        highlight
          ? isDarkMode
            ? "bg-cyan-500/15 border-2 border-cyan-500/50 ring-2 ring-cyan-500/20"
            : "bg-cyan-50 border-2 border-cyan-400"
          : muted
            ? "opacity-35"
            : ""
      }`}
    >
      <span
        className={`shrink-0 text-[10px] md:text-xs font-bold tabular-nums w-12 text-right ${
          isDarkMode ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      <OptotypeLetters
        letters={letters}
        capHeightPx={fontSize}
        gapRatio={getSnellenLetterGapRatio(level)}
        isDarkMode={isDarkMode}
        className="flex-1"
      />
    </div>
  );
}

export function SnellenEngine({
  ppi,
  acuityLevel,
  levelIndex,
  onLevelResult,
  isDarkMode,
  visionOk,
  coveredEyeLabel,
  resetToken,
  screenerMode = false,
  quickMode = false,
  acuityLevels = SNELLEN_ACUITY_LEVELS,
}) {
  const effectiveLevel = screenerMode ? SCREENER_ACUITY_LEVEL : acuityLevel;
  const effectiveIndex = screenerMode
    ? acuityLevels.indexOf(SCREENER_ACUITY_LEVEL)
    : levelIndex;

  const rowLetters = getSnellenRowLetters(effectiveLevel, quickMode);
  const lettersPerRow = rowLetters.length;
  const passThreshold = snellenPassThreshold(lettersPerRow);
  const expectedText = rowLetters.join("");

  const [submitted, setSubmitted] = useState(false);
  const [rowScore, setRowScore] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const rowStartRef = useRef(Date.now());
  const resetGenRef = useRef(0);
  const pendingTimerRef = useRef(null);

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  const prevLevel = effectiveIndex > 0 ? acuityLevels[effectiveIndex - 1] : null;
  const nextLevel =
    !screenerMode && effectiveIndex < acuityLevels.length - 1
      ? acuityLevels[effectiveIndex + 1]
      : null;

  const chartLevels = screenerMode
    ? [prevLevel, effectiveLevel, nextLevel].filter(Boolean)
    : acuityLevels;

  const chartLettersByLevel = useMemo(() => {
    const map = {};
    for (const level of chartLevels) {
      map[level] = getSnellenRowLetters(level, quickMode);
    }
    return map;
  }, [chartLevels, quickMode, resetToken]);

  const finalizeRow = useCallback(
    ({ letters, expectedText: exp, userTypedText, correctCount, wrongCount, positionMatches, accuracyPercent }) => {
      if (submitted || !visionOk) return;

      const correct = correctCount;
      const passed = correct >= passThreshold;
      const myGen = resetGenRef.current;

      setSubmitted(true);
      setRowScore({ correct, passed, expectedText: exp, userTypedText, wrongCount, accuracyPercent });
      setFeedback(passed ? "pass" : "fail");

      const rowMetrics = {
        expectedText: exp,
        userTypedText,
        correctCount,
        wrongCount,
        positionMatches,
        accuracyPercent,
        rowTimings: [
          {
            correct: passed,
            responseTime: Date.now() - rowStartRef.current,
            correctCount: correct,
            level: effectiveLevel,
          },
        ],
        letterTimings: letters.map((a, i) => ({
          correct: a === rowLetters[i],
          letter: rowLetters[i],
          typed: a,
          responseTime: 0,
        })),
      };

      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        if (myGen !== resetGenRef.current) return;
        onLevelResult(passed, effectiveIndex, rowMetrics);
      }, FEEDBACK_MS);
    },
    [submitted, visionOk, passThreshold, rowLetters, effectiveLevel, effectiveIndex, onLevelResult]
  );

  const { displaySlots, clearTyped, submitNow, canSubmit, filledCount } = useLetterRowInput({
    expectedLetters: rowLetters,
    visionOk: visionOk && !submitted,
    submitted,
    onSubmit: finalizeRow,
  });

  useEffect(() => {
    resetGenRef.current += 1;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
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
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Look at the camera and hold the correct distance to resume.
          </p>
        </div>
      )}

      {zoomWarning && (
        <div className="mb-3 w-full px-4 py-2 rounded-xl text-xs font-semibold text-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
          ⚠️ {zoomWarning}
        </div>
      )}

      <div
        className={`mb-2 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider ${
          isDarkMode
            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
            : "bg-cyan-50 text-cyan-700 border border-cyan-200"
        }`}
      >
        {screenerMode ? "Distance screener — " : ""}
        Decimal {formatAcuityLabel(effectiveLevel)} — Read the highlighted line
      </div>

      <div
        className={`mb-4 px-4 py-2 rounded-xl text-sm font-semibold ${
          isDarkMode
            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        👁️ Keep your {coveredEyeLabel} eye covered
      </div>

      <div className="w-full space-y-0 mb-4">
        {chartLevels.map((level) => {
          const letters = chartLettersByLevel[level] ?? getSnellenRowLetters(level, quickMode);
          const isCurrent = level === effectiveLevel;
          return (
            <SnellenRow
              key={level}
              level={level}
              letters={letters}
              fontSize={getSnellenChartCapHeightPx(level, ppi)}
              muted={!isCurrent}
              highlight={isCurrent}
              compact={!screenerMode}
              isDarkMode={isDarkMode}
            />
          );
        })}
      </div>

      <div className="flex gap-2 mb-3">
        {displaySlots.map((a, i) => (
          <div
            key={i}
            className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center text-lg font-bold ${
              submitted
                ? a === rowLetters[i]
                  ? "border-green-500 bg-green-500/15 text-green-500"
                  : "border-red-500 bg-red-500/15 text-red-500"
                : i === filledCount
                  ? isDarkMode
                    ? "border-cyan-400 bg-cyan-500/20 text-white"
                    : "border-cyan-500 bg-cyan-50 text-slate-900"
                  : isDarkMode
                    ? "border-slate-600 text-slate-400"
                    : "border-slate-200 text-slate-400"
            }`}
          >
            {a || "·"}
          </div>
        ))}
      </div>

      {submitted && rowScore && (
        <div
          className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-xl ${
            feedback === "pass"
              ? isDarkMode
                ? "bg-green-500/10 text-green-400"
                : "bg-green-50 text-green-700"
              : isDarkMode
                ? "bg-red-500/10 text-red-400"
                : "bg-red-50 text-red-700"
          }`}
        >
          {feedback === "pass" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-bold text-sm">
            {rowScore.correct}/{lettersPerRow} correct —{" "}
            {rowScore.passed ? "Row passed" : "Row failed"}
          </span>
        </div>
      )}

      <p className={`text-xs mb-3 text-center max-w-md ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Type any letters A–Z on your keyboard ({filledCount}/{lettersPerRow}). Wrong letters are
        recorded. Need {passThreshold}/{lettersPerRow} correct to pass. Backspace to fix before the
        row submits.
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
          className="px-6 py-2 rounded-xl text-sm font-bold bg-slate-500/80 hover:bg-slate-500 text-white disabled:opacity-40"
        >
          Submit row
        </button>
      </div>
    </div>
  );
}
