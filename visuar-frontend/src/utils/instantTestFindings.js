import {
  buildJaegerFindings,
  buildJaegerRecommendations,
  buildNearFarFindings,
  buildNearFarRecommendations,
  buildRefractionFindings,
  buildRefractionRecommendations,
} from "./jaegerResults";

const REFRACTION_SLUGS = new Set([
  "refraction-battery",
  "duochrome-refinement",
  "refraction-simulator",
]);

/**
 * Rule-based findings shown immediately on the results page (before Gemini returns).
 */
export function buildInstantFindings(testType, state) {
  if (!state) return [];

  switch (testType) {
    case "jaeger-acuity":
      return buildJaegerFindings(state.leftEye, state.rightEye);
    case "near-far-switching":
      return buildNearFarFindings(state.nearFarData);
    default:
      if (REFRACTION_SLUGS.has(testType) && state.leftEye && state.rightEye) {
        return buildRefractionFindings(state.leftEye, state.rightEye, {
          visionFocus: state.visionFocus,
        });
      }
      return [];
  }
}

export function buildInstantRecommendations(testType, state) {
  if (!state) return [];

  switch (testType) {
    case "jaeger-acuity":
      return buildJaegerRecommendations(state.leftEye, state.rightEye);
    case "near-far-switching":
      return buildNearFarRecommendations(state.nearFarData);
    default:
      if (REFRACTION_SLUGS.has(testType) && state.leftEye && state.rightEye) {
        return buildRefractionRecommendations(state.leftEye, state.rightEye, {
          visionFocus: state.visionFocus,
        });
      }
      return [];
  }
}
