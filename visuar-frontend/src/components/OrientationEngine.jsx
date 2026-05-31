import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import {
  buildMetricsPayload,
  calcSessionStability,
} from "../utils/metricsEngine";
import { speakInstruction } from "../utils/speech";
import { TUMBLING_E_SIZES_MM, getBrowserZoomWarning } from "../utils/visionScaling";

// Fixed pixel size per orientation level (level 0 = easiest/biggest, level 7 = hardest).
// Proportional to physical mm sizes; does not require PPI calibration.
const ORIENTATION_E_PX = [160, 120, 96, 76, 60, 48, 32, 24];
// Canvas is fixed at the largest level's size * 1.7 for comfortable margin
const CANVAS_CSS_SIZE = Math.max(300, Math.round(160 * 1.75));

/**
 * Difficulty levels for the orientation-discrimination test.
 *
 * sizeMm is now stored in visionScaling.TUMBLING_E_SIZES_MM and converted to
 * CSS pixels at render time via getTumblingESize(levelIndex, ppi).
 * This replaces the old arbitrary sizePx values with physically calibrated sizes.
 *
 *   Level 0 = 40 mm (easiest)  …  Level 7 = 6 mm (hardest)
 *
 * grayVal:     E color on the light-gray (245,245,245) background.
 *              Lower = darker = higher contrast. Combined with small size at hard levels.
 * displayMs:   How long the stimulus is shown before it disappears.
 * strokeRatio: Stroke thickness as a fraction of the E bounding-box side.
 */
const ORIENTATION_LEVELS = [
  { grayVal: 60,  displayMs: Infinity, strokeRatio: 0.22 },  // 40 mm
  { grayVal: 75,  displayMs: Infinity, strokeRatio: 0.20 },  // 30 mm
  { grayVal: 90,  displayMs: 4000,     strokeRatio: 0.18 },  // 24 mm
  { grayVal: 110, displayMs: 3500,     strokeRatio: 0.17 },  // 19 mm
  { grayVal: 128, displayMs: 3000,     strokeRatio: 0.16 },  // 15 mm
  { grayVal: 148, displayMs: 2500,     strokeRatio: 0.15 },  // 12 mm
  { grayVal: 168, displayMs: 2000,     strokeRatio: 0.14 },  //  8 mm
  { grayVal: 188, displayMs: 1500,     strokeRatio: 0.13 },  //  6 mm
];

const DIRECTIONS = ["UP", "DOWN", "LEFT", "RIGHT"];
const TOTAL_ROUNDS = 30;
const STARTING_LEVEL_INDEX = 2;
const FEEDBACK_MS = 700;

const KEY_TO_DIR = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
};

/**
 * Draw the tumbling-E on the canvas using exact physical proportions.
 *
 * The canvas buffer was scaled to devicePixelRatio in the setup useEffect.
 * ctx.setTransform(dpr,0,0,dpr,0,0) maps all CSS-pixel coordinates to device pixels,
 * ensuring sharp HiDPI rendering without CSS transforms.
 *
 * Supported rotations: 0° (RIGHT), 90° (DOWN), 180° (LEFT), 270° (UP).
 *
 * @param {HTMLCanvasElement} canvas
 * @param {"UP"|"DOWN"|"LEFT"|"RIGHT"} direction
 * @param {number} levelIndex     - Index into ORIENTATION_LEVELS
 * @param {boolean} showStimulus  - Whether to draw the E (false = blank screen)
 * @param {number} eSizePx        - E bounding-box side in CSS pixels (calibrated)
 * @param {number} strokeRatio    - Stroke thickness relative to eSizePx
 * @param {number} canvasCSSSize  - Canvas display size in CSS pixels
 */
function drawTumblingE(canvas, direction, levelIndex, showStimulus, eSizePx, strokeRatio, canvasCSSSize) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;

  // Always ensure buffer is correctly sized — fixes timing issue where the
  // canvas mounts after the setup effect already ran.
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

  ctx.fillStyle = "rgb(245,245,245)";
  ctx.fillRect(0, 0, W, H);

  if (!showStimulus) return;

  const cfg = ORIENTATION_LEVELS[levelIndex];
  // Scale E dimensions to device pixels
  const size = eSizePx * dpr;
  const sw   = size * strokeRatio;
  const half = size / 2;

  ctx.fillStyle = `rgb(${cfg.grayVal},${cfg.grayVal},${cfg.grayVal})`;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(({ RIGHT: 0, DOWN: 90, LEFT: 180, UP: 270 }[direction] * Math.PI) / 180);

  ctx.fillRect(-half, -half, size, sw);           // top bar
  ctx.fillRect(-half, -half, sw,   size);          // vertical spine
  ctx.fillRect(-half, -sw / 2, size * 0.75, sw);  // middle bar
  ctx.fillRect(-half, half - sw,  size, sw);       // bottom bar

  ctx.restore();
}

export function OrientationEngine({ ppi = 96, isDarkMode, visionOk, onTestComplete, lang = "en" }) {
  const [phase, setPhase] = useState("INSTRUCTIONS");
  const [direction, setDirection] = useState("RIGHT");
  const [levelIndex, setLevelIndex] = useState(STARTING_LEVEL_INDEX);
  const [feedback, setFeedback] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [roundNum, setRoundNum] = useState(0);
  const [showStimulus, setShowStimulus] = useState(true);

  const canvasRef = useRef(null);
  const roundsRef = useRef([]);
  const roundStartRef = useRef(null);
  const dirRef = useRef("RIGHT");
  const levelRef = useRef(STARTING_LEVEL_INDEX);
  const waitingRef = useRef(false);
  const phaseRef = useRef("INSTRUCTIONS");
  const isPausedRef = useRef(false);
  const consecutiveWrongRef = useRef(0);
  const stimulusTimerRef = useRef(null);

  const pauseCountRef = useRef(0);
  const wasPausedRef = useRef(false);

  dirRef.current = direction;
  levelRef.current = levelIndex;
  phaseRef.current = phase;
  isPausedRef.current = isPaused;

  const eSizePx = ORIENTATION_E_PX[Math.min(levelIndex, ORIENTATION_E_PX.length - 1)];
  const canvasCSSSize = CANVAS_CSS_SIZE;

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
      const cfg = ORIENTATION_LEVELS[levelIndex];
      drawTumblingE(
        canvasRef.current, direction, levelIndex, showStimulus,
        eSizePx, cfg.strokeRatio, canvasCSSSize
      );
    }
  }, [direction, levelIndex, showStimulus, phase, eSizePx, canvasCSSSize]);

  useEffect(() => {
    if (phase !== "TESTING") return;
    speakInstruction("contrast_start", lang);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRound = useCallback((li) => {
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    setDirection(dir);
    setLevelIndex(li);
    setShowStimulus(true);
    waitingRef.current = true;
    roundStartRef.current = Date.now();

    if (stimulusTimerRef.current) clearTimeout(stimulusTimerRef.current);
    const displayMs = ORIENTATION_LEVELS[li].displayMs;
    if (displayMs !== Infinity) {
      stimulusTimerRef.current = setTimeout(() => setShowStimulus(false), displayMs);
    }
  }, []);

  const processResponse = useCallback(
    (response) => {
      if (stimulusTimerRef.current) clearTimeout(stimulusTimerRef.current);
      if (!waitingRef.current || phaseRef.current !== "TESTING" || isPausedRef.current) return;
      waitingRef.current = false;

      const responseTime = Date.now() - (roundStartRef.current || Date.now());
      const isCorrect = response === dirRef.current;

      roundsRef.current.push({
        levelIndex: levelRef.current,
        response,
        correct: isCorrect,
        responseTime,
      });

      setFeedback(isCorrect ? "correct" : "wrong");
      const completedRounds = roundsRef.current.length;
      setRoundNum(completedRounds);

      if (isCorrect) {
        consecutiveWrongRef.current = 0;
      } else {
        consecutiveWrongRef.current += 1;
      }

      let newLevel = levelRef.current;
      if (isCorrect) {
        newLevel = Math.min(newLevel + 1, ORIENTATION_LEVELS.length - 1);
      } else if (consecutiveWrongRef.current >= 2) {
        newLevel = Math.max(newLevel - 1, 0);
        consecutiveWrongRef.current = 0;
      }

      setTimeout(() => {
        setFeedback(null);
        if (completedRounds >= TOTAL_ROUNDS) {
          const rounds = roundsRef.current;
          const metrics = buildMetricsPayload(rounds, ORIENTATION_LEVELS.length - 1);

          // Report threshold in physical mm (replaces old sizePx — more meaningful unit)
          const thresholdLevelMm = TUMBLING_E_SIZES_MM[metrics.precisionLevel];
          const orientationScore = Math.round(
            (metrics.precisionLevel / (ORIENTATION_LEVELS.length - 1)) * 100
          );
          const sessionStability = calcSessionStability(pauseCountRef.current);

          setPhase("COMPLETE");
          onTestComplete({
            orientationScore,
            thresholdLevel: thresholdLevelMm,
            ...metrics,
            sessionStability,
            pauseCount: pauseCountRef.current,
          });
        } else {
          startRound(newLevel);
        }
      }, FEEDBACK_MS);
    },
    [startRound, onTestComplete]
  );

  useEffect(() => {
    const onKey = (e) => {
      const dir = KEY_TO_DIR[e.key];
      if (dir) {
        e.preventDefault();
        processResponse(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [processResponse]);

  const handleStart = useCallback(() => {
    roundsRef.current = [];
    consecutiveWrongRef.current = 0;
    pauseCountRef.current = 0;
    wasPausedRef.current = false;
    setRoundNum(0);
    setPhase("TESTING");
    startRound(STARTING_LEVEL_INDEX);
  }, [startRound]);

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
          <svg viewBox="0 0 24 24" className={`w-8 h-8 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <path d="M7 12h10M12 7v10" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Orientation Discrimination Test
        </h2>
        <p className={`text-lg mb-2 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          You will see the letter <strong>E</strong> at different sizes and contrasts.
          Identify the direction the opening is facing.
        </p>
        <p className={`text-base mb-6 max-w-lg ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          The E becomes progressively smaller and harder to see.
          Use <strong>arrow keys</strong> to respond.
        </p>

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
          className={`px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg ${visionOk ? isDarkMode ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-cyan-500 hover:bg-cyan-600 text-white" : "bg-slate-500/40 text-slate-400 cursor-not-allowed"}`}
        >
          {visionOk ? "Start Test" : "Waiting for camera…"}
        </button>
        {!visionOk && (
          <p className={`mt-3 text-sm ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
            Make sure your face is visible and at the correct distance.
          </p>
        )}
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
              <p className="text-sm text-slate-300 mt-2">Return to the correct position to continue</p>
            </div>
          </div>
        )}

        {/* Browser zoom warning */}
        {zoomWarning && (
          <div className="mb-3 px-4 py-2 rounded-xl text-xs font-semibold text-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
            ⚠️ {zoomWarning}
          </div>
        )}

        <div className={`text-sm font-bold mb-4 tabular-nums ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Round {Math.min(roundNum + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
        </div>

        {/* Canvas container — sized to match the calibrated canvas */}
        <div
          className={`rounded-2xl overflow-hidden transition-all duration-100 ${
            feedback === "correct" ? "ring-4 ring-green-500"
            : feedback === "wrong" ? "ring-4 ring-red-500"
            : isDarkMode ? "ring-2 ring-slate-700" : "ring-2 ring-slate-200"
          }`}
          style={{ width: canvasCSSSize, height: canvasCSSSize, position: "relative" }}
        >
          {/* width/height attributes set via useEffect for HiDPI; style controls CSS display size */}
          <canvas ref={canvasRef} style={{ display: "block" }} />
          {feedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-5xl font-black ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}
              style={{ background: "rgba(0,0,0,0.12)" }}
            >
              {feedback === "correct" ? "✓" : "✗"}
            </div>
          )}
        </div>

        <p className={`mt-5 text-base font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Which direction is the E opening?
        </p>
        <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-600" : "text-slate-300"}`}>
          ← Left &nbsp;·&nbsp; Right → &nbsp;·&nbsp; ↑ Up &nbsp;·&nbsp; ↓ Down
        </p>
      </div>
    );
  }

  return null;
}
