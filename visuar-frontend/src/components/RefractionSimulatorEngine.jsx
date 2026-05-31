import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { getBrowserZoomWarning, getRefractionDisplaySize } from "../utils/visionScaling";
import { formatAcuityLabel } from "../utils/acuityUnits";
import { diopterToBlurSigma, roundDiopter } from "../utils/refractionMath";
import { calcConsistencyScore } from "../utils/metricsEngine";
import {
  getRefractionRounds,
  getRefractionRoundLetters,
} from "../utils/testStimuli";

const MAX_COMPARISONS = 22;
const TOLERANCE = 0.25;

function drawBlurredLetters(
  canvas,
  diopter,
  isDarkMode,
  letterPx,
  canvasSize,
  letters,
  blurMultiplier = 1
) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expected = Math.round(canvasSize * dpr);
  if (canvas.width !== expected) {
    canvas.width = expected;
    canvas.height = expected;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  const sigma = diopterToBlurSigma(diopter, letterPx) * blurMultiplier;
  ctx.filter = sigma > 0.3 ? `blur(${sigma}px)` : "none";
  ctx.fillStyle = isDarkMode ? "rgb(248,248,248)" : "rgb(15,15,15)";
  ctx.font = `900 ${letterPx}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const gap = letterPx * 0.35;
  const totalW = (letters.length - 1) * gap;
  const startX = canvasSize / 2 - totalW / 2;
  letters.forEach((ch, i) => {
    ctx.fillText(ch, startX + i * gap, canvasSize / 2);
  });
  ctx.filter = "none";
}

/**
 * Interactive "which is clearer?" binary search on simulated defocus.
 */
export function RefractionSimulatorEngine({
  ppi = 96,
  initialDiopter = -1.5,
  searchRange = 1.0,
  isDarkMode,
  visionOk,
  onComplete,
  showInstructions = true,
  quickMode = false,
}) {
  const refractionRounds = getRefractionRounds(quickMode);
  const scriptedRoundCount = refractionRounds.length;

  const [phase, setPhase] = useState(showInstructions ? "INSTRUCTIONS" : "TESTING");
  const [low, setLow] = useState(roundDiopter(initialDiopter - searchRange));
  const [high, setHigh] = useState(roundDiopter(initialDiopter + searchRange));
  const [comparison, setComparison] = useState(null);
  const [step, setStep] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [scriptLetters, setScriptLetters] = useState(() =>
    getRefractionRoundLetters(0, quickMode)
  );

  const leftCanvasRef = useRef(null);
  const rightCanvasRef = useRef(null);
  const comparisonsRef = useRef(0);
  const logRef = useRef([]);
  const scriptRoundRef = useRef(0);

  const scriptCfg = refractionRounds[Math.min(scriptRoundRef.current, refractionRounds.length - 1)];
  const letterPx = getRefractionDisplaySize(scriptCfg?.acuityLevel || "0.50", ppi);
  const canvasSize = Math.max(letterPx * 2.2, 160);

  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  const pickComparison = useCallback(() => {
    const scriptIdx = Math.min(scriptRoundRef.current, refractionRounds.length - 1);
    const scripted = refractionRounds[scriptIdx];
    const lensStep = scripted?.lensStep ?? TOLERANCE;
    const blurMult = scripted?.blurMultiplier ?? 1;
    const mid = (low + high) / 2;
    const a = roundDiopter(mid - lensStep);
    const b = roundDiopter(mid + lensStep);
    const leftFirst = Math.random() < 0.5;
    setScriptLetters(getRefractionRoundLetters(scriptIdx, quickMode));
    setComparison({
      leftD: leftFirst ? a : b,
      rightD: leftFirst ? b : a,
      sharperD: leftFirst ? a : b,
      blurMultiplier: blurMult,
      acuityLevel: scripted?.acuityLevel,
      scriptedRound: scriptIdx,
    });
  }, [low, high, refractionRounds, quickMode]);

  useEffect(() => {
    if (phase !== "TESTING") return;
    pickComparison();
  }, [phase, pickComparison, low, high]);

  useEffect(() => {
    if (phase !== "TESTING" || !comparison) return;
    const px = getRefractionDisplaySize(comparison.acuityLevel || scriptCfg?.acuityLevel || "0.50", ppi);
    drawBlurredLetters(
      leftCanvasRef.current,
      comparison.leftD,
      isDarkMode,
      px,
      canvasSize,
      scriptLetters,
      comparison.blurMultiplier
    );
    drawBlurredLetters(
      rightCanvasRef.current,
      comparison.rightD,
      isDarkMode,
      px,
      canvasSize,
      scriptLetters,
      comparison.blurMultiplier
    );
  }, [comparison, isDarkMode, phase, scriptLetters, ppi, canvasSize, scriptCfg]);

  const finish = useCallback(
    (finalD) => {
      const responseTimes = logRef.current.map((e) => e.responseTime || 500);
      onComplete({
        simulatorD: roundDiopter(finalD),
        comparisons: comparisonsRef.current,
        log: logRef.current,
        simulatorConsistency: calcConsistencyScore(responseTimes) / 100,
      });
    },
    [onComplete]
  );

  const advanceAfterPick = useCallback(
    (logEntry, pickedD, sharperD) => {
      logRef.current.push(logEntry);

      let newLow = low;
      let newHigh = high;
      if (pickedD <= sharperD) {
        newHigh = Math.min(high, pickedD + TOLERANCE);
      } else {
        newLow = Math.max(low, pickedD - TOLERANCE);
      }

      setTimeout(() => {
        setAdvancing(false);
        comparisonsRef.current += 1;
        const nextStep = step + 1;
        setStep(nextStep);
        setLow(newLow);
        setHigh(newHigh);

        if (scriptRoundRef.current < refractionRounds.length - 1) {
          scriptRoundRef.current += 1;
        }

        if (newHigh - newLow <= TOLERANCE || nextStep >= MAX_COMPARISONS) {
          finish((newLow + newHigh) / 2);
          return;
        }
        pickComparison();
      }, 280);
    },
    [low, high, step, finish, pickComparison, refractionRounds.length]
  );

  const handlePick = useCallback(
    (side) => {
      if (!comparison || advancing) return;
      setAdvancing(true);

      const pickedLeft = side === "left";
      const pickedSharper =
        (pickedLeft && comparison.leftD === comparison.sharperD) ||
        (!pickedLeft && comparison.rightD === comparison.sharperD);
      const pickedD = pickedLeft ? comparison.leftD : comparison.rightD;

      advanceAfterPick(
        {
          leftD: comparison.leftD,
          rightD: comparison.rightD,
          picked: side,
          pickedD,
          correct: pickedSharper,
          responseTime: 400,
          scriptedRound: comparison.scriptedRound,
        },
        pickedD,
        comparison.sharperD
      );
    },
    [comparison, advancing, advanceAfterPick]
  );

  const handleSame = useCallback(() => {
    if (!comparison || advancing) return;
    setAdvancing(true);
    const mid = (comparison.leftD + comparison.rightD) / 2;
    advanceAfterPick(
      {
        leftD: comparison.leftD,
        rightD: comparison.rightD,
        picked: "same",
        pickedD: mid,
        correct: true,
        responseTime: 400,
        scriptedRound: comparison.scriptedRound,
      },
      mid,
      comparison.sharperD
    );
  }, [comparison, advancing, advanceAfterPick]);

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Refraction Simulator
        </h2>
        <p className={`text-lg mb-6 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Compare letter groups side by side — like &quot;1 or 2?&quot; at the optician. Starts with
          obvious blur differences and ends with smaller letters and finer steps ({scriptedRoundCount}{" "}
          rounds).
        </p>
        <button
          type="button"
          onClick={() => {
            comparisonsRef.current = 0;
            logRef.current = [];
            scriptRoundRef.current = 0;
            setPhase("TESTING");
          }}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold ${
            visionOk ? "bg-cyan-500 text-white" : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          {visionOk ? "Start" : "Waiting for camera…"}
        </button>
      </div>
    );
  }

  const displayStep = Math.min(step + 1, scriptedRoundCount);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 select-none">
      {!visionOk && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-3xl">
          <div className="text-center text-white">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-amber-400" />
            <p className="font-bold">Paused — adjust position</p>
          </div>
        </div>
      )}
      {zoomWarning && <p className="mb-2 text-xs text-amber-500">{zoomWarning}</p>}
      <p className={`text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        Comparison {displayStep} / {scriptedRoundCount} · {formatAcuityLabel(scriptCfg?.acuityLevel)}
      </p>
      <p className={`text-xs mb-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Range {low.toFixed(2)} to {high.toFixed(2)} D
      </p>
      <p className={`text-lg font-bold mb-6 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        Which looks clearer?
      </p>
      <div className="flex gap-4 flex-wrap justify-center items-stretch">
        <button
          type="button"
          onClick={() => handlePick("left")}
          disabled={!visionOk || advancing}
          className={`rounded-2xl overflow-hidden ring-2 transition-all flex flex-col ${
            isDarkMode ? "ring-slate-600 hover:ring-cyan-400" : "ring-slate-200 hover:ring-cyan-500"
          }`}
        >
          <canvas ref={leftCanvasRef} style={{ display: "block" }} />
          <span className={`block py-2 text-sm font-bold ${isDarkMode ? "bg-slate-800 text-white" : "bg-slate-100"}`}>
            Option A
          </span>
        </button>
        <button
          type="button"
          onClick={handleSame}
          disabled={!visionOk || advancing}
          className={`self-center px-4 py-6 rounded-xl text-sm font-bold border-2 ${
            isDarkMode
              ? "border-slate-600 text-slate-300 hover:bg-slate-800"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Both same
        </button>
        <button
          type="button"
          onClick={() => handlePick("right")}
          disabled={!visionOk || advancing}
          className={`rounded-2xl overflow-hidden ring-2 transition-all flex flex-col ${
            isDarkMode ? "ring-slate-600 hover:ring-cyan-400" : "ring-slate-200 hover:ring-cyan-500"
          }`}
        >
          <canvas ref={rightCanvasRef} style={{ display: "block" }} />
          <span className={`block py-2 text-sm font-bold ${isDarkMode ? "bg-slate-800 text-white" : "bg-slate-100"}`}>
            Option B
          </span>
        </button>
      </div>
    </div>
  );
}
