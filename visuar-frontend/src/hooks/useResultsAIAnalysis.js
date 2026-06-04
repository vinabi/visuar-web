import { useState, useEffect, useRef } from "react";
import {
  fetchAIAnalysis,
  buildResultsAIPayload,
  emptyAiAnalysis,
  mergeAIIntoPersistedResult,
} from "../lib/aiAnalysis";

/**
 * Fetches AI explanation on the results page when navigation state has no AI yet.
 */
export function useResultsAIAnalysis({
  testType,
  ctx,
  initialAi,
  userProfile,
  persistSlug,
}) {
  const hasCompleteInitial =
    (initialAi?.findings?.length ?? 0) > 0 &&
    ((initialAi?.recommendations?.length ?? 0) > 0 || Boolean(initialAi?.summary));
  const [aiAnalysis, setAiAnalysis] = useState(initialAi || emptyAiAnalysis());
  const [aiLoading, setAiLoading] = useState(false);
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
    }
  }, [initialAi]);

  useEffect(() => {
    if (prevTypeRef.current !== testType) {
      fetchedRef.current = false;
      prevTypeRef.current = testType;
    }
  }, [testType]);

  useEffect(() => {
    if (!testType || hasCompleteInitial || fetchedRef.current) return;

    const payload = buildResultsAIPayload(testType, { ...ctx, userProfile });
    if (!payload) return;

    fetchedRef.current = true;
    let cancelled = false;
    setAiLoading(true);

    fetchAIAnalysis(payload.test_type || testType, payload, userProfile)
      .then((data) => {
        if (cancelled) return;
        const next = data.aiAnalysis;
        const hasContent =
          next?.findings?.length ||
          next?.recommendations?.length ||
          next?.summary ||
          next?.screening?.summary_en;
        if (!hasContent) return;
        setAiAnalysis(next);
        if (persistSlug) mergeAIIntoPersistedResult(persistSlug, data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when test slug changes
  }, [testType, hasCompleteInitial, userProfile, persistSlug]);

  // Pick up background AI written to sessionStorage after test finish
  useEffect(() => {
    if (!persistSlug || hasCompleteInitial) return;
    const key = `visuar_last_result_${persistSlug}`;
    const poll = () => {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        const p = JSON.parse(raw);
        const stored = p?.aiAnalysis;
        if (!stored) return;
        const ready =
          stored.findings?.length > 0 && stored.recommendations?.length > 0;
        setAiAnalysis((prev) => ({
          ...prev,
          ...stored,
          findings: stored.findings?.length ? stored.findings : prev.findings,
          recommendations: stored.recommendations?.length
            ? stored.recommendations
            : prev.recommendations,
        }));
        if (ready) {
          setAiLoading(false);
          fetchedRef.current = true;
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [persistSlug, hasCompleteInitial]);

  return { aiAnalysis, aiLoading, setAiAnalysis };
}
