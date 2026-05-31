<<<<<<< Updated upstream
import { useState, useCallback, useEffect, useRef } from "react";
import { getSnellenSize, getBrowserZoomWarning } from "../utils/visionScaling";
import { applyDuochromeAdjustmentWeighted, roundDiopter } from "../utils/refractionMath";
import { DUOCHROME_ROUNDS, pickOptotypes } from "../utils/testStimuli";
import { calcDuochromeScore } from "../utils/metricsEngine";

const FEEDBACK_MS = 300;

/** Generate two non-overlapping letter sets — one for each side. */
function genPair(count) {
  const red = pickOptotypes(count);
  const green = pickOptotypes(count, red);
  return { red, green };
}

function InstructionsScreen({ isDarkMode, visionOk, onStart }) {
  const head = isDarkMode ? "text-white" : "text-slate-900";
  const sub  = isDarkMode ? "text-slate-300" : "text-slate-600";
  const dim  = isDarkMode ? "text-slate-500" : "text-slate-400";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-9 h-9 rounded-full inline-block" style={{ background: "#B91C1C" }} />
        <span className={`text-2xl font-black ${head}`}>vs</span>
        <span className="w-9 h-9 rounded-full inline-block" style={{ background: "#15803D" }} />
      </div>

      <h2 className={`text-3xl font-bold mb-3 ${head}`}>Duochrome Red–Green Test</h2>

      <p className={`text-base mb-5 max-w-md ${sub}`}>
        Red and green light focus at slightly different depths in the eye. By comparing
        how sharp letters appear on each background, this test pinpoints whether your
        focus is under- or over-corrected.
      </p>

      {/* Mini preview */}
      <div className="flex w-full max-w-xs rounded-xl overflow-hidden mb-6 shadow-lg text-sm border border-slate-600">
        <div className="flex-1 py-4 flex flex-col items-center" style={{ background: "#B91C1C" }}>
          <span className="font-black text-white text-lg tracking-widest">D E P</span>
          <span className="text-xs text-white/60 mt-1">Red side</span>
        </div>
        <div className={`w-14 flex flex-col items-center justify-center text-sm font-bold ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-600"}`}>
          <span className="text-base">=</span>
          <span className="text-xs">Equal</span>
        </div>
        <div className="flex-1 py-4 flex flex-col items-center" style={{ background: "#15803D" }}>
          <span className="font-black text-white text-lg tracking-widest">T O Z</span>
          <span className="text-xs text-white/60 mt-1">Green side</span>
        </div>
      </div>

      <ul className={`text-sm text-left mb-7 space-y-2 max-w-sm ${sub}`}>
        <li className="flex items-start gap-2">
          <span className="text-cyan-400 mt-0.5">◆</span>
          <span><strong>Letters are different</strong> on each side — judge <em>sharpness</em>, not what they spell</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-cyan-400 mt-0.5">◆</span>
          <span><strong>Answer on instinct</strong> — first impressions are the most clinically reliable</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-cyan-400 mt-0.5">◆</span>
          <span><strong>10 rounds</strong>, increasing difficulty — letters get smaller and lower contrast</span>
        </li>
        <li className={`flex items-start gap-2 ${dim}`}>
          <span className="mt-0.5">◇</span>
          <span>Some rounds are deliberate attention checks — stay focused throughout</span>
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
=======
import { useState, useCallback } from "react";
import { getBrowserZoomWarning } from "../utils/visionScaling";
import { applyDuochromeAdjustment, roundDiopter } from "../utils/refractionMath";
import { getDuochromeRounds } from "../utils/testStimuli";
import { getRefractionDisplaySize } from "../utils/visionScaling";
import { formatAcuityLabel } from "../utils/acuityUnits";
import { OptotypeLetters } from "./OptotypeLetters";
>>>>>>> Stashed changes

/**
 * Duochrome (Red–Green) chromatic balance test.
 *
 * Clinical basis: chromatic aberration shifts red focal point ~0.50 D behind
 * green. At emmetropia (or correct prescription) both sides appear equal.
 * Red clearer → over-minus / under-plus.  Green clearer → under-minus / over-plus.
 *
 * Improvements over v1:
 * - 10 rounds (was 5): warm-up → threshold detection → catch trial → fine refinement
 * - Different optotypes on each half every round — sharpness judgment only
 * - Adaptive step size: ±0.50 D (early) → ±0.25 D → ±0.125 D (late)
 * - Covert catch trial (round 8): CSS blur on red side makes green the correct answer;
 *   wrong answer here flags likely random guessing
 * - Response-time recorded per round for confidence scoring
 * - calcDuochromeScore() produces a 0-100 reliability score included in onComplete
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
<<<<<<< Updated upstream
  const [phase, setPhase]     = useState(showInstructions ? "INSTRUCTIONS" : "TESTING");
=======
  const rounds = getDuochromeRounds(quickMode);

  const [phase, setPhase] = useState(showInstructions ? "INSTRUCTIONS" : "TESTING");
>>>>>>> Stashed changes
  const [currentD, setCurrentD] = useState(roundDiopter(initialDiopter));
  const [round, setRound]     = useState(0);
  const [choices, setChoices] = useState([]);
<<<<<<< Updated upstream
  const [pair, setPair]       = useState(() => genPair(3));
  const [feedback, setFeedback] = useState(null); // "red" | "green" | "equal" | null
  const roundStartRef = useRef(Date.now());

  const cfg       = DUOCHROME_ROUNDS[round] ?? DUOCHROME_ROUNDS.at(-1);
  const letterPx  = getSnellenSize(cfg.acuityLevel ?? acuityLevel, ppi);
  const opacity   = cfg.contrast ?? 1;
  const isCatch   = cfg.type === "catch";
  const zoomWarn  = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") ?? "0")
  );

  // Reset timer whenever we enter a new round
  useEffect(() => {
    roundStartRef.current = Date.now();
  }, [round, phase]);

  const prepareNext = useCallback((nextRound) => {
    const c = DUOCHROME_ROUNDS[nextRound] ?? DUOCHROME_ROUNDS.at(-1);
    setPair(genPair(c.letterCount));
  }, []);
=======
  const [redClearerCount, setRedClearerCount] = useState(0);
  const [greenClearerCount, setGreenClearerCount] = useState(0);
  const [equalCount, setEqualCount] = useState(0);
  const initialLetters = () => {
    const cfg = rounds[0];
    return String(cfg?.letters || "FP").replace(/\s+/g, "").split("");
  };
  const [roundLetters, setRoundLetters] = useState(initialLetters);

  const roundConfig = rounds[round] || rounds[rounds.length - 1];
  const letterPx = getRefractionDisplaySize(roundConfig.acuityLevel || acuityLevel, ppi);
  const zoomWarning = getBrowserZoomWarning(
    parseFloat(localStorage.getItem("visuar_calibration_dpr") || "0")
  );

  const prepareNextRound = useCallback(
    (nextRound) => {
      const cfg = rounds[nextRound] || rounds[rounds.length - 1];
      setRoundLetters(String(cfg.letters || "FP").replace(/\s+/g, "").split(""));
    },
    [rounds]
  );
>>>>>>> Stashed changes

  const handleChoice = useCallback(
    (side) => {
      if (feedback) return; // debounce during flash
      const rt = Date.now() - roundStartRef.current;
      setFeedback(side);

<<<<<<< Updated upstream
      setTimeout(() => {
        setFeedback(null);
=======
      const rCount = redClearerCount + (choice === "red" ? 1 : 0);
      const gCount = greenClearerCount + (choice === "green" ? 1 : 0);
      const eCount = equalCount + (choice === "equal" ? 1 : 0);

      if (choice === "red") setRedClearerCount(rCount);
      else if (choice === "green") setGreenClearerCount(gCount);
      else setEqualCount(eCount);
>>>>>>> Stashed changes

        // Catch round: don't adjust diopter estimate (it's a validity check only)
        const newD = isCatch
          ? currentD
          : applyDuochromeAdjustmentWeighted(currentD, side, round);

<<<<<<< Updated upstream
        const nextChoices = [
          ...choices,
          {
            side,
            rt,
            roundType: cfg.type ?? "normal",
            expectedAnswer: cfg.expectedAnswer ?? null,
            round,
          },
        ];
        setChoices(nextChoices);
        setCurrentD(newD);

        if (round + 1 >= DUOCHROME_ROUNDS.length) {
          const score = calcDuochromeScore(nextChoices);
          const rC = nextChoices.filter((c) => c.side === "red").length;
          const gC = nextChoices.filter((c) => c.side === "green").length;
          const eC = nextChoices.filter((c) => c.side === "equal").length;
          const sig =
            rC > gC && rC > eC ? "red_clearer"
            : gC > rC && gC > eC ? "green_clearer"
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
    [feedback, isCatch, currentD, round, cfg, choices, initialDiopter, onComplete, prepareNext]
=======
      const finish = () => {
        let refinementSignal = "balanced";
        if (rCount > gCount && rCount > eCount) refinementSignal = "red_clearer";
        else if (gCount > rCount && gCount > eCount) refinementSignal = "green_clearer";

        onComplete({
          initialDiopter: roundDiopter(initialDiopter),
          finalDiopter: adjusted,
          duochromeD: adjusted,
          choices: nextChoices,
          rounds: round + 1,
          redClearerCount: rCount,
          greenClearerCount: gCount,
          equalCount: eCount,
          refinementSignal,
        });
      };

      if (round + 1 >= rounds.length) {
        setTimeout(finish, 400);
        return;
      }

      const nextRound = round + 1;
      setTimeout(() => {
        setRound(nextRound);
        prepareNextRound(nextRound);
      }, 400);
    },
    [
      choices,
      currentD,
      initialDiopter,
      onComplete,
      round,
      redClearerCount,
      greenClearerCount,
      equalCount,
      prepareNextRound,
      rounds.length,
    ]
>>>>>>> Stashed changes
  );

  if (phase === "INSTRUCTIONS") {
    return (
<<<<<<< Updated upstream
      <InstructionsScreen
        isDarkMode={isDarkMode}
        visionOk={visionOk}
        onStart={() => setPhase("TESTING")}
      />
    );
  }

  const total = DUOCHROME_ROUNDS.length;

  // Catch round: apply blur to the red side so green is visibly clearer.
  // The user sees no explicit signal that this is a catch round.
  const redFilter = isCatch ? "blur(2px)" : "none";

=======
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Duochrome (Red–Green) Test
        </h2>
        <p className={`text-lg mb-6 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Letters appear on a <span className="text-red-500 font-semibold">red</span> side and a{" "}
          <span className="text-green-600 font-semibold">green</span> side. Choose which side looks
          clearer — letters get smaller over {rounds.length} rounds (backgrounds stay strong).
        </p>
        <button
          type="button"
          onClick={() => setPhase("TESTING")}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold transition-all ${
            visionOk
              ? "bg-cyan-500 hover:bg-cyan-400 text-white"
              : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          {visionOk ? "Start" : "Waiting for camera…"}
        </button>
      </div>
    );
  }

>>>>>>> Stashed changes
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 select-none">
      {zoomWarn && (
        <div className="mb-2 px-4 py-1.5 rounded-xl text-xs font-semibold text-amber-500 bg-amber-500/15">
          ⚠️ {zoomWarn}
        </div>
      )}
<<<<<<< Updated upstream

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-3">
        {DUOCHROME_ROUNDS.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-200"
            style={{
              width:  i === round ? 12 : 8,
              height: i === round ? 12 : 8,
              background: i < round ? "#22d3ee" : i === round ? "#ffffff" : isDarkMode ? "#475569" : "#cbd5e1",
              opacity: i > round ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {/* HUD info */}
      <p className={`text-xs font-mono mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Round {round + 1} / {total} · {cfg.acuityLevel} · Est.&nbsp;
        <span className={currentD < 0 ? "text-rose-400" : currentD > 0 ? "text-sky-400" : "text-emerald-400"}>
          {currentD >= 0 ? "+" : ""}{currentD.toFixed(2)} D
        </span>
=======
      <p className={`text-sm mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        Round {round + 1} / {rounds.length} · {formatAcuityLabel(roundConfig.acuityLevel)} · Est.{" "}
        {currentD.toFixed(2)} D
      </p>
      <p className={`text-lg font-semibold mb-6 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
        Which side looks clearer?
>>>>>>> Stashed changes
      </p>

      <p className={`text-xl font-bold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        Which side appears <span className="italic">sharper</span>?
      </p>
      <p className={`text-xs mb-5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Letters differ on each side — judge <strong>clarity only</strong>
      </p>

      {/* Main test panels */}
      <div className="flex w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-slate-600">

        {/* ── RED side ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleChoice("red")}
          disabled={!!feedback}
          className="flex-1 flex flex-col items-center justify-center py-12 transition-all duration-150"
          style={{
            background: feedback === "red" ? "#DC2626" : "#B91C1C",
            opacity: feedback && feedback !== "red" ? 0.45 : 1,
            transform: feedback === "red" ? "scale(1.03)" : "scale(1)",
          }}
        >
<<<<<<< Updated upstream
          <div
            className="flex gap-2 md:gap-3 flex-wrap justify-center px-4 mb-4"
            style={{ filter: redFilter }}
          >
            {pair.red.map((ch, i) => (
              <span
                key={i}
                className="font-black text-white leading-none"
                style={{ fontSize: letterPx, opacity }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Red Clearer
          </span>
=======
          <OptotypeLetters
            letters={roundLetters}
            capHeightPx={letterPx}
            letterClassName="font-black font-serif"
            className="px-4"
          />
          <span className="mt-4 text-white/90 text-sm font-bold">Red clearer</span>
>>>>>>> Stashed changes
        </button>

        {/* ── EQUAL middle ─────────────────────────────────────── */}
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
          <span className="text-xs">Both<br/>Equal</span>
        </button>

        {/* ── GREEN side ───────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => handleChoice("green")}
          disabled={!!feedback}
          className="flex-1 flex flex-col items-center justify-center py-12 transition-all duration-150"
          style={{
            background: feedback === "green" ? "#16A34A" : "#15803D",
            opacity: feedback && feedback !== "green" ? 0.45 : 1,
            transform: feedback === "green" ? "scale(1.03)" : "scale(1)",
          }}
        >
<<<<<<< Updated upstream
          <div className="flex gap-2 md:gap-3 flex-wrap justify-center px-4 mb-4">
            {pair.green.map((ch, i) => (
              <span
                key={i}
                className="font-black text-white leading-none"
                style={{ fontSize: letterPx, opacity }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Green Clearer
          </span>
=======
          <OptotypeLetters
            letters={roundLetters}
            capHeightPx={letterPx}
            letterClassName="font-black font-serif"
            className="px-4"
          />
          <span className="mt-4 text-white/90 text-sm font-bold">Green clearer</span>
>>>>>>> Stashed changes
        </button>
      </div>

      {/* Difficulty indicator */}
      <div className="mt-4 flex items-center gap-1.5">
        {[...Array(total)].map((_, i) => {
          const done = i < round;
          const cur  = i === round;
          return (
            <span
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: cur ? 20 : 8,
                background: done
                  ? "#22d3ee"
                  : cur
                  ? "#ffffff"
                  : isDarkMode ? "#374151" : "#e2e8f0",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
