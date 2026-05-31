/**
 * Estimated spherical diopter from acuity — screening approximations, not prescriptions.
 * Option A: distance / myopia (minus D).
 * Option B: near / reading add (plus D).
 */

import { parseAcuityDecimal } from "./acuityUnits";
import { formatPrescription } from "./refractionMath";
import { computeSingleDiopterD } from "./finalEstimate";

export const DIOPTER_ESTIMATE_DISCLAIMER =
  "This diopter value is a software-based statistical estimate of your spherical vision. " +
  "It does not replace a comprehensive refraction exam by a licensed optometrist.";

function roundDiopter(d) {
  return Math.round(d * 4) / 4;
}

/**
 * Decimal acuity → estimated myopia (minus D), log-interpolated between clinical anchors.
 * Calibrated so ~0.20 ≈ −2.50 D and ~0.17 ≈ −2.75 D at 60–80 cm screening distance.
 */
const MYOPIA_TABLE = [
  [1.0, 0],
  [0.86, -0.25],
  [0.67, -0.5],
  [0.5, -1.0],
  [0.4, -1.25],
  [0.33, -1.5],
  [0.25, -2.0],
  [0.2, -2.5],
  [0.17, -2.75],
  [0.13, -3.0],
  [0.1, -3.25],
];

/** Option A — last passed decimal row → estimated myopia (distance glasses, minus D). */
export function estimateMyopiaDiopter(decimal) {
  const d = parseAcuityDecimal(decimal);
  if (d >= 1.0) return 0;

  for (let i = 0; i < MYOPIA_TABLE.length - 1; i++) {
    const [dHigh, diopHigh] = MYOPIA_TABLE[i];
    const [dLow, diopLow] = MYOPIA_TABLE[i + 1];
    if (d <= dHigh && d >= dLow) {
      if (dHigh === dLow) return diopLow;
      const t =
        (Math.log(d) - Math.log(dLow)) / (Math.log(dHigh) - Math.log(dLow));
      return roundDiopter(diopLow + t * (diopHigh - diopLow));
    }
  }
  return -3.25;
}

/** Option B — last passed decimal row → estimated reading add (plus D). */
export function estimateReadingAddDiopter(decimal) {
  const d = parseAcuityDecimal(decimal);
  if (d >= 1.0) return 0;
  if (d >= 0.75) return 1.125;
  if (d >= 0.5) return 1.625;
  if (d >= 0.29) return 2.25;
  return 2.5;
}

/** Jaeger N level (higher N = larger print = worse near acuity) → reading add. */
export function estimateReadingAddFromJaeger(jaegerLevel) {
  const match = String(jaegerLevel ?? "").match(/^N(\d+)$/i);
  const n = match ? parseInt(match[1], 10) : 12;
  if (n <= 8) return 0;
  if (n <= 12) return 1.125;
  if (n <= 18) return 1.625;
  return 2.25;
}

/**
 * @param {object} params
 * @param {string} params.acuity — decimal ("0.50"), legacy "6/12", or Jaeger "N12"
 * @param {"decimal"|"jaeger"} [params.unit]
 * @param {boolean} [params.forceNear] — use reading-add table on decimal acuity (rare)
 */
export function estimateDiopterFromResult({ acuity, unit = "decimal", forceNear = false }) {
  if (!acuity) return null;

  if (unit === "jaeger" || /^N\d/i.test(String(acuity))) {
    return roundDiopter(estimateReadingAddFromJaeger(acuity));
  }

  if (forceNear) {
    return roundDiopter(estimateReadingAddDiopter(acuity));
  }

  return roundDiopter(estimateMyopiaDiopter(acuity));
}

/**
 * Full per-eye prescription estimate for a single test completion.
 */
export function buildTestEyePrescription({
  acuity,
  unit = "decimal",
  cylinderD = 0,
  axis = null,
  forceNear = false,
}) {
  const sph = estimateDiopterFromResult({ acuity, unit, forceNear });
  const cyl = cylinderD != null ? roundDiopter(cylinderD) : 0;
  const resolvedAxis = cyl !== 0 && axis != null ? Math.round(axis) % 180 : null;

  return {
    acuity,
    sph,
    cyl,
    axis: resolvedAxis,
    diopter: sph,
    singleDiopterD: computeSingleDiopterD(sph, cyl),
    prescriptionLabel: formatPrescription({ sph, cyl, axis: resolvedAxis }),
  };
}
