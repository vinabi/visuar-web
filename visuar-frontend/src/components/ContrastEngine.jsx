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
  contrastGrayValue,
  snellenPassThreshold,
} from "../utils/testStimuli";

const FEEDBACK_MS = 500;
const ALL_DIRS = ["right", "up", "left", "down"];
const DIR_ANGLES = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const DIR_ARROWS = { right: "→", up: "↑", left: "←", down: "↓" };
const DIR_LABELS = { right: "Right", up: "Up", left: "Left", down: "Down" };

function pickTumblingEDirections(count, roundIndex) {
  const dirs = [];
  for (let i = 0; i < count; i++) {
    dirs.push(ALL_DIRS[(roundIndex * 3 + i * 7 + 1) % ALL_DIRS.length]);
  }
  return dirs;
}

function drawTumblingE(canvas, directions, contrastPercent, isDarkMode, fontPx, canvasW, canvasH) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expectedW = Math.round(canvasW * dpr);
  const expectedH = Math.round(canvasH * dpr);
  if (canvas.width !== expectedW || canvas.height !== expectedH) {
    canvas.width = expectedW;
    canvas.height = expectedH;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gray = contrastGrayValue(contrastPercent, isDarkMode);
  ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
  const slotW = canvasW / directions.length;
  const cy = canvasH / 2;
  directions.forEach((dir, i) => {
    const cx = slotW * i + slotW / 2;
    const angle = DIR_ANGLES[dir] ?? 0;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.font = `900 ${fontPx}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("E", 0, 0);
    ctx.restore();
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
  const [directions, setDirections] = useState(["right"]);
  const [contrastLevelIndex, setContrastLevelIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [userDirs, setUserDirs] = useState([]);
  const [acceptingInput, setAcceptingInput] = useState(false);

  const canvasRef = useRef(null);
  const roundsRef = useRef([]);
  const roundStartRef = useRef(null);
  const levelRef = useRef(0);
  const directionsRef = useRef(["right"]);
  const waitingRef = useRef(false);
  const phaseRef = useRef("INSTRUCTIONS");
  const isPausedRef = useRef(false);
  const pauseCountRef = useRef(0);
  const wasPausedRef = useRef(false);
  const submittedRef = useRef(false);

  directionsRef.current = directions;
  levelRef.current = contrastLevelIndex;
  phaseRef.current = phase;
  isPausedRef.current = isPaused;
  submittedRef.current = submitted;

  const level = contrastLevels[contrastLevelIndex] || contrastLevels[0];
  const fontPx = level.fontPx;
  const count = directions.length;
  const canvasW = Math.max(fontPx * 2.4 * count, 180);
  const canvasH = Math.max(fontPx * 2.4, 110);
  const passThreshold = snellenPassThreshold(count);

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  useEffect(() => {
    if (phase === "TESTING") {
      const nowPaused = !visionOk;
      if (nowPaused && !wasPausedRef.current) pauseCountRef.current += 1;
      wasPausedRef.current = nowPaused;
      setIsPaused(nowPaused);
    }
  }, [visionOk, phase]);

  // Redraw canvas when directions or contrast changes
  useEffect(() => {
    if (phase === "TESTING" && canvasRef.current) {
      drawTumblingE(canvasRef.current, directions, level.percent, isDarkMode, fontPx, canvasW, canvasH);
    }
  }, [directions, contrastLevelIndex, isDarkMode, phase, fontPx, canvasW, canvasH, level.percent]);

  useEffect(() => {
    if (phase !== "TESTING") return;
    speakInstruction("contrast_start", lang);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset user input when new round starts
  useEffect(() => {
    setUserDirs([]);
  }, [directions]);

  const startRoundRef = useRef(null);

  const startRound = useCallback(
    (roundIndex) => {
      const li = Math.min(roundIndex, contrastLevels.length - 1);
      const cfg = contrastLevels[li];
      const dirs = pickTumblingEDirections(cfg.letterCount, roundIndex);
      setDirections(dirs);
      setContrastLevelIndex(li);
      setSubmitted(false);
      submittedRef.current = false;
      setUserDirs([]);
      waitingRef.current = true;
      setAcceptingInput(true);
      roundStartRef.current = Date.now();
    },
    [contrastLevels]
  );

  useEffect(() => { startRoundRef.current = startRound; }, [startRound]);

  const processResponse = useCallback(
    (inputDirs) => {
      if (!waitingRef.current || phaseRef.current !== "TESTING" || isPausedRef.current) return;
      waitingRef.current = false;
      setAcceptingInput(false);

      const dirs = directionsRef.current;
      const correctCount = inputDirs.filter((d, i) => d === dirs[i]).length;
      const wrongCount = dirs.length - correctCount;
      const accuracyPercent = Math.round((correctCount / dirs.length) * 100);
      const isCorrect = correctCount >= passThreshold;
      const responseTime = Date.now() - (roundStartRef.current || Date.now());

      roundsRef.current.push({
        levelIndex: levelRef.current,
        contrastPercent: contrastLevels[levelRef.current]?.percent,
        expectedText: dirs.join(","),
        userTypedText: inputDirs.join(","),
        correct: isCorrect,
        correctCount,
        wrongCount,
        accuracyPercent,
        positionMatches: inputDirs.map((d, i) => d === dirs[i]),
        responseTime,
      });

      const completedRounds = roundsRef.current.length;
      setRoundNum(completedRounds);
      setFeedback(isCorrect ? "correct" : "wrong");

      setTimeout(() => {
        setFeedback(null);
        setSubmitted(false);
        submittedRef.current = false;
        if (completedRounds >= totalRounds) {
          const rounds = roundsRef.current;
          const metrics = buildMetricsPayload(rounds, contrastLevels.length - 1);
          const correctLevels = rounds.filter((r) => r.correct).map((r) => r.levelIndex);
          const maxCorrectLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
          const contrastLevelPassed = contrastLevels[maxCorrectLevel]?.percent ?? 60;
          const sessionStability = calcSessionStability(pauseCountRef.current);
          const contrastScore = calcWeightedContrastScore(
            rounds, metrics.consistencyScore, sessionStability,
            metrics.fatigueLevel, metrics.avgResponseTime
          );
          setPhase("COMPLETE");
          onTestComplete({
            contrastScore, contrastLevelPassed,
            lowestContrastValue: contrastLevelPassed,
            faintestContrastPercent: contrastLevelPassed,
            totalLevels: contrastLevels.length,
            supportingResultOnly: true,
            usedInSessionAverage: false,
            ...metrics, sessionStability,
            pauseCount: pauseCountRef.current,
          });
        } else {
          startRoundRef.current?.(completedRounds);
        }
      }, FEEDBACK_MS);
    },
    [contrastLevels, totalRounds, onTestComplete, passThreshold]
  );

  // Arrow key input
  useEffect(() => {
    if (!acceptingInput || submitted || !visionOk || phase !== "TESTING") return;
    const onKey = (e) => {
      if (submittedRef.current) return;
      const dirMap = { ArrowRight: "right", ArrowLeft: "left", ArrowUp: "up", ArrowDown: "down" };
      const dir = dirMap[e.key];
      if (!dir) return;
      e.preventDefault();
      setUserDirs((prev) => {
        if (prev.length >= directionsRef.current.length) return prev;
        const next = [...prev, dir];
        if (next.length === directionsRef.current.length) {
          submittedRef.current = true;
          setSubmitted(true);
          setTimeout(() => processResponse(next), 0);
        }
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [acceptingInput, submitted, visionOk, phase, processResponse]);

  const handleDirButton = useCallback(
    (dir) => {
      if (!acceptingInput || submittedRef.current || !visionOk) return;
      setUserDirs((prev) => {
        if (prev.length >= directionsRef.current.length) return prev;
        const next = [...prev, dir];
        if (next.length === directionsRef.current.length) {
          submittedRef.current = true;
          setSubmitted(true);
          setTimeout(() => processResponse(next), 0);
        }
        return next;
      });
    },
    [acceptingInput, visionOk, processResponse]
  );

  const handleStart = useCallback(() => {
    roundsRef.current = [];
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
          You will see one or more "E" letters rotated in different directions. Use the{" "}
          <strong>arrow keys</strong> (or the buttons on screen) to identify which way each E is
          pointing — left, right, up, or down.
        </p>
        <p className={`text-base mb-2 max-w-lg ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          The letters will become fainter each round ({totalRounds} rounds total). Answer as quickly
          as you can.
        </p>
        <div className="flex gap-3 mb-6 text-2xl">
          <span title="Right">→ E</span>
          <span title="Up" className="inline-block rotate-90">→ E</span>
          <span title="Left">E ←</span>
          <span title="Down" className="inline-block -rotate-90">→ E</span>
        </div>
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

        <div className={`text-sm font-bold mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Round {Math.min(roundNum + 1, totalRounds)} / {totalRounds} · Contrast ~{currentContrast}%
          · {count} E{count !== 1 ? "s" : ""}
        </div>

        {/* Canvas showing tumbling E letters */}
        <div className="relative mb-4" style={{ width: canvasW, height: canvasH }}>
          <div
            className={`rounded-2xl overflow-hidden w-full h-full ${
              isDarkMode ? "ring-2 ring-slate-700" : "ring-2 ring-slate-200"
            }`}
          >
            <canvas ref={canvasRef} style={{ display: "block" }} />
          </div>
          {feedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl ${
                feedback === "correct" ? "bg-green-500/20" : "bg-red-500/20"
              }`}
            >
              <span
                className={`text-5xl font-black ${
                  feedback === "correct" ? "text-green-400" : "text-red-400"
                }`}
              >
                {feedback === "correct" ? "✓" : "✗"}
              </span>
            </div>
          )}
        </div>

        {/* Input slots showing user answers */}
        <div className="flex gap-2 mb-3">
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                userDirs[i]
                  ? isDarkMode
                    ? "border-cyan-400 text-cyan-400 bg-cyan-500/10"
                    : "border-cyan-500 text-cyan-600 bg-cyan-50"
                  : isDarkMode
                  ? "border-slate-600 text-slate-500"
                  : "border-slate-200 text-slate-300"
              }`}
            >
              {userDirs[i] ? DIR_ARROWS[userDirs[i]] : "·"}
            </div>
          ))}
        </div>

        {/* Direction buttons (touch / mouse fallback) */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <button
            onClick={() => handleDirButton("up")}
            disabled={!acceptingInput || submitted}
            className={`w-12 h-10 rounded-lg text-xl font-bold transition-colors ${
              isDarkMode
                ? "bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30"
                : "bg-slate-100 hover:bg-cyan-100 text-slate-700 disabled:opacity-30"
            }`}
          >
            ↑
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => handleDirButton("left")}
              disabled={!acceptingInput || submitted}
              className={`w-12 h-10 rounded-lg text-xl font-bold transition-colors ${
                isDarkMode
                  ? "bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30"
                  : "bg-slate-100 hover:bg-cyan-100 text-slate-700 disabled:opacity-30"
              }`}
            >
              ←
            </button>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs ${isDarkMode ? "text-slate-600" : "text-slate-300"}`}>
              E
            </div>
            <button
              onClick={() => handleDirButton("right")}
              disabled={!acceptingInput || submitted}
              className={`w-12 h-10 rounded-lg text-xl font-bold transition-colors ${
                isDarkMode
                  ? "bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30"
                  : "bg-slate-100 hover:bg-cyan-100 text-slate-700 disabled:opacity-30"
              }`}
            >
              →
            </button>
          </div>
          <button
            onClick={() => handleDirButton("down")}
            disabled={!acceptingInput || submitted}
            className={`w-12 h-10 rounded-lg text-xl font-bold transition-colors ${
              isDarkMode
                ? "bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white disabled:opacity-30"
                : "bg-slate-100 hover:bg-cyan-100 text-slate-700 disabled:opacity-30"
            }`}
          >
            ↓
          </button>
        </div>

        <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          Arrow keys or tap buttons · {userDirs.length}/{count} answered
        </p>
      </div>
    );
  }

  return null;
}
