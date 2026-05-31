import { useState, useEffect, useRef, useCallback } from "react";
import { scoreLetterResponse } from "../utils/testStimuli";

const LETTER_KEY_RE = /^[A-Z]$/;
const AUTO_SUBMIT_MS = 400;

/**
 * Free A–Z keyboard input for chart-style letter rows.
 * Auto-submits after expected length is reached (with short delay).
 */
export function useLetterRowInput({
  expectedLetters,
  visionOk,
  submitted,
  onSubmit,
  autoSubmitDelayMs = AUTO_SUBMIT_MS,
}) {
  const expected = Array.isArray(expectedLetters)
    ? expectedLetters.join("")
    : String(expectedLetters || "").replace(/\s+/g, "");
  const rowLen = expected.length;

  const [typed, setTyped] = useState("");
  const submitTimerRef = useRef(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const clearTimer = useCallback(() => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setTyped("");
    clearTimer();
  }, [expected, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const clearTyped = useCallback(() => {
    if (submitted) return;
    clearTimer();
    setTyped("");
  }, [submitted, clearTimer]);

  const fireSubmit = useCallback(
    (nextTyped) => {
      if (submitted || !visionOk || nextTyped.length < rowLen) return;
      clearTimer();
      const trimmed = nextTyped.slice(0, rowLen);
      const letters = trimmed.split("");
      const scores = scoreLetterResponse(expected, trimmed);
      onSubmitRef.current({ letters, ...scores });
    },
    [submitted, visionOk, rowLen, expected, clearTimer]
  );

  const submitNow = useCallback(() => {
    fireSubmit(typed);
  }, [fireSubmit, typed]);

  const scheduleAutoSubmit = useCallback(
    (nextTyped) => {
      clearTimer();
      if (nextTyped.length >= rowLen) {
        submitTimerRef.current = setTimeout(() => {
          submitTimerRef.current = null;
          fireSubmit(nextTyped);
        }, autoSubmitDelayMs);
      }
    },
    [rowLen, autoSubmitDelayMs, clearTimer, fireSubmit]
  );

  const appendLetter = useCallback(
    (letter) => {
      if (submitted || !visionOk) return;
      setTyped((prev) => {
        if (prev.length >= rowLen) return prev;
        const next = prev + letter;
        scheduleAutoSubmit(next);
        return next;
      });
    },
    [submitted, visionOk, rowLen, scheduleAutoSubmit]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (submitted || !visionOk) return;
      if (e.repeat) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        clearTimer();
        setTyped((t) => t.slice(0, -1));
        return;
      }
      const key = e.key.length === 1 ? e.key.toUpperCase() : "";
      if (!LETTER_KEY_RE.test(key)) return;
      e.preventDefault();
      appendLetter(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitted, visionOk, appendLetter, clearTimer]);

  const displaySlots = Array.from({ length: rowLen }, (_, i) => typed[i] || null);

  return {
    typed,
    displaySlots,
    appendLetter,
    clearTyped,
    submitNow,
    canSubmit: typed.length >= rowLen && !submitted && visionOk,
    filledCount: typed.length,
  };
}
