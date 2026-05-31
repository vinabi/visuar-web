import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { buildMetricsPayload, calcSessionStability } from "../utils/metricsEngine";

// Level definitions: sizePx = arrow bounding box, displayMs = how long it stays visible
const LEVELS = [
  { sizePx: 80, displayMs: 2500 }, // 0 - Easy start
  { sizePx: 68, displayMs: 2000 }, // 1
  { sizePx: 56, displayMs: 1600 }, // 2 ← Starting level
  { sizePx: 46, displayMs: 1300 }, // 3
  { sizePx: 38, displayMs: 1000 }, // 4
  { sizePx: 30, displayMs:  750 }, // 5
  { sizePx: 24, displayMs:  550 }, // 6
  { sizePx: 18, displayMs:  400 }, // 7 - Hard
];

const RESPONSE_WINDOW_MS = 500; // grace window after stimulus disappears
const DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"];
const TOTAL_ROUNDS = 25;
const STARTING_LEVEL = 2;
const FEEDBACK_MS = 380;
const INTER_ROUND_MS = 650;

const KEY_TO_DIR = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
};

const CANVAS_CSS = 244;

// Draws a solid geometric arrow pointing up, rotated to the desired direction.
function drawArrow(canvas, direction, sizePx, isDarkMode) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expected = Math.round(CANVAS_CSS * dpr);
  if (canvas.width !== expected || canvas.height !== expected) {
    canvas.width = expected;
    canvas.height = expected;
    canvas.style.width = `${CANVAS_CSS}px`;
    canvas.style.height = `${CANVAS_CSS}px`;
  }
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = isDarkMode ? "#e2e8f0" : "#1e293b";

  const s = sizePx * dpr;
  const headH = s * 0.46;
  const headW = s * 0.56;
  const shaftW = s * 0.22;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  const rotDeg = { UP: 0, RIGHT: 90, DOWN: 180, LEFT: 270 };
  ctx.rotate((rotDeg[direction] * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, -s / 2);
  ctx.lineTo(headW / 2, -s / 2 + headH);
  ctx.lineTo(shaftW / 2, -s / 2 + headH);
  ctx.lineTo(shaftW / 2, s / 2);
  ctx.lineTo(-shaftW / 2, s / 2);
  ctx.lineTo(-shaftW / 2, -s / 2 + headH);
  ctx.lineTo(-headW / 2, -s / 2 + headH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function clearCanvas(canvas, isDarkMode) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expected = Math.round(CANVAS_CSS * dpr);
  if (canvas.width !== expected || canvas.height !== expected) {
    canvas.width = expected;
    canvas.height = expected;
    canvas.style.width = `${CANVAS_CSS}px`;
    canvas.style.height = `${CANVAS_CSS}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function RapidRecognitionEngine({ ppi = 96, isDarkMode, visionOk, onTestComplete, lang = "en" }) {
  const [phase, setPhase] = useState("INSTRUCTIONS");
  const [direction, setDirection] = useState(null);
  const [levelIndex, setLevelIndex] = useState(STARTING_LEVEL);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [isPaused, setIsPaused] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const [stimulusVisible, setStimulusVisible] = useState(false);

  const canvasRef = useRef(null);
  const roundsRef = useRef([]);
  const roundStartRef = useRef(null);
  const dirRef = useRef(null);
  const levelRef = useRef(STARTING_LEVEL);
  const phaseRef = useRef("INSTRUCTIONS");
  const isPausedRef = useRef(false);
  const waitingRef = useRef(false);
  const hideTimerRef = useRef(null);
  const missTimerRef = useRef(null);
  const interTimerRef = useRef(null);
  const pauseCountRef = useRef(0);
  const wasPausedRef = useRef(false);
  const pauseTransitionRef = useRef(false); // tracks rising edge of pause

  dirRef.current = direction;
  levelRef.current = levelIndex;
  phaseRef.current = phase;
  isPausedRef.current = isPaused;

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (missTimerRef.current) { clearTimeout(missTimerRef.current); missTimerRef.current = null; }
    if (interTimerRef.current) { clearTimeout(interTimerRef.current); interTimerRef.current = null; }
  }, []);

  // ── Pause tracking ───────────────────────────────────────
  useEffect(() => {
    if (phase !== "TESTING") return;
    const nowPaused = !visionOk;
    if (nowPaused && !wasPausedRef.current) {
      pauseCountRef.current += 1;
    }
    wasPausedRef.current = nowPaused;
    setIsPaused(nowPaused);
  }, [visionOk, phase]);

  // ── Canvas rendering ─────────────────────────────────────
  useEffect(() => {
    if (phase !== "TESTING") return;
    if (stimulusVisible && direction) {
      drawArrow(canvasRef.current, direction, LEVELS[levelIndex].sizePx, isDarkMode);
    } else {
      clearCanvas(canvasRef.current, isDarkMode);
    }
  }, [direction, stimulusVisible, levelIndex, isDarkMode, phase]);

  // ── Pause / resume handler ───────────────────────────────
  useEffect(() => {
    if (phase !== "TESTING") return;

    if (isPaused && !pauseTransitionRef.current) {
      pauseTransitionRef.current = true;
      clearTimers();
      setStimulusVisible(false);
    } else if (!isPaused && pauseTransitionRef.current) {
      pauseTransitionRef.current = false;
      // If we were mid-round, re-show stimulus with full display time
      if (waitingRef.current && dirRef.current) {
        const li = levelRef.current;
        setStimulusVisible(true);
        roundStartRef.current = Date.now();
        const { displayMs } = LEVELS[li];
        hideTimerRef.current = setTimeout(() => {
          setStimulusVisible(false);
          missTimerRef.current = setTimeout(() => {
            if (waitingRef.current && !isPausedRef.current) {
              finishRound(false, null);
            }
          }, RESPONSE_WINDOW_MS);
        }, displayMs);
      }
    }
  }, [isPaused, phase, clearTimers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finish a round ──────────────────────────────────────
  const finishRound = useCallback((isCorrect, responseTime) => {
    if (!waitingRef.current) return;
    waitingRef.current = false;
    clearTimers();
    setStimulusVisible(false);

    const li = levelRef.current;
    roundsRef.current.push({
      levelIndex: li,
      correct: isCorrect,
      responseTime: responseTime ?? LEVELS[li].displayMs + RESPONSE_WINDOW_MS,
    });

    setFeedback(isCorrect ? "correct" : "wrong");
    const completedRounds = roundsRef.current.length;
    setRoundNum(completedRounds);

    const newLevel = isCorrect
      ? Math.min(li + 1, LEVELS.length - 1)
      : Math.max(li - 1, 0);

    setTimeout(() => {
      setFeedback(null);

      if (completedRounds >= TOTAL_ROUNDS) {
        const rounds = roundsRef.current;
        const metrics = buildMetricsPayload(rounds, LEVELS.length - 1);

        const correctLevels = rounds.filter((r) => r.correct).map((r) => r.levelIndex);
        const highestLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;
        const rapidScore = Math.min(
          100,
          Math.round((highestLevel / (LEVELS.length - 1)) * 65 + (metrics.accuracy / 100) * 35)
        );
        const sessionStability = calcSessionStability(pauseCountRef.current);

        setPhase("COMPLETE");
        onTestComplete({ rapidScore, highestLevel, ...metrics, sessionStability, pauseCount: pauseCountRef.current });
      } else {
        startRound(newLevel);
      }
    }, FEEDBACK_MS);
  }, [clearTimers, onTestComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start a round ────────────────────────────────────────
  const startRound = useCallback((li) => {
    setLevelIndex(li);
    levelRef.current = li;

    interTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "TESTING" || isPausedRef.current) return;

      const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      setDirection(dir);
      dirRef.current = dir;
      setStimulusVisible(true);
      roundStartRef.current = Date.now();
      waitingRef.current = true;

      const { displayMs } = LEVELS[li];
      hideTimerRef.current = setTimeout(() => {
        setStimulusVisible(false);
        missTimerRef.current = setTimeout(() => {
          if (waitingRef.current && !isPausedRef.current) {
            finishRound(false, null);
          }
        }, RESPONSE_WINDOW_MS);
      }, displayMs);
    }, INTER_ROUND_MS);
  }, [finishRound]);

  // ── Process key response ─────────────────────────────────
  const processResponse = useCallback((dir) => {
    if (!waitingRef.current || phaseRef.current !== "TESTING" || isPausedRef.current) return;
    const responseTime = Date.now() - (roundStartRef.current || Date.now());
    finishRound(dir === dirRef.current, responseTime);
  }, [finishRound]);

  useEffect(() => {
    const onKey = (e) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir) { e.preventDefault(); processResponse(dir); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [processResponse]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── Start test ───────────────────────────────────────────
  const handleStart = useCallback(() => {
    roundsRef.current = [];
    pauseCountRef.current = 0;
    wasPausedRef.current = false;
    pauseTransitionRef.current = false;
    setRoundNum(0);
    setPhase("TESTING");
    phaseRef.current = "TESTING";
    startRound(STARTING_LEVEL);
  }, [startRound]);

  // ── Level label ──────────────────────────────────────────
  const levelLabel = levelIndex <= 1 ? "Easy" : levelIndex <= 3 ? "Medium" : levelIndex <= 5 ? "Hard" : "Expert";

  // ─────────────────── RENDER ─────────────────────────────

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
          <Zap className={`w-8 h-8 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
        </div>

        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Rapid Recognition Test
        </h2>
        <p className={`text-base mb-2 max-w-md ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          An arrow will appear briefly. Identify its direction before it disappears.
        </p>
        <p className={`text-sm mb-1 max-w-md ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          The arrows get <strong>smaller</strong> and <strong>faster</strong> as you improve.
        </p>
        <p className={`text-sm mb-7 max-w-md ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          25 rounds · Adaptive difficulty · No restart between arrows
        </p>

        {/* Arrow key legend */}
        <div className={`inline-grid grid-cols-3 gap-2 mb-8 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          <div />
          <kbd className={`px-3 py-2 rounded-lg text-center font-mono ${isDarkMode ? "bg-slate-700 border border-slate-600" : "bg-slate-100 border border-slate-200"}`}>↑</kbd>
          <div />
          <kbd className={`px-3 py-2 rounded-lg text-center font-mono ${isDarkMode ? "bg-slate-700 border border-slate-600" : "bg-slate-100 border border-slate-200"}`}>←</kbd>
          <div className={`rounded-lg ${isDarkMode ? "bg-slate-800" : "bg-slate-50"}`} />
          <kbd className={`px-3 py-2 rounded-lg text-center font-mono ${isDarkMode ? "bg-slate-700 border border-slate-600" : "bg-slate-100 border border-slate-200"}`}>→</kbd>
          <div />
          <kbd className={`px-3 py-2 rounded-lg text-center font-mono ${isDarkMode ? "bg-slate-700 border border-slate-600" : "bg-slate-100 border border-slate-200"}`}>↓</kbd>
          <div />
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
        {!visionOk && (
          <p className={`mt-3 text-sm ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
            Ensure your face is visible and at the correct distance.
          </p>
        )}
      </div>
    );
  }

  if (phase === "TESTING") {
    const progress = Math.min(roundNum / TOTAL_ROUNDS, 1);

    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full p-4 select-none">
        {isPaused && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-xl font-bold text-white">Test Paused</p>
              <p className="text-sm text-slate-300 mt-2">Return to the correct position to continue</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-4">
          <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className={`text-xs font-semibold tabular-nums ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Round {Math.min(roundNum + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              levelIndex >= 6
                ? isDarkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"
                : levelIndex >= 4
                ? isDarkMode ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"
                : isDarkMode ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
            }`}>
              {levelLabel} · L{levelIndex + 1}
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div
          className={`rounded-2xl overflow-hidden transition-all duration-75 ${
            feedback === "correct"
              ? "ring-4 ring-green-500"
              : feedback === "wrong"
              ? "ring-4 ring-red-500"
              : isDarkMode
              ? "ring-2 ring-slate-700"
              : "ring-2 ring-slate-200"
          }`}
          style={{ width: CANVAS_CSS, height: CANVAS_CSS, position: "relative" }}
        >
          <canvas ref={canvasRef} style={{ display: "block" }} />
          {feedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-5xl font-black ${
                feedback === "correct" ? "text-green-500" : "text-red-500"
              }`}
              style={{ background: "rgba(0,0,0,0.10)" }}
            >
              {feedback === "correct" ? "✓" : "✗"}
            </div>
          )}
          {/* Flash indicator when blank */}
          {!stimulusVisible && !feedback && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            </div>
          )}
        </div>

        <p className={`mt-5 text-base font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Press the arrow key matching the direction
        </p>
        <p className={`mt-1.5 text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          Respond fast — the arrow disappears!
        </p>
      </div>
    );
  }

  return null;
}
