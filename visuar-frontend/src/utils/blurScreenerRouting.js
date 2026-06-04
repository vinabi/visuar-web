/**
 * Blur screener scoring and routing — no final eyesight estimates.
 */

import { VISION_FOCUS } from "./visionFocus";
import { TEST_IDS } from "./testCatalog";

export const RECOMMENDED_FLOW = {
  DISTANCE: "distance",
  NEAR: "near",
  FULL: "full",
  OPTIONAL: "optional",
};

export const GOOD_SCORE = 0.75;

export const ROUTE_MESSAGES = {
  [RECOMMENDED_FLOW.DISTANCE]:
    "Your answers suggest distance blur, so we'll start with the far vision test.",
  [RECOMMENDED_FLOW.NEAR]:
    "Your answers suggest near blur, so we'll start with the near vision test.",
  [RECOMMENDED_FLOW.FULL]:
    "Your answers suggest both near and far blur, so we'll run a fuller check.",
  [RECOMMENDED_FLOW.OPTIONAL]:
    "No strong blur pattern was detected. You can still take the full test for a more complete estimate.",
};

/**
 * @param {{ correct: number, wrong: number, unsure: number, skipped: number, total: number, confidenceSum?: number, confidenceCount?: number }} stats
 */
export function scorePart(stats) {
  const total =
    stats.total ??
    stats.correct + stats.wrong + (stats.unsure ?? 0) + (stats.skipped ?? 0);
  const answered = Math.max(total, 1);
  return {
    score: stats.correct / answered,
    difficulty: (stats.wrong ?? 0) + (stats.unsure ?? 0) + (stats.skipped ?? 0),
    total: answered,
    avgConfidence:
      stats.confidenceCount > 0
        ? stats.confidenceSum / stats.confidenceCount
        : null,
  };
}

/**
 * @param {{ distanceScore: number, nearScore: number }} scores
 */
export function decideBlurRoute({ distanceScore, nearScore }) {
  const distanceWeak = distanceScore < GOOD_SCORE;
  const nearWeak = nearScore < GOOD_SCORE;

  let recommendedFlow = RECOMMENDED_FLOW.OPTIONAL;
  if (distanceWeak && !nearWeak) recommendedFlow = RECOMMENDED_FLOW.DISTANCE;
  else if (nearWeak && !distanceWeak) recommendedFlow = RECOMMENDED_FLOW.NEAR;
  else if (distanceWeak && nearWeak) recommendedFlow = RECOMMENDED_FLOW.FULL;

  return {
    distanceScore,
    nearScore,
    distanceWeak,
    nearWeak,
    recommendedFlow,
    message: ROUTE_MESSAGES[recommendedFlow],
  };
}

/** Map routing outcome to persisted vision focus (for test catalog ordering). */
export function visionFocusForFlow(recommendedFlow) {
  if (recommendedFlow === RECOMMENDED_FLOW.DISTANCE) return VISION_FOCUS.FAR;
  if (recommendedFlow === RECOMMENDED_FLOW.NEAR) return VISION_FOCUS.NEAR;
  if (recommendedFlow === RECOMMENDED_FLOW.FULL) return VISION_FOCUS.BOTH;
  return VISION_FOCUS.UNSURE;
}

/** Next test path after screener — routing only. */
export function pathForRecommendedFlow(recommendedFlow) {
  if (recommendedFlow === RECOMMENDED_FLOW.DISTANCE) {
    return `/test/${TEST_IDS.SNELLEN}`;
  }
  if (recommendedFlow === RECOMMENDED_FLOW.NEAR) {
    return `/test/${TEST_IDS.JAEGER}`;
  }
  if (recommendedFlow === RECOMMENDED_FLOW.FULL) {
    return `/test/${TEST_IDS.COMPLETE}`;
  }
  return "/test-selection";
}

export function labelForRecommendedFlow(recommendedFlow) {
  const labels = {
    [RECOMMENDED_FLOW.DISTANCE]: "Start distance acuity test",
    [RECOMMENDED_FLOW.NEAR]: "Start near acuity test",
    [RECOMMENDED_FLOW.FULL]: "Start full vision check",
    [RECOMMENDED_FLOW.OPTIONAL]: "Browse tests",
  };
  return labels[recommendedFlow] || "Continue";
}

/**
 * Build screeningResult payload for session storage.
 */
export function buildScreeningResult({
  entryReason,
  distanceStats,
  nearStats,
}) {
  const distance = scorePart(distanceStats);
  const near = scorePart(nearStats);
  const route = decideBlurRoute({
    distanceScore: distance.score,
    nearScore: near.score,
  });

  return {
    entryReason,
    distanceScore: distance.score,
    nearScore: near.score,
    distanceWeak: route.distanceWeak,
    nearWeak: route.nearWeak,
    distanceDifficulty: distance.difficulty,
    nearDifficulty: near.difficulty,
    recommendedFlow: route.recommendedFlow,
    message: route.message,
    distanceStats,
    nearStats,
    completedAt: new Date().toISOString(),
  };
}
