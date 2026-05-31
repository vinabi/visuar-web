/**
 * Accumulates screening test results in session for multi-test final estimate.
 */

import { buildFinalScreeningEstimate } from "./finalEstimate";

const KEY = "visuar_screening_session";

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function load() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw
      ? JSON.parse(raw)
      : { sessionId: null, results: [], completedSessionTests: [], visionFocus: null };
  } catch {
    return { sessionId: null, results: [], completedSessionTests: [], visionFocus: null };
  }
}

function save(data) {
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

/** Start a fresh screening session (new sessionId, cleared averages). */
export function startNewScreeningSession({ visionFocus } = {}) {
  const data = {
    sessionId: newSessionId(),
    results: [],
    completedSessionTests: [],
    visionFocus: visionFocus ?? null,
    startedAt: new Date().toISOString(),
  };
  save(data);
  return data;
}

export function appendScreeningResult(record) {
  let data = load();
  if (!data.sessionId) {
    data = startNewScreeningSession({ visionFocus: record.visionFocus });
  }
  const enriched = { sessionId: data.sessionId, ...record };
  data.results.push(enriched);
  const name = record.testName || record.testId;
  if (name && !(data.completedSessionTests || []).includes(name)) {
    data.completedSessionTests = [...(data.completedSessionTests || []), name];
  }
  if (record.visionFocus) data.visionFocus = record.visionFocus;
  save(data);
}

export function getScreeningSession() {
  return load();
}

export function clearScreeningSession() {
  sessionStorage.removeItem(KEY);
}

export function setSessionVisionFocus(focus) {
  const data = load();
  if (!data.sessionId) {
    startNewScreeningSession({ visionFocus: focus });
    return;
  }
  data.visionFocus = focus;
  save(data);
}

/** Results for the active session only (ignores stale sessionId rows). */
export function getActiveSessionResults() {
  const data = load();
  const sid = data.sessionId;
  if (!sid) return [];
  return (data.results || []).filter((r) => !r.sessionId || r.sessionId === sid);
}

/** Latest estimated cylinder + axis for an eye from prior tests this session. */
export function getSessionCylinderForEye(eye) {
  const key = (eye || "left").toLowerCase();
  const records = [...getActiveSessionResults()].reverse();
  const hit = records.find(
    (r) =>
      (r.eye || "left").toLowerCase() === key &&
      r.estimatedCylinderD != null &&
      Math.abs(r.estimatedCylinderD) >= 0.25
  );
  return hit
    ? { cyl: hit.estimatedCylinderD ?? hit.cylinderD, axis: hit.estimatedAxis ?? hit.axis }
    : null;
}

/** Latest estimated sphere for an eye from prior tests this session. */
export function getSessionSphereForEye(eye) {
  const key = (eye || "left").toLowerCase();
  const records = [...getActiveSessionResults()].reverse();
  const hit = records.find(
    (r) =>
      (r.eye || "left").toLowerCase() === key &&
      (r.estimatedSphereD ?? r.sphereD) != null &&
      !Number.isNaN(r.estimatedSphereD ?? r.sphereD)
  );
  return hit ? hit.estimatedSphereD ?? hit.sphereD : null;
}

/** Rebuild session screening estimate from all results in the current session. */
export function refreshSessionEstimate({ visionFocus, correctionMode } = {}) {
  const data = load();
  const results = getActiveSessionResults();
  return buildFinalScreeningEstimate(results, {
    visionFocus: visionFocus ?? data.visionFocus,
    correctionMode,
    sessionId: data.sessionId,
  });
}
