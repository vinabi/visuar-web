/**
 * refractionFusion.js — Weighted triangulation of spherical prescription estimates.
 */

import { roundDiopter } from "./refractionMath";
import { computeSingleDiopterD } from "./finalEstimate";
import { acuityToScore } from "./acuityUnits";

/**
 * Fuse spherical diopter from multiple sub-tests.
 *
 * @param {object} params
 * @param {number} params.snellenD
 * @param {number} params.duochromeD
 * @param {number} params.simulatorD
 * @param {object} params.metrics
 * @param {number} [params.metrics.snellenConsistency] 0–1
 * @param {number} [params.metrics.duochromeAgreed] 0–1  (legacy)
 * @param {number} [params.metrics.duochromeScore]  0–100 (preferred; from calcDuochromeScore)
 * @param {number} [params.metrics.simulatorConsistency] 0–1
 * @param {number} [params.metrics.contrastFactor] 0–1 optional weight scaler
 */
export function fuseSpherical({
  snellenD,
  duochromeD,
  simulatorD,
  metrics = {},
}) {
  const snellenConsistency = metrics.snellenConsistency ?? 0.85;
  const simulatorConsistency = metrics.simulatorConsistency ?? 0.85;
  const contrastFactor = metrics.contrastFactor ?? 1;

  // Duochrome weight scales with test reliability.
  // duochromeScore 0-100 → weight 0.10-0.25 (better test = more influence).
  // Falls back to legacy duochromeAgreed (0-1) if score not provided.
  const duochromeReliability = metrics.duochromeScore != null
    ? Math.max(0, Math.min(1, metrics.duochromeScore / 100))
    : (metrics.duochromeAgreed ?? 0.9);
  const wD = 0.10 + 0.15 * duochromeReliability;

  // Screening weights: simulator primary, snellen secondary, duochrome refinement
  const wS = 0.25 * snellenConsistency;
  const wR = 0.5 * simulatorConsistency * (0.5 + 0.5 * contrastFactor);
  const sum = wS + wD + wR || 1;

  const D = (wS * snellenD + wD * duochromeD + wR * simulatorD) / sum;
  return {
    spherical: roundDiopter(D),
    weights: { snellen: wS, duochrome: wD, simulator: wR },
    confidence: Math.min(100, Math.round((sum / 0.85) * 100)),
  };
}

/**
 * Build per-eye prescription object after all sub-tests.
 */
export function buildEyePrescription(eyeData) {
  const {
    acuity,
    snellenD,
    duochromeD,
    simulatorD,
    cyl = 0,
    axis = null,
    metrics = {},
  } = eyeData;

  const fused = fuseSpherical({
    snellenD: snellenD ?? 0,
    duochromeD: duochromeD ?? snellenD ?? 0,
    simulatorD: simulatorD ?? duochromeD ?? snellenD ?? 0,
    metrics,
  });

  const sph = fused.spherical;
  const cylVal = cyl || 0;
  const singleDiopterD = computeSingleDiopterD(sph, cylVal);

  return {
    acuity,
    snellenD,
    duochromeD,
    simulatorD,
    sph,
    cyl: cylVal,
    axis,
    diopter: sph,
    singleDiopterD,
    sessionAverageDiopterD: singleDiopterD,
    confidence: fused.confidence,
    weights: fused.weights,
  };
}

/**
 * Overall refraction score 0–100 from both eyes.
 */
export function refractionOverallScore(left, right) {
  const l = acuityToScore(left?.acuity);
  const r = acuityToScore(right?.acuity);
  const conf = ((left?.confidence ?? 70) + (right?.confidence ?? 70)) / 2;
  return Math.round((l + r) / 2 * 0.7 + conf * 0.3);
}
