/**
 * Standard viewing distance for all VISUAR tests and camera calibration.
 */

export const TEST_DISTANCE_CM = 70;
export const TEST_DISTANCE_MM = TEST_DISTANCE_CM * 10;

/** 5 arcmin optotype at decimal 1.0: 2 × D × tan(5/120°) */
const ARCMIN_RAD = (5 / 120) * (Math.PI / 180);
export const OPTOTYPE_HEIGHT_MM_AT_UNIT_DECIMAL =
  2 * TEST_DISTANCE_MM * Math.tan(ARCMIN_RAD);

/** Camera-assisted distance band (cm). */
export const VIEWING_DISTANCE = {
  label: "60–80 cm",
  labelShort: "~70 cm",
  target: TEST_DISTANCE_CM,
  min: 60,
  max: 80,
  calibrateHint: TEST_DISTANCE_CM,
};

/** Jaeger N8 height was defined at 40 cm — scale for current test distance. */
export const JAEGER_REFERENCE_DISTANCE_CM = 40;
export const JAEGER_DISTANCE_SCALE =
  TEST_DISTANCE_CM / JAEGER_REFERENCE_DISTANCE_CM;
