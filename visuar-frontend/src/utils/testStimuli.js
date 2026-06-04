/**
 * Shared stimulus definitions for vision tests — letter sets, difficulty progressions.
 */

import { normalizeAcuityLevel, parseAcuityDecimal } from "./acuityUnits";

/** Sloan / Snellen optotypes — chosen for high confusability (no N, H, M, etc.). */
export const SNELLEN_OPTOTYPES = ["C", "D", "E", "F", "L", "O", "P", "T", "Z"];
export const OPTOTYPES = SNELLEN_OPTOTYPES;
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Target iteration counts (full = standalone tests; quick = battery / complete assessment). */
export const FULL_ITERATIONS = 15;
export const QUICK_ITERATIONS = 7;

/** Jaeger display scale (near chart only). */
export const JAEGER_DISPLAY_SCALE = 0.82;

export const JAEGER_MIN_PX = 12;
export const JAEGER_MAX_PX = 36;

// ─── Distance acuity chart @ 60–80 cm — decimal notation (not 6/X) ─────────

/** Screener row (moderate difficulty). */
export const SCREENER_ACUITY_LEVEL = "0.33";

/** @param {string|string[]} row */
function parseRow(row) {
  if (Array.isArray(row)) return row.map((c) => String(c).toUpperCase());
  return String(row).replace(/\s+/g, "").split("");
}

/** Active full ladder — classic 11-row Snellen (easiest → hardest). */
export const SNELLEN_LEVELS_FULL = [
  "0.10",
  "0.13",
  "0.17",
  "0.25",
  "0.33",
  "0.40",
  "0.50",
  "0.67",
  "0.86",
  "1.0",
  "1.33",
];

/** Quick ladder for battery / complete assessment (7 levels). */
export const SNELLEN_LEVELS_QUICK = [
  "0.33",
  "0.40",
  "0.50",
  "0.67",
  "0.86",
  "1.0",
  "1.20",
];

export const SNELLEN_ROWS_FULL = {
  "0.10": ["E"],
  "0.13": ["F", "P"],
  "0.17": ["T", "O", "Z"],
  "0.25": ["L", "P", "E", "D"],
  "0.33": ["P", "E", "C", "F", "D"],
  "0.40": ["E", "D", "F", "C", "Z"],
  "0.50": ["F", "E", "L", "O", "P"],
  "0.67": ["D", "E", "F", "P", "O", "T"],
  "0.86": ["E", "D", "F", "C", "Z", "P"],
  "1.0": ["F", "E", "L", "O", "P", "Z", "D"],
  "1.33": ["P", "E", "Z", "O", "L", "C", "F"],
};

/** @deprecated Legacy 6/X chart — retained for old result rendering only */
export const SNELLEN_CHART_LEGACY = {
  "6/60": "E",
  "6/48": "FP",
  "6/36": "LPE",
};

export const DISTANCE_TEXT_LEVELS = [...SNELLEN_LEVELS_FULL];
export const DISTANCE_TEXT_LEVELS_QUICK = [...SNELLEN_LEVELS_QUICK];

export const SNELLEN_ROWS = SNELLEN_LEVELS_FULL.map((level) => ({
  level,
  letters: parseRow(SNELLEN_ROWS_FULL[level]).join(""),
}));

export const SNELLEN_ACUITY_LEVELS = [...SNELLEN_LEVELS_FULL];

/** @deprecated use SNELLEN_CHART_LEGACY */
export const SNELLEN_CHART_FULL = SNELLEN_ROWS_FULL;

export function getSnellenLevels(quickMode = false) {
  return quickMode ? [...SNELLEN_LEVELS_QUICK] : [...SNELLEN_LEVELS_FULL];
}

export function getSnellenRowLetters(level, quickMode = false) {
  const raw = String(level ?? "").trim();
  const key = normalizeAcuityLevel(level);
  const row =
    SNELLEN_ROWS_FULL[raw] ??
    SNELLEN_ROWS_FULL[key];
  if (row) return [...row];
  const legacy = SNELLEN_CHART_LEGACY[level];
  if (legacy) return parseRow(legacy);
  const decimal = parseAcuityDecimal(key);
  return pickConfusableOptotypes(letterCountForDecimal(decimal), decimal);
}

/** Letter gap as fraction of cap height — tighter on harder rows (crowding). */
export function getSnellenLetterGapRatio(level) {
  const d = parseAcuityDecimal(level);
  if (d >= 1.33) return 0.02;
  if (d >= 1.0) return 0.035;
  if (d >= 0.67) return 0.05;
  if (d >= 0.33) return 0.065;
  return 0.1;
}

export function snellenPassThreshold(letterCount) {
  if (letterCount <= 1) return 1;
  if (letterCount <= 3) return letterCount;
  return 3;
}

// ─── Jaeger near chart ─────────────────────────────────────────────────────────

function uniqueDescendingInts(from, to, count) {
  if (count <= 1) return [from];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    let v = Math.round(from + (to - from) * t);
    v = Math.max(to, Math.min(from, v));
    while (seen.has(v) && v > to) v -= 1;
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  while (out.length < count) {
    const candidate = (out[out.length - 1] ?? to) - 1;
    if (candidate >= to && !seen.has(candidate)) {
      seen.add(candidate);
      out.push(candidate);
    } else break;
  }
  return out.sort((a, b) => b - a);
}

/** Readable multi-character rows per Jaeger level (no single repeated letter). */
const JAEGER_ROW_BY_N = {
  32: "READ",
  28: "NEAR",
  24: "TEXT",
  20: "BOOK",
  18: "PAGE",
  16: "LINE",
  14: "WORD",
  12: "TYPE",
  10: "FOCUS",
  8: "CLEAR",
  7: "SHARP",
  6: "CLOSE",
  5: "FINE",
  4: "TINY",
  3: "DOT",
};

function jaegerRowForN(n) {
  if (JAEGER_ROW_BY_N[n]) return JAEGER_ROW_BY_N[n];
  const len = n >= 20 ? 4 : n >= 10 ? 5 : 6;
  return pickOptotypes(len).join("");
}

function buildJaegerRows(nValues) {
  return nValues.map((n) => ({
    level: `N${n}`,
    letters: jaegerRowForN(n),
  }));
}

export const NEAR_TEXT_LEVELS = uniqueDescendingInts(32, 3, FULL_ITERATIONS).map((n) => `N${n}`);
export const NEAR_TEXT_LEVELS_QUICK = uniqueDescendingInts(24, 5, QUICK_ITERATIONS).map((n) => `N${n}`);

export const JAEGER_ROWS = buildJaegerRows(
  NEAR_TEXT_LEVELS.map((l) => parseInt(l.slice(1), 10))
);
export const JAEGER_ROWS_QUICK = buildJaegerRows(
  NEAR_TEXT_LEVELS_QUICK.map((l) => parseInt(l.slice(1), 10))
);

export function getJaegerLevels(quickMode = false) {
  return quickMode ? [...NEAR_TEXT_LEVELS_QUICK] : [...NEAR_TEXT_LEVELS];
}

export function getJaegerRowLetters(level, quickMode = false) {
  const rows = quickMode ? JAEGER_ROWS_QUICK : JAEGER_ROWS;
  const row = rows.find((r) => r.level === level);
  if (row) return parseRow(row.letters);
  return pickOptotypes(5);
}

// ─── Contrast sensitivity ──────────────────────────────────────────────────────

// Contrast levels redesigned for 60–80 cm screen testing:
// - Font size stays stable (44-46 px) for the first 8 levels so only contrast changes
// - Start with 2 letters from level 0 so the format is consistent throughout
// - Contrast drops more gradually in the easy-to-medium range (90 → 60 % over 4 steps)
// - Font only shrinks noticeably at the hardest levels (levels 12-14)
export const CONTRAST_LEVELS = [
  { percent: 90, fontPx: 46, letterCount: 2 },
  { percent: 80, fontPx: 46, letterCount: 2 },
  { percent: 70, fontPx: 44, letterCount: 2 },
  { percent: 60, fontPx: 44, letterCount: 2 },
  { percent: 50, fontPx: 44, letterCount: 3 },
  { percent: 42, fontPx: 42, letterCount: 3 },
  { percent: 34, fontPx: 42, letterCount: 3 },
  { percent: 27, fontPx: 40, letterCount: 3 },
  { percent: 21, fontPx: 40, letterCount: 4 },
  { percent: 16, fontPx: 38, letterCount: 4 },
  { percent: 12, fontPx: 38, letterCount: 4 },
  { percent: 9,  fontPx: 36, letterCount: 4 },
  { percent: 6,  fontPx: 36, letterCount: 5 },
  { percent: 4,  fontPx: 34, letterCount: 5 },
  { percent: 3,  fontPx: 32, letterCount: 5 },
];

export const CONTRAST_LEVELS_QUICK = [
  { percent: 90, fontPx: 46, letterCount: 2 },
  { percent: 70, fontPx: 44, letterCount: 2 },
  { percent: 50, fontPx: 44, letterCount: 3 },
  { percent: 34, fontPx: 42, letterCount: 3 },
  { percent: 21, fontPx: 40, letterCount: 4 },
  { percent: 10, fontPx: 38, letterCount: 4 },
  { percent: 5,  fontPx: 34, letterCount: 5 },
];

/** @deprecated alias */
export const CONTRAST_PERCENT_LEVELS = CONTRAST_LEVELS.map(({ percent }) => ({
  percent,
  blurPx: 0,
}));

export function getContrastLevels(quickMode = false) {
  return quickMode ? CONTRAST_LEVELS_QUICK : CONTRAST_LEVELS;
}

export function contrastGrayValue(percent, isDarkMode) {
  const p = Math.max(0, Math.min(100, percent));
  if (isDarkMode) {
    return Math.round(255 * (p / 100));
  }
  return Math.round(255 * (1 - p / 100));
}

// ─── Duochrome ─────────────────────────────────────────────────────────────────

const DUOCHROME_ACUITIES_FULL = [
  "0.13",
  "0.14",
  "0.17",
  "0.20",
  "0.25",
  "0.29",
  "0.33",
  "0.40",
  "0.50",
  "0.60",
  "0.67",
  "0.75",
  "0.86",
  "1.0",
  "1.0",
];

const DUOCHROME_ACUITIES_QUICK = ["0.17", "0.25", "0.33", "0.50", "0.67", "0.86", "1.0"];

const DUOCHROME_LETTER_ROWS = [
  "FP",
  "TOZ",
  "LPE",
  "DEF",
  "FPTO",
  "OLCD",
  "PECFD",
  "EDFCZ",
  "FELOP",
  "DEFPOT",
  "EDFCZP",
  "CDEFLO",
  "PTOZLF",
  "FELOPZD",
  "PEZOCLFT",
];

function buildDuochromeRounds(count) {
  const acuities = count <= QUICK_ITERATIONS ? DUOCHROME_ACUITIES_QUICK : DUOCHROME_ACUITIES_FULL;
  const rows = DUOCHROME_LETTER_ROWS.slice(0, count);
  return acuities.slice(0, count).map((acuityLevel, i) => ({
    acuityLevel,
    letters: rows[i] || rows[rows.length - 1],
    letterCount: parseRow(rows[i] || "PECF").length,
  }));
}

export const DUOCHROME_ROUNDS = buildDuochromeRounds(FULL_ITERATIONS);
export const DUOCHROME_ROUNDS_QUICK = buildDuochromeRounds(QUICK_ITERATIONS);

export function getDuochromeRounds(quickMode = false) {
  return quickMode ? DUOCHROME_ROUNDS_QUICK : DUOCHROME_ROUNDS;
}

// ─── Refraction simulator ──────────────────────────────────────────────────────

const REFRACTION_LETTER_ROWS = [
  "CDE",
  "FPT",
  "LPE",
  "DEF",
  "FPTO",
  "OLCD",
  "PECFD",
  "EDFCZ",
  "FELOP",
  "DEFPOT",
  "EDFCZP",
  "CDEFLO",
  "PTOZLF",
  "FELOPZD",
  "PEZOCLFT",
];

const REFRACTION_DECIMALS_FULL = [
  "0.13", "0.14", "0.17", "0.20", "0.25", "0.29", "0.33", "0.40",
  "0.50", "0.60", "0.67", "0.75", "0.86", "1.0", "1.20",
];

const REFRACTION_DECIMALS_QUICK = ["0.17", "0.25", "0.33", "0.50", "0.67", "0.86", "1.0"];

function buildRefractionRounds(count) {
  const decimals =
    count <= QUICK_ITERATIONS
      ? REFRACTION_DECIMALS_QUICK.slice(0, count)
      : REFRACTION_DECIMALS_FULL.slice(0, count);
  return decimals.map((acuityLevel, i) => {
    const t = count <= 1 ? 0 : i / (count - 1);
    const letters = REFRACTION_LETTER_ROWS[i] || REFRACTION_LETTER_ROWS[REFRACTION_LETTER_ROWS.length - 1];
    return {
      acuityLevel,
      letters,
      letterCount: parseRow(letters).length,
      blurMultiplier: Math.round((1.45 - t * 0.93) * 100) / 100,
      lensStep: t < 0.35 ? 0.5 : t < 0.65 ? 0.35 : 0.25,
    };
  });
}

export const REFRACTION_ROUNDS = buildRefractionRounds(FULL_ITERATIONS);
export const REFRACTION_ROUNDS_QUICK = buildRefractionRounds(QUICK_ITERATIONS);

/** @deprecated alias */
export const REFRACTION_SCRIPT_ROUNDS = REFRACTION_ROUNDS;

export function getRefractionRounds(quickMode = false) {
  return quickMode ? REFRACTION_ROUNDS_QUICK : REFRACTION_ROUNDS;
}

export function getRefractionRoundLetters(roundIndex, quickMode = false) {
  const rounds = getRefractionRounds(quickMode);
  const cfg = rounds[Math.min(roundIndex, rounds.length - 1)];
  return parseRow(cfg?.letters || "FPT");
}

// ─── Astigmatism fan ───────────────────────────────────────────────────────────

export const ASTIGMATISM_FAN_ROUNDS = 1;
export const ASTIGMATISM_FAN_LINE_COUNT = 12;

const QUICK_MODE_TEST_IDS = new Set(["refraction-battery", "complete", "quick-screener"]);

/**
 * Battery and complete assessment default to quick (7 steps).
 * Standalone tests default to full (15 steps). Override with ?mode=full|quick.
 */
export function isQuickMode(testId, searchParams) {
  const mode = searchParams?.get?.("mode");
  if (mode === "full") return false;
  if (mode === "quick") return true;
  return QUICK_MODE_TEST_IDS.has(testId);
}

function letterCountForDecimal(decimal) {
  if (decimal <= 0.17) return 1;
  if (decimal <= 0.25) return 2;
  if (decimal <= 0.33) return 3;
  if (decimal <= 0.5) return 5;
  if (decimal <= 0.67) return 6;
  return 7;
}

/** Blocky (E/F/P/L/T) vs rounded (C/D/O/Z) — alternates for harder rows. */
const CONFUSABLE_GROUPS = [
  ["E", "F", "P", "L", "T"],
  ["C", "D", "O", "Z"],
];

function pickConfusableOptotypes(count, difficulty = 0.5) {
  const hard = difficulty >= 0.67;
  const result = [];
  let last = null;
  let groupIdx = 0;
  for (let i = 0; i < count; i++) {
    const group = CONFUSABLE_GROUPS[groupIdx % CONFUSABLE_GROUPS.length];
    const other = CONFUSABLE_GROUPS[(groupIdx + 1) % CONFUSABLE_GROUPS.length];
    const pool = hard && i % 2 === 1 ? other : group;
    const avail = pool.filter((c) => c !== last);
    const ch = avail[Math.floor(Math.random() * avail.length)] ?? pool[0];
    result.push(ch);
    last = ch;
    if (hard) groupIdx += 1;
  }
  return result;
}

export function pickOptotypes(count, exclude = []) {
  const pool = OPTOTYPES.filter((c) => !exclude.includes(c));
  const result = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    const avail = pool.filter((c) => !exclude.includes(c) && c !== last);
    const src = avail.length ? avail : pool.filter((c) => c !== last);
    const fallback = src.length ? src : OPTOTYPES;
    const ch = fallback[Math.floor(Math.random() * fallback.length)];
    result.push(ch);
    last = ch;
  }
  return result;
}

export function pickRandomLetters(count, exclude = []) {
  const pool = ALPHABET.filter((c) => !exclude.includes(c));
  const result = [];
  for (let i = 0; i < count; i++) {
    const avail = pool.filter((c) => !result.includes(c));
    const src = avail.length ? avail : ALPHABET;
    result.push(src[Math.floor(Math.random() * src.length)]);
  }
  return result;
}

function contrastLettersFromSeed(seedIndex, letterCount) {
  const seed = REFRACTION_LETTER_ROWS[seedIndex % REFRACTION_LETTER_ROWS.length];
  let letters = parseRow(seed);
  if (letters.length < letterCount) {
    const extra = parseRow(
      REFRACTION_LETTER_ROWS[(seedIndex + 1) % REFRACTION_LETTER_ROWS.length]
    );
    for (const ch of extra) {
      if (letters.length >= letterCount) break;
      if (!letters.includes(ch)) letters.push(ch);
    }
    const pool = OPTOTYPES.filter((c) => !letters.includes(c));
    let i = 0;
    while (letters.length < letterCount && pool.length > 0) {
      letters.push(pool[(seedIndex + i) % pool.length]);
      i += 1;
    }
  }
  if (letters.length > letterCount) {
    letters = letters.slice(0, letterCount);
  }
  return letters;
}

/** Pick contrast row letters for a level (stable per round index, varied across rounds). */
export function pickContrastRowLetters(levelIndex, letterCount, recentRows = []) {
  for (let offset = 0; offset < REFRACTION_LETTER_ROWS.length; offset += 1) {
    const letters = contrastLettersFromSeed(levelIndex + offset, letterCount);
    const key = letters.join("");
    if (!recentRows.includes(key)) return letters;
  }
  return contrastLettersFromSeed(levelIndex, letterCount);
}

/** Score letter-by-letter response vs expected. */
export function scoreLetterResponse(expectedText, userTypedText) {
  const expected = String(expectedText || "").toUpperCase().replace(/[^A-Z]/g, "");
  const typed = String(userTypedText || "").toUpperCase().replace(/[^A-Z]/g, "");
  const len = Math.max(expected.length, typed.length);
  let correctCount = 0;
  let wrongCount = 0;
  const positionMatches = [];
  for (let i = 0; i < len; i++) {
    const expCh = expected[i];
    const typCh = typed[i];
    const match = expCh && typCh && expCh === typCh;
    positionMatches.push(!!match);
    if (i < expected.length) {
      if (typCh === expCh) correctCount += 1;
      else wrongCount += 1;
    }
  }
  const accuracyPercent =
    expected.length > 0 ? Math.round((correctCount / expected.length) * 100) : 0;
  return {
    expectedText: expected,
    userTypedText: typed,
    correctCount,
    wrongCount,
    positionMatches,
    accuracyPercent,
  };
}

/**
 * Primary axis from selected line angles (degrees, 15° steps).
 * Returns { primaryAxis, uncertain }.
 */
export function computePrimaryAxis(selectedAngles) {
  if (!selectedAngles?.length) return { primaryAxis: null, uncertain: true };
  const angles = [...selectedAngles].map((a) => ((a % 180) + 180) % 180);
  if (angles.length === 1) {
    return { primaryAxis: Math.round(angles[0]) % 180, uncertain: false };
  }
  const sorted = [...angles].sort((a, b) => a - b);
  const step = 180 / ASTIGMATISM_FAN_LINE_COUNT;
  const isAdjacent = (a, b) => {
    const diff = Math.abs(a - b);
    return diff <= step + 0.5 || Math.abs(diff - 180) <= step + 0.5;
  };
  let adjacent = true;
  for (let i = 1; i < sorted.length; i++) {
    if (!isAdjacent(sorted[i - 1], sorted[i])) {
      adjacent = false;
      break;
    }
  }
  if (!adjacent) {
    const first = ((selectedAngles[0] % 180) + 180) % 180;
    return { primaryAxis: Math.round(first) % 180, uncertain: true };
  }
  const primaryAxis = Math.round(sorted.reduce((s, a) => s + a, 0) / sorted.length) % 180;
  return { primaryAxis, uncertain: false };
}
