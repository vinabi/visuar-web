/**
 * refractionMath.js — Diopter estimation, blur simulation, and acuity mapping.
 */

import { parseAcuityDecimal } from "./acuityUnits";
import { estimateDiopterFromResult } from "./diopterEstimate";

/** Legacy Snellen denominator lookup (for backward-compatible exports). */
const ACUITY_TO_DENOM = {
  "6/6": 6, "6/9": 9, "6/12": 12, "6/18": 18, "6/24": 24, "6/36": 36, "6/60": 60,
  "1.0": 6, "0.67": 9, "0.50": 12, "0.33": 18, "0.25": 24, "0.17": 36, "0.10": 60,
};

/** @deprecated Prefer estimateDiopterFromResult from diopterEstimate.js */
export function acuityToDiopter(acuityStr, options = {}) {
  if (!acuityStr) return -2.0;
  const result = estimateDiopterFromResult({
    acuity: acuityStr,
    unit: options.unit ?? "decimal",
    forceNear: options.forceNear,
  });
  return result ?? -2.0;
}

/** Empirical mapping: decimal acuity → approximate diopter. */
export function acuityDecimalToDiopter(decimal) {
  return acuityToDiopter(String(decimal));
}

/** @deprecated Use acuityDecimalToDiopter — kept for legacy denom-based callers. */
export function acuityDenomToDiopter(denom) {
  return acuityToDiopter(`6/${denom}`);
}

/** Round to nearest 0.25 D. */
export function roundDiopter(d) {
  return Math.round(d * 4) / 4;
}

/** Blur sigma (CSS px) from diopter defocus simulation. */
export function diopterToBlurSigma(diopter, optotypePx) {
  const px = optotypePx || 80;
  return Math.min(12, Math.abs(diopter) * px * 0.055);
}

/** Apply duochrome choice: red clearer → more myopic (−0.25). */
export function applyDuochromeAdjustment(diopter, choice) {
  if (choice === "red") return roundDiopter(diopter - 0.25);
  if (choice === "green") return roundDiopter(diopter + 0.25);
  return roundDiopter(diopter);
}

/**
 * Round-aware duochrome adjustment.
 * Step size shrinks as the test progresses to narrow the threshold:
 *   rounds 0-2 → ±0.50 D  (exploration — move fast toward correct zone)
 *   rounds 3-6 → ±0.25 D  (standard clinical step)
 *   rounds 7+  → ±0.125 D (fine refinement)
 */
export function applyDuochromeAdjustmentWeighted(diopter, choice, roundIndex) {
  if (choice === "equal") return roundDiopter(diopter);
  const step = roundIndex < 3 ? 0.50 : roundIndex < 7 ? 0.25 : 0.125;
  return roundDiopter(diopter + (choice === "red" ? -step : step));
}

/** Format prescription for display. */
export function formatPrescription({ sph, cyl, axis }) {
  const s = sph >= 0 ? `+${sph.toFixed(2)}` : sph.toFixed(2);
  if (!cyl || cyl === 0) return `SPH ${s} D`;
  const c = cyl.toFixed(2);
  const a = axis != null ? ` × ${axis}°` : "";
  return `SPH ${s} D · CYL ${c} D${a}`;
}

export { ACUITY_TO_DENOM };
