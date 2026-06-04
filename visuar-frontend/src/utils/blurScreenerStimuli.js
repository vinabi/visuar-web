/**
 * Stimuli for blur screener — medium → slightly smaller per part.
 */

import { getSnellenRowLetters } from "./testStimuli";

/** Distance letters @ 60–80 cm (5 items). */
export const DISTANCE_BLUR_ITEMS = [
  { id: "d1", type: "letter", level: "0.50", label: "Distance 1 of 5" },
  { id: "d2", type: "letter", level: "0.40", label: "Distance 2 of 5" },
  { id: "d3", type: "letter", level: "0.33", label: "Distance 3 of 5" },
  { id: "d4", type: "letter", level: "0.33", label: "Distance 4 of 5" },
  { id: "d5", type: "letter", level: "0.25", label: "Distance 5 of 5" },
];

/** Near words @ 35–40 cm (5 items). */
export const NEAR_BLUR_ITEMS = [
  { id: "n1", type: "word", level: "N14", text: "READ", label: "Near 1 of 5" },
  { id: "n2", type: "word", level: "N12", text: "CLOSE", label: "Near 2 of 5" },
  { id: "n3", type: "word", level: "N10", text: "VISION", label: "Near 3 of 5" },
  { id: "n4", type: "word", level: "N8", text: "SCREEN", label: "Near 4 of 5" },
  { id: "n5", type: "word", level: "N6", text: "FOCUS", label: "Near 5 of 5" },
];

export function getDistanceStimulus(item) {
  const letters = getSnellenRowLetters(item.level, true);
  return letters[0] || "E";
}

export function emptyPartStats() {
  return {
    correct: 0,
    wrong: 0,
    unsure: 0,
    skipped: 0,
    total: 0,
    confidenceSum: 0,
    confidenceCount: 0,
  };
}

export function recordAnswer(stats, outcome, confidence) {
  const next = { ...stats, total: stats.total + 1 };
  if (outcome === "correct") next.correct += 1;
  else if (outcome === "wrong") next.wrong += 1;
  else if (outcome === "skipped") next.skipped += 1;
  else next.unsure += 1;
  if (typeof confidence === "number") {
    next.confidenceSum += confidence;
    next.confidenceCount += 1;
  }
  return next;
}
