import { useState, useEffect, useRef, useCallback } from "react";
import { scoreLetterResponse } from "../utils/testStimuli";

const LETTER_KEY_RE = /^[A-Z]$/;
const AUTO_SUBMIT_MS = 400;

/** One-letter (or fixed-length) free keyboard input with auto-submit. */
export function useSingleLetterInput({
  expectedLetter,
  visionOk,
  disabled,
  onSubmit,
  autoSubmitDelayMs = AUTO_SUBMIT_MS,
}) {
  const expected = String(expectedLetter || "").toUpperCase();
  const [typed, setTyped] = useState("");
  const submitTimerRef = useRef(null);

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

  const submitChar = useCallback(
    (ch) => {
      if (disabled || !visionOk) return;
      clearTimer();
      const scores = scoreLetterResponse(expected, ch);
      onSubmit({ response: ch, ...scores, correct: ch === expected });
    },
    [disabled, visionOk, expected, onSubmit, clearTimer]
  );

  const handleLetter = useCallback(
    (letter) => {
      if (disabled || !visionOk) return;
      setTyped(letter);
      submitTimerRef.current = setTimeout(() => {
        submitTimerRef.current = null;
        submitChar(letter);
      }, autoSubmitDelayMs);
    },
    [disabled, visionOk, submitChar, autoSubmitDelayMs]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (disabled || !visionOk) return;
      const key = e.key.length === 1 ? e.key.toUpperCase() : "";
      if (LETTER_KEY_RE.test(key)) {
        e.preventDefault();
        handleLetter(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, visionOk, handleLetter]);

  return { typed, handleLetter };
}
