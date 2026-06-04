/**
 * VISUAR test catalog — routing, badges, glasses rules (not diagnosis).
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
};

/** Tests that require bare eyes (block if glasses detected). */
export const BARE_EYES_REQUIRED = new Set([
  TEST_IDS.REFRACTION_BATTERY,
  TEST_IDS.DUOCHROME,
  TEST_IDS.SIMULATOR,
]);

/** Tests that allow glasses with warning + correctionMode. */
export const GLASSES_ALLOWED_WITH_WARNING = new Set([
  TEST_IDS.SNELLEN,
  TEST_IDS.JAEGER,
  TEST_IDS.CONTRAST,
  TEST_IDS.NEAR_FAR,
  TEST_IDS.LANDOLT,
  TEST_IDS.COLOR_VISION,
]);

export const SECTION_TITLES = {
  [VISION_FOCUS.FAR]: "Distance Vision Tests",
  [VISION_FOCUS.NEAR]: "Near Vision Tests",
  [VISION_FOCUS.BOTH]: "Complete Vision Assessment",
  [VISION_FOCUS.UNSURE]: "Quick Vision Screener",
};

export const SECTION_SUBTITLES = {
  [VISION_FOCUS.FAR]:
    "Recommended for blurry board, TV, road signs, or far objects.",
  [VISION_FOCUS.NEAR]:
    "Recommended for blurry phone, book, laptop, or near reading.",
  [VISION_FOCUS.BOTH]:
    "Recommended when both distance and near vision feel unclear.",
  [VISION_FOCUS.UNSURE]:
    "We'll start with a short screener to recommend the right tests.",
};

export const FOCUS_ROUTING_COPY = {
  [VISION_FOCUS.FAR]: "Distance focused tests selected based on your blur report.",
  [VISION_FOCUS.NEAR]: "Near focused tests selected based on your blur report.",
  [VISION_FOCUS.BOTH]: "Complete assessment selected because both near and far feel blurry.",
  [VISION_FOCUS.UNSURE]: "We'll start with a short screener to recommend the right tests.",
};

export const SAFETY_COPY =
  "Your selection helps us choose tests. It is not a diagnosis.";

const ALL_TESTS = [
  {
    id: TEST_IDS.SNELLEN,
    title: "Distance Eyesight Number Test",
    description: "Checks how clearly you see letters and estimates your eyesight number.",
    duration: "4 min",
    badge: "Recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.JAEGER,
    title: "Near Eyesight Number Test",
    description: "Near reading chart at 40 to 50 cm for phone, book, and laptop blur.",
    duration: "4 min",
    badge: "Recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.SIMULATOR,
    title: "Refraction Simulator",
    description: "Interactive clearer comparisons — primary estimated sphere.",
    duration: "4 min",
    badge: "Best for eyesight number",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.DUOCHROME,
    title: "Duochrome Test",
    description: "Red-green balance to refine sphere by about ±0.25 D.",
    duration: "2 min",
    badge: "Focus refinement",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.REFRACTION_BATTERY,
    title: "Full Refraction Battery",
    description: "Distance Eyesight Number, duochrome, and refraction simulator combined.",
    duration: "12 min",
    badge: "Recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.NEAR_FAR,
    title: "Near Far Switching",
    description: "Checks how quickly your eyes adjust between near and far focus.",
    duration: "4 min",
    badge: "Focus flexibility",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.QUICK_SCREENER,
    title: "Quick Vision Screener",
    description: "One distance and one near check to recommend distance, near, or complete tests.",
    duration: "3 min",
    badge: "Screener",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.COLOR_VISION,
    title: "Colour Vision Test",
    description: "14-plate Ishihara-style procedural test — screens for red-green colour deficiency across 4 difficulty levels.",
    duration: "3 min",
    badge: "Colour deficiency",
    available: true,
    category: "supporting",
    planTier: "free",
  },
  {
    id: TEST_IDS.LANDOLT,
    title: "Landolt C Acuity",
    description: "Adaptive tumbling-ring staircase — pinpoints sharpest readable size for a precise acuity estimate.",
    duration: "3 min",
    badge: "Precise acuity",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.CONTRAST,
    title: "Contrast Sensitivity",
    description: "Visual quality screening — does not estimate diopters directly.",
    duration: "3 min",
    badge: "Supporting test",
    available: true,
    category: "supporting",
    planTier: "free",
  },
  {
    id: TEST_IDS.ORIENTATION,
    title: "Orientation Discrimination",
    description: "Line orientation sensitivity — available from advanced menu only.",
    duration: "3 min",
    badge: "Advanced",
    available: false,
    category: "hidden",
    planTier: "free",
  },
  {
    id: TEST_IDS.RAPID,
    title: "Rapid Recognition",
    description: "Recognition speed — not used for eyesight number estimation.",
    duration: "2 min",
    badge: "Hidden",
    available: false,
    category: "hidden",
    planTier: "free",
  },
  {
    id: TEST_IDS.SUSTAINED,
    title: "Sustained Focus",
    description: "Coming soon — not part of core refractive screening.",
    duration: "5 min",
    badge: "Coming Soon",
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

const UNSURE_SCREENER = [TEST_IDS.QUICK_SCREENER];

export function getTestById(id) {
  return ALL_TESTS.find((t) => t.id === id);
}

function decorateBatteryTitle(test, focus) {
  if (test.id !== TEST_IDS.REFRACTION_BATTERY) return test;
  if (focus === VISION_FOCUS.NEAR) {
    return {
      ...test,
      title: "Full Near Vision Battery",
      description: "Near Eyesight Number, near–far switching, simulator, and duochrome for near blur.",
    };
  }
  if (focus === VISION_FOCUS.FAR) {
    return {
      ...test,
      title: "Full Distance Refraction Battery",
      description:
        "Distance Eyesight Number, refraction simulator, and duochrome for distance blur.",
    };
  }
  if (focus === VISION_FOCUS.BOTH) {
    return {
      ...test,
      title: "Full Refraction Battery",
      description: "Distance and near modules for complete refractive screening.",
    };
  }
  return test;
}

function pickTests(ids, focus) {
  return ids
    .map((id) => {
      const t = getTestById(id);
      if (!t) return null;
      return decorateBatteryTitle(t, focus);
    })
    .filter(Boolean);
}

export function getTestsForFocus(focus) {
  const map = {
    [VISION_FOCUS.FAR]: { main: FAR_MAIN, supporting: FAR_SUPPORTING },
    [VISION_FOCUS.NEAR]: { main: NEAR_MAIN, supporting: NEAR_SUPPORTING },
    [VISION_FOCUS.BOTH]: { main: BOTH_MAIN, supporting: BOTH_SUPPORTING },
    [VISION_FOCUS.UNSURE]: { main: UNSURE_SCREENER, supporting: [] },
  };
  const cfg = map[focus] || map[VISION_FOCUS.BOTH];

  return {
    sectionTitle: SECTION_TITLES[focus] || SECTION_TITLES[VISION_FOCUS.BOTH],
    sectionSubtitle: SECTION_SUBTITLES[focus] || SECTION_SUBTITLES[VISION_FOCUS.BOTH],
    routingCopy: FOCUS_ROUTING_COPY[focus] || FOCUS_ROUTING_COPY[VISION_FOCUS.BOTH],
    mainTests: pickTests(cfg.main, focus),
    supportingTests: pickTests(cfg.supporting, focus),
  };
}

/** Browse cards when focus is unsure — distance and near catalogs side by side. */
export function getUnsureBrowseSections() {
  const far = getTestsForFocus(VISION_FOCUS.FAR);
  const near = getTestsForFocus(VISION_FOCUS.NEAR);
  return {
    distance: { title: SECTION_TITLES[VISION_FOCUS.FAR], ...far },
    nearVision: { title: SECTION_TITLES[VISION_FOCUS.NEAR], ...near },
  };
}

const PLAN_RANK = { free: 0, basic: 1, pro: 2 };

export function planUnlocksTest(planId, planTier) {
  return (PLAN_RANK[planId] ?? 0) >= (PLAN_RANK[planTier] ?? 0);
}

export const PLAN_LABELS = { free: "Free", basic: "Basic", pro: "Pro" };

export function requiresBareEyes(testId) {
  return BARE_EYES_REQUIRED.has(testId);
}

export function allowsGlassesWithWarning(testId) {
  return GLASSES_ALLOWED_WITH_WARNING.has(testId);
}

export function getRecommendedAssessmentPath(focus) {
  if (focus === VISION_FOCUS.UNSURE) return `/test/${TEST_IDS.QUICK_SCREENER}`;
  if (focus === VISION_FOCUS.BOTH) return `/test/${TEST_IDS.COMPLETE}`;
  return `/test/${TEST_IDS.REFRACTION_BATTERY}`;
}

export function getRecommendedAssessmentLabel(focus) {
  if (focus === VISION_FOCUS.UNSURE) return "Start Quick Screener";
  if (focus === VISION_FOCUS.BOTH) return "Start Complete Vision Assessment";
  if (focus === VISION_FOCUS.NEAR) return "Start Full Near Vision Battery";
  return "Start Full Distance Refraction Battery";
}
