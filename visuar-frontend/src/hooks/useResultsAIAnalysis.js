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
  const hasInitial =
    (initialAi?.findings?.length ?? 0) > 0 || Boolean(initialAi?.summary);
  const [aiAnalysis, setAiAnalysis] = useState(initialAi || emptyAiAnalysis());
  const [aiLoading, setAiLoading] = useState(false);
  const fetchedRef = useRef(false);
  const prevTypeRef = useRef(null);

  useEffect(() => {
    if (hasInitial) {
      setAiAnalysis(initialAi);
    }
  }, [initialAi, hasInitial]);

  useEffect(() => {
    if (prevTypeRef.current !== testType) {
      fetchedRef.current = false;
      prevTypeRef.current = testType;
    }
  }, [testType]);

  useEffect(() => {
    if (!testType || hasInitial || fetchedRef.current) return;

    const payload = buildResultsAIPayload(testType, { ...ctx, userProfile });
    if (!payload) return;

    fetchedRef.current = true;
    let cancelled = false;
    setAiLoading(true);

    fetchAIAnalysis(payload.test_type || testType, payload, userProfile)
      .then((data) => {
        if (cancelled || !data.aiAnalysis?.findings?.length) return;
        setAiAnalysis(data.aiAnalysis);
        if (persistSlug) mergeAIIntoPersistedResult(persistSlug, data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [testType, hasInitial, userProfile, persistSlug]);

  // Pick up background AI written to sessionStorage after test finish
  useEffect(() => {
    if (!persistSlug || hasInitial) return;
    const key = `visuar_last_result_${persistSlug}`;
    const poll = () => {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p?.aiAnalysis?.findings?.length || p?.aiAnalysis?.summary) {
          setAiAnalysis(p.aiAnalysis);
          fetchedRef.current = true;
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [persistSlug, hasInitial]);

  const merged =
    (initialAi?.findings?.length || initialAi?.summary) ? initialAi : aiAnalysis;
  return { aiAnalysis: merged, aiLoading, setAiAnalysis };
}
