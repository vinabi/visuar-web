/**
 * visionScaling.js — Display-size helpers for VISUAR vision tests.
 *
 * Distance acuity (decimal @ 60–80 cm): physical mm heights via calibrated PPI.
 * Jaeger, tumbling-E, and contrast tests use mm→px + PPI where noted.
 */

import {
  decimalToHeightMm,
  parseAcuityDecimal,
} from "./acuityUnits";
import {
  JAEGER_DISPLAY_SCALE,
  JAEGER_MIN_PX,
  JAEGER_MAX_PX,
} from "./testStimuli";
import {
  JAEGER_DISTANCE_SCALE,
  TEST_DISTANCE_CM,
  VIEWING_DISTANCE,
} from "./viewingDistance";
import {
  LANDOLT_ACUITY_TIERS,
  LANDOLT_DECIMAL_LADDER,
  LANDOLT_START_TIER_INDEX,
  LANDOLT_TEST_DISTANCE_CM,
  LANDOLT_TRIALS_PER_TIER,
  LANDOLT_PASS_MIN_CORRECT,
} from "./landoltAcuity";

/** Render base — scaled via transform to bypass browser minimum font-size (~12px). */
export const OPTOTYPE_BASE_FONT_PX = 16;

/** Cap height ≈ 72% of CSS font-size for sans-serif caps. */
export const OPTOTYPE_CAP_HEIGHT_RATIO = 0.72;

/** Easiest / hardest decimal on the distance chart ladder. */
export const CHART_EASIEST_DECIMAL = 0.10;
export const CHART_HARDEST_DECIMAL = 1.33;

// ─── Decimal acuity @ 60–80 cm (PPI-calibrated) ────────────────────────────

/** Clinical cap height in CSS px (requires calibrated PPI). */
export function getSnellenDisplaySize(level, ppi) {
  const decimal = parseAcuityDecimal(level);
  const heightMm = decimalToHeightMm(decimal);
  return Math.max(1, Math.round(mmToPx(heightMm, ppi || 96)));
}

/**
 * Full-chart row cap height — top row (0.29) largest, bottom (2.0) smallest.
 * Uses log spacing by decimal so each row is visibly smaller than the one above.
 * PPI calibration nudges the overall ladder slightly on different screens.
 */
export function getSnellenChartCapHeightPx(level, ppi) {
  const decimal = parseAcuityDecimal(level);
  const lo = CHART_EASIEST_DECIMAL;
  const hi = CHART_HARDEST_DECIMAL;
  const clamped = Math.max(lo, Math.min(hi, decimal));
  const span = Math.log(hi / lo);
  const t = span > 0 ? Math.log(hi / clamped) / span : 0;

  const ppiFactor = Math.max(0.85, Math.min(1.35, (ppi || 96) / 110));
  const displayMax = Math.round(48 * ppiFactor);
  const displayMin = 6;

  return Math.round(displayMin + t * (displayMax - displayMin));
}

/**
 * Styles for clinically sized optotypes. Uses transform: scale() so sub-12px
 * heights are not collapsed by the browser's minimum font-size setting.
 */
export function buildOptotypeStyles(capHeightPx, gapRatio = 0.1) {
  const h = Math.max(1, capHeightPx);
  const scale = h / (OPTOTYPE_BASE_FONT_PX * OPTOTYPE_CAP_HEIGHT_RATIO);
  const gap = Math.max(0, Math.round(h * gapRatio));
  return {
    row: {
      height: `${h + 8}px`,
      minHeight: `${h + 8}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      overflow: "visible",
    },
    text: {
      fontSize: `${OPTOTYPE_BASE_FONT_PX}px`,
      lineHeight: 1,
      transform: `scale(${scale})`,
      transformOrigin: "left center",
      display: "inline-flex",
      gap: `${gap}px`,
      letterSpacing: gapRatio < 0.05 ? "-0.04em" : undefined,
    },
  };
}

/** Refraction / duochrome distance letters — same mm formula as the chart. */
export function getRefractionDisplaySize(level, ppi) {
  return getSnellenDisplaySize(level, ppi);
}

/** @deprecated Use getSnellenDisplaySize — kept for legacy callers. */
export function getSnellenSize(level, ppi) {
  return getSnellenDisplaySize(level, ppi);
}

// ─── Jaeger (near vision @ TEST_DISTANCE_CM) ────────────────────────────────

const JAEGER_N8_HEIGHT_MM = 2.9;

export function getJaegerSize(level, ppi) {
  const match = String(level).match(/^N(\d+)$/i);
  const n = match ? parseInt(match[1], 10) : 8;
  const heightMm = (n / 8) * JAEGER_N8_HEIGHT_MM * JAEGER_DISTANCE_SCALE;
  return Math.round(mmToPx(heightMm, ppi));
}

export function getJaegerDisplaySize(level, ppi) {
  const raw = getJaegerSize(level, ppi);
  const scaled = Math.round(raw * JAEGER_DISPLAY_SCALE);
  return Math.max(JAEGER_MIN_PX, Math.min(JAEGER_MAX_PX, scaled));
}

// ─── Viewing distance (camera-assisted) ───────────────────────────────────────

export const VIEWING = {
  distance: { ...VIEWING_DISTANCE },
  near: { ...VIEWING_DISTANCE, label: `about ${TEST_DISTANCE_CM} cm` },
};

export function isDistanceOkForMode(visionResult, mode = "distance") {
  if (!visionResult?.face_detected || visionResult.distance_cm == null) return false;
  const d = visionResult.distance_cm;
  const band = VIEWING[mode] || VIEWING.distance;
  return d >= band.min && d <= band.max;
}

// ─── Contrast Sensitivity ─────────────────────────────────────────────────────

/** @deprecated Prefer per-level fontPx from CONTRAST_LEVELS in testStimuli.js */
export function getContrastSize(ppi) {
  return Math.round(mmToPx(20, ppi));
}

// ─── Tumbling E / Orientation ─────────────────────────────────────────────────

export const TUMBLING_E_SIZES_MM = [40, 30, 24, 19, 15, 12, 8, 6];

export function getTumblingESize(levelIndex, ppi) {
  const mm = TUMBLING_E_SIZES_MM[Math.min(levelIndex, TUMBLING_E_SIZES_MM.length - 1)];
  return Math.round(mmToPx(mm, ppi));
}

// ─── Landolt C (ISO 8596) ─────────────────────────────────────────────────────

/** ISO 8596 reference table distance (mm formula published at 50 cm). */
export const LANDOLT_ISO_REF_DISTANCE_CM = 50;

/** Outer diameter (mm) at decimal 1.0 and 50 cm: D = 3.636 / decimal. */
export const LANDOLT_ISO_DIAMETER_MM_AT_DECIMAL_1 = 3.636;

/** Gap width and stroke thickness = 1/5 of outer diameter. */
export const LANDOLT_STROKE_GAP_RATIO = 1 / 5;

export {
  LANDOLT_ACUITY_TIERS,
  LANDOLT_DECIMAL_LADDER,
  LANDOLT_TEST_DISTANCE_CM,
  LANDOLT_TRIALS_PER_TIER,
  LANDOLT_PASS_MIN_CORRECT,
};

/** @deprecated Use LANDOLT_START_TIER_INDEX */
export const LANDOLT_START_INDEX = LANDOLT_START_TIER_INDEX;

/** @deprecated Use LANDOLT_TRIALS_PER_TIER */
export const LANDOLT_TRIALS_PER_LEVEL = LANDOLT_TRIALS_PER_TIER;

/** @deprecated Use LANDOLT_PASS_MIN_CORRECT / LANDOLT_TRIALS_PER_TIER */
export const LANDOLT_PASS_RATE = LANDOLT_PASS_MIN_CORRECT / LANDOLT_TRIALS_PER_TIER;

export const LANDOLT_DENOM_LADDER = LANDOLT_DECIMAL_LADDER.map((dec) =>
  Math.round((6 / dec) * 10) / 10
);

/**
 * Outer diameter in mm (ISO 8596 @ reference distance, scaled to test distance).
 * D_mm = (3.636 / decimal) × (distanceCm / 50)
 */
export function landoltOuterDiameterMm(decimal, distanceCm = LANDOLT_TEST_DISTANCE_CM) {
  const d = Math.max(0.08, typeof decimal === "number" ? decimal : parseFloat(decimal) || 0.5);
  const distScale = distanceCm / LANDOLT_ISO_REF_DISTANCE_CM;
  return (LANDOLT_ISO_DIAMETER_MM_AT_DECIMAL_1 * distScale) / d;
}

/** Stroke and gap width in mm (each = D/5). */
export function landoltStrokeGapMm(decimal, distanceCm = LANDOLT_TEST_DISTANCE_CM) {
  return landoltOuterDiameterMm(decimal, distanceCm) * LANDOLT_STROKE_GAP_RATIO;
}

/** Outer diameter in CSS pixels from decimal acuity. */
export function getLandoltSizeFromDecimal(decimal, ppi, distanceCm = LANDOLT_TEST_DISTANCE_CM) {
  return Math.max(8, Math.round(mmToPx(landoltOuterDiameterMm(decimal, distanceCm), ppi)));
}

/**
 * Outer diameter (CSS px) from Snellen denominator (6/X).
 * @param {number} denom - e.g. 12 for 6/12 → decimal 0.5
 */
export function getLandoltSize(denom, ppi, distanceCm = LANDOLT_TEST_DISTANCE_CM) {
  const d = denom > 0 ? denom : 12;
  return getLandoltSizeFromDecimal(6 / d, ppi, distanceCm);
}

/** Decimal acuity → Snellen label, e.g. 0.5 → "6/12". */
export function decimalToLandoltSnellen(decimal) {
  const d = typeof decimal === "number" ? decimal : parseFloat(decimal) || 0.5;
  return landoltDenomToAcuity(6 / d);
}

/** Format a (possibly fractional) denominator as a clean Snellen string, e.g. "6/9.5". */
export function landoltDenomToAcuity(denom) {
  if (denom == null || Number.isNaN(denom)) return "6/12";
  const rounded = Math.round(denom * 10) / 10;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `6/${display}`;
}

// ─── Core conversion ──────────────────────────────────────────────────────────

export function mmToPx(mm, ppi) {
  return (mm / 25.4) * ppi;
}

/** px per mm from credit-card calibration (85.6 mm wide). */
export function pxPerMm(ppi) {
  return (ppi || 96) / 25.4;
}

// ─── Browser zoom detection ───────────────────────────────────────────────────

export function getBrowserZoomWarning(calibrationDPR) {
  if (!calibrationDPR || calibrationDPR <= 0) return null;
  const currentDPR = window.devicePixelRatio || 1;
  const ratio = currentDPR / calibrationDPR;
  if (Math.abs(ratio - 1) > 0.15) {
    return "Please keep browser zoom at 100% for accurate vision testing.";
  }
  return null;
}

export function getBaselineDPR() {
  return window.devicePixelRatio || 1;
}
