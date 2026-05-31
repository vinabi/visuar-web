/**
 * User-facing interpretation for contrast sensitivity screening results.
 */

import { scoreLabel } from "./metricsEngine";

/** Normalize stored value to visibility percent (never 0–255 for display). */
export function faintestContrastPercent(value) {
  if (value == null || Number.isNaN(value)) return null;
  let pct = Number(value);
  if (pct > 100) {
    pct = Math.round(100 - (pct / 255) * 100);
  }
  return Math.max(1, Math.min(100, Math.round(pct)));
}

export function formatFaintestContrastRead(value) {
  const pct = faintestContrastPercent(value);
  if (pct == null) return "—";
  return `${pct}% visibility`;
}

/** Contrast ability from score (hardest level reached proxy). */
export function contrastAbilityLabel(contrastScore) {
  return scoreLabel(contrastScore ?? 0);
}

/** Reliability from accuracy and fatigue. */
export function contrastReliabilityLabel({ accuracy = 0, fatigueLevel = "None" } = {}) {
  const fatigue = fatigueLevel || "None";
  if (accuracy >= 75 && (fatigue === "None" || fatigue === "Mild")) return "High";
  if (accuracy >= 55 && fatigue !== "Significant") return "Medium";
  return "Low";
}

/**
 * Plain-language summary separating ability, reliability, fatigue, and practical meaning.
 */
export function buildContrastPlainMeaning({
  contrastScore = 0,
  accuracy = 0,
  fatigueLevel = "None",
  reliability,
  pauseCount = 0,
} = {}) {
  const ability = contrastAbilityLabel(contrastScore);
  const rel = reliability ?? contrastReliabilityLabel({ accuracy, fatigueLevel });
  const fatigueParts = [];

  if (fatigueLevel === "Significant") {
    fatigueParts.push("Your accuracy dropped noticeably during the test, which often indicates eye fatigue or attention lapses.");
  } else if (fatigueLevel === "Mild") {
    fatigueParts.push("There was a slight drop in accuracy toward the end of the test — this is common with longer tests.");
  }
  if (pauseCount >= 3) {
    fatigueParts.push("The test was interrupted several times, which can reduce result reliability.");
  }

  if (ability === "Excellent" || ability === "Good") {
    if (rel === "Low") {
      const base =
        "You reached a very faint contrast level, suggesting your contrast detection may be strong. " +
        "However, accuracy was too low or fatigue too high for this to count as a reliable result.";
      return fatigueParts.length
        ? `${base} ${fatigueParts.join(" ")} Retake after resting your eyes.`
        : `${base} Retake the test after resting and with good lighting.`;
    }
    if (rel === "Medium") {
      const base =
        "You detected low-contrast letters reasonably well. Some inconsistency was noted, " +
        "so the result is useful as a screening indicator but not conclusive.";
      return fatigueParts.length ? `${base} ${fatigueParts.join(" ")}` : base;
    }
    const base = "You read low-contrast letters reliably — a positive sign for contrast sensitivity.";
    return fatigueParts.length ? `${base} ${fatigueParts.join(" ")}` : base;
  }

  if (ability === "Low" || ability === "Fair") {
    const base =
      "You had difficulty reading letters at lower contrast levels. " +
      "This can result from eye strain, screen glare, reduced brightness, or genuinely reduced contrast vision.";
    const advice = "If this result repeats on a fresh attempt, consider a professional eye exam.";
    return fatigueParts.length
      ? `${base} ${fatigueParts.join(" ")} ${advice}`
      : `${base} ${advice}`;
  }

  const base =
    "Contrast sensitivity measures how well you detect differences in brightness. " +
    "This screening gives an indication only — it is not a clinical diagnosis.";
  return fatigueParts.length ? `${base} ${fatigueParts.join(" ")}` : base;
}

export function buildContrastRecommendations({
  contrastScore = 0,
  accuracy = 0,
  fatigueLevel = "None",
  reliability,
  pauseCount = 0,
} = {}) {
  const ability = contrastAbilityLabel(contrastScore);
  const rel = reliability ?? contrastReliabilityLabel({ accuracy, fatigueLevel });
  const recs = [];

  if (fatigueLevel === "Significant") {
    recs.push("Rest your eyes for at least 10 minutes before retaking this test.");
  }
  if (pauseCount >= 3) {
    recs.push("Minimise interruptions and ensure stable camera positioning before retesting.");
  }
  if ((ability === "Excellent" || ability === "Good") && rel === "Low") {
    recs.push("Retake the test in a well-lit, quiet environment after resting your eyes.");
  }
  if (ability === "Low" || ability === "Fair") {
    recs.push("Make sure your screen brightness is at 70–100% and the room is dimly lit. If low contrast results continue, visit an eye care professional.");
  }
  if (rel === "Medium" && (ability === "Excellent" || ability === "Good")) {
    recs.push("For a more conclusive result, complete the full contrast test rather than the quick version.");
  }
  recs.push("This is a screening result only — it is not a clinical diagnosis.");

  return recs;
}

export function hardestLevelDisplay(precisionLevel, totalLevels) {
  const total = totalLevels > 0 ? totalLevels : 15;
  const reached = Math.min(total, Math.max(1, (precisionLevel ?? 0) + 1));
  return { reached, total, label: `Hardest level reached: ${reached} of ${total}` };
}
