const STORAGE_KEY = "visuar_correction_mode";

export const CORRECTION_MODE = {
  UNCORRECTED: "uncorrected",
  CORRECTED: "corrected",
};

export function getCorrectionMode() {
  const v = sessionStorage.getItem(STORAGE_KEY);
  if (v === CORRECTION_MODE.CORRECTED || v === CORRECTION_MODE.UNCORRECTED) return v;
  return CORRECTION_MODE.UNCORRECTED;
}

export function setCorrectionMode(mode) {
  sessionStorage.setItem(STORAGE_KEY, mode);
}

export function correctionModeLabel(mode) {
  return mode === CORRECTION_MODE.CORRECTED
    ? "Corrected vision (with glasses or contacts)"
    : "Uncorrected vision (without glasses or contacts)";
}
