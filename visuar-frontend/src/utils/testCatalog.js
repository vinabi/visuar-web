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
  ASTIGMATISM: "astigmatism-fan",
  NEAR_FAR: "near-far-switching",
  SUSTAINED: "sustained-focus",
  COMPLETE: "complete",
};

/** Tests that require bare eyes (block if glasses detected). */
export const BARE_EYES_REQUIRED = new Set([
  TEST_IDS.REFRACTION_BATTERY,
  TEST_IDS.DUOCHROME,
  TEST_IDS.SIMULATOR,
  TEST_IDS.ASTIGMATISM,
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
  [VISION_FOCUS.UNSURE]: "Vision Screening",
};

/**
 * planTier: which plan is required to run this test
 *   "free"  — available to all users
 *   "basic" — requires Basic ($5) or Pro ($10)
 *   "pro"   — requires Pro ($10) only
 */
const ALL_TESTS = [
  {
    id: TEST_IDS.SNELLEN,
    title: "Snellen Acuity",
    description: "Distance letter chart at calibrated 60–80 cm for far blur screening.",
    duration: "4 min",
    badge: "Distance vision",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.JAEGER,
    title: "Jaeger Near Acuity",
    description: "Reading chart at 60–80 cm for near blur screening.",
    duration: "4 min",
    badge: "Near vision",
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
    id: TEST_IDS.ASTIGMATISM,
    title: "Astigmatism Fan",
    description: "Clock-dial lines for estimated cylinder and axis.",
    duration: "2 min",
    badge: "Cylinder and axis",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.REFRACTION_BATTERY,
    title: "Full Refraction Battery",
    description: "Snellen, duochrome, simulator, and astigmatism fan combined.",
    duration: "12 min",
    badge: "Recommended",
    available: true,
    category: "core",
    planTier: "free",
  },
  {
    id: TEST_IDS.NEAR_FAR,
    title: "Near-Far Switching",
    description: "Near focus and accommodation support — not a direct diopter test.",
    duration: "4 min",
    badge: "Near focus support",
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
    description: "Overlaps with astigmatism fan — available from advanced menu only.",
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
  TEST_IDS.ASTIGMATISM,
  TEST_IDS.REFRACTION_BATTERY,
];
const FAR_SUPPORTING = [TEST_IDS.CONTRAST, TEST_IDS.COLOR_VISION];

const NEAR_MAIN = [
  TEST_IDS.JAEGER,
  TEST_IDS.NEAR_FAR,
  TEST_IDS.SNELLEN,
  TEST_IDS.SIMULATOR,
  TEST_IDS.REFRACTION_BATTERY,
];
const NEAR_SUPPORTING = [TEST_IDS.DUOCHROME];

const BOTH_MAIN = [
  TEST_IDS.REFRACTION_BATTERY,
  TEST_IDS.SNELLEN,
  TEST_IDS.LANDOLT,
  TEST_IDS.JAEGER,
  TEST_IDS.SIMULATOR,
  TEST_IDS.DUOCHROME,
  TEST_IDS.ASTIGMATISM,
  TEST_IDS.NEAR_FAR,
];

export function getTestById(id) {
  return ALL_TESTS.find((t) => t.id === id);
}

export function getTestsForFocus(focus) {
  const map = {
    [VISION_FOCUS.FAR]: { main: FAR_MAIN, supporting: FAR_SUPPORTING },
    [VISION_FOCUS.NEAR]: { main: NEAR_MAIN, supporting: NEAR_SUPPORTING },
    [VISION_FOCUS.BOTH]: { main: BOTH_MAIN, supporting: [] },
    [VISION_FOCUS.UNSURE]: { main: [], supporting: [] },
  };
  const cfg = map[focus] || map[VISION_FOCUS.BOTH];
  const pick = (ids) =>
    ids.map((id) => {
      const t = getTestById(id);
      if (!t) return null;
      if (focus === VISION_FOCUS.NEAR && id === TEST_IDS.REFRACTION_BATTERY) {
        return { ...t, title: "Full Near Vision Battery", description: "Near-focused refraction battery for reading blur." };
      }
      if (focus === VISION_FOCUS.FAR && id === TEST_IDS.REFRACTION_BATTERY) {
        return { ...t, title: "Full Distance Refraction Battery", description: "Distance-focused refraction battery for far blur." };
      }
      return t;
    }).filter(Boolean);

  return {
    sectionTitle: SECTION_TITLES[focus] || SECTION_TITLES[VISION_FOCUS.BOTH],
    mainTests: pick(cfg.main),
    supportingTests: pick(cfg.supporting),
  };
}

const PLAN_RANK = { free: 0, basic: 1, pro: 2 };

/** Returns true if the given planId grants access to a test with planTier. */
export function planUnlocksTest(planId, planTier) {
  return (PLAN_RANK[planId] ?? 0) >= (PLAN_RANK[planTier] ?? 0);
}

/** Human-readable plan name for upgrade prompts. */
export const PLAN_LABELS = { free: "Free", basic: "Basic", pro: "Pro" };

export function requiresBareEyes(testId) {
  return BARE_EYES_REQUIRED.has(testId);
}

export function allowsGlassesWithWarning(testId) {
  return GLASSES_ALLOWED_WITH_WARNING.has(testId);
}

export function getRecommendedAssessmentPath(focus) {
  if (focus === VISION_FOCUS.UNSURE) return `/test/${TEST_IDS.COMPLETE}`;
  return `/test/${TEST_IDS.COMPLETE}`;
}
