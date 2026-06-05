/**
 * VISUAR test catalog — routing, badges, glasses rules (not diagnosis).
 * Pass `t` from useTranslation() so labels follow the active language.
 */

import { VISION_FOCUS } from "./visionFocus";

export const TEST_IDS = {
  SNELLEN: "snellen-acuity",
  JAEGER: "jaeger-acuity",
  CONTRAST: "contrast-sensitivity",
  ORIENTATION: "orientation-discrimination",
  LANDOLT: "landolt-acuity",
  COLOR_VISION: "color-vision",
  RAPID: "rapid-recognition",
  REFRACTION_BATTERY: "refraction-battery",
  DUOCHROME: "duochrome-refinement",
  SIMULATOR: "refraction-simulator",
  NEAR_FAR: "near-far-switching",
  SUSTAINED: "sustained-focus",
  COMPLETE: "complete",
  QUICK_SCREENER: "quick-screener",
  BLUR_SCREENER: "blur-screener",
};

export const BARE_EYES_REQUIRED = new Set([
  TEST_IDS.REFRACTION_BATTERY,
  TEST_IDS.DUOCHROME,
  TEST_IDS.SIMULATOR,
]);

export const GLASSES_ALLOWED_WITH_WARNING = new Set([
  TEST_IDS.SNELLEN,
  TEST_IDS.JAEGER,
  TEST_IDS.CONTRAST,
  TEST_IDS.NEAR_FAR,
  TEST_IDS.LANDOLT,
  TEST_IDS.COLOR_VISION,
]);

const ALL_TESTS = [
  {
    id: TEST_IDS.SNELLEN,
    badgeKey: "recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.JAEGER,
    badgeKey: "recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.SIMULATOR,
    badgeKey: "bestForEyesight",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.DUOCHROME,
    badgeKey: "focusRefinement",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.REFRACTION_BATTERY,
    badgeKey: "recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.NEAR_FAR,
    badgeKey: "focusFlexibility",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.QUICK_SCREENER,
    badgeKey: "screener",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.BLUR_SCREENER,
    badgeKey: "screener",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.COLOR_VISION,
    badgeKey: "colourDeficiency",
    available: true,
    category: "supporting",
    planTier: "free",
  },
  {
    id: TEST_IDS.LANDOLT,
    badgeKey: "preciseAcuity",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.CONTRAST,
    badgeKey: "supportingTest",
    available: true,
    category: "supporting",
    planTier: "free",
  },
  {
    id: TEST_IDS.ORIENTATION,
    badgeKey: "advanced",
    available: false,
    category: "hidden",
    planTier: "free",
  },
  {
    id: TEST_IDS.RAPID,
    badgeKey: "hidden",
    available: false,
    category: "hidden",
    planTier: "free",
  },
  {
    id: TEST_IDS.SUSTAINED,
    badgeKey: "comingSoon",
    available: false,
    category: "hidden",
    planTier: "free",
  },
];

const FAR_MAIN = [
  TEST_IDS.SNELLEN,
  TEST_IDS.LANDOLT,
  TEST_IDS.SIMULATOR,
  TEST_IDS.DUOCHROME,
  TEST_IDS.REFRACTION_BATTERY,
];
const FAR_SUPPORTING = [TEST_IDS.CONTRAST, TEST_IDS.COLOR_VISION];

const NEAR_MAIN = [
  TEST_IDS.JAEGER,
  TEST_IDS.NEAR_FAR,
  TEST_IDS.SIMULATOR,
  TEST_IDS.DUOCHROME,
  TEST_IDS.REFRACTION_BATTERY,
];
const NEAR_SUPPORTING = [
  TEST_IDS.SNELLEN,
  TEST_IDS.LANDOLT,
  TEST_IDS.CONTRAST,
  TEST_IDS.COLOR_VISION,
];

const BOTH_MAIN = [
  TEST_IDS.REFRACTION_BATTERY,
  TEST_IDS.SNELLEN,
  TEST_IDS.JAEGER,
  TEST_IDS.LANDOLT,
  TEST_IDS.SIMULATOR,
  TEST_IDS.DUOCHROME,
  TEST_IDS.NEAR_FAR,
];
const BOTH_SUPPORTING = [TEST_IDS.CONTRAST, TEST_IDS.COLOR_VISION];

const UNSURE_SCREENER = [TEST_IDS.BLUR_SCREENER];
const BOTH_SCREENER = [TEST_IDS.BLUR_SCREENER];

function batteryVariant(focus) {
  if (focus === VISION_FOCUS.NEAR) return "near";
  if (focus === VISION_FOCUS.FAR) return "far";
  if (focus === VISION_FOCUS.BOTH) return "both";
  return null;
}

function localizeTest(test, t, focus) {
  if (!test) return null;
  const variant =
    test.id === TEST_IDS.REFRACTION_BATTERY ? batteryVariant(focus) : null;
  const titleKey = variant
    ? `testCatalog.battery.${variant}.title`
    : `testCatalog.tests.${test.id}.title`;
  const descKey = variant
    ? `testCatalog.battery.${variant}.description`
    : `testCatalog.tests.${test.id}.description`;

  return {
    ...test,
    title: t(titleKey),
    description: t(descKey),
    badge: t(`testCatalog.badges.${test.badgeKey}`),
    duration: t(`testCatalog.tests.${test.id}.duration`),
  };
}

export function getTestById(id, t) {
  const raw = ALL_TESTS.find((x) => x.id === id);
  return raw ? localizeTest(raw, t, null) : null;
}

function pickTests(ids, focus, t) {
  return ids
    .map((id) => localizeTest(ALL_TESTS.find((x) => x.id === id), t, focus))
    .filter(Boolean);
}

const FOCUS_MAP = {
  [VISION_FOCUS.FAR]: { main: FAR_MAIN, supporting: FAR_SUPPORTING },
  [VISION_FOCUS.NEAR]: { main: NEAR_MAIN, supporting: NEAR_SUPPORTING },
  [VISION_FOCUS.BOTH]: { main: BOTH_SCREENER, supporting: BOTH_SUPPORTING },
  [VISION_FOCUS.UNSURE]: { main: UNSURE_SCREENER, supporting: [] },
};

export function getTestsForFocus(focus, t) {
  const cfg = FOCUS_MAP[focus] || FOCUS_MAP[VISION_FOCUS.BOTH];
  const sectionKey = focus in FOCUS_MAP ? focus : VISION_FOCUS.BOTH;

  return {
    sectionTitle: t(`testCatalog.sections.${sectionKey}.title`),
    sectionSubtitle: t(`testCatalog.sections.${sectionKey}.subtitle`),
    routingCopy: t(`testCatalog.sections.${sectionKey}.routing`),
    mainTests: pickTests(cfg.main, focus, t),
    supportingTests: pickTests(cfg.supporting, focus, t),
  };
}

export function getUnsureBrowseSections(t) {
  const far = getTestsForFocus(VISION_FOCUS.FAR, t);
  const near = getTestsForFocus(VISION_FOCUS.NEAR, t);
  return {
    distance: { title: far.sectionTitle, ...far },
    nearVision: { title: near.sectionTitle, ...near },
  };
}

export const SAFETY_COPY = "testCatalog.safety";

const PLAN_RANK = { free: 0, basic: 1, pro: 2 };

export function planUnlocksTest(planId, planTier) {
  return (PLAN_RANK[planId] ?? 0) >= (PLAN_RANK[planTier] ?? 0);
}

export function getPlanLabel(planId, t) {
  return t(`testCatalog.plans.${planId}`, planId);
}

export function requiresBareEyes(testId) {
  return BARE_EYES_REQUIRED.has(testId);
}

export function allowsGlassesWithWarning(testId) {
  return GLASSES_ALLOWED_WITH_WARNING.has(testId);
}

export function getBlurEntryReasonForFocus(focus) {
  if (focus === VISION_FOCUS.BOTH) return "both";
  return "unsure";
}

export function getBlurScreenerPath(focus) {
  return {
    pathname: `/test/${TEST_IDS.BLUR_SCREENER}`,
    state: { blurEntryReason: getBlurEntryReasonForFocus(focus) },
  };
}

export function getRecommendedAssessmentPath(focus) {
  if (focus === VISION_FOCUS.UNSURE || focus === VISION_FOCUS.BOTH) {
    return `/test/${TEST_IDS.BLUR_SCREENER}`;
  }
  return `/test/${TEST_IDS.REFRACTION_BATTERY}`;
}

export function getRecommendedAssessmentLabel(focus, t) {
  if (focus === VISION_FOCUS.UNSURE || focus === VISION_FOCUS.BOTH) {
    return t("testCatalog.startBlurScreenerBtn");
  }
  if (focus === VISION_FOCUS.NEAR) return t("testCatalog.startNearBattery");
  return t("testCatalog.startDistanceBattery");
}
