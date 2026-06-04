import { BLUR_ENTRY_REASON } from "./blurScreenerSession";

export function getBlurScreenerIntro(entryReason) {
  if (entryReason === BLUR_ENTRY_REASON.UNSURE) {
    return {
      title: "Quick clarity check",
      body: "We'll quickly check both distance and near clarity. This only helps choose your next test — it is not a prescription or diagnosis.",
      distanceHint: "Part 1: Sit about 60–80 cm from your screen.",
      nearHint: "Part 2: Move closer to about 35–40 cm for near reading.",
    };
  }
  return {
    title: "Blur screener",
    body: "You reported blur both near and far. We'll run a short distance check and a near check to see which area needs follow-up testing.",
    distanceHint: "Part 1: Sit about 60–80 cm from your screen.",
    nearHint: "Part 2: Move closer to about 35–40 cm for near reading.",
  };
}

export function getNearTransitionCopy(entryReason) {
  if (entryReason === BLUR_ENTRY_REASON.UNSURE) {
    return "Distance check done. Move to about 35–40 cm for the near reading check.";
  }
  return "Distance check done. Move closer (35–40 cm) for the near blur check.";
}
