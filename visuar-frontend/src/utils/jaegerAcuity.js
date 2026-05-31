/**
 * Jaeger near-vision — physical scaling and clinical equivalents per eye.
 *
 * Row label N: larger N ⇒ larger print ⇒ worse near acuity (matches chart ladder).
 * Reference: N8 cap height 2.9 mm @ 40 cm ≈ normal near (decimal 1.0).
 * At platform distance (TEST_DISTANCE_CM), sizes scale via JAEGER_DISTANCE_SCALE in visionScaling.
 */

import { roundDiopter } from "./refractionMath";

function readingAddFromNearDecimal(decimal) {
  const d = Number(decimal);
  if (!Number.isFinite(d) || d >= 1.0) return 0;
  if (d >= 0.75) return 1.125;
  if (d >= 0.5) return 1.625;
  if (d >= 0.29) return 2.25;
  return 2.5;
}
import {
  JAEGER_REFERENCE_DISTANCE_CM,
  TEST_DISTANCE_CM,
} from "./viewingDistance";

/** Reference row for “normal” near acuity at the clinical card distance. */
export const JAEGER_N_REF = 8;
export const JAEGER_DECIMAL_AT_REF = 1.0;

/** N (row size) → standard Jaeger J-number anchors for log interpolation. */
const N_TO_J_ANCHORS = [
  [3, 1],
  [4, 2],
  [5, 3],
  [6, 4],
  [8, 5],
  [10, 7],
  [12, 8],
  [14, 10],
  [16, 12],
  [20, 14],
  [24, 18],
  [28, 20],
  [32, 20],
];

export function parseJaegerN(level) {
  const m = String(level ?? "").match(/^N(\d+)/i);
  return m ? parseInt(m[1], 10) : JAEGER_N_REF;
}

/**
 * Near decimal acuity equivalent from row N at viewing distance D (cm).
 * decimal = (N_ref / N) × (D_ref / D_test)
 */
export function jaegerNToNearDecimal(n, distanceCm = TEST_DISTANCE_CM) {
  const nn = Math.max(1, Number(n) || JAEGER_N_REF);
  const d = Math.max(20, Number(distanceCm) || TEST_DISTANCE_CM);
  const decimal = (JAEGER_N_REF / nn) * (JAEGER_REFERENCE_DISTANCE_CM / d);
  return Math.round(decimal * 100) / 100;
}

/** Cap height (mm) for row N — matches visionScaling JAEGER_N8_HEIGHT_MM ladder. */
export function jaegerNToHeightMm(n, distanceCm = TEST_DISTANCE_CM) {
  const JAEGER_N8_HEIGHT_MM = 2.9;
  const scale = distanceCm / JAEGER_REFERENCE_DISTANCE_CM;
  return ((Math.max(1, n) / JAEGER_N_REF) * JAEGER_N8_HEIGHT_MM * scale);
}

/** Standard Jaeger J label (J1 = smallest/best … J20 = largest/worst). */
export function jaegerNToJLabel(n) {
  const nn = Math.max(1, Number(n) || JAEGER_N_REF);
  if (nn <= N_TO_J_ANCHORS[0][0]) return `J${N_TO_J_ANCHORS[0][1]}`;
  if (nn >= N_TO_J_ANCHORS[N_TO_J_ANCHORS.length - 1][0]) {
    return `J${N_TO_J_ANCHORS[N_TO_J_ANCHORS.length - 1][1]}`;
  }
  const logN = Math.log(nn);
  for (let i = 0; i < N_TO_J_ANCHORS.length - 1; i++) {
    const [n0, j0] = N_TO_J_ANCHORS[i];
    const [n1, j1] = N_TO_J_ANCHORS[i + 1];
    if (nn >= n0 && nn <= n1) {
      const t = (logN - Math.log(n0)) / (Math.log(n1) - Math.log(n0));
      const j = j0 + t * (j1 - j0);
      return `J${Math.max(1, Math.min(20, Math.round(j)))}`;
    }
  }
  return "J7";
}

/** Estimated reading add (+D) from near decimal — hyperopia / presbyopia screening. */
export function jaegerNToReadingAddD(n, distanceCm = TEST_DISTANCE_CM) {
  const decimal = jaegerNToNearDecimal(n, distanceCm);
  return roundDiopter(readingAddFromNearDecimal(decimal));
}

/** Approximate N from J label (inverse of anchor table). */
export function jaegerJToN(jLabel) {
  const m = String(jLabel ?? "").match(/^J(\d+)/i);
  if (!m) return parseJaegerN(jLabel);
  const j = parseInt(m[1], 10);
  let best = N_TO_J_ANCHORS[0];
  let bestDiff = Infinity;
  for (const [n, jv] of N_TO_J_ANCHORS) {
    const diff = Math.abs(jv - j);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [n, jv];
    }
  }
  return best[0];
}

/** Map N or J level string to reading add. */
export function jaegerLevelToReadingAddD(level, distanceCm = TEST_DISTANCE_CM) {
  const s = String(level ?? "");
  if (/^J\d/i.test(s)) return jaegerNToReadingAddD(jaegerJToN(s), distanceCm);
  return jaegerNToReadingAddD(parseJaegerN(level), distanceCm);
}

/**
 * Threshold from last passed row (N label, e.g. "N12").
 * @returns {object|null}
 */
export function computeJaegerEyeResult(lastPassedLevel, distanceCm = TEST_DISTANCE_CM) {
  if (!lastPassedLevel) return null;
  const n = parseJaegerN(lastPassedLevel);
  const nearDecimal = jaegerNToNearDecimal(n, distanceCm);
  const jLabel = jaegerNToJLabel(n);
  const readingAddD = jaegerNToReadingAddD(n, distanceCm);

  return {
    level: lastPassedLevel,
    n,
    jLabel,
    nearDecimal,
    readingAddD,
    heightMm: Math.round(jaegerNToHeightMm(n, distanceCm) * 100) / 100,
    /** Primary display string for results cards */
    displayAcuity: jLabel,
    /** Secondary detail */
    detailLabel: `${lastPassedLevel} · near ${nearDecimal} · +${readingAddD.toFixed(2)} D est.`,
  };
}

/**
 * Optional fractional threshold when failing a row with partial credit.
 * Blends log(N) between last pass and fail row by accuracy (0–1).
 */
export function computeJaegerThresholdFromAttempt({
  passed,
  levelIndex,
  levels,
  accuracyPercent = 0,
}) {
  if (!levels?.length) return null;

  if (passed) {
    return computeJaegerEyeResult(levels[levelIndex]);
  }

  if (levelIndex <= 0) return null;

  const nPass = parseJaegerN(levels[levelIndex - 1]);
  const nFail = parseJaegerN(levels[levelIndex]);
  const acc = Math.max(0, Math.min(1, (accuracyPercent ?? 0) / 100));
  const logBlend = Math.log(nPass) + (1 - acc) * (Math.log(nFail) - Math.log(nPass));
  const nEff = Math.round(Math.exp(logBlend));
  const level = `N${Math.max(3, Math.min(32, nEff))}`;
  return computeJaegerEyeResult(level);
}
