/**
 * Near ↔ far focus switching via visual angle — distance target + on-screen scale.
 * No physical screen change: double viewing distance ⇒ double optotype size (same angle).
 */

import {
  getLandoltSizeFromDecimal,
  landoltStrokeGapMm,
  LANDOLT_ISO_REF_DISTANCE_CM,
} from "./visionScaling";

export const FOCUS_NEAR_CM = 50;
export const FOCUS_FAR_CM = 100;

/** Hold target distance this long before unfreezing (ms). */
export const FOCUS_DISTANCE_HOLD_MS = 2000;

/** Minimum outer Landolt diameter (CSS px) for a sharp gap/stroke on typical displays. */
export const MIN_LANDOLT_OUTER_PX = 22;

/** Minimum stroke/gap thickness (CSS px) — ISO stroke = D/5. */
export const MIN_LANDOLT_STROKE_PX = 3;

export const FOCUS_MODES = {
  NEAR: "near",
  FAR: "far",
};

const FOCUS_CONFIG = {
  [FOCUS_MODES.NEAR]: {
    id: FOCUS_MODES.NEAR,
    targetCm: FOCUS_NEAR_CM,
    minCm: 42,
    maxCm: 58,
    label: "Near focus",
    instruction: "Please move to about 50 cm (roughly arm’s length to the screen).",
    accommodation: "Lens works harder (near accommodation).",
  },
  [FOCUS_MODES.FAR]: {
    id: FOCUS_MODES.FAR,
    targetCm: FOCUS_FAR_CM,
    minCm: 88,
    maxCm: 112,
    label: "Far focus",
    instruction:
      "Please move back to about 100 cm (about arm’s length plus one step from the screen).",
    accommodation: "Lens relaxes — tests distance clarity.",
  },
};

export function getFocusConfig(mode) {
  return FOCUS_CONFIG[mode] || FOCUS_CONFIG[FOCUS_MODES.NEAR];
}

export function getOppositeFocusMode(mode) {
  return mode === FOCUS_MODES.FAR ? FOCUS_MODES.NEAR : FOCUS_MODES.FAR;
}

/** Scale multiplier vs ISO Landolt reference distance (50 cm). */
export function visualAngleScaleMultiplier(focusDistanceCm, referenceCm = LANDOLT_ISO_REF_DISTANCE_CM) {
  return focusDistanceCm / referenceCm;
}

export function isDistanceInFocusBand(visionResult, mode) {
  if (!visionResult?.face_detected || visionResult.distance_cm == null) return false;
  const { minCm, maxCm } = getFocusConfig(mode);
  const d = visionResult.distance_cm;
  return d >= minCm && d <= maxCm;
}

/**
 * Landolt outer diameter (px) at a focus distance, with pixel safeguard (monitor limit).
 */
export function evaluateLandoltPixelSafeguard(decimal, ppi, focusDistanceCm) {
  const ringPx = getLandoltSizeFromDecimal(decimal, ppi, focusDistanceCm);
  const strokePx = ringPx / 5;
  const strokeMm = landoltStrokeGapMm(decimal, focusDistanceCm);

  if (ringPx < MIN_LANDOLT_OUTER_PX) {
    return {
      display: false,
      ringPx,
      strokePx,
      strokeMm,
      reason: "monitor_resolution",
      message:
        "This acuity level is too fine for your screen at this distance — the ring would blur below the display’s pixel limit. Test stopped at monitor resolution limit.",
    };
  }
  if (strokePx < MIN_LANDOLT_STROKE_PX) {
    return {
      display: false,
      ringPx,
      strokePx,
      strokeMm,
      reason: "stroke_too_thin",
      message:
        "Gap/stroke would be thinner than one pixel at this size. Test stopped at monitor resolution limit.",
    };
  }
  return { display: true, ringPx, strokePx, strokeMm, reason: null, message: null };
}

/** Snellen/Jaeger cap height scaled for focus distance (reference ladder @ 70 cm). */
export function scaleDisplayPxForFocus(basePx, focusDistanceCm, referenceCm = 70) {
  return Math.max(1, Math.round(basePx * (focusDistanceCm / referenceCm)));
}
