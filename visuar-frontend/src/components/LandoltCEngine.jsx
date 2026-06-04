import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowDownUp } from "lucide-react";
import { buildMetricsPayload, calcSessionStability, calcWeightedLandoltScore } from "../utils/metricsEngine";
import { acuityToScore } from "../utils/acuityUnits";
import {
  LANDOLT_ACUITY_TIERS,
  LANDOLT_START_TIER_INDEX,
  LANDOLT_TRIALS_PER_TIER,
  LANDOLT_PASS_MIN_CORRECT,
  calculateLandoltAcuityResults,
} from "../utils/landoltAcuity";
import { getLandoltSizeFromDecimal, getBrowserZoomWarning } from "../utils/visionScaling";
import {
  FOCUS_MODES,
  FOCUS_NEAR_CM,
  FOCUS_FAR_CM,
  getFocusConfig,
  getOppositeFocusMode,
  evaluateLandoltPixelSafeguard,
} from "../utils/nearFarFocus";
import { useFocusDistanceHold } from "../hooks/useFocusDistanceHold";
import { FocusDistanceGate } from "./FocusDistanceGate";
import { LandoltCSvg } from "./LandoltCSvg";
import { EyeRestReminder } from "./EyeRestReminder";

const MAX_TIER = LANDOLT_ACUITY_TIERS.length - 1;
const FEEDBACK_MS = 450;
const FROZEN_MS = 400;

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
 * Landolt C @ variable focus distance (50 cm near / 100 cm far).
 * Doubling distance doubles on-screen ring size (constant visual angle).
 */
export function LandoltCEngine({
  ppi = 96,
  isDarkMode,
  visionOk,
  visionResult = null,
  onTestComplete,
  enableFocusSwitch = true,
}) {
  const [phase, setPhase] = useState("INSTRUCTIONS");
  const [focusMode, setFocusMode] = useState(FOCUS_MODES.NEAR);
  const [switchPhase, setSwitchPhase] = useState(null);
  const [tierIndex, setTierIndex] = useState(LANDOLT_START_TIER_INDEX);
  const [trialInTier, setTrialInTier] = useState(0);
  const [gapDir, setGapDir] = useState(CARDINAL_DIRECTIONS[0].key);
  const [feedback, setFeedback] = useState(null);
  const [picked, setPicked] = useState(null);
  const [tierCorrect, setTierCorrect] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [resolutionNote, setResolutionNote] = useState(null);

  const pendingFocusRef = useRef(null);
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
  const focusModeRef = useRef(FOCUS_MODES.NEAR);

  tierRef.current = tierIndex;
  gapRef.current = gapDir;
  phaseRef.current = phase;
  pausedRef.current = isPaused || switchPhase != null;
  tierCorrectRef.current = tierCorrect;
  focusModeRef.current = focusMode;

  const focusCfg = getFocusConfig(focusMode);
  const focusDistanceCm = focusCfg.targetCm;

  const tier = LANDOLT_ACUITY_TIERS[tierIndex];
  const decimal = tier.decimal;
  const safeguard = evaluateLandoltPixelSafeguard(decimal, ppi, focusDistanceCm);
  const ringPx = safeguard.ringPx;
  const canvasCSSSize = Math.max(
    260,
    getLandoltSizeFromDecimal(LANDOLT_ACUITY_TIERS[0].decimal, ppi, focusDistanceCm) + 48
  );

  const { holdProgress, gateOpen, distanceOk: gateDistanceOk } = useFocusDistanceHold(
    visionResult,
    pendingFocusRef.current || focusMode,
    switchPhase === "gate"
  );

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  useEffect(() => {
    if (phase !== "TESTING" || switchPhase) return;
    const nowPaused = !visionOk;
    if (nowPaused && !wasPausedRef.current) pauseCountRef.current += 1;
    wasPausedRef.current = nowPaused;
    setIsPaused(nowPaused);
  }, [visionOk, phase, switchPhase]);

  useEffect(() => {
    if (!isPaused && waitingRef.current && !switchPhase) {
      roundStartRef.current = Date.now();
    }
  }, [isPaused, switchPhase]);

  useEffect(() => {
    if (switchPhase !== "gate" || !gateOpen || !pendingFocusRef.current) return;
    const next = pendingFocusRef.current;
    pendingFocusRef.current = null;
    setFocusMode(next);
    focusModeRef.current = next;
    setTierIndex(LANDOLT_START_TIER_INDEX);
    setTierCorrect(0);
    tierCorrectRef.current = 0;
    setSwitchPhase(null);
    beginTrialRef.current(LANDOLT_START_TIER_INDEX, 0);
  }, [switchPhase, gateOpen]);

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

  const beginTrialRef = useRef(beginTrial);
  beginTrialRef.current = beginTrial;

  const finish = useCallback(
    ({ failedTierIndex, completedAll = false, resolutionLimited = false }) => {
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
        protocol: "landolt_tier_5x4of5_focus",
        focusMode: focusModeRef.current,
        testDistanceCm: focusDistanceCm,
        resolutionLimited,
        resolutionNote: resolutionLimited ? resolutionNote : null,
        nearFarSwitches: rounds.filter((r) => r.focusSwitch).length,
      });
    },
    [onTestComplete, focusDistanceCm, resolutionNote]
  );

  const finishResolutionLimited = useCallback(
    (lastPassedTierIndex, message) => {
      setResolutionNote(message);
      finish({
        failedTierIndex: Math.min(lastPassedTierIndex + 1, MAX_TIER + 1),
        resolutionLimited: true,
      });
    },
    [finish]
  );

  const tierPassesSafeguard = useCallback(
    (ti) => {
      const sg = evaluateLandoltPixelSafeguard(
        LANDOLT_ACUITY_TIERS[ti].decimal,
        ppi,
        focusModeRef.current === FOCUS_MODES.FAR ? FOCUS_FAR_CM : FOCUS_NEAR_CM
      );
      return sg;
    },
    [ppi]
  );

  const advanceAfterTier = useCallback(
    (passed, currentIndex) => {
      if (passed) {
        if (currentIndex >= MAX_TIER) {
          finish({ failedTierIndex: MAX_TIER + 1, completedAll: true });
          return;
        }
        const nextIndex = currentIndex + 1;
        const sg = tierPassesSafeguard(nextIndex);
        if (!sg.display) {
          finishResolutionLimited(currentIndex, sg.message);
          return;
        }
        setTierCorrect(0);
        tierCorrectRef.current = 0;
        beginTrial(nextIndex, 0);
        return;
      }
      finish({ failedTierIndex: currentIndex });
    },
    [beginTrial, finish, finishResolutionLimited, tierPassesSafeguard]
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
        focusMode: focusModeRef.current,
        focusDistanceCm:
          focusModeRef.current === FOCUS_MODES.FAR ? FOCUS_FAR_CM : FOCUS_NEAR_CM,
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

  const requestFocusSwitch = useCallback(() => {
    if (!enableFocusSwitch || switchPhase) return;
    const next = getOppositeFocusMode(focusModeRef.current);
    pendingFocusRef.current = next;
    waitingRef.current = false;
    setFeedback(null);
    setSwitchPhase("frozen");
    setTimeout(() => {
      setSwitchPhase("gate");
    }, FROZEN_MS);
  }, [enableFocusSwitch, switchPhase]);

  useEffect(() => {
    if (phase !== "TESTING" || switchPhase) return;
    const onKey = (e) => {
      const dir = KEY_TO_DIR[e.key];
      if (!dir || feedback) return;
      e.preventDefault();
      processAnswer(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, feedback, processAnswer, switchPhase]);

  const handleStart = useCallback(() => {
    roundsRef.current = [];
    pauseCountRef.current = 0;
    wasPausedRef.current = false;
    setResolutionNote(null);
    setFocusMode(FOCUS_MODES.NEAR);
    focusModeRef.current = FOCUS_MODES.NEAR;
    setTierCorrect(0);
    tierCorrectRef.current = 0;
    setPhase("TESTING");
    const sg = tierPassesSafeguard(LANDOLT_START_TIER_INDEX);
    if (!sg.display) {
      finishResolutionLimited(-1, sg.message);
      return;
    }
    beginTrial(LANDOLT_START_TIER_INDEX, 0);
  }, [beginTrial, tierPassesSafeguard, finishResolutionLimited]);

  const gapAngle = CARDINAL_DIRECTIONS.find((d) => d.key === gapDir)?.angle ?? 0;
  const oppositeLabel = getFocusConfig(getOppositeFocusMode(focusMode)).label;

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <EyeRestReminder isDarkMode={isDarkMode} className="max-w-lg" />
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Landolt C Acuity Test
        </h2>
        <p className={`text-base mb-3 max-w-md ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Resolving power at <strong>{FOCUS_NEAR_CM} cm</strong> (near). You can switch to{" "}
          <strong>{FOCUS_FAR_CM} cm</strong> (far) — rings scale up automatically (same visual angle).
        </p>
        <ul
          className={`text-sm text-left mb-6 space-y-2 max-w-sm ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <li>5 trials per tier · pass with ≥ 4/5 · fail stops the test.</li>
          <li>Switching focus freezes the chart, then webcam checks your new distance (2 s hold).</li>
          <li>Tiers restart from the beginning after each switch.</li>
        </ul>
        <button
          type="button"
          onClick={handleStart}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold ${
            visionOk ? "bg-cyan-500 text-white" : "bg-slate-500/40 text-slate-400"
          }`}
        >
          {visionOk ? "Start at near (50 cm)" : "Waiting for camera…"}
        </button>
      </div>
    );
  }

  if (phase === "TESTING") {
    const testingBlocked = switchPhase != null;

    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full p-4 select-none">
        {switchPhase === "frozen" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-3xl">
            <p className="text-lg font-bold text-white px-6 text-center">
              Switching to {getFocusConfig(pendingFocusRef.current || focusMode).label}…
              <br />
              <span className="text-sm font-normal text-slate-300">Chart frozen — do not read the ring</span>
            </p>
          </div>
        )}

        {switchPhase === "gate" && (
          <FocusDistanceGate
            focusMode={pendingFocusRef.current || focusMode}
            visionResult={visionResult}
            holdProgress={holdProgress}
            distanceOk={gateDistanceOk}
            isDarkMode={isDarkMode}
            title="Step 3: Webcam distance check"
          />
        )}

        {isPaused && !testingBlocked && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-xl font-bold text-white">Test Paused</p>
            </div>
          </div>
        )}

        {enableFocusSwitch && !testingBlocked && (
          <button
            type="button"
            onClick={requestFocusSwitch}
            className={`mb-3 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
              isDarkMode
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30"
                : "bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100"
            }`}
          >
            <ArrowDownUp className="w-4 h-4" />
            Switch to {oppositeLabel}
          </button>
        )}

        <div
          className={`text-sm font-bold mb-1 tabular-nums ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
        >
          {focusCfg.label} ({focusDistanceCm} cm) · decimal {decimal}
          <span className="mx-2 opacity-40">·</span>
          Trial {trialInTier + 1}/{LANDOLT_TRIALS_PER_TIER}
        </div>

        {!safeguard.display && !testingBlocked && (
          <p className="text-xs text-amber-500 mb-2 px-4 text-center">{safeguard.message}</p>
        )}

        <div
          className={`rounded-2xl overflow-hidden flex items-center justify-center ${
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
            background: "rgb(250,250,250)",
            opacity: testingBlocked ? 0.3 : 1,
            pointerEvents: testingBlocked ? "none" : "auto",
          }}
        >
          <LandoltCSvg size={ringPx} gapAngleDeg={gapAngle} grayVal={30} />
        </div>

        <div
          className={`mt-5 grid grid-cols-2 gap-3 max-w-xs w-full ${
            testingBlocked ? "opacity-30 pointer-events-none" : ""
          }`}
        >
          {CARDINAL_DIRECTIONS.map((d) => {
            const Icon = d.arrow;
            return (
              <button
                key={d.key}
                type="button"
                disabled={!!feedback || isPaused || testingBlocked}
                onClick={() => processAnswer(d.key)}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm ${
                  isDarkMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                <Icon className="w-6 h-6" />
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
