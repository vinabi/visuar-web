import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import {
  buildMetricsPayload,
  calcSessionStability,
  calcWeightedContrastScore,
} from "../utils/metricsEngine";
import { speakInstruction } from "../utils/speech";
import { getBrowserZoomWarning } from "../utils/visionScaling";
import {
  getContrastLevels,
  pickContrastRowLetters,
  contrastGrayValue,
  snellenPassThreshold,
} from "../utils/testStimuli";
import { useLetterRowInput } from "../hooks/useLetterRowInput";

const FEEDBACK_MS = 350;

function drawContrastLetters(canvas, letters, level, isDarkMode, letterPx, canvasCSSSize) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;

  const expectedW = Math.round(canvasCSSSize * dpr);
  if (canvas.width !== expectedW || canvas.height !== expectedW) {
    canvas.width = expectedW;
    canvas.height = expectedW;
    canvas.style.width = `${canvasCSSSize}px`;
    canvas.style.height = `${canvasCSSSize}px`;
  }

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const gray = contrastGrayValue(level.percent, isDarkMode);
  ctx.fillStyle = `rgb(${gray},${gray},${gray})`;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `900 ${letterPx}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const gap = letterPx * 0.35;
  const totalW = (letters.length - 1) * gap;
  const startX = canvasCSSSize / 2 - totalW / 2;
  letters.forEach((ch, i) => {
    ctx.fillText(ch, startX + i * gap, canvasCSSSize / 2);
  });
  ctx.restore();
}

export function ContrastEngine({
  ppi = 96,
  isDarkMode,
  visionOk,
  onTestComplete,
  lang = "en",
  quickMode = false,
}) {
  const contrastLevels = getContrastLevels(quickMode);
  const totalRounds = contrastLevels.length;

  const [phase, setPhase] = useState("INSTRUCTIONS");
  const [rowLetters, setRowLetters] = useState(["E"]);
  const [contrastLevelIndex, setContrastLevelIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
<<<<<<< Updated upstream
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
=======
  const [submitted, setSubmitted] = useState(false);
>>>>>>> Stashed changes

  const canvasRef = useRef(null);
  const roundsRef = useRef([]);
  const roundStartRef = useRef(null);
  const levelRef = useRef(0);
  const lettersRef = useRef(["E"]);
  const waitingRef = useRef(false);
  const recentRowsRef = useRef([]);
  const phaseRef = useRef("INSTRUCTIONS");
  const isPausedRef = useRef(false);

  const pauseCountRef = useRef(0);
  const wasPausedRef = useRef(false);

  lettersRef.current = rowLetters;
  levelRef.current = contrastLevelIndex;
  phaseRef.current = phase;
  isPausedRef.current = isPaused;

<<<<<<< Updated upstream
  const baseESizePx = getContrastSize(ppi) || 80;
  // Shrink the E from full calibrated size down to 38 % by the final round
  const eSizePx = Math.round(
    baseESizePx * (0.15 + 0.85 * (1 - roundNum / TOTAL_ROUNDS))
  );
  const canvasCSSSize = 220;
=======
  const level = contrastLevels[contrastLevelIndex] || contrastLevels[0];
  const letterPx = level.fontPx;
  const canvasCSSSize = Math.max(letterPx * rowLetters.length + 48, 120);
  const passThreshold = snellenPassThreshold(rowLetters.length);
>>>>>>> Stashed changes

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  useEffect(() => {
    if (phase === "TESTING") {
      const nowPaused = !visionOk;
      if (nowPaused && !wasPausedRef.current) {
        pauseCountRef.current += 1;
      }
      wasPausedRef.current = nowPaused;
      setIsPaused(nowPaused);
    }
  }, [visionOk, phase]);

  useEffect(() => {
    if (!isPaused && waitingRef.current && roundStartRef.current) {
      roundStartRef.current = Date.now();
    }
  }, [isPaused]);

  useEffect(() => {
    if (phase === "TESTING" && canvasRef.current) {
      drawContrastLetters(
        canvasRef.current,
        rowLetters,
        level,
        isDarkMode,
        letterPx,
        canvasCSSSize
      );
    }
<<<<<<< Updated upstream
  }, [direction, contrastLevelIndex, isDarkMode, phase, eSizePx, canvasCSSSize, roundNum]);
=======
  }, [rowLetters, contrastLevelIndex, isDarkMode, phase, letterPx, canvasCSSSize, level]);
>>>>>>> Stashed changes

  useEffect(() => {
    if (phase !== "TESTING") return;
    speakInstruction("contrast_start", lang);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const [acceptingInput, setAcceptingInput] = useState(false);

  const startRound = useCallback(
    (roundIndex) => {
      const li = Math.min(roundIndex, contrastLevels.length - 1);
      const cfg = contrastLevels[li];
      const letters = pickContrastRowLetters(li, cfg.letterCount, recentRowsRef.current);
      const key = letters.join("");
      recentRowsRef.current.push(key);
      if (recentRowsRef.current.length > 8) {
        recentRowsRef.current = recentRowsRef.current.slice(-8);
      }
      setRowLetters(letters);
      setContrastLevelIndex(li);
      setSubmitted(false);
      waitingRef.current = true;
      setAcceptingInput(true);
      roundStartRef.current = Date.now();
    },
    [contrastLevels]
  );

  const processResponse = useCallback(
    (payload) => {
      if (!waitingRef.current || phaseRef.current !== "TESTING" || isPausedRef.current) return;
      waitingRef.current = false;
      setAcceptingInput(false);

      const expectedText = lettersRef.current.join("");
      const isCorrect = payload.correctCount >= passThreshold;
      const responseTime = Date.now() - (roundStartRef.current || Date.now());

      roundsRef.current.push({
        levelIndex: levelRef.current,
        contrastPercent: contrastLevels[levelRef.current]?.percent,
        letter: expectedText,
        expectedText,
        userTypedText: payload.userTypedText,
        response: payload.userTypedText,
        correct: isCorrect,
        correctCount: payload.correctCount,
        wrongCount: payload.wrongCount,
        accuracyPercent: payload.accuracyPercent,
        positionMatches: payload.positionMatches,
        responseTime,
      });

      const completedRounds = roundsRef.current.length;
      setRoundNum(completedRounds);
      setFeedback(isCorrect ? "correct" : "wrong");

      setTimeout(() => {
<<<<<<< Updated upstream
        setFeedback(null);
        if (completedRounds >= TOTAL_ROUNDS) {
=======
        setSubmitted(false);
        if (completedRounds >= totalRounds) {
>>>>>>> Stashed changes
          const rounds = roundsRef.current;
          const metrics = buildMetricsPayload(rounds, contrastLevels.length - 1);

          const correctLevels = rounds.filter((r) => r.correct).map((r) => r.levelIndex);
          const maxCorrectLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
<<<<<<< Updated upstream
          const lowestContrastValue =
            CONTRAST_PERCENT_LEVELS[maxCorrectLevel]?.percent ?? 90;
=======
          const contrastLevelPassed = contrastLevels[maxCorrectLevel]?.percent ?? 60;
          const contrastScore = Math.round(
            (maxCorrectLevel / Math.max(1, contrastLevels.length - 1)) * 100
          );
>>>>>>> Stashed changes

          const sessionStability = calcSessionStability(pauseCountRef.current);

          const contrastScore = calcWeightedContrastScore(
            rounds,
            metrics.consistencyScore,
            sessionStability,
            metrics.fatigueLevel,
            metrics.avgResponseTime
          );

          setPhase("COMPLETE");
          onTestComplete({
            contrastScore,
            contrastLevelPassed,
            lowestContrastValue: contrastLevelPassed,
            faintestContrastPercent: contrastLevelPassed,
            totalLevels: contrastLevels.length,
            supportingResultOnly: true,
            usedInSessionAverage: false,
            ...metrics,
            sessionStability,
            pauseCount: pauseCountRef.current,
          });
        } else {
          startRound(completedRounds);
        }
      }, FEEDBACK_MS);
    },
    [contrastLevels, totalRounds, onTestComplete, passThreshold, startRound]
  );

  const finalizeRow = useCallback(
    (payload) => {
      if (submitted) return;
      setSubmitted(true);
      processResponse({ ...payload, correct: payload.correctCount >= passThreshold });
    },
    [submitted, processResponse, passThreshold]
  );

<<<<<<< Updated upstream
  const [lastClickedDir, setLastClickedDir] = useState(null);

  const handleDirClick = (dir) => {
    setLastClickedDir(dir);
    processResponse(dir);
  };
=======
  const { displaySlots, filledCount } = useLetterRowInput({
    expectedLetters: rowLetters,
    visionOk: visionOk && phase === "TESTING" && !isPaused && acceptingInput && !submitted,
    submitted,
    onSubmit: finalizeRow,
  });
>>>>>>> Stashed changes

  const handleStart = useCallback(() => {
    roundsRef.current = [];
    recentRowsRef.current = [];
    pauseCountRef.current = 0;
    wasPausedRef.current = false;
    setRoundNum(0);
    setPhase("TESTING");
    startRound(0);
  }, [startRound]);

  const currentContrast = contrastLevels[contrastLevelIndex]?.percent ?? 60;

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Contrast Sensitivity Test
        </h2>
        <p className={`text-lg mb-2 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Identify faint letters — contrast drops and letters get smaller with more characters each
          round ({totalRounds} rounds).
        </p>
        <p className={`text-base mb-6 max-w-lg ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Type any letter A–Z on the keyboard. Wrong answers are recorded. This test supports
          visual quality screening only — it does not estimate diopters.
        </p>
        <button
          onClick={handleStart}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg ${
            visionOk
              ? isDarkMode
                ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                : "bg-cyan-500 hover:bg-cyan-600 text-white"
              : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          {visionOk ? "Start Test" : "Waiting for camera…"}
        </button>
      </div>
    );
  }

  if (phase === "TESTING") {
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full p-4 select-none">
        {isPaused && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-xl font-bold text-white">Test Paused</p>
            </div>
          </div>
        )}

        {zoomWarning && (
          <div className="mb-3 px-4 py-2 rounded-xl text-xs font-semibold text-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
            ⚠️ {zoomWarning}
          </div>
        )}

        <div className={`text-sm font-bold mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Round {Math.min(roundNum + 1, totalRounds)} / {totalRounds} · Visibility ~{currentContrast}%
          · {rowLetters.length} letter{rowLetters.length !== 1 ? "s" : ""}
        </div>

        <div
<<<<<<< Updated upstream
          className={`rounded-2xl overflow-hidden transition-all duration-100 ${
            feedback === "correct"
              ? "ring-4 ring-green-500"
              : feedback === "wrong"
              ? "ring-4 ring-red-500"
              : isDarkMode ? "ring-2 ring-slate-700" : "ring-2 ring-slate-200"
=======
          className={`rounded-2xl overflow-hidden mb-4 ${
            isDarkMode ? "ring-2 ring-slate-700" : "ring-2 ring-slate-200"
>>>>>>> Stashed changes
          }`}
          style={{ width: canvasCSSSize, height: canvasCSSSize }}
        >
          <canvas ref={canvasRef} style={{ display: "block" }} />
          {feedback && (
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl ${feedback === "correct" ? "bg-green-500/20" : "bg-red-500/20"}`}>
              <span className={`text-5xl font-black ${feedback === "correct" ? "text-green-400" : "text-red-400"}`}>
                {feedback === "correct" ? "✓" : "✗"}
              </span>
            </div>
          )}
        </div>

<<<<<<< Updated upstream
        <p className={`mt-5 text-base font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Which direction are the E&apos;s prongs pointing?
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4 max-w-xs w-full">
          {[
            { dir: "UP", label: "↑ Up", col: "col-start-2" },
            { dir: "LEFT", label: "← Left", col: "col-start-1" },
            { dir: "RIGHT", label: "Right →", col: "col-start-3" },
            { dir: "DOWN", label: "↓ Down", col: "col-start-2" },
          ].map(({ dir, label, col }) => {
            const isThis = feedback && lastClickedDir === dir;
            const btnColor = isThis
              ? feedback === "correct"
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-red-500 bg-red-500/20 text-red-400"
              : isDarkMode
              ? "border-slate-600 bg-slate-800 text-white hover:bg-cyan-500/20"
              : "border-slate-200 bg-white hover:bg-cyan-50";
            return (
              <button
                key={dir}
                type="button"
                disabled={isPaused || !visionOk}
                onClick={() => handleDirClick(dir)}
                className={`${col} py-3 rounded-xl font-bold border-2 transition-colors ${btnColor}`}
              >
                {label}
              </button>
            );
          })}
=======
        <div className="flex gap-2 mb-3">
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
>>>>>>> Stashed changes
        </div>

        <p className={`text-sm mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Type what you see ({filledCount}/{rowLetters.length}). Auto-submits when the row is full.
        </p>
      </div>
    );
  }

  return null;
}
