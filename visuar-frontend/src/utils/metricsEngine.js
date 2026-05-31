// Shared metrics calculation utilities for all VISUAR vision tests.
// Used by ContrastEngine, OrientationEngine, and Snellen results assembly.

/**
 * Coefficient-of-variation approach: lower spread = higher consistency.
 * Returns 0-100 where 100 = perfectly consistent response times.
 */
export function calcConsistencyScore(responseTimes) {
  if (!responseTimes || responseTimes.length < 2) return 100;
  const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  if (mean < 1) return 100;
  const variance = responseTimes.reduce((s, t) => s + (t - mean) ** 2, 0) / responseTimes.length;
  const cv = Math.sqrt(variance) / mean; // coefficient of variation
  return Math.max(0, Math.round((1 - Math.min(cv, 1)) * 100));
}

/**
 * Compare first-half vs second-half accuracy to detect fatigue.
 * rounds: Array of { correct: boolean }
 */
export function calcFatigueLevel(rounds) {
  const n = rounds.length;
  if (n < 4) return "None";
  const half = Math.floor(n / 2);
  const early = rounds.slice(0, half).filter((r) => r.correct).length / half;
  const late = rounds.slice(half).filter((r) => r.correct).length / (n - half);
  const drop = early - late;
  return drop > 0.3 ? "Significant" : drop > 0.15 ? "Mild" : "None";
}

/**
 * Session stability based on interruption count.
 * Each pause event subtracts from a 100-point stability score.
 */
export function calcSessionStability(pauseCount) {
  const penalty = Math.min(pauseCount * 10, 60);
  return Math.max(40, 100 - penalty);
}

/**
 * Descriptive label for a 0-100 score.
 */
export function scoreLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Fair";
  return "Low";
}

/**
 * CSS color class for a score value.
 */
export function scoreColorClass(score, variant = "text") {
  const color = score >= 70 ? "green" : score >= 40 ? "amber" : "red";
  return `${variant}-${color}-500`;
}

/**
 * Hex color string for SVG rendering based on score.
 */
export function scoreHex(score) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

/**
 * Weighted contrast sensitivity score (0–100).
 *
 * Correct answers  70 % — difficulty-scaled gain + asymmetric penalty:
 *   correct at hard level  → big gain
 *   correct at easy level  → small gain
 *   wrong   at easy level  → big penalty  (should have been obvious)
 *   wrong   at hard level  → small penalty (expected to miss)
 * Response speed   10 %
 * Consistency       8 %
 * Session stability 7 %
 * Visual fatigue    5 %
 */
export function calcWeightedContrastScore(rounds, consistencyScore, sessionStability, fatigueLevel, avgResponseTime) {
  const N = rounds.length;
  if (N === 0) return 0;
  const maxIdx = 7; // 8 contrast levels → indices 0–7

  // ── Accuracy component ────────────────────────────────────
  let raw = 0;
  let maxPossible = 0;
  rounds.forEach(({ levelIndex, correct }) => {
    const diff    = (levelIndex + 1) / (maxIdx + 1); // 0.125 (easy) → 1.0 (hard)
    const easy    = 1 - diff;
    const gain    = diff;                             // harder correct → more gain
    const penalty = diff * (1 + easy * 3);            // easier wrong  → bigger penalty
    maxPossible  += gain;
    raw          += correct ? gain : -penalty;
  });
  const accuracySc = maxPossible > 0
    ? Math.max(0, Math.min(100, Math.round((raw / maxPossible) * 100)))
    : 0;

  // ── Speed component ───────────────────────────────────────
  const speedSc = avgResponseTime <= 500  ? 100
    : avgResponseTime <= 1000 ? Math.round(100 - (avgResponseTime - 500)  / 500  * 20)
    : avgResponseTime <= 2000 ? Math.round(80  - (avgResponseTime - 1000) / 1000 * 40)
    : avgResponseTime <= 4000 ? Math.round(40  - (avgResponseTime - 2000) / 2000 * 30)
    : 10;

  // ── Fatigue component ─────────────────────────────────────
  const fatigueSc = fatigueLevel === "None" ? 100 : fatigueLevel === "Mild" ? 65 : 30;

  return Math.round(
    0.70 * accuracySc
    + 0.10 * speedSc
    + 0.08 * (consistencyScore ?? 100)
    + 0.07 * (sessionStability ?? 100)
    + 0.05 * fatigueSc
  );
}

/**
 * Weighted Colour Vision score (0–100) for the Ishihara-style procedural test.
 *
 * Difficulty-aware, asymmetric — mirrors the ContrastEngine / LandoltC logic:
 *   correct on a HARD plate  → big gain   (good colour discrimination)
 *   correct on an EASY plate  → small gain  (expected)
 *   wrong   on an EASY plate  → big penalty (should have been obvious)
 *   wrong   on a HARD plate   → small penalty (expected to struggle)
 *
 * rounds: Array of { level (1-4), correct (bool), rt (ms) }
 *
 * Returns { score, cvdRisk, cvdType, accuracySc, speedSc, l1Errors, l1Total }
 *   cvdRisk  — "None" | "Low" | "Moderate" | "High"
 *   cvdType  — "None" | "Red-Green (Protan/Deutan)"
 */
export function calcColorVisionScore(rounds) {
  if (!rounds || rounds.length === 0) {
    return { score: 50, cvdRisk: "Unknown", cvdType: "Unknown", accuracySc: 50, speedSc: 50, l1Errors: 0, l1Total: 0 };
  }

  const maxLevel = 4;
  let raw = 0;
  let maxPossible = 0;

  rounds.forEach(({ level, correct }) => {
    const diff  = (level ?? 1) / maxLevel;  // 0.25 (easy) → 1.0 (hard)
    const easy  = 1 - diff;
    const gain    = diff;
    const penalty = diff * (1 + easy * 2.5);  // easy wrong → 3.5× gain penalty
    maxPossible  += gain;
    raw          += correct ? gain : -penalty;
  });

  const accuracySc = Math.max(0, Math.min(100,
    Math.round((raw / (maxPossible || 1)) * 100)
  ));

  // Speed: comfortable reading pace is 1.5-4 s; very fast = guessing penalty
  const avgRt = rounds.reduce((a, r) => a + (r.rt ?? 3000), 0) / rounds.length;
  const speedSc =
    avgRt < 400  ? 55                                      // suspiciously fast
    : avgRt <= 1500 ? 100
    : avgRt <= 3000 ? 85
    : avgRt <= 5000 ? 65
    : avgRt <= 8000 ? 45 : 25;

  const score = Math.min(100, Math.max(0,
    Math.round(0.88 * accuracySc + 0.12 * speedSc)
  ));

  // CVD risk from Level-1 (screening) plates — simplest, clearest colour contrast
  const l1      = rounds.filter((r) => r.level === 1);
  const l1Errors = l1.filter((r) => !r.correct).length;
  const l1Rate   = l1.length > 0 ? l1Errors / l1.length : 0;

  const cvdRisk =
    l1Rate >= 0.75 ? "High"
    : l1Rate >= 0.50 ? "Moderate"
    : l1Rate >= 0.25 ? "Low"
    : "None";

  // All plates in this set target the protan/deutan (red-green) confusion axis
  const cvdType = cvdRisk === "None" ? "None" : "Red-Green (Protan/Deutan)";

  return { score, cvdRisk, cvdType, accuracySc, speedSc, l1Errors, l1Total: l1.length };
}

/**
 * Weighted Landolt-C acuity score (0–100).
 *
 * Difficulty-aware, asymmetric — exactly the behaviour requested for the ring test:
 *   correct on a SMALL (hard) ring  → big gain   (impressive — sharp vision)
 *   correct on a LARGE (easy) ring   → small gain  (expected, barely rewarded)
 *   wrong   on a LARGE (easy) ring    → big penalty (should have been obvious)
 *   wrong   on a SMALL (hard) ring     → small penalty (expected to miss)
 *
 * In the ladder, levelIndex increases as the ring gets smaller, so
 * difficulty rises with levelIndex.
 *
 * Accuracy 70 % · Speed 10 % · Consistency 8 % · Stability 7 % · Fatigue 5 %.
 *
 * @param {Array<{levelIndex:number, correct:boolean}>} rounds
 * @param {number} consistencyScore  0–100
 * @param {number} sessionStability  0–100
 * @param {"None"|"Mild"|"Significant"} fatigueLevel
 * @param {number} avgResponseTime   ms
 * @param {number} maxLevelIndex     highest reachable ladder index
 */
export function calcWeightedLandoltScore(
  rounds, consistencyScore, sessionStability, fatigueLevel, avgResponseTime, maxLevelIndex,
) {
  const N = rounds.length;
  if (N === 0) return 0;
  const maxIdx = maxLevelIndex ?? Math.max(...rounds.map((r) => r.levelIndex), 1);

  // ── Accuracy component (difficulty-scaled, asymmetric) ────
  let raw = 0;
  let maxPossible = 0;
  rounds.forEach(({ levelIndex, correct }) => {
    const diff    = (levelIndex + 1) / (maxIdx + 1); // small ring → near 1.0
    const easy    = 1 - diff;
    const gain    = diff;                             // harder correct → more gain
    const penalty = diff * (1 + easy * 3);            // easier wrong  → bigger penalty
    maxPossible  += gain;
    raw          += correct ? gain : -penalty;
  });
  const accuracySc = maxPossible > 0
    ? Math.max(0, Math.min(100, Math.round((raw / maxPossible) * 100)))
    : 0;

  // ── Speed component ───────────────────────────────────────
  const speedSc = avgResponseTime <= 600  ? 100
    : avgResponseTime <= 1200 ? Math.round(100 - (avgResponseTime - 600)  / 600  * 20)
    : avgResponseTime <= 2500 ? Math.round(80  - (avgResponseTime - 1200) / 1300 * 40)
    : avgResponseTime <= 5000 ? Math.round(40  - (avgResponseTime - 2500) / 2500 * 30)
    : 10;

  // ── Fatigue component ─────────────────────────────────────
  const fatigueSc = fatigueLevel === "None" ? 100 : fatigueLevel === "Mild" ? 65 : 30;

  return Math.round(
    0.70 * accuracySc
    + 0.10 * speedSc
    + 0.08 * (consistencyScore ?? 100)
    + 0.07 * (sessionStability ?? 100)
    + 0.05 * fatigueSc
  );
}

/**
 * Weighted duochrome reliability score (0–100).
 *
 * choices: Array of { side, rt, roundType, expectedAnswer }
 *   side          — "red" | "green" | "equal"
 *   rt            — response time in ms
 *   roundType     — "normal" | "catch"
 *   expectedAnswer— only on catch rounds; the correct answer
 *
 * Component weights:
 *   Reversal quality    35 % — fewer direction flips = more reliable threshold
 *   Response-time conf  25 % — decisive 800-2500 ms responses score highest
 *   Catch-trial acc     20 % — must pick "green" on the blurred-red round
 *   Convergence         20 % — last 3 rounds pointing the same direction
 */
export function calcDuochromeScore(choices) {
  if (!choices || choices.length === 0) return 50;

  const normal = choices.filter((c) => c.roundType !== "catch");
  const catches = choices.filter((c) => c.roundType === "catch");

  // ── 1. Reversal score (35 pts) ──────────────────────────────────────────
  // Each red→green or green→red flip without an "equal" between = 1 reversal.
  let reversals = 0;
  let prevDir = null;
  for (const c of normal) {
    const dir = c.side !== "equal" ? c.side : null;
    if (dir && prevDir && dir !== prevDir) reversals++;
    if (dir) prevDir = dir;
  }
  const reversalScore = Math.max(0, 35 - reversals * 8);

  // ── 2. Response-time confidence (25 pts) ────────────────────────────────
  // Ideal decisive window: 800–2500 ms. Very fast (<300 ms) = likely guessing.
  const rtScores = normal.map((c) => {
    const rt = c.rt ?? 2000;
    if (rt < 300)   return 0.20;
    if (rt < 800)   return 0.70;
    if (rt <= 2500) return 1.00;
    if (rt <= 4500) return 0.65;
    if (rt <= 7000) return 0.35;
    return 0.15;
  });
  const avgRt = rtScores.length
    ? rtScores.reduce((a, b) => a + b, 0) / rtScores.length
    : 0.70;
  const rtScore = Math.round(avgRt * 25);

  // ── 3. Catch-trial accuracy (20 pts) ────────────────────────────────────
  // Catch round has CSS blur on the red side → green must appear clearer.
  let catchScore = 14; // neutral when no catch played
  if (catches.length > 0) {
    let earned = 0;
    for (const c of catches) {
      if (c.expectedAnswer && c.side === c.expectedAnswer) earned += 20;
      else if (c.side === "equal") earned += 8;
      // incorrect (red on a blurred-red round) → 0
    }
    catchScore = Math.round(earned / catches.length);
  }

  // ── 4. Convergence (20 pts) ─────────────────────────────────────────────
  // The final 3 normal choices should consistently agree on a direction.
  const last3 = normal.slice(-3).map((c) => c.side).filter((s) => s !== "equal");
  const convergenceScore =
    last3.length < 2  ? 10 :
    last3.every((s) => s === last3[0]) ? 20 :
    last3.filter((s) => s === last3[0]).length >= 2 ? 13 : 6;

  return Math.min(100, Math.max(0,
    reversalScore + rtScore + catchScore + convergenceScore,
  ));
}

/**
 * Build a complete metrics payload from a round log.
 * rounds: Array of { levelIndex, correct, responseTime }
 * maxLevelIndex: highest possible level index (e.g. 7 for 8-level tests)
 */
export function buildMetricsPayload(rounds, maxLevelIndex) {
  const total = rounds.length;
  const correctCount = rounds.filter((r) => r.correct).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const responseTimes = rounds.map((r) => r.responseTime);
  const avgResponseTime = total > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / total)
    : 0;
  const fastestResponse = total > 0 ? Math.min(...responseTimes) : 0;
  const slowestResponse = total > 0 ? Math.max(...responseTimes) : 0;

  const correctLevels = rounds.filter((r) => r.correct).map((r) => r.levelIndex);
  const precisionLevel = correctLevels.length > 0 ? Math.max(...correctLevels) : 0;

  const consistencyScore = calcConsistencyScore(responseTimes);
  const fatigueLevel = calcFatigueLevel(rounds);
  const levelProgression = rounds.map((r) => r.levelIndex);
  const roundResults = rounds.map((r) => ({ correct: r.correct, levelIndex: r.levelIndex }));

  return {
    accuracy,
    avgResponseTime,
    fastestResponse,
    slowestResponse,
    consistencyScore,
    fatigueLevel,
    precisionLevel,
    totalLevels: maxLevelIndex + 1,
    hardestLevelReached: precisionLevel + 1,
    levelProgression,
    responseTimes,
    roundResults,
  };
}
