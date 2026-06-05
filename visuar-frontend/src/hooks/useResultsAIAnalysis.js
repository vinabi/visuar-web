import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchAIAnalysis,
  buildResultsAIPayload,
  emptyAiAnalysis,
  mergeAIIntoPersistedResult,
} from "../lib/aiAnalysis";

function isCompleteAI(ai) {
  return (
    (ai?.findings?.length ?? 0) > 0 &&
    ((ai?.recommendations?.length ?? 0) > 0 || Boolean(ai?.summary))
  );
}

function hasPartialAI(ai) {
  return (
    (ai?.findings?.length ?? 0) > 0 ||
    (ai?.recommendations?.length ?? 0) > 0 ||
    Boolean(ai?.summary || ai?.screening?.summary_en)
  );
}

const BACKGROUND_AI_DEFER_MS = 5000;
const SESSION_POLL_MS = 400;

/**
 * Fetches AI explanation on the results page when navigation state has no AI yet.
 */
export function useResultsAIAnalysis({
  testType,
  ctx,
  initialAi,
  userProfile,
  persistSlug,
  /** When false (e.g. Free plan), skip Gemini fetch on results page. */
  enabled = true,
  /** When false (e.g. Dashboard history view), skip auto-fetch on mount. */
  autoFetch = true,
  /** Called after manual generate succeeds (e.g. persist to DB). */
  onPersist,
}) {
  const hasCompleteInitial = isCompleteAI(initialAi);
  const [aiAnalysis, setAiAnalysis] = useState(initialAi || emptyAiAnalysis());
  const [aiLoading, setAiLoading] = useState(false);
  const [hasCompleteAI, setHasCompleteAI] = useState(hasCompleteInitial);
  const fetchedRef = useRef(false);
  const prevTypeRef = useRef(null);

  useEffect(() => {
    if (initialAi?.summary || initialAi?.findings?.length) {
      setAiAnalysis((prev) => ({
        ...prev,
        ...initialAi,
        findings: initialAi.findings?.length ? initialAi.findings : prev.findings,
        recommendations: initialAi.recommendations?.length
          ? initialAi.recommendations
          : prev.recommendations,
        summary: initialAi.summary || prev.summary,
        summary_ur: initialAi.summary_ur || prev.summary_ur,
      }));
      setHasCompleteAI(isCompleteAI(initialAi));
    }
  }, [initialAi]);

  useEffect(() => {
    if (prevTypeRef.current !== testType) {
      fetchedRef.current = false;
      prevTypeRef.current = testType;
    }
  }, [testType]);

  const applyAIResult = useCallback(
    async (data, { persist = true } = {}) => {
      const next = data.aiAnalysis;
      const hasContent =
        next?.findings?.length ||
        next?.recommendations?.length ||
        next?.summary ||
        next?.screening?.summary_en;
      if (!hasContent) return false;

      setAiAnalysis(next);
      setHasCompleteAI(isCompleteAI(next));
      fetchedRef.current = true;

      if (persist) {
        if (persistSlug) mergeAIIntoPersistedResult(persistSlug, data);
        if (onPersist) await onPersist(data);
      }
      return true;
    },
    [persistSlug, onPersist]
  );

  useEffect(() => {
    if (!autoFetch || !enabled || !testType || hasCompleteInitial || fetchedRef.current) return;

    const payload = buildResultsAIPayload(testType, { ...ctx, userProfile });
    if (!payload) return;

    let cancelled = false;
    let deferTimer = null;

    const runFetch = () => {
      if (cancelled || fetchedRef.current) return;
      fetchedRef.current = true;
      setAiLoading(true);

      fetchAIAnalysis(payload.test_type || testType, payload, userProfile)
        .then((data) => {
          if (cancelled) return;
          applyAIResult(data, { persist: true });
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setAiLoading(false);
        });
    };

    // TestPage may already be fetching AI in the background — wait before duplicating the call.
    if (persistSlug) {
      try {
        const raw = sessionStorage.getItem(`visuar_last_result_${persistSlug}`);
        const stored = raw ? JSON.parse(raw) : null;
        const hasResultData =
          stored?.leftEye ||
          stored?.rightEye ||
          stored?.nearFarData ||
          stored?.finalEstimate;
        const missingAi = !hasPartialAI(stored?.aiAnalysis);
        if (hasResultData && missingAi) {
          deferTimer = setTimeout(runFetch, BACKGROUND_AI_DEFER_MS);
          return () => {
            cancelled = true;
            if (deferTimer) clearTimeout(deferTimer);
          };
        }
      } catch {
        /* ignore */
      }
    }

    runFetch();
    return () => {
      cancelled = true;
      if (deferTimer) clearTimeout(deferTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when test slug changes
  }, [testType, hasCompleteInitial, userProfile, persistSlug, enabled, autoFetch]);

  // Pick up background AI written to sessionStorage after test finish
  useEffect(() => {
    if (!enabled || !persistSlug || hasCompleteInitial) return;
    const key = `visuar_last_result_${persistSlug}`;
    const poll = () => {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        const p = JSON.parse(raw);
        const stored = p?.aiAnalysis;
        if (!stored) return;
        setAiAnalysis((prev) => ({
          ...prev,
          ...stored,
          findings: stored.findings?.length ? stored.findings : prev.findings,
          recommendations: stored.recommendations?.length
            ? stored.recommendations
            : prev.recommendations,
          summary: stored.summary || prev.summary,
          summary_ur: stored.summary_ur || prev.summary_ur,
        }));
        if (hasPartialAI(stored)) {
          setHasCompleteAI(isCompleteAI(stored));
          if (isCompleteAI(stored)) {
            setAiLoading(false);
            fetchedRef.current = true;
          }
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, SESSION_POLL_MS);
    return () => clearInterval(id);
  }, [persistSlug, hasCompleteInitial, enabled]);

  const generateAIAnalysis = useCallback(async () => {
    if (!enabled || !testType || aiLoading || hasCompleteAI) return false;

    const payload = buildResultsAIPayload(testType, { ...ctx, userProfile });
    if (!payload) return false;

    setAiLoading(true);
    try {
      const data = await fetchAIAnalysis(payload.test_type || testType, payload, userProfile);
      return await applyAIResult(data, { persist: true });
    } catch {
      return false;
    } finally {
      setAiLoading(false);
    }
  }, [enabled, testType, aiLoading, hasCompleteAI, ctx, userProfile, applyAIResult]);

  return { aiAnalysis, aiLoading, hasCompleteAI, generateAIAnalysis, setAiAnalysis };
}
