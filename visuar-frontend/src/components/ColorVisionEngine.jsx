import { useState, useCallback, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { COLOR_PLATES, TOTAL_PLATES } from "../utils/colorVisionData";
import { calcColorVisionScore } from "../utils/metricsEngine";

const FEEDBACK_MS = 700;

function Instructions({ isDarkMode, visionOk, onStart }) {
  const head = isDarkMode ? "text-white" : "text-slate-900";
  const sub  = isDarkMode ? "text-slate-300" : "text-slate-600";
  const dim  = isDarkMode ? "text-slate-500" : "text-slate-400";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
        <svg viewBox="0 0 32 32" className="w-9 h-9">
          <circle cx="10" cy="16" r="7" fill="#e03030" opacity="0.85" />
          <circle cx="22" cy="16" r="7" fill="#30aa30" opacity="0.85" />
          <circle cx="16" cy="16" r="7" fill="#e08030" opacity="0.75" />
        </svg>
      </div>

      <h2 className={`text-3xl font-bold mb-3 ${head}`}>Colour Vision Test</h2>
      <p className={`text-base mb-5 max-w-md ${sub}`}>
        Each plate hides a number inside coloured dots. People with normal colour vision
        read it easily — those with a colour deficiency may see a different number or nothing.
      </p>

      <ul className={`text-sm text-left mb-7 space-y-2 max-w-sm ${sub}`}>
        <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">◆</span><span><strong>Both eyes open</strong> — no eye covering needed for this test.</span></li>
        <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">◆</span><span><strong>Answer on first impression</strong> — instinct is more accurate than guessing.</span></li>
        <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">◆</span><span><strong>{TOTAL_PLATES} plates</strong>, increasing difficulty. Tap "Nothing" if you see no number.</span></li>
        <li className={`flex gap-2 ${dim}`}><span className="mt-0.5">◇</span><span>Harder plates score more; missing an easy plate costs the most.</span></li>
      </ul>

      <button
        onClick={onStart}
        disabled={!visionOk}
        className={`px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg ${
          visionOk ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
        }`}
      >
        {visionOk ? "Start Test" : "Waiting for camera…"}
      </button>
    </div>
  );
}

/**
 * Ishihara-style Colour Vision Test using real SVG plate images.
 *
 * 6 plates ordered by difficulty (Level 1–4).
 * Scoring: difficulty-weighted, asymmetric — easy plate miss = big penalty,
 * hard plate correct = big gain.  CVD risk derived from Level-1 error rate.
 * Binocular — no eye cover required.
 */
export function ColorVisionEngine({ isDarkMode, visionOk, onTestComplete }) {
  const [phase, setPhase]       = useState("INSTRUCTIONS");
  const [idx, setIdx]           = useState(0);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "wrong"
  const [pickedAnswer, setPickedAnswer] = useState(null);
  const [rounds, setRounds]     = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const roundStartRef = useRef(Date.now());
  const pauseCount    = useRef(0);
  const wasPaused     = useRef(false);

  const plate = COLOR_PLATES[idx];
  const levelNames = ["", "Screening", "Moderate", "Hard", "Diagnostic"];
  const levelColors = ["", "text-green-400", "text-yellow-400", "text-orange-400", "text-red-400"];

  // Pause / resume tracking
  useEffect(() => {
    if (phase !== "TESTING") return;
    const nowPaused = !visionOk;
    if (nowPaused && !wasPaused.current) pauseCount.current += 1;
    wasPaused.current = nowPaused;
    setIsPaused(nowPaused);
  }, [visionOk, phase]);

  // Reset round timer + image loaded state on each new plate
  useEffect(() => {
    roundStartRef.current = Date.now();
    setImgLoaded(false);
  }, [idx, phase]);

  const handleStart = useCallback(() => {
    setIdx(0);
    setRounds([]);
    setFeedback(null);
    setPickedAnswer(null);
    setPhase("TESTING");
  }, []);

  const handleAnswer = useCallback(
    (answer) => {
      if (feedback || isPaused) return;
      const rt = Date.now() - roundStartRef.current;
      const isCorrect = answer === plate.correct;

      setPickedAnswer(answer);
      setFeedback(isCorrect ? "correct" : "wrong");

      const nextRounds = [
        ...rounds,
        { plateId: plate.id, level: plate.level, correct: isCorrect, rt, answer },
      ];

      setTimeout(() => {
        setFeedback(null);
        setPickedAnswer(null);

        if (idx + 1 >= TOTAL_PLATES) {
          const result = calcColorVisionScore(nextRounds);
          setPhase("COMPLETE");
          onTestComplete({
            ...result,
            rounds: nextRounds,
            totalPlates: TOTAL_PLATES,
            pauseCount: pauseCount.current,
          });
        } else {
          setRounds(nextRounds);
          setIdx((i) => i + 1);
        }
      }, FEEDBACK_MS);
    },
    [feedback, isPaused, plate, idx, rounds, onTestComplete]
  );

  if (phase === "INSTRUCTIONS") {
    return <Instructions isDarkMode={isDarkMode} visionOk={visionOk} onStart={handleStart} />;
  }

  if (phase === "TESTING") {
    const progress = ((idx) / TOTAL_PLATES) * 100;

    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full p-4 select-none">

        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-xl font-bold text-white">Test Paused</p>
              <p className="text-sm text-slate-300 mt-1">Return to the correct position to continue</p>
            </div>
          </div>
        )}

        {/* Progress bar + labels */}
        <div className="flex items-center gap-3 mb-3 w-full max-w-lg">
          <span className={`text-xs font-bold tabular-nums shrink-0 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Plate {idx + 1} / {TOTAL_PLATES}
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-700/30">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-xs font-bold shrink-0 ${levelColors[plate.level]}`}>
            {levelNames[plate.level]}
          </span>
        </div>

        <p className={`text-base font-semibold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          What number do you see?
        </p>

        {/* Plate image */}
        <div
          className={`rounded-2xl overflow-hidden transition-all duration-100 shadow-lg relative ${
            feedback === "correct"
              ? "ring-4 ring-green-500"
              : feedback === "wrong"
              ? "ring-4 ring-red-500"
              : isDarkMode ? "ring-1 ring-slate-700" : "ring-1 ring-slate-200"
          }`}
          style={{ width: 340, height: 340, background: isDarkMode ? "#1e293b" : "#f8f8f8" }}
        >
          {/* Loading skeleton */}
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin" />
            </div>
          )}

          <img
            key={plate.id}
            src={plate.imageUrl}
            alt="Colour vision plate — what number do you see?"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: 340, height: 340,
              objectFit: "contain",
              display: imgLoaded ? "block" : "none",
            }}
          />

          {/* Correct / wrong overlay */}
          {feedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-6xl font-black ${
                feedback === "correct" ? "text-green-500" : "text-red-500"
              }`}
              style={{ background: "rgba(0,0,0,0.10)" }}
            >
              {feedback === "correct" ? "✓" : "✗"}
            </div>
          )}
        </div>

        {/* Answer buttons */}
        <div className="flex gap-3 mt-5 flex-wrap justify-center">
          {plate.choices.map((choice) => {
            const isPicked       = pickedAnswer === choice;
            const isCorrectChoice = choice === plate.correct;

            let bg     = isDarkMode ? "bg-[#1e40af] hover:bg-[#1d4ed8]" : "bg-[#1d4ed8] hover:bg-[#1e40af]";
            let border = "border-transparent";

            if (feedback) {
              if (isPicked && feedback === "correct") bg = "bg-green-600";
              else if (isPicked && feedback === "wrong")  bg = "bg-red-600";
              else if (!isPicked && isCorrectChoice && feedback === "wrong") {
                bg = "bg-green-600"; border = "border-green-400";
              }
            }

            return (
              <button
                key={choice}
                onClick={() => handleAnswer(choice)}
                disabled={!!feedback || isPaused}
                className={`min-w-[68px] px-5 py-3 rounded-xl font-bold text-base text-white ${bg} border-2 ${border} transition-all duration-150 shadow disabled:opacity-60`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
