/**
 * Copy for distance (far) letter-row acuity tests — Snellen, contrast rows, far near–far rounds.
 */

export const DISTANCE_ACUITY_WARNING_TITLE = "Important for accurate results";

export const DISTANCE_ACUITY_WARNING_BODY =
  "When you reach a row where you must squint, strain, or guess, enter the entire row incorrectly.";

export const DISTANCE_ACUITY_EMPHASIS = "Do not guess letters";

export const DISTANCE_ACUITY_WARNING_FOOTER =
  "This is how the system finds your true vision limit.";

export const DISTANCE_ACUITY_ACK_LABEL =
  "I understand that I should not guess letters.";

/** @deprecated Use warning card strings; kept for compact in-test hint. */
export const DISTANCE_ACUITY_THRESHOLD_GUIDE = [
  DISTANCE_ACUITY_WARNING_BODY,
  DISTANCE_ACUITY_EMPHASIS + ".",
  DISTANCE_ACUITY_WARNING_FOOTER,
].join(" ");

/** Compact reminder shown during active letter entry. */
export const DISTANCE_ACUITY_THRESHOLD_HINT =
  "Squint line? Enter the full row wrong — do not guess.";
