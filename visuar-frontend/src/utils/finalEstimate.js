/**
 * Smart screening estimate — weighted fusion (not a medical prescription).
 */

import { roundDiopter } from "./refractionMath";

export const CONFIDENCE = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGHER: "Higher",
  MIXED: "Mixed",
};

/** Weights for session weighted average on singleDiopterD. */
export const TEST_DIOPTER_WEIGHTS = {
  refraction_simulator: 0.5,
  refraction_battery: 0.5,
  snellen_acuity: 0.25,
  duochrome_refinement: 0.15,
  jaeger_acuity: 0.1,
};

const EXPLANATION_SINGLE_DIOPTER =
  "Approximate eyesight number combines the main focus number and astigmatism into one simple value. It is useful for understanding the result, but full glasses prescriptions also need cylinder and axis.";

function normalizeTestKey(testName, testId) {
  const raw = (testId || testName || "").toLowerCase();
  return raw.replace(/\s+/g, "_").replace(/-/g, "_");
}

export function computeSingleDiopterD(sphereD, cylinderD) {
  if (sphereD == null || Number.isNaN(sphereD)) return null;
  if (cylinderD == null || Number.isNaN(cylinderD)) return roundDiopter(sphereD);
  return roundDiopter(sphereD + cylinderD / 2);
}

export function getTestDiopterWeight(testName, testId, { visionFocus } = {}) {
  const key = normalizeTestKey(testName, testId);
  if (key.includes("contrast") || key.includes("near_far") || key.includes("orientation") || key.includes("rapid")) {
    return 0;
  }
  if (key.includes("simulator")) return TEST_DIOPTER_WEIGHTS.refraction_simulator;
  if (key.includes("battery")) return TEST_DIOPTER_WEIGHTS.refraction_battery;
  if (key.includes("snellen")) return TEST_DIOPTER_WEIGHTS.snellen_acuity;
  if (key.includes("duochrome")) return TEST_DIOPTER_WEIGHTS.duochrome_refinement;
  if (key.includes("jaeger")) {
    return visionFocus === "near" || visionFocus === "both"
      ? TEST_DIOPTER_WEIGHTS.jaeger_acuity
      : 0;
  }
  if (key.includes("astigmatism")) return 0;
  return 0;
}

function roundAxis(deg) {
  if (deg == null || Number.isNaN(deg)) return null;
  return Math.round(deg / 5) * 5;
}

function roundCylinder(cyl) {
  if (cyl == null || Number.isNaN(cyl)) return 0;
  return roundDiopter(cyl);
}

function enrichRecord(r) {
  const sphereD = r.sphereD ?? r.estimatedSphereD ?? null;
  const cylinderD = r.cylinderD ?? r.estimatedCylinderD ?? null;
  const singleDiopterD =
    r.singleDiopterD != null
      ? roundDiopter(r.singleDiopterD)
      : computeSingleDiopterD(sphereD, cylinderD);
  const weight =
    r.weight != null ? r.weight : getTestDiopterWeight(r.testName, r.testId, { visionFocus: r.visionFocus });
  const usedInSessionAverage =
    r.usedInSessionAverage != null
      ? r.usedInSessionAverage
      : singleDiopterD != null && weight > 0 && r.usedInFinalEstimate !== false;

  return {
    ...r,
    estimatedSphereD: sphereD,
    estimatedCylinderD: cylinderD,
    singleDiopterD,
    weight,
    usedInSessionAverage,
  };
}

/**
 * Weighted session average from all valid test records for one eye.
 */
function filterBySession(testResults, sessionId) {
  if (!sessionId) return testResults || [];
  return (testResults || []).filter((r) => !r.sessionId || r.sessionId === sessionId);
}

export function computeWeightedSessionAverage(testResults, eye, options = {}) {
  const scoped = filterBySession(testResults, options.sessionId);
  const list = scoped
    .map(enrichRecord)
    .filter((r) => (r.eye || "left").toLowerCase() === eye && r.usedInSessionAverage && r.singleDiopterD != null);

  if (list.length === 0) {
    return { sessionAverageDiopterD: null, testCount: 0, testsUsed: [], weights: {} };
  }

  const sumW = list.reduce((s, e) => s + (e.weight || 0), 0);
  const sessionAverageDiopterD = roundDiopter(
    list.reduce((s, e) => s + e.singleDiopterD * (e.weight || 0), 0) / (sumW || 1)
  );

  return {
    sessionAverageDiopterD,
    testCount: list.length,
    testsUsed: [...new Set(list.map((e) => e.testName))],
    weights: Object.fromEntries(list.map((e) => [e.testName, e.weight])),
  };
}

export function computeScreeningConfidence(singleDiopterSamples) {
  const vals = singleDiopterSamples.filter((v) => v != null && !Number.isNaN(v));
  if (vals.length <= 1) return CONFIDENCE.LOW;

  const spread = Math.max(...vals) - Math.min(...vals);
  if (spread > 0.75) return CONFIDENCE.MIXED;
  if (vals.length >= 3 && spread <= 0.5) return CONFIDENCE.HIGHER;
  if (vals.length >= 2 && spread <= 0.5) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.LOW;
}

/** Legacy sphere-only weighted fusion (kept for compatibility). */
export function computeWeightedSphere(testResults, { visionFocus } = {}) {
  const entries = [];
  for (const r of testResults.map(enrichRecord)) {
    if (r.estimatedSphereD == null || Number.isNaN(r.estimatedSphereD)) continue;
    if (r.usedInFinalEstimate === false) continue;
    const w = getTestDiopterWeight(r.testName, r.testId, { visionFocus });
    if (w <= 0) continue;
    entries.push({ d: r.estimatedSphereD, w, testName: r.testName });
  }

  if (entries.length === 0) return { sphereD: null, testsUsed: [], weights: {} };

  const sumW = entries.reduce((s, e) => s + e.w, 0);
  const sphereD = roundDiopter(entries.reduce((s, e) => s + e.d * e.w, 0) / (sumW || 1));

  return {
    sphereD,
    testsUsed: entries.map((e) => e.testName),
    weights: Object.fromEntries(entries.map((e) => [e.testName, e.w])),
  };
}

function buildEyeEstimate(list, eyeKey, options) {
  const { visionFocus, correctionMode, sessionId } = options;
  const session = computeWeightedSessionAverage(list, eyeKey, { visionFocus, sessionId });
  const { sphereD, testsUsed: sphereTests } = computeWeightedSphere(list, { visionFocus });

  const singleSamples = list
    .map(enrichRecord)
    .filter((r) => (r.eye || "left").toLowerCase() === eyeKey && r.usedInSessionAverage && r.singleDiopterD != null)
    .map((r) => r.singleDiopterD);

  const confidence = computeScreeningConfidence(singleSamples);
  const testCount = session.testCount;

  const cylEntry = list
    .map(enrichRecord)
    .find((r) => (r.eye || "left").toLowerCase() === eyeKey && r.estimatedCylinderD != null && Math.abs(r.estimatedCylinderD) >= 0.25);

  const eyeList = list.filter((r) => (r.eye || "left").toLowerCase() === eyeKey);

  const distanceAcuity =
    eyeList.find((r) => r.unit === "decimal" || r.unit === "snellen" || r.rawResult?.match?.(/^6\//) || r.rawResult?.match?.(/^\d+\.\d+$/))?.rawResult
    || eyeList.find((r) => r.distanceAcuity)?.distanceAcuity
    || null;

  const nearAcuity =
    eyeList.find((r) => r.unit === "jaeger" || /^J\d/i.test(r.rawResult || ""))?.rawResult
    || eyeList.find((r) => r.nearAcuity)?.nearAcuity
    || null;

  const latestSphere = [...eyeList].reverse().find((r) => r.estimatedSphereD != null)?.estimatedSphereD;
  const resolvedSphereD = sphereD ?? latestSphere ?? null;
  const cylinderD = cylEntry ? roundCylinder(cylEntry.estimatedCylinderD) : 0;
  const axis = cylEntry ? roundAxis(cylEntry.estimatedAxis) : null;
  const singleDiopterD =
    session.sessionAverageDiopterD ??
    computeSingleDiopterD(resolvedSphereD, cylinderD);

  return {
    sphereD: resolvedSphereD,
    cylinderD,
    axis,
    singleDiopterD,
    sessionAverageDiopterD: session.sessionAverageDiopterD ?? singleDiopterD,
    distanceAcuity,
    nearAcuity,
    correctionMode: correctionMode || "uncorrected",
    confidence,
    testCount,
    testsUsed: [...new Set([...session.testsUsed, ...sphereTests])],
    singleDiopterExplanation: EXPLANATION_SINGLE_DIOPTER,
  };
}

/**
 * Build per-eye + bilateral screening summary from accumulated test results.
 */
export function buildFinalScreeningEstimate(
  testResults,
  { visionFocus, correctionMode, sessionId } = {}
) {
  const scoped = filterBySession(testResults, sessionId);
  const enriched = scoped.map(enrichRecord);
  const byEye = { left: [], right: [] };
  for (const r of enriched) {
    const eye = (r.eye || "left").toLowerCase();
    if (byEye[eye]) byEye[eye].push(r);
  }

  const leftEye = buildEyeEstimate(enriched, "left", { visionFocus, correctionMode, sessionId });
  const rightEye = buildEyeEstimate(enriched, "right", { visionFocus, correctionMode, sessionId });
  const allTests = [...new Set([...leftEye.testsUsed, ...rightEye.testsUsed])];

  const diopterTests = enriched.filter((r) => r.usedInSessionAverage);
  const singleTestWarning = diopterTests.length <= 1;

  const disagree =
    leftEye.confidence === CONFIDENCE.MIXED ||
    rightEye.confidence === CONFIDENCE.MIXED ||
    (leftEye.confidence === CONFIDENCE.LOW &&
      rightEye.confidence === CONFIDENCE.LOW &&
      diopterTests.length >= 2);

  return {
    sessionId,
    visionFocus,
    correctionMode: correctionMode || "uncorrected",
    testsUsed: allTests,
    testCount: diopterTests.length,
    leftEye,
    rightEye,
    disagree,
    singleTestWarning,
    multiTestMessage:
      diopterTests.length > 1
        ? "This estimate combines the completed tests in this session."
        : null,
    singleDiopterExplanation: EXPLANATION_SINGLE_DIOPTER,
  };
}

/**
 * Normalize a test completion payload into storable screening records.
 */
export function normalizeTestResultRecord({
  testName,
  testId,
  eye,
  visionFocus,
  correctionMode,
  rawResult,
  unit,
  estimatedSphereD,
  estimatedCylinderD,
  estimatedAxis,
  confidenceScore,
  usedInFinalEstimate = true,
  usedInSessionAverage,
  weight,
  singleDiopterD,
  distanceAcuity,
  nearAcuity,
}) {
  const w = weight ?? getTestDiopterWeight(testName, testId, { visionFocus });
  const single =
    singleDiopterD != null
      ? roundDiopter(singleDiopterD)
      : computeSingleDiopterD(estimatedSphereD, estimatedCylinderD);
  const inSession =
    usedInSessionAverage != null
      ? usedInSessionAverage
      : single != null && w > 0 && usedInFinalEstimate !== false;

  const sphereD = estimatedSphereD;
  const cylinderD = estimatedCylinderD;
  const axis = estimatedAxis;

  return {
    testName: testName || testId,
    testId,
    eye,
    visionFocus,
    correctionMode,
    rawResult,
    unit,
    distanceAcuity,
    nearAcuity,
    sphereD,
    cylinderD,
    axis,
    estimatedSphereD,
    estimatedCylinderD,
    estimatedAxis,
    singleDiopterD: single,
    weight: w,
    confidenceScore,
    usedInFinalEstimate,
    usedInSessionAverage: inSession,
    aiExplanationInput: {
      testName: testName || testId,
      eye,
      rawResult,
      estimatedSphereD,
      estimatedCylinderD,
      estimatedAxis,
      singleDiopterD: single,
      correctionMode,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregate behavioral and reliability signals from all session test records.
 * Returns a fatigueSignals object Gemini can use to assess reliability.
 */
export function aggregateSessionSignals(testResults) {
  const records = (testResults || []).filter((r) => r.usedInFinalEstimate !== false || r.fatigueLevel);
  if (records.length === 0) return null;

  const fatigueLevels = records.map((r) => r.fatigueLevel).filter(Boolean);
  const worstFatigue = fatigueLevels.includes("Significant")
    ? "Significant"
    : fatigueLevels.includes("Mild")
      ? "Mild"
      : "None";

  const accuracies = records.map((r) => r.accuracy).filter((v) => v != null);
  const avgAccuracy = accuracies.length
    ? Math.round(accuracies.reduce((s, v) => s + v, 0) / accuracies.length)
    : null;

  const consistencies = records.map((r) => r.consistencyScore).filter((v) => v != null);
  const avgConsistency = consistencies.length
    ? Math.round(consistencies.reduce((s, v) => s + v, 0) / consistencies.length)
    : null;

  const pauseCounts = records.map((r) => r.pauseCount ?? 0);
  const totalPauses = pauseCounts.reduce((s, v) => s + v, 0);

  const stabilities = records.map((r) => r.sessionStability).filter((v) => v != null);
  const avgStability = stabilities.length
    ? Math.round(stabilities.reduce((s, v) => s + v, 0) / stabilities.length)
    : null;

  return {
    fatigueLevel: worstFatigue,
    averageAccuracy: avgAccuracy,
    averageConsistency: avgConsistency,
    totalPauseCount: totalPauses,
    averageSessionStability: avgStability,
    testCount: records.length,
    reliabilityNote:
      worstFatigue === "Significant" || totalPauses >= 4
        ? "Fatigue or frequent interruptions may have affected result reliability."
        : avgAccuracy != null && avgAccuracy < 55
          ? "Low accuracy across tests — results may be less reliable."
          : "Signals within acceptable range for screening.",
  };
}

/** Structured payload for Gemini — values pre-calculated by the app. */
export function buildGeminiScreeningPayload(finalEstimate, extra = {}) {
  if (!finalEstimate) return { screening_explanation: true, ...extra };
  const mapEye = (eye) => ({
    sphereD: eye?.sphereD ?? null,
    cylinderD: eye?.cylinderD ?? 0,
    axis: eye?.axis ?? null,
    singleDiopterD: eye?.singleDiopterD ?? eye?.sessionAverageDiopterD ?? null,
    sessionAverageDiopterD: eye?.sessionAverageDiopterD ?? eye?.singleDiopterD ?? null,
    distanceAcuity: eye?.distanceAcuity ?? null,
    nearAcuity: eye?.nearAcuity ?? null,
    confidence: eye?.confidence ?? CONFIDENCE.LOW,
    testCount: eye?.testCount ?? 0,
    testsUsed: eye?.testsUsed ?? [],
  });

  // Auto-aggregate fatigue/behavioral signals from session results if not provided
  const sessionResults = finalEstimate._sessionResults ?? null;
  const autoSignals = sessionResults ? aggregateSessionSignals(sessionResults) : null;

  const payload = {
    screening_explanation: true,
    visionFocus: finalEstimate.visionFocus,
    correctionMode: finalEstimate.correctionMode,
    testsCompleted: finalEstimate.testsUsed || [],
    testCount: finalEstimate.testCount ?? 0,
    single_test_warning: finalEstimate.singleTestWarning ?? false,
    results_disagree: finalEstimate.disagree ?? false,
    leftEye: mapEye(finalEstimate.leftEye),
    rightEye: mapEye(finalEstimate.rightEye),
    singleDiopterExplanation: "Approximate eyesight number = sphere + half of cylinder. Negative means myopia (difficulty seeing far). Positive means hyperopia (difficulty with near focus). Zero or near-zero is within normal screening range.",
    safetyNote: "VISUAR is a screening tool, not a medical prescription. Please visit an eye care professional before buying glasses or changing your prescription.",
  };

  // Merge auto signals if not already provided in extra
  if (autoSignals && !extra.fatigueSignals) {
    payload.fatigueSignals = autoSignals;
  }

  return { ...payload, ...extra };
}

/** Backfill singleDiopterD on legacy eye objects. */
export function enrichLegacyEyeEstimate(eye) {
  if (!eye) return eye;
  const sphereD = eye.sphereD ?? eye.sph ?? eye.diopter ?? eye.estimatedSphereD ?? null;
  const cylinderD = eye.cylinderD ?? eye.cyl ?? eye.estimatedCylinderD ?? 0;
  const singleDiopterD =
    eye.singleDiopterD ?? eye.sessionAverageDiopterD ?? computeSingleDiopterD(sphereD, cylinderD);
  return {
    ...eye,
    sphereD,
    cylinderD,
    axis: eye.axis ?? null,
    singleDiopterD,
    sessionAverageDiopterD: eye.sessionAverageDiopterD ?? singleDiopterD,
    singleDiopterExplanation: EXPLANATION_SINGLE_DIOPTER,
  };
}
