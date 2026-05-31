import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { buildMetricsPayload, calcSessionStability, calcWeightedLandoltScore } from "../utils/metricsEngine";
import { acuityToScore } from "../utils/acuityUnits";
import {
  LANDOLT_ACUITY_TIERS,
  LANDOLT_START_TIER_INDEX,
  LANDOLT_TRIALS_PER_TIER,
  LANDOLT_PASS_MIN_CORRECT,
  LANDOLT_TEST_DISTANCE_CM,
  calculateLandoltAcuityResults,
} from "../utils/landoltAcuity";
import { getLandoltSizeFromDecimal, getBrowserZoomWarning } from "../utils/visionScaling";
import { LandoltCSvg } from "./LandoltCSvg";

const MAX_TIER = LANDOLT_ACUITY_TIERS.length - 1;
const FEEDBACK_MS = 450;

const CARDINAL_DIRECTIONS = [
  { key: "E", label: "Right", angle: 0, arrow: ArrowRight },
  { key: "S", label: "Down", angle: 90, arrow: ArrowDown },
  { key: "W", label: "Left", angle: 180, arrow: ArrowLeft },
  { key: "N", label: "Up", angle: 270, arrow: ArrowUp },
];

const KEY_TO_DIR = {
  ArrowRight: "E",
  ArrowDown: "S",
  ArrowLeft: "W",
  ArrowUp: "N",
};

function pickRandomDirection() {
  return CARDINAL_DIRECTIONS[Math.floor(Math.random() * CARDINAL_DIRECTIONS.length)];
}

/**
 * Landolt C resolving-power test @ 50 cm (ISO 8596 ring geometry).
 * 5 random orientations per tier; pass ≥ 4/5 → next tier; fail → stop and score last passed tier.
 */
export function LandoltCEngine({ ppi = 96, isDarkMode, visionOk, onTestComplete }) {
  const [phase, setPhase] = useState("INSTRUCTIONS");
  const [tierIndex, setTierIndex] = useState(LANDOLT_START_TIER_INDEX);
  const [trialInTier, setTrialInTier] = useState(0);
  const [gapDir, setGapDir] = useState(CARDINAL_DIRECTIONS[0].key);
  const [feedback, setFeedback] = useState(null);
  const [picked, setPicked] = useState(null);
  const [tierCorrect, setTierCorrect] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const roundsRef = useRef([]);
  const tierCorrectRef = useRef(0);
  const trialInTierRef = useRef(0);
  const roundStartRef = useRef(Date.now());
  const tierRef = useRef(LANDOLT_START_TIER_INDEX);
  const gapRef = useRef(CARDINAL_DIRECTIONS[0].key);
  const waitingRef = useRef(false);
  const phaseRef = useRef("INSTRUCTIONS");
  const pausedRef = useRef(false);
  const pauseCountRef = useRef(0);
  const wasPausedRef = useRef(false);

  tierRef.current = tierIndex;
  gapRef.current = gapDir;
  phaseRef.current = phase;
  pausedRef.current = isPaused;
  tierCorrectRef.current = tierCorrect;

  const tier = LANDOLT_ACUITY_TIERS[tierIndex];
  const decimal = tier.decimal;
  const ringPx = getLandoltSizeFromDecimal(decimal, ppi, LANDOLT_TEST_DISTANCE_CM);
  const canvasCSSSize = Math.max(
    260,
    getLandoltSizeFromDecimal(LANDOLT_ACUITY_TIERS[0].decimal, ppi, LANDOLT_TEST_DISTANCE_CM) + 48
  );

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  useEffect(() => {
    if (phase !== "TESTING") return;
    const nowPaused = !visionOk;
    if (nowPaused && !wasPausedRef.current) pauseCountRef.current += 1;
    wasPausedRef.current = nowPaused;
    setIsPaused(nowPaused);
  }, [visionOk, phase]);

  useEffect(() => {
    if (!isPaused && waitingRef.current) roundStartRef.current = Date.now();
  }, [isPaused]);

  const beginTrial = useCallback((ti, trialIdx) => {
    const dir = pickRandomDirection();
    setTierIndex(ti);
    setTrialInTier(trialIdx);
    trialInTierRef.current = trialIdx;
    setGapDir(dir.key);
    setPicked(null);
    setFeedback(null);
    waitingRef.current = true;
    roundStartRef.current = Date.now();
  }, []);

  const finish = useCallback(
    ({ failedTierIndex, completedAll = false }) => {
      const rounds = roundsRef.current;
      const metrics = buildMetricsPayload(rounds, MAX_TIER);
      const sessionStability = calcSessionStability(pauseCountRef.current);
      const report = calculateLandoltAcuityResults(failedTierIndex, { completedAll });

      const landoltScore = calcWeightedLandoltScore(
        rounds,
        metrics.consistencyScore,
        sessionStability,
        metrics.fatigueLevel,
        metrics.avgResponseTime,
        MAX_TIER
      );

      setPhase("COMPLETE");
      onTestComplete({
        landoltScore: Math.max(landoltScore, acuityToScore(String(report.decimalScore))),
        ...report,
        thresholdAcuity: report.snellen6,
        thresholdDecimal: report.decimalScore,
        thresholdSnellen20: report.snellen20,
        estimatedSphereD: report.estimatedDiopterD,
        ...metrics,
        sessionStability,
        pauseCount: pauseCountRef.current,
        protocol: "landolt_tier_5x4of5",
        testDistanceCm: LANDOLT_TEST_DISTANCE_CM,
      });
    },
    [onTestComplete]
  );

  const advanceAfterTier = useCallback(
    (passed, failedOrCurrentIndex) => {
      if (passed) {
        if (failedOrCurrentIndex >= MAX_TIER) {
          finish({ failedTierIndex: MAX_TIER + 1, completedAll: true });
          return;
        }
        setTierCorrect(0);
        tierCorrectRef.current = 0;
        beginTrial(failedOrCurrentIndex + 1, 0);
        return;
      }
      finish({ failedTierIndex: failedOrCurrentIndex });
    },
    [beginTrial, finish]
  );

  const processAnswer = useCallback(
    (answerKey) => {
      if (!waitingRef.current || phaseRef.current !== "TESTING" || pausedRef.current) return;
      waitingRef.current = false;

      const rt = Date.now() - (roundStartRef.current || Date.now());
      const correct = answerKey === gapRef.current;
      const ti = tierRef.current;
      const trialIdx = trialInTierRef.current;

      roundsRef.current.push({
        levelIndex: ti,
        tierDecimal: LANDOLT_ACUITY_TIERS[ti].decimal,
        correct,
        responseTime: rt,
        answer: answerKey,
        gap: gapRef.current,
      });

      setPicked(answerKey);
      setFeedback(correct ? "correct" : "wrong");

      const nextCorrect = tierCorrectRef.current + (correct ? 1 : 0);
      tierCorrectRef.current = nextCorrect;
      setTierCorrect(nextCorrect);

      const completedTrials = trialIdx + 1;

      setTimeout(() => {
        setFeedback(null);
        if (completedTrials >= LANDOLT_TRIALS_PER_TIER) {
          const passed = nextCorrect >= LANDOLT_PASS_MIN_CORRECT;
          advanceAfterTier(passed, ti);
        } else {
          beginTrial(ti, completedTrials);
        }
      }, FEEDBACK_MS);
    },
    [beginTrial, advanceAfterTier]
  );

  useEffect(() => {
    if (phase !== "TESTING") return;
    const onKey = (e) => {
      const dir = KEY_TO_DIR[e.key];
      if (!dir || feedback) return;
      e.preventDefault();
      processAnswer(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, feedback, processAnswer]);

  const handleStart = useCallback(() => {
    roundsRef.current = [];
    pauseCountRef.current = 0;
    wasPausedRef.current = false;
    setTierCorrect(0);
    tierCorrectRef.current = 0;
    setPhase("TESTING");
    beginTrial(LANDOLT_START_TIER_INDEX, 0);
  }, [beginTrial]);

  const gapAngle = CARDINAL_DIRECTIONS.find((d) => d.key === gapDir)?.angle ?? 0;

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
            isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-9 h-9 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <path d="M12 3a9 9 0 1 0 4 0.8" />
          </svg>
        </div>
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Landolt C Acuity Test
        </h2>
        <p className={`text-base mb-3 max-w-md ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Measures <strong>resolving power</strong> — how small a gap you can see — without letter guessing.
          Test distance: <strong>{LANDOLT_TEST_DISTANCE_CM} cm</strong>.
        </p>
        <ul
          className={`text-sm text-left mb-6 space-y-2 max-w-sm ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <li className="flex gap-2">
            <span className="text-cyan-400">◆</span>
            <span>
              Start at decimal <strong>0.29</strong> (20/70). <strong>5 trials</strong> per size; pass with{" "}
              <strong>≥ 4/5</strong> correct.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400">◆</span>
            <span>Pass → smaller ring. <strong>Fail → test stops</strong>; score = last tier you cleared.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-cyan-400">◆</span>
            <span>Arrow buttons or keyboard (↑ ↓ ← →).</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={handleStart}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg ${
            visionOk
              ? "bg-cyan-500 hover:bg-cyan-400 text-white"
              : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
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

        <div
          className={`text-sm font-bold mb-1 tabular-nums ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
        >
          Decimal {decimal} · {tier.snellen20} · {tier.snellen6}
          <span className="mx-2 opacity-40">·</span>
          Trial {trialInTier + 1}/{LANDOLT_TRIALS_PER_TIER}
          <span className="mx-2 opacity-40">·</span>
          {tierCorrect}/{LANDOLT_TRIALS_PER_TIER} correct (need {LANDOLT_PASS_MIN_CORRECT})
        </div>
        <p className={`text-xs mb-3 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          Which way is the gap facing?
        </p>

        <div
          className={`rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-100 ${
            feedback === "correct"
              ? "ring-4 ring-green-500"
              : feedback === "wrong"
                ? "ring-4 ring-red-500"
                : isDarkMode
                  ? "ring-1 ring-slate-700"
                  : "ring-1 ring-slate-200"
          }`}
          style={{
            width: canvasCSSSize,
            height: canvasCSSSize,
            position: "relative",
            background: "rgb(250,250,250)",
          }}
        >
          <div className="flex items-center justify-center w-full h-full">
            <LandoltCSvg size={ringPx} gapAngleDeg={gapAngle} grayVal={30} />
          </div>
          {feedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${
                feedback === "correct" ? "text-green-500" : "text-red-500"
              }`}
              style={{ background: "rgba(0,0,0,0.06)" }}
            >
              {feedback === "correct" ? "✓" : "✗"}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 max-w-xs w-full">
          {CARDINAL_DIRECTIONS.map((d) => {
            const Icon = d.arrow;
            const isHi = feedback && picked === d.key;
            return (
              <button
                key={d.key}
                type="button"
                disabled={!!feedback || isPaused}
                onClick={() => processAnswer(d.key)}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all ${
                  isHi
                    ? feedback === "correct"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                    : isDarkMode
                      ? "bg-slate-800 hover:bg-slate-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                } ${feedback || isPaused ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Icon className="w-6 h-6" />
                {d.label}
              </button>
            );
          })}
        </div>
        <p className={`text-[10px] mt-2 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          Or use keyboard arrow keys
        </p>
      </div>
    );
  }

  return null;
}
