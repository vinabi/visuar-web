import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { buildOptotypeStyles, getSnellenDisplaySize, getJaegerDisplaySize } from "../utils/visionScaling";
import { getDistanceStimulus, recordAnswer } from "../utils/blurScreenerStimuli";

/**
 * One-at-a-time blur screening items with correct / wrong / unsure + optional confidence.
 */
export function BlurScreenerPart({
  items,
  partTitle,
  partHint,
  ppi,
  isDarkMode,
  onComplete,
}) {
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    unsure: 0,
    skipped: 0,
    total: 0,
    confidenceSum: 0,
    confidenceCount: 0,
  });
  const [pendingConfidence, setPendingConfidence] = useState(null);

  const item = items[index];
  const isLetter = item.type === "letter";
  const stimulus = isLetter ? getDistanceStimulus(item) : item.text;
  const capPx = isLetter
    ? getSnellenDisplaySize(item.level, ppi)
    : getJaegerDisplaySize(item.level, ppi);
  const { text: textStyle } = buildOptotypeStyles(capPx, 0.12);

  const finishAnswer = (outcome, confidence) => {
    const nextStats = recordAnswer(stats, outcome, confidence);
    setStats(nextStats);
    setPendingConfidence(null);
    if (index + 1 >= items.length) {
      onComplete(nextStats);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleOutcome = (outcome) => {
    if (outcome === "correct") {
      setPendingConfidence({ outcome });
      return;
    }
    finishAnswer(outcome, null);
  };

  const handleConfidence = (level) => {
    if (!pendingConfidence) return;
    finishAnswer(pendingConfidence.outcome, level);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto w-full">
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
          {partTitle}
        </p>
        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{partHint}</p>
        <p className={`text-xs mt-2 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
          {item.label} · Question {index + 1} of {items.length}
        </p>
      </div>

      <div
        className={`rounded-2xl p-10 flex items-center justify-center min-h-[140px] ${
          isDarkMode ? "bg-[#0d1117] border border-slate-700" : "bg-slate-50 border border-slate-200"
        }`}
      >
        <span
          className={`font-bold tracking-wide ${isDarkMode ? "text-white" : "text-slate-900"}`}
          style={textStyle}
        >
          {stimulus}
        </span>
      </div>

      {pendingConfidence ? (
        <div className="space-y-3">
          <p className={`text-sm text-center font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            How confident were you? (optional)
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {[
              { level: 1, label: "Low" },
              { level: 3, label: "Medium" },
              { level: 5, label: "High" },
            ].map(({ level, label }) => (
              <Button
                key={level}
                variant="outline"
                className="rounded-full"
                onClick={() => handleConfidence(level)}
              >
                {label}
              </Button>
            ))}
            <Button variant="ghost" className="rounded-full" onClick={() => handleConfidence(null)}>
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className={`text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Could you read this clearly?
          </p>
          <div className="grid gap-2">
            <Button
              className="rounded-xl h-12 bg-green-600 hover:bg-green-500 text-white"
              onClick={() => handleOutcome("correct")}
            >
              Yes, read clearly
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-12"
              onClick={() => handleOutcome("wrong")}
            >
              No / blurry
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl h-11"
              onClick={() => handleOutcome("unsure")}
            >
              Not sure
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
