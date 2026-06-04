/**
 * Blur screener session — routing only, no diopter estimates.
 */

const KEY = "visuar_blur_screener";

export const BLUR_ENTRY_REASON = {
  BOTH: "both",
  UNSURE: "unsure",
};

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw
      ? JSON.parse(raw)
      : { blurEntryReason: null, screeningResult: null, fullFlowProgress: null };
  } catch {
    return { blurEntryReason: null, screeningResult: null, fullFlowProgress: null };
  }
}

function save(data) {
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function setBlurEntryReason(reason) {
  const data = load();
  data.blurEntryReason = reason;
  save(data);
}

export function getBlurEntryReason() {
  return load().blurEntryReason;
}

export function saveBlurScreeningResult(screeningResult) {
  const data = load();
  data.screeningResult = {
    ...screeningResult,
    completedAt: screeningResult.completedAt || new Date().toISOString(),
  };
  save(data);
}

export function getBlurScreeningResult() {
  return load().screeningResult;
}

export function setFullFlowProgress(progress) {
  const data = load();
  data.fullFlowProgress = { ...data.fullFlowProgress, ...progress };
  save(data);
}

export function getFullFlowProgress() {
  return load().fullFlowProgress;
}

export function clearBlurScreenerSession() {
  sessionStorage.removeItem(KEY);
}

export function initBlurScreenerSession(entryReason) {
  const data = {
    blurEntryReason: entryReason,
    screeningResult: null,
    fullFlowProgress: null,
  };
  save(data);
  return data;
}
