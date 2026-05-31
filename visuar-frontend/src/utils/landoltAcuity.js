/**
 * Landolt C acuity — standardized tiers, test protocol, and clinical result mapping.
 * Ring sizing uses ISO 8596 at 50 cm; diopter estimate uses Swaine/Egger-style rule at 50 cm.
 */

/** Fixed test distance for Landolt methodology and SPH estimate (per clinical brief). */
export const LANDOLT_TEST_DISTANCE_CM = 50;

/** Standardized decimal tiers (easy → hard). */
export const LANDOLT_ACUITY_TIERS = [
  { decimal: 0.29, snellen6: "6/21", snellen20: "20/70" },
  { decimal: 0.40, snellen6: "6/15", snellen20: "20/50" },
  { decimal: 0.50, snellen6: "6/12", snellen20: "20/40" },
  { decimal: 0.67, snellen6: "6/9", snellen20: "20/30" },
  { decimal: 0.86, snellen6: "6/7", snellen20: "20/25" },
  { decimal: 1.0, snellen6: "6/6", snellen20: "20/20" },
  { decimal: 1.2, snellen6: "6/5", snellen20: "20/15" },
  { decimal: 1.5, snellen6: "6/4", snellen20: "20/13" },
  { decimal: 2.0, snellen6: "6/3", snellen20: "20/10" },
];

export const LANDOLT_START_TIER_INDEX = 0;

export const LANDOLT_TRIALS_PER_TIER = 5;

/** Pass tier when ≥ 4 of 5 correct (80%). */
export const LANDOLT_PASS_MIN_CORRECT = 4;

const WORSE_THAN_FIRST_TIER = {
  decimalScore: 0.2,
  snellen6: "Worse than 6/21",
  snellen20: "Worse than 20/70",
  estimatedDiopterD: -1.75,
  estimatedDiopter: "-1.75 D",
  interpretation: "Moderate visual impairment. Distance correction highly recommended.",
};

/** Formula A: 6/X and 20/X from decimal. */
export function decimalToSnellen6(decimal) {
  const d = Math.max(0.08, decimal);
  const x = Math.round((6 / d) * 10) / 10;
  const display = Number.isInteger(x) ? String(x) : x.toFixed(1);
  return `6/${display}`;
}

export function decimalToSnellen20(decimal) {
  const d = Math.max(0.08, decimal);
  const x = Math.round((20 / d) * 10) / 10;
  const display = Number.isInteger(x) ? String(x) : x.toFixed(1);
  return `20/${display}`;
}

/**
 * Formula B: estimated spherical equivalent (diopters), rounded to 0.25 D steps.
 * SPH = -1 × (0.35 / decimal); 1.0 tier → 0.00 D.
 */
export function decimalToEstimatedDiopterD(decimal) {
  if (decimal >= 1.0) return 0;
  const raw = -1 * (0.35 / Math.max(0.08, decimal));
  return Math.round(raw * 4) / 4;
}

export function clinicalInterpretationForDecimal(decimal) {
  if (decimal < 0.29) {
    return "Moderate visual impairment. Distance correction highly recommended.";
  }
  if (decimal < 1.0) {
    return "Mild nearsightedness (myopia) detected.";
  }
  if (decimal > 1.2) {
    return "Excellent, above-average distance vision sharpness.";
  }
  return "Normal, healthy vision.";
}

function buildResultFromTier(tier) {
  const decimal = tier.decimal;
  const estimatedDiopterD = decimalToEstimatedDiopterD(decimal);
  return {
    decimalScore: decimal,
    snellen6: tier.snellen6,
    snellen20: tier.snellen20,
    estimatedDiopterD,
    estimatedDiopter: `${estimatedDiopterD >= 0 ? "+" : ""}${estimatedDiopterD.toFixed(2)} D`,
    interpretation: clinicalInterpretationForDecimal(decimal),
    failedTierIndex: null,
    completedAllTiers: true,
  };
}

/**
 * Final Landolt result when the user fails a tier or completes the chart.
 *
 * @param {number} failedTierIndex - Index in LANDOLT_ACUITY_TIERS where they failed (0 = failed first tier).
 * @param {{ completedAll?: boolean }} [options]
 */
export function calculateLandoltAcuityResults(failedTierIndex, { completedAll = false } = {}) {
  const tiers = LANDOLT_ACUITY_TIERS;

  if (completedAll || failedTierIndex >= tiers.length) {
    return buildResultFromTier(tiers[tiers.length - 1]);
  }

  if (failedTierIndex <= 0) {
    return { ...WORSE_THAN_FIRST_TIER, failedTierIndex: 0, completedAllTiers: false };
  }

  const finalPassedTier = tiers[failedTierIndex - 1];
  const decimal = finalPassedTier.decimal;
  const estimatedDiopterD = decimalToEstimatedDiopterD(decimal);

  return {
    decimalScore: decimal,
    snellen6: finalPassedTier.snellen6,
    snellen20: finalPassedTier.snellen20,
    estimatedDiopterD,
    estimatedDiopter: `${estimatedDiopterD >= 0 ? "+" : ""}${estimatedDiopterD.toFixed(2)} D`,
    interpretation: clinicalInterpretationForDecimal(decimal),
    failedTierIndex,
    completedAllTiers: false,
  };
}

/** Decimal ladder for engine indexing (derived from tiers). */
export const LANDOLT_DECIMAL_LADDER = LANDOLT_ACUITY_TIERS.map((t) => t.decimal);

/** Rebuild display report from a stored decimal score (e.g. from database). */
export function landoltReportFromStoredDecimal(decimalRaw) {
  const d = typeof decimalRaw === "number" ? decimalRaw : parseFloat(decimalRaw);
  if (Number.isNaN(d)) return null;

  const exact = LANDOLT_ACUITY_TIERS.find((t) => Math.abs(t.decimal - d) < 0.02);
  if (exact) {
    return buildResultFromTier(exact);
  }

  let passedIdx = -1;
  for (let i = 0; i < LANDOLT_ACUITY_TIERS.length; i++) {
    if (d >= LANDOLT_ACUITY_TIERS[i].decimal - 0.05) passedIdx = i;
  }
  if (passedIdx < 0) return { ...WORSE_THAN_FIRST_TIER };
  return buildResultFromTier(LANDOLT_ACUITY_TIERS[passedIdx]);
}
