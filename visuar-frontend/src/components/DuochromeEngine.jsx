import { useState, useCallback, useEffect, useRef } from "react";
import { getRefractionDisplaySize, getBrowserZoomWarning } from "../utils/visionScaling";
import { applyDuochromeAdjustmentWeighted, roundDiopter } from "../utils/refractionMath";
import { getDuochromeRounds, pickOptotypes } from "../utils/testStimuli";
import { calcDuochromeScore } from "../utils/metricsEngine";
import { formatAcuityLabel } from "../utils/acuityUnits";
import { EyeRestReminder } from "./EyeRestReminder";

const FEEDBACK_MS = 300;
/** Covert validity check — blurred red side; correct answer is green. */
const CATCH_ROUND_INDEX = 7;

/** Deep duochrome panels — strong red/green for clinical contrast. */
const DUO_RED = { base: "#B91C1C", active: "#DC2626" };
const DUO_GREEN = { base: "#15803D", active: "#16A34A" };

function genPair(count) {
  const n = Math.max(2, count || 3);
  const red = pickOptotypes(n);
  const green = pickOptotypes(n, red);
  return { red, green };
}

function letterCountForRound(cfg) {
  if (cfg?.letterCount) return cfg.letterCount;
  return String(cfg?.letters || "FP").replace(/\s+/g, "").length || 3;
}

function InstructionsScreen({ isDarkMode, visionOk, roundCount, onStart }) {
  const head = isDarkMode ? "text-white" : "text-slate-900";
  const sub = isDarkMode ? "text-slate-300" : "text-slate-600";
  const dim = isDarkMode ? "text-slate-500" : "text-slate-400";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
      <EyeRestReminder isDarkMode={isDarkMode} className="max-w-md" />
      <div className="flex items-center gap-3 mb-5">
        <span className="w-9 h-9 rounded-full inline-block" style={{ background: DUO_RED.base }} />
        <span className={`text-2xl font-black ${head}`}>vs</span>
        <span className="w-9 h-9 rounded-full inline-block" style={{ background: DUO_GREEN.base }} />
      </div>

      <h2 className={`text-3xl font-bold mb-3 ${head}`}>Duochrome Red–Green Test</h2>

      <p className={`text-base mb-5 max-w-md ${sub}`}>
        Red and green light focus at slightly different depths in the eye. Compare how sharp
        letters appear on each background to refine your estimated sphere.
      </p>

      <div className="flex w-full max-w-xs rounded-xl overflow-hidden mb-6 shadow-lg text-sm border border-slate-600">
        <div className="flex-1 py-4 flex flex-col items-center" style={{ background: DUO_RED.base }}>
          <span className="font-black text-white text-lg tracking-widest">D E P</span>
          <span className="text-xs text-white/60 mt-1">Red side</span>
        </div>
        <div
          className={`w-14 flex flex-col items-center justify-center text-sm font-bold ${
            isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"
          }`}
        >
          <span className="text-base">=</span>
          <span className="text-xs">Equal</span>
        </div>
        <div className="flex-1 py-4 flex flex-col items-center" style={{ background: DUO_GREEN.base }}>
          <span className="font-black text-white text-lg tracking-widest">T O Z</span>
          <span className="text-xs text-white/60 mt-1">Green side</span>
        </div>
      </div>

      <ul className={`text-sm text-left mb-7 space-y-2 max-w-sm ${sub}`}>
        <li className="flex items-start gap-2">
          <span className="text-cyan-400 mt-0.5">◆</span>
          <span>
            <strong>Letters differ</strong> on each side — judge <em>sharpness</em>, not spelling
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-cyan-400 mt-0.5">◆</span>
          <span>
            <strong>{roundCount} rounds</strong> — letters get smaller as you progress
          </span>
        </li>
        <li className={`flex items-start gap-2 ${dim}`}>
          <span className="mt-0.5">◇</span>
          <span>Answer on instinct — first impressions are most reliable</span>
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        disabled={!visionOk}
        className={`px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg ${
          visionOk
            ? "bg-cyan-500 hover:bg-cyan-400 text-white"
            : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
        }`}
      >
        {visionOk ? "Begin Test" : "Waiting for camera…"}
      </button>
    </div>
  );
}

/**
 * Duochrome (Red–Green) chromatic balance test.
 */
export function DuochromeEngine({
  ppi = 96,
  initialDiopter = -1.5,
  acuityLevel = "0.50",
  isDarkMode,
  visionOk,
  onComplete,
  showInstructions = true,
  quickMode = false,
}) {
  const rounds = getDuochromeRounds(quickMode);
  const total = rounds.length;

  const [phase, setPhase] = useState(showInstructions ? "INSTRUCTIONS" : "TESTING");
  const [currentD, setCurrentD] = useState(() => roundDiopter(initialDiopter));
  const [round, setRound] = useState(0);
  const [choices, setChoices] = useState([]);
  const [pair, setPair] = useState(() => genPair(letterCountForRound(rounds[0])));
  const [feedback, setFeedback] = useState(null);
  const roundStartRef = useRef(Date.now());

  const cfg = rounds[round] ?? rounds[rounds.length - 1];
  const letterPx = getRefractionDisplaySize(cfg?.acuityLevel ?? acuityLevel, ppi);
  const isCatch = round === CATCH_ROUND_INDEX && total > CATCH_ROUND_INDEX;
  const zoomWarn = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") ?? "0")
  );

  useEffect(() => {
    roundStartRef.current = Date.now();
  }, [round, phase]);

  const prepareNext = useCallback((nextRound) => {
    const c = rounds[nextRound] ?? rounds[rounds.length - 1];
    setPair(genPair(letterCountForRound(c)));
  }, [rounds]);

  const handleChoice = useCallback(
    (side) => {
      if (feedback) return;

      const rt = Date.now() - roundStartRef.current;
      setFeedback(side);

      setTimeout(() => {
        setFeedback(null);

        const newD = isCatch
          ? currentD
          : applyDuochromeAdjustmentWeighted(currentD, side, round);

        const nextChoices = [
          ...choices,
          {
            side,
            rt,
            roundType: isCatch ? "catch" : "normal",
            expectedAnswer: isCatch ? "green" : null,
            round,
          },
        ];
        setChoices(nextChoices);
        setCurrentD(newD);

        if (round + 1 >= total) {
          const score = calcDuochromeScore(nextChoices);
          const rC = nextChoices.filter((c) => c.side === "red").length;
          const gC = nextChoices.filter((c) => c.side === "green").length;
          const eC = nextChoices.filter((c) => c.side === "equal").length;
          const sig =
            rC > gC && rC > eC
              ? "red_clearer"
              : gC > rC && gC > eC
                ? "green_clearer"
                : "balanced";

          onComplete({
            initialDiopter: roundDiopter(initialDiopter),
            finalDiopter: newD,
            duochromeD: newD,
            choices: nextChoices,
            rounds: round + 1,
            redClearerCount: rC,
            greenClearerCount: gC,
            equalCount: eC,
            refinementSignal: sig,
            score,
          });
          return;
        }

        const nr = round + 1;
        setRound(nr);
        prepareNext(nr);
      }, FEEDBACK_MS);
    },
    [
      feedback,
      isCatch,
      currentD,
      round,
      choices,
      initialDiopter,
      onComplete,
      prepareNext,
      total,
    ]
  );

  if (phase === "INSTRUCTIONS") {
    return (
      <InstructionsScreen
        isDarkMode={isDarkMode}
        visionOk={visionOk}
        roundCount={total}
        onStart={() => setPhase("TESTING")}
      />
    );
  }

  const redFilter = isCatch ? "blur(2px)" : "none";
  const diopterClass =
    currentD < 0 ? "text-rose-400" : currentD > 0 ? "text-sky-400" : "text-emerald-400";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 select-none">
      {zoomWarn && (
        <div className="mb-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-amber-500 bg-amber-500/15">
          ⚠️ {zoomWarn}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {rounds.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === round ? 12 : 8,
              height: i === round ? 12 : 8,
              background:
                i < round ? "#22d3ee" : i === round ? "#ffffff" : isDarkMode ? "#475569" : "#cbd5e1",
              opacity: i > round ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      <p className={`text-xs font-mono mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Round {round + 1} / {total} · {formatAcuityLabel(cfg.acuityLevel)} · Est.{" "}
        <span className={diopterClass}>
          {currentD >= 0 ? "+" : ""}
          {currentD.toFixed(2)} D
        </span>
      </p>

      <p className={`text-xl font-bold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        Which side appears <span className="italic">sharper</span>?
      </p>
      <p className={`text-xs mb-5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Letters differ on each side — judge <strong>clarity only</strong>
      </p>

      <div className="flex w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-600">
        <button
          type="button"
          onClick={() => handleChoice("red")}
          disabled={!!feedback}
          className="flex-1 flex flex-col items-center justify-center py-12 transition-all duration-150"
          style={{
            background: feedback === "red" ? DUO_RED.active : DUO_RED.base,
            opacity: feedback && feedback !== "red" ? 0.45 : 1,
            transform: feedback === "red" ? "scale(1.03)" : "scale(1)",
          }}
        >
          <div
            className="flex gap-2 md:gap-3 flex-wrap justify-center px-4 mb-4"
            style={{ filter: redFilter }}
          >
            {pair.red.map((ch, i) => (
              <span
                key={i}
                className="font-black text-white leading-none"
                style={{ fontSize: letterPx }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Red clearer
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleChoice("equal")}
          disabled={!!feedback}
          className={`w-20 shrink-0 flex flex-col items-center justify-center gap-1 text-sm font-bold transition-all
            ${isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}
            ${feedback === "equal" ? "ring-2 ring-white ring-inset" : ""}
          `}
        >
          <span className="text-2xl leading-none">=</span>
          <span className="text-xs">
            Both
            <br />
            equal
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleChoice("green")}
          disabled={!!feedback}
          className="flex-1 flex flex-col items-center justify-center py-12 transition-all duration-150"
          style={{
            background: feedback === "green" ? DUO_GREEN.active : DUO_GREEN.base,
            opacity: feedback && feedback !== "green" ? 0.45 : 1,
            transform: feedback === "green" ? "scale(1.03)" : "scale(1)",
          }}
        >
          <div className="flex gap-2 md:gap-3 flex-wrap justify-center px-4 mb-4">
            {pair.green.map((ch, i) => (
              <span
                key={i}
                className="font-black text-white leading-none"
                style={{ fontSize: letterPx }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Green clearer
          </span>
        </button>
      </div>
    </div>
  );
}
