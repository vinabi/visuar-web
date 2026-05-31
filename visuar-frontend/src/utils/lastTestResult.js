const STORAGE_PREFIX = "visuar_last_result_";

/** Persist the latest completed test payload for results deep-links / refresh. */
export function persistTestResult(testId, payload) {
  if (!testId || !payload) return;
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${testId}`,
      JSON.stringify({ ...payload, timestamp: payload.timestamp || new Date().toISOString() })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Read persisted payload for a test slug (e.g. snellen-acuity). */
export function loadPersistedTestResult(testId) {
  if (!testId) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${testId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
