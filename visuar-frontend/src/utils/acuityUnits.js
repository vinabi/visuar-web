/**
 * Decimal acuity for 60–80 cm screen-based vision tests.
 * Letter heights follow the 5 arcmin optotype rule: H = k / decimal (mm).
 */

import {
  OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL,
  TEST_DISTANCE_MM,
} from "./viewingDistance";

export { TEST_DISTANCE_MM, OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL };

/** Legacy 6/X Snellen → decimal acuity id (distance-independent). */
export const LEGACY_SNELLEN_TO_DECIMAL = {
  "6/60": "0.10",
  "6/48": "0.13",
  "6/42": "0.14",
  "6/36": "0.17",
  "6/30": "0.20",
  "6/24": "0.25",
  "6/21": "0.29",
  "6/18": "0.33",
  "6/15": "0.40",
  "6/12": "0.50",
  "6/10": "0.60",
  "6/9": "0.67",
  "6/8": "0.75",
  "6/7": "0.86",
  "6/6": "1.0",
  "6/5.5": "1.09",
  "6/5": "1.20",
  "6/4.5": "1.33",
  "6/4": "1.50",
  "6/3.5": "1.71",
  "6/3": "2.0",
};

/** @param {number} decimal */
export function decimalToHeightMm(decimal) {
  const d = Math.max(0.08, decimal);
  return OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL / d;
}

/** @param {string|number|null|undefined} level */
export function parseAcuityDecimal(level) {
  if (level == null) return 0.5;
  const s = String(level).trim();
  const legacy = LEGACY_SNELLEN_TO_DECIMAL[s];
  if (legacy) return parseFloat(legacy);
  const snellen = s.match(/^6\/(\d+(?:\.\d+)?)$/);
  if (snellen) return 6 / parseFloat(snellen[1]);
  const n = parseFloat(s);
  if (!Number.isNaN(n) && n > 0) return n;
  return 0.5;
}

/** Canonical key matching SNELLEN_ROWS_FULL / SNELLEN_LEVELS_FULL ids. */
export function canonicalAcuityKey(level) {
  const d = parseAcuityDecimal(level);
  const r = Math.round(d * 100) / 100;
  if (r >= 1 && r === Math.floor(r)) {
    return r.toFixed(1);
  }
  return r.toFixed(2);
}

/** Normalize stored level to canonical decimal string id. */
export function normalizeAcuityLevel(level) {
  if (level == null) return "0.50";
  const s = String(level).trim();
  if (LEGACY_SNELLEN_TO_DECIMAL[s]) return LEGACY_SNELLEN_TO_DECIMAL[s];
  const snellen = s.match(/^6\/(\d+(?:\.\d+)?)$/);
  if (snellen) {
    return canonicalAcuityKey(6 / parseFloat(snellen[1]));
  }
  const n = parseFloat(s);
  if (!Number.isNaN(n) && n > 0) return canonicalAcuityKey(n);
  return s;
}

/** @deprecated Use canonicalAcuityKey */
export function formatDecimalId(decimal) {
  return canonicalAcuityKey(decimal);
}

/** UI label for chart rows and results (may drop trailing zeros). */
export function formatAcuityLabel(level) {
  const key = normalizeAcuityLevel(level);
  const d = parseAcuityDecimal(key);
  if (d >= 1) {
    const rounded = Math.round(d * 100) / 100;
    if (rounded === Math.floor(rounded)) return rounded.toFixed(1);
    const s = rounded.toFixed(2);
    return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }
  return d.toFixed(2);
}

/** @param {string|number} level */
export function decimalToLogMAR(level) {
  return -Math.log10(parseAcuityDecimal(level));
}

/** Optional 6 m Snellen equivalent for display only. */
export function snellenEquivalent(level) {
  const d = parseAcuityDecimal(level);
  const denom = Math.round(6 / d);
  return `6/${denom}`;
}

/** Score 0–100 from decimal acuity (supports legacy 6/X strings). */
export function acuityToScore(acuityStr) {
  if (!acuityStr) return 20;
  const d = parseAcuityDecimal(acuityStr);
  if (d >= 2.0) return 100;
  if (d >= 1.0) return Math.round(85 + (d - 1) * 15);
  if (d >= 0.5) return Math.round(65 + (d - 0.5) * 40);
  if (d >= 0.25) return Math.round(40 + (d - 0.25) * 100);
  return Math.round(Math.max(10, d * 160));
}

/** Status bucket for results UI. */
export function acuityStatus(acuityStr) {
  if (!acuityStr) return "poor";
  const d = parseAcuityDecimal(acuityStr);
  if (d >= 1.0) return "excellent";
  if (d >= 0.5) return "good";
  if (d >= 0.25) return "moderate";
  return "poor";
}

