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

// ─── Landolt C (Tumbling Ring) acuity ──────────────────────────────────────────

/**
 * Staircase ladder of Snellen-equivalent denominators, easy → hard.
 * Index 0 = largest ring (6/30, poorest acuity)  …  last = smallest (6/3.8, sharpest).
 * Spacing follows the clinical logMAR convention (0.1 logMAR per step):
 *   logMAR 0.7 → -0.2, i.e. denom = 6 × 10^logMAR.
 *
 * A correct answer moves the staircase one step DOWN this list (smaller ring);
 * a wrong answer moves one step UP (larger ring).
 */
export const LANDOLT_DENOM_LADDER = [30, 24, 19, 15, 12, 9.5, 7.6, 6, 4.8, 3.8];

/** Recommended starting rung (slightly easy) so the staircase brackets threshold quickly. */
export const LANDOLT_START_INDEX = 2; // 6/19

/**
 * Outer diameter (CSS px) of a Landolt C ring for a given Snellen denominator.
 * A Landolt C's overall size equals a Snellen letter's height (both subtend 5 arcmin
 * at the reference distance for 6/6), so we reuse the Snellen physical formula:
 *   diameter = (denom / 6) × 8.726 mm.
 * The gap and stroke each subtend 1 arcmin = 1/5 of the diameter.
 *
 * @param {number} denom - Snellen denominator (e.g. 6 for 6/6, 4.8 for 6/4.8)
 * @param {number} ppi   - Calibrated CSS pixels per inch
 * @returns {number}       CSS pixel diameter (integer)
 */
export function getLandoltSize(denom, ppi) {
  const d = denom > 0 ? denom : 6;
  const diameterMm = (d / 6) * SNELLEN_6_6_HEIGHT_MM;
  return Math.round(mmToPx(diameterMm, ppi));
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
