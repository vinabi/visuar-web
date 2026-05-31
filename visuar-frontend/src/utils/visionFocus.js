/**
 * Vision focus routing — soft ordering for complete assessment (not diagnosis).
 */

export const VISION_FOCUS = {
  FAR: "far",
  NEAR: "near",
  BOTH: "both",
  UNSURE: "unsure",
};

export const VISION_FOCUS_LABELS = {
  far: "Distance (far) blur reported",
  near: "Near blur reported",
  both: "Both near and distance blur reported",
  unsure: "Vision focus not specified",
};

export const STEP = {
  SCREENER_SNELLEN: "screener_snellen",
  SCREENER_JAEGER: "screener_jaeger",
  SNELLEN: "snellen",
  JAEGER: "jaeger",
  CONTRAST: "contrast",
  ORIENTATION: "orientation",
  RAPID: "rapid",
  NEAR_FAR: "near_far",
};

const STORAGE_KEY = "visuar_vision_focus";

export function getVisionFocus() {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v && Object.values(VISION_FOCUS).includes(v)) return v;
  return VISION_FOCUS.UNSURE;
}

export function setVisionFocus(focus) {
  localStorage.setItem(STORAGE_KEY, focus);
}

export function resolveFocusAfterScreener({ snellenPassed, jaegerPassed }) {
  if (!snellenPassed && jaegerPassed) return VISION_FOCUS.NEAR;
  if (snellenPassed && !jaegerPassed) return VISION_FOCUS.FAR;
  return VISION_FOCUS.BOTH;
}

/** Distance-focused screening (myopia pattern) — Snellen first, contrast as supporting data. */
function farTrack() {
  return [STEP.SNELLEN, STEP.CONTRAST];
}

/** Near-focused screening (hyperopia pattern) — Jaeger and near-far first, Snellen + contrast supporting. */
function nearTrack() {
  return [STEP.JAEGER, STEP.NEAR_FAR, STEP.SNELLEN, STEP.CONTRAST];
}

/** Both near and far blur — full bilateral screening with contrast. */
function bothTrack() {
  return [STEP.SNELLEN, STEP.JAEGER, STEP.NEAR_FAR, STEP.CONTRAST];
}

/**
 * Build ordered assessment steps. Unsure runs screeners first, then applies resolved focus.
 */
export function buildAssessmentPlan(focus, { includeScreeners = false } = {}) {
  const steps = [];
  if (focus === VISION_FOCUS.UNSURE || includeScreeners) {
    steps.push(STEP.SCREENER_SNELLEN, STEP.SCREENER_JAEGER);
  }
  const effective =
    focus === VISION_FOCUS.UNSURE && !includeScreeners ? VISION_FOCUS.BOTH : focus;

  if (effective === VISION_FOCUS.FAR) steps.push(...farTrack());
  else if (effective === VISION_FOCUS.NEAR) steps.push(...nearTrack());
  else steps.push(...bothTrack());

  return steps;
}

export function getStepLabel(step) {
  const map = {
    [STEP.SCREENER_SNELLEN]: "Distance screener",
    [STEP.SCREENER_JAEGER]: "Near screener",
    [STEP.SNELLEN]: "Snellen chart",
    [STEP.JAEGER]: "Jaeger reading chart",
    [STEP.CONTRAST]: "Contrast sensitivity",
    [STEP.ORIENTATION]: "Orientation discrimination",
    [STEP.RAPID]: "Rapid recognition",
    [STEP.NEAR_FAR]: "Near–far switching",
  };
  return map[step] || step;
}

export function getStepViewingMode(step) {
  if (step === STEP.JAEGER || step === STEP.SCREENER_JAEGER) return "near";
  if (step === STEP.NEAR_FAR) return "alternating";
  return "distance";
}
