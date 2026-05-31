import { useState, useEffect, useRef } from "react";
import { FOCUS_DISTANCE_HOLD_MS, isDistanceInFocusBand } from "../utils/nearFarFocus";

/**
 * Tracks consecutive time in the target distance band (webcam gate).
 * @param {object|null} visionResult
 * @param {string} focusMode - "near" | "far"
 * @param {boolean} active - only accumulate when gate overlay is shown
 */
export function useFocusDistanceHold(visionResult, focusMode, active) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const holdStartRef = useRef(null);

  useEffect(() => {
    if (!active) {
      holdStartRef.current = null;
      setHoldProgress(0);
      setGateOpen(false);
      return;
    }

    const tick = () => {
      const ok = isDistanceInFocusBand(visionResult, focusMode);
      const now = Date.now();

      if (!ok) {
        holdStartRef.current = null;
        setHoldProgress(0);
        setGateOpen(false);
        return;
      }

      if (!holdStartRef.current) holdStartRef.current = now;
      const elapsed = now - holdStartRef.current;
      const progress = Math.min(1, elapsed / FOCUS_DISTANCE_HOLD_MS);
      setHoldProgress(progress);

      if (elapsed >= FOCUS_DISTANCE_HOLD_MS) {
        setGateOpen(true);
      }
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [visionResult, focusMode, active]);

  return { holdProgress, gateOpen, distanceOk: isDistanceInFocusBand(visionResult, focusMode) };
}
