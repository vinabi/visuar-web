import { API_URL } from "./config";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import { buildGeminiScreeningPayload } from "../utils/finalEstimate";
import {
  contrastAbilityLabel,
  contrastReliabilityLabel,
  buildContrastPlainMeaning,
  formatFaintestContrastRead,
} from "../utils/contrastResults";

export const AI_ANALYSIS_TIMEOUT_MS = 20000;

export const emptyAiAnalysis = () => ({
  findings: [],
  recommendations: [],
  summary: "",
});

export function mapApiResponseToAiAnalysis(ai) {
  if (!ai || ai.error) return emptyAiAnalysis();
  const screening = ai.screening || {};
  const summary =
    ai.summary ||
    screening.summary_en ||
    "";
  const summaryUr = ai.summary_ur || screening.summary_ur || "";
  let findings = ai.findings || [];
  let recommendations = ai.recommendations || screening.recommendations_en || [];

  // Build findings from screening blocks if legacy list is empty
  if (!findings.length && screening.findings?.length) {
    findings = screening.findings.map((f) => ({
      type: f.type || "info",
      title: f.title || "",
      description: f.description_en || f.description || "",
      description_ur: f.description_ur || "",
    }));
  }
  if (!recommendations.length && screening.recommendations_en?.length) {
    recommendations = screening.recommendations_en;
  }
  if (!findings.length && screening.units_explained_en) {
    findings.push({
      type: "info",
      title: "What the units mean",
      description: screening.units_explained_en,
      description_ur: screening.units_explained_ur || "",
    });
  }

  return {
    findings,
    recommendations,
    recommendations_ur: ai.recommendations_ur || screening.recommendations_ur || [],
    summary,
    summary_ur: summaryUr,
    screening,
    safety_note_en: ai.safety_note_en || screening.safety_note_en || "",
    safety_note_ur: ai.safety_note_ur || screening.safety_note_ur || "",
    lifestyle_do_en: screening.lifestyle_do_en || ai.lifestyle_do_en || [],
    lifestyle_do_ur: screening.lifestyle_do_ur || ai.lifestyle_do_ur || [],
    lifestyle_avoid_en: screening.lifestyle_avoid_en || ai.lifestyle_avoid_en || [],
    lifestyle_avoid_ur: screening.lifestyle_avoid_ur || ai.lifestyle_avoid_ur || [],
    nutrition_notes_en: screening.nutrition_notes_en || ai.nutrition_notes_en || "",
    nutrition_notes_ur: screening.nutrition_notes_ur || ai.nutrition_notes_ur || "",
  };
}

export const emptyAiPayload = () => ({
  ai_findings: null,
  ai_recommendations: null,
  ai_summary: null,
  aiAnalysis: emptyAiAnalysis(),
});

export async function fetchAIAnalysis(testType, testData, userProfile = null) {
  try {
    const context = {
      test_type: testType,
      ...testData,
      ...(userProfile ? { userProfile } : {}),
    };
    const res = await fetchWithTimeout(
      `${API_URL}/api/analyze-results`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      },
      AI_ANALYSIS_TIMEOUT_MS
    );
    if (!res.ok) {
      console.warn("[VISUAR] AI analysis HTTP", res.status);
      return emptyAiPayload();
    }
    const ai = await res.json();
    const aiAnalysis = mapApiResponseToAiAnalysis(ai);
    return {
      ai_findings: JSON.stringify(aiAnalysis.findings),
      ai_recommendations: JSON.stringify(aiAnalysis.recommendations),
      ai_summary: aiAnalysis.summary,
      aiAnalysis,
    };
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    console.error(`[VISUAR] AI analysis ${isTimeout ? "timed out" : "error"}:`, err);
    return emptyAiPayload();
  }
}

function mapEyeForAI(eye) {
  if (!eye) return null;
  return {
    acuity: eye.acuity ?? eye.distanceAcuity ?? null,
    nearAcuity: eye.nearAcuity ?? eye.jaegerJ ?? null,
    sphereD: eye.sphereD ?? eye.sph ?? eye.diopter ?? null,
    cylinderD: eye.cylinderD ?? eye.cyl ?? 0,
    axis: eye.axis ?? null,
    singleDiopterD: eye.singleDiopterD ?? null,
    jaegerJ: eye.jaegerJ ?? null,
    nearLevel: eye.nearLevel ?? null,
  };
}

/** Build Gemini payload from results page state for on-mount fetch. */
export function buildResultsAIPayload(testType, ctx) {
  const {
    resultState,
    persistedState,
    effectiveResultState,
    contrastData,
    orientationData,
    colorVisionData,
    landoltData,
    rapidData,
    refractionData,
    userProfile,
  } = ctx;

  const state = resultState || persistedState;
  const profile = userProfile || null;
  const base = { userProfile: profile, correctionMode: state?.correctionMode, visionFocus: state?.visionFocus };

  switch (testType) {
    case "snellen-acuity": {
      const d = effectiveResultState || state;
      if (!d?.leftEye && !d?.rightEye) return null;
      return buildGeminiScreeningPayload(d.finalEstimate, {
        ...base,
        test_type: "snellen_acuity",
        screening_explanation: true,
        snellenResult: {
          leftAcuity: d.leftEye?.acuity,
          rightAcuity: d.rightEye?.acuity,
          leftSphereD: d.leftEye?.sph ?? d.leftEye?.diopter,
          rightSphereD: d.rightEye?.sph ?? d.rightEye?.diopter,
          leftCylinderD: d.leftEye?.cyl,
          rightCylinderD: d.rightEye?.cyl,
          leftAxis: d.leftEye?.axis,
          rightAxis: d.rightEye?.axis,
        },
        fatigueSignals: {
          fatigueLevel: d.fatigueLevel,
          pauseCount: d.pauseCount,
          consistencyScore: d.consistencyScore,
          sessionStability: d.sessionStability,
        },
      });
    }
    case "jaeger-acuity": {
      if (!state?.leftEye && !state?.rightEye) return null;
      return {
        ...base,
        test_type: "jaeger_acuity",
        screening_explanation: true,
        leftEye: mapEyeForAI(state.leftEye),
        rightEye: mapEyeForAI(state.rightEye),
      };
    }
    case "near-far-switching": {
      const nf = state?.nearFarData;
      if (!nf) return null;
      return {
        ...base,
        test_type: "near_far_switching",
        nearFarResult: {
          score: nf.nearFarScore,
          roundsPassed: nf.roundsPassed,
          totalRounds: nf.totalRounds,
        },
      };
    }
    case "contrast-sensitivity": {
      if (!contrastData) return null;
      const score = contrastData.contrastScore ?? 0;
      return {
        ...base,
        test_type: "contrast_sensitivity",
        screening_explanation: true,
        contrastResult: {
          ability: contrastAbilityLabel(score),
          reliability: contrastReliabilityLabel({
            accuracy: contrastData.accuracy,
            fatigueLevel: contrastData.fatigueLevel,
          }),
          faintestContrastRead: formatFaintestContrastRead(
            contrastData.faintestContrastPercent ?? contrastData.lowestContrastValue
          ),
          accuracyPercent: contrastData.accuracy,
          fatigueLevel: contrastData.fatigueLevel,
          plainMeaning: buildContrastPlainMeaning({
            contrastScore: score,
            accuracy: contrastData.accuracy,
            fatigueLevel: contrastData.fatigueLevel,
          }),
        },
        leftEye: contrastData.leftEye ? { contrastScore: contrastData.leftEye.contrastScore } : null,
        rightEye: contrastData.rightEye ? { contrastScore: contrastData.rightEye.contrastScore } : null,
      };
    }
    case "orientation-discrimination": {
      if (!orientationData) return null;
      return {
        ...base,
        test_type: "orientation_discrimination",
        overall_score: orientationData.orientationScore,
        accuracy_percent: orientationData.accuracy,
        threshold_level: orientationData.thresholdLevel,
        fatigue: orientationData.fatigueLevel,
      };
    }
    case "color-vision": {
      if (!colorVisionData) return null;
      return {
        ...base,
        test_type: "color_vision",
        overall_score: colorVisionData.score ?? colorVisionData.colorVisionScore,
        cvd_risk: colorVisionData.cvdRisk,
        cvd_type: colorVisionData.cvdType,
        level1_errors: colorVisionData.l1Errors,
        level1_total: colorVisionData.l1Total,
      };
    }
    case "landolt-acuity": {
      if (!landoltData) return null;
      return {
        ...base,
        test_type: "landolt_acuity",
        landoltScore: landoltData.landoltScore,
        leftEye: landoltData.leftEye,
        rightEye: landoltData.rightEye,
        leftDecimal: landoltData.leftDecimal,
        rightDecimal: landoltData.rightDecimal,
        fatigue: landoltData.fatigueLevel,
      };
    }
    case "rapid-recognition": {
      if (!rapidData) return null;
      return {
        ...base,
        test_type: "rapid_recognition",
        overall_score: rapidData.rapidScore,
        accuracy_percent: rapidData.accuracy,
        highest_level: rapidData.highestLevel,
        fatigue: rapidData.fatigueLevel,
      };
    }
    case "complete": {
      if (!state) return null;
      return buildGeminiScreeningPayload(state.finalEstimate, {
        ...base,
        test_type: "complete_assessment",
        screening_explanation: true,
        distanceAcuity: state.distanceAcuity,
        nearAcuity: state.nearAcuity,
        testsCompleted: ["Complete assessment"],
      });
    }
    case "refraction-battery":
    case "duochrome-refinement":
    case "refraction-simulator":
    case "astigmatism-fan": {
      const d = refractionData || state;
      if (!d?.leftEye && !d?.rightEye) return null;
      return buildGeminiScreeningPayload(d.finalEstimate, {
        ...base,
        test_type: testType.replace(/-/g, "_"),
        screening_explanation: true,
        refractionResult: {
          leftSphereD: d.leftEye?.sph ?? d.leftEye?.diopter,
          rightSphereD: d.rightEye?.sph ?? d.rightEye?.diopter,
          leftCylinderD: d.leftEye?.cyl ?? 0,
          rightCylinderD: d.rightEye?.cyl ?? 0,
          leftAxis: d.leftEye?.axis,
          rightAxis: d.rightEye?.axis,
          leftAcuity: d.leftEye?.acuity,
          rightAcuity: d.rightEye?.acuity,
        },
      });
    }
    default:
      return null;
  }
}

/** Persist AI fields on an existing test result (Dashboard generate flow). */
export async function saveAIAnalysisToDB(resultId, aiData, accessToken) {
  if (!resultId || !accessToken || !aiData?.ai_findings) return false;
  try {
    const res = await fetch(`${API_URL}/api/test-results/${resultId}/ai`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ai_findings: aiData.ai_findings,
        ai_recommendations: aiData.ai_recommendations,
        ai_summary: aiData.ai_summary,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[VISUAR] Save AI analysis error:", err);
    return false;
  }
}

/** Merge AI into session summary / persisted results after background fetch. */
export function mergeAIIntoPersistedResult(slug, aiData) {
  if (!slug || !aiData?.aiAnalysis?.findings?.length) return;
  try {
    const key = `visuar_last_result_${slug}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    const prev = JSON.parse(raw);
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...prev, aiAnalysis: aiData.aiAnalysis })
    );
  } catch {
    /* ignore */
  }
}
