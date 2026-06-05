import { BLUR_ENTRY_REASON } from "./blurScreenerSession";

export function getBlurScreenerIntro(entryReason, t) {
  if (entryReason === BLUR_ENTRY_REASON.UNSURE) {
    return {
      title: t("blurScreener.introUnsureTitle"),
      body: t("blurScreener.introUnsureBody"),
      distanceHint: t("blurScreener.distancePartHint"),
      nearHint: t("blurScreener.nearPartHint"),
    };
  }
  return {
    title: t("blurScreener.introBothTitle"),
    body: t("blurScreener.introBothBody"),
    distanceHint: t("blurScreener.distancePartHint"),
    nearHint: t("blurScreener.nearPartHint"),
  };
}

export function getNearTransitionCopy(entryReason, t) {
  if (entryReason === BLUR_ENTRY_REASON.UNSURE) {
    return t("blurScreener.nearTransitionUnsure");
  }
  return t("blurScreener.nearTransitionBoth");
}

export function routeMessageForFlow(flow, t) {
  const keys = {
    distance: "blurScreener.routeDistance",
    near: "blurScreener.routeNear",
    full: "blurScreener.routeFull",
    optional: "blurScreener.routeOptional",
  };
  return t(keys[flow] || "blurScreener.routeOptional");
}

export function labelForRecommendedFlowI18n(flow, t) {
  const keys = {
    distance: "blurScreener.ctaDistance",
    near: "blurScreener.ctaNear",
    full: "blurScreener.ctaFull",
    optional: "blurScreener.ctaBrowse",
  };
  return t(keys[flow] || "blurScreener.ctaContinue");
}
