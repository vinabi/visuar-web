import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { buildMetricsPayload, calcSessionStability, calcWeightedLandoltScore } from "../utils/metricsEngine";
import { acuityToDiopter } from "../utils/refractionMath";
import {
  LANDOLT_DENOM_LADDER,
  LANDOLT_START_INDEX,
  getLandoltSize,
  landoltDenomToAcuity,
  getBrowserZoomWarning,
} from "../utils/visionScaling";

const TOTAL_ROUNDS = 20;
const FEEDBACK_MS = 500;
const MAX_IDX = LANDOLT_DENOM_LADDER.length - 1;

/**
 * Eight gap orientations. `angle` is in screen-coordinate degrees:
 * 0 = right (East), 90 = down (South) — clockwise because canvas/SVG y grows down.
 */
const DIRECTIONS = [
  { key: "E",  label: "Right",       angle: 0 },
  { key: "SE", label: "Down-right",  angle: 45 },
  { key: "S",  label: "Down",        angle: 90 },
  { key: "SW", label: "Down-left",   angle: 135 },
  { key: "W",  label: "Left",        angle: 180 },
  { key: "NW", label: "Up-left",     angle: 225 },
  { key: "N",  label: "Up",          angle: 270 },
  { key: "NE", label: "Up-right",    angle: 315 },
];

const deg2rad = (d) => (d * Math.PI) / 180;

/** Draw a Landolt C (ring with a gap) on a HiDPI canvas. */
function drawLandoltC(canvas, gapAngleDeg, diameterPx, canvasCSSSize, grayVal) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expected = Math.round(canvasCSSSize * dpr);
  if (canvas.width !== expected || canvas.height !== expected) {
    canvas.width = expected;
    canvas.height = expected;
    canvas.style.width = `${canvasCSSSize}px`;
    canvas.style.height = `${canvasCSSSize}px`;
  }

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  ctx.fillStyle = "rgb(250,250,250)";
  ctx.fillRect(0, 0, W, W);

  const cx = W / 2;
  const cy = W / 2;
  const diameter = diameterPx * dpr;
  const stroke = diameter / 5;          // standard Landolt: stroke = gap = 1/5 of diameter
  const midR = diameter / 2 - stroke / 2;
  const halfGap = stroke / midR / 2;    // angular half-width of the gap (radians)
  const a = deg2rad(gapAngleDeg);

  ctx.strokeStyle = `rgb(${grayVal},${grayVal},${grayVal})`;
  ctx.lineWidth = stroke;
  ctx.beginPath();
  // Arc spanning the full circle except the gap centred on angle `a`.
  ctx.arc(cx, cy, midR, a + halfGap, a - halfGap + Math.PI * 2);
  ctx.stroke();
}

/** SVG donut-wedge path for the clickable answer ring. */
function wedgePath(cx, cy, rIn, rOut, a0, a1) {
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0o, y0o] = pt(rOut, a0);
  const [x1o, y1o] = pt(rOut, a1);
  const [x1i, y1i] = pt(rIn, a1);
  const [x0i, y0i] = pt(rIn, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} `
    + `L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

/**
 * Answer selector — a large, fixed-size 8-segment ring. The user clicks the wedge
 * pointing toward the gap they saw on the (variably sized) reference ring above.
 * This decouples motor precision from visual acuity: only the small top ring tests sight.
 */
function AnswerRing({ onPick, disabled, isDarkMode, highlight }) {
  const SIZE = 240;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const rOut = 112;
  const rIn = 56;
  const gapPad = deg2rad(3); // thin white separators between wedges
  const half = deg2rad(45) / 2;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="select-none">
      {DIRECTIONS.map((d) => {
        const a = deg2rad(d.angle);
        const path = wedgePath(cx, cy, rIn, rOut, a - half + gapPad, a + half - gapPad);
        const isHi = highlight === d.key;
        const base = isDarkMode ? "#1e293b" : "#0f172a";
        return (
          <path
            key={d.key}
            d={path}
            fill={isHi ? "#06b6d4" : base}
            stroke={isDarkMode ? "#334155" : "#ffffff"}
            strokeWidth={2}
            style={{ cursor: disabled ? "default" : "pointer", transition: "fill 0.12s" }}
            onClick={() => !disabled && onPick(d.key)}
          />
        );
      })}
      {/* center hub */}
      <circle cx={cx} cy={cy} r={rIn - 6} fill={isDarkMode ? "#0f172a" : "#f1f5f9"} />
      <text
        x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize="13" fontWeight="700"
        fill={isDarkMode ? "#64748b" : "#94a3b8"}
      >
        tap gap
      </text>
    </svg>
  );
}

/**
 * Landolt C (Tumbling Ring) acuity test with an adaptive 1-up/1-down staircase.
 *
 * Mechanics requested:
 *   correct answer → ring shrinks one acuity step (harder)
 *   wrong answer   → ring grows one acuity step (easier)
 * The staircase brackets the patient's true threshold; the threshold acuity is
 * estimated from the mean of the staircase reversals, then mapped to a Snellen
 * value and an approximate spherical diopter.
 *
 * Scoring (calcWeightedLandoltScore) rewards correct answers on SMALL rings far
 * more than on large ones, and penalises misses on LARGE rings far more than on
 * small ones — so a lucky/skilled small-ring hit is worth more, and an easy
 * large-ring miss costs more.
 */
export function LandoltCEngine({ ppi = 96, isDarkMode, visionOk, onTestComplete }) {
  const [phase, setPhase] = useState("INSTRUCTIONS");
  const [levelIndex, setLevelIndex] = useState(LANDOLT_START_INDEX);
  const [gapDir, setGapDir] = useState(DIRECTIONS[0].key);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [picked, setPicked] = useState(null);
  const [roundNum, setRoundNum] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const canvasRef = useRef(null);
  const roundsRef = useRef([]);
  const reversalsRef = useRef([]);   // ladder indices at each staircase reversal
  const moveDirRef = useRef(null);   // "down" (after correct) | "up" (after wrong)
  const roundStartRef = useRef(Date.now());
  const levelRef = useRef(LANDOLT_START_INDEX);
  const gapRef = useRef(DIRECTIONS[0].key);
  const waitingRef = useRef(false);
  const phaseRef = useRef("INSTRUCTIONS");
  const pausedRef = useRef(false);
  const pauseCountRef = useRef(0);
  const wasPausedRef = useRef(false);

  levelRef.current = levelIndex;
  gapRef.current = gapDir;
  phaseRef.current = phase;
  pausedRef.current = isPaused;

  const denom = LANDOLT_DENOM_LADDER[levelIndex];
  const ringPx = getLandoltSize(denom, ppi);
  // Canvas large enough for the biggest rung at this PPI, plus margin.
  const canvasCSSSize = Math.max(260, getLandoltSize(LANDOLT_DENOM_LADDER[0], ppi) + 48);

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  // Pause handling — mirror OrientationEngine: count interruptions when vision drops.
  useEffect(() => {
    if (phase !== "TESTING") return;
    const nowPaused = !visionOk;
    if (nowPaused && !wasPausedRef.current) pauseCountRef.current += 1;
    wasPausedRef.current = nowPaused;
    setIsPaused(nowPaused);
  }, [visionOk, phase]);

  // Reset the response timer when resuming from a pause.
  useEffect(() => {
    if (!isPaused && waitingRef.current) roundStartRef.current = Date.now();
  }, [isPaused]);

  // Redraw the ring whenever level / gap / phase changes.
  useEffect(() => {
    if (phase === "TESTING" && canvasRef.current) {
      const dir = DIRECTIONS.find((d) => d.key === gapDir) || DIRECTIONS[0];
      drawLandoltC(canvasRef.current, dir.angle, ringPx, canvasCSSSize, 30);
    }
  }, [gapDir, levelIndex, phase, ringPx, canvasCSSSize]);

  const startRound = useCallback((li) => {
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    setLevelIndex(li);
    setGapDir(dir.key);
    setPicked(null);
    waitingRef.current = true;
    roundStartRef.current = Date.now();
  }, []);

  const finish = useCallback(() => {
    const rounds = roundsRef.current;
    const metrics = buildMetricsPayload(rounds, MAX_IDX);
    const sessionStability = calcSessionStability(pauseCountRef.current);

    // ── Threshold estimate from staircase reversals ──
    const reversals = reversalsRef.current;
    let thresholdLevel;
    if (reversals.length >= 4) {
      const used = reversals.slice(2);             // drop the first two (still homing in)
      thresholdLevel = used.reduce((a, b) => a + b, 0) / used.length;
    } else if (metrics.precisionLevel != null) {
      thresholdLevel = metrics.precisionLevel;     // fallback: finest correct rung
    } else {
      thresholdLevel = LANDOLT_START_INDEX;
    }

    // Interpolate the (fractional) ladder index into a Snellen denominator.
    const lo = Math.max(0, Math.floor(thresholdLevel));
    const hi = Math.min(MAX_IDX, Math.ceil(thresholdLevel));
    const frac = thresholdLevel - lo;
    const thresholdDenom =
      LANDOLT_DENOM_LADDER[lo] + (LANDOLT_DENOM_LADDER[hi] - LANDOLT_DENOM_LADDER[lo]) * frac;

    const thresholdAcuity = landoltDenomToAcuity(thresholdDenom);
    const estimatedSphereD = acuityToDiopter(`6/${Math.round(thresholdDenom)}`);

    const landoltScore = calcWeightedLandoltScore(
      rounds, metrics.consistencyScore, sessionStability,
      metrics.fatigueLevel, metrics.avgResponseTime, MAX_IDX,
    );

    setPhase("COMPLETE");
    onTestComplete({
      landoltScore,
      thresholdAcuity,
      thresholdDenom: Math.round(thresholdDenom * 10) / 10,
      estimatedSphereD,
      reversals: reversals.length,
      ...metrics,
      sessionStability,
      pauseCount: pauseCountRef.current,
    });
  }, [onTestComplete]);

  const processAnswer = useCallback(
    (answerKey) => {
      if (!waitingRef.current || phaseRef.current !== "TESTING" || pausedRef.current) return;
      waitingRef.current = false;

      const rt = Date.now() - (roundStartRef.current || Date.now());
      const correct = answerKey === gapRef.current;
      const curLevel = levelRef.current;

      roundsRef.current.push({ levelIndex: curLevel, correct, responseTime: rt, answer: answerKey, gap: gapRef.current });
      setPicked(answerKey);
      setFeedback(correct ? "correct" : "wrong");
      const completed = roundsRef.current.length;
      setRoundNum(completed);

      // Staircase move: correct → down (smaller), wrong → up (larger).
      const move = correct ? "down" : "up";
      if (moveDirRef.current && move !== moveDirRef.current) {
        reversalsRef.current.push(curLevel); // direction flipped → reversal
      }
      moveDirRef.current = move;

      const nextLevel = correct
        ? Math.min(curLevel + 1, MAX_IDX)
        : Math.max(curLevel - 1, 0);

      setTimeout(() => {
        setFeedback(null);
        if (completed >= TOTAL_ROUNDS) {
          finish();
        } else {
          startRound(nextLevel);
        }
      }, FEEDBACK_MS);
    },
    [startRound, finish]
  );

  const handleStart = useCallback(() => {
    roundsRef.current = [];
    reversalsRef.current = [];
    moveDirRef.current = null;
    pauseCountRef.current = 0;
    wasPausedRef.current = false;
    setRoundNum(0);
    setPhase("TESTING");
    startRound(LANDOLT_START_INDEX);
  }, [startRound]);

  // ─── Instructions ───────────────────────────────────────
  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
          <svg viewBox="0 0 24 24" className={`w-9 h-9 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 3a9 9 0 1 0 4 0.8" />
          </svg>
        </div>
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Landolt C Acuity Test
        </h2>
        <p className={`text-base mb-3 max-w-md ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          A broken ring (like a <strong>C</strong>) appears with its gap facing one of eight
          directions. Find the gap, then tap the matching wedge on the answer dial below.
        </p>
        <ul className={`text-sm text-left mb-6 space-y-2 max-w-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          <li className="flex gap-2"><span className="text-cyan-400">◆</span><span><strong>Correct → the ring shrinks.</strong> Keep going as small as you can read.</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">◆</span><span><strong>Wrong → the ring grows back.</strong> It self-adjusts to your exact limit.</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">◆</span><span>Getting a <strong>tiny</strong> ring right scores big; missing a <strong>large</strong> one costs the most.</span></li>
          <li className="flex gap-2"><span className="text-cyan-400">◆</span><span>{TOTAL_ROUNDS} rounds. Cover the eye not being tested.</span></li>
        </ul>
        <button
          onClick={handleStart}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg ${
            visionOk ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
          }`}
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

  // ─── Testing ────────────────────────────────────────────
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

        {zoomWarning && (
          <div className="mb-2 px-4 py-2 rounded-xl text-xs font-semibold text-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
            ⚠️ {zoomWarning}
          </div>
        )}

        <div className={`text-sm font-bold mb-1 tabular-nums ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Round {Math.min(roundNum + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
          <span className="mx-2 opacity-40">·</span>
          <span className="font-mono">{landoltDenomToAcuity(denom)}</span>
        </div>
        <p className={`text-xs mb-3 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          Which way is the gap facing?
        </p>

        {/* Reference ring (the actual acuity stimulus) */}
        <div
          className={`rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-100 ${
            feedback === "correct" ? "ring-4 ring-green-500"
            : feedback === "wrong" ? "ring-4 ring-red-500"
            : isDarkMode ? "ring-1 ring-slate-700" : "ring-1 ring-slate-200"
          }`}
          style={{ width: canvasCSSSize, height: canvasCSSSize, position: "relative", background: "rgb(250,250,250)" }}
        >
          <canvas ref={canvasRef} style={{ display: "block" }} />
          {feedback && (
            <div className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}
              style={{ background: "rgba(0,0,0,0.06)" }}>
              {feedback === "correct" ? "✓" : "✗"}
            </div>
          )}
        </div>

        {/* Answer dial */}
        <div className="mt-4">
          <AnswerRing
            onPick={processAnswer}
            disabled={!!feedback || isPaused}
            isDarkMode={isDarkMode}
            highlight={feedback ? picked : null}
          />
        </div>
      </div>
    );
  }

  return null;
}
