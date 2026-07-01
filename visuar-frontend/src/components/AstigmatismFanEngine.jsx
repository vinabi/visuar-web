import { useState, useEffect, useRef, useCallback } from "react";
import {
  ASTIGMATISM_CYL_MAX_STEP,
  cylinderFromNormalizationStep,
  darkestLineAngleToPrescriptionAxis,
} from "../utils/refractionMath";
import { ASTIGMATISM_FAN_LINE_COUNT, computePrimaryAxis } from "../utils/testStimuli";
import { VIEWING_DISTANCE } from "../utils/viewingDistance";
import { EyeRestReminder } from "./EyeRestReminder";

const CANVAS_SIZE = 360;
const PERP_LINE_BLUR_PX = 3;
const SHARP_LINE_BLUR_PER_STEP = PERP_LINE_BLUR_PX / ASTIGMATISM_CYL_MAX_STEP;

function lineAngleDeg(index) {
  return Math.round((index * 180) / ASTIGMATISM_FAN_LINE_COUNT);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function nearestLineIndex(x, y, size, hitRadius) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const inner = size * 0.06;
  const distFromCenter = Math.hypot(x - cx, y - cy);
  if (distFromCenter < inner || distFromCenter > r + hitRadius + 4) return null;

  let best = null;
  let bestDist = hitRadius;
  for (let i = 0; i < ASTIGMATISM_FAN_LINE_COUNT; i++) {
    const angle = (i * Math.PI) / ASTIGMATISM_FAN_LINE_COUNT;
    const x1 = cx - Math.cos(angle) * r;
    const y1 = cy - Math.sin(angle) * r;
    const x2 = cx + Math.cos(angle) * r;
    const y2 = cy + Math.sin(angle) * r;
    const d = distToSegment(x, y, x1, y1, x2, y2);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function drawLine(ctx, cx, cy, angleDeg, r, blurPx, strokeStyle, lineWidth) {
  const rad = (angleDeg * Math.PI) / 180;
  ctx.save();
  if (blurPx > 0) ctx.filter = `blur(${blurPx}px)`;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(rad) * r, cy - Math.sin(rad) * r);
  ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
  ctx.stroke();
  ctx.restore();
}

function drawFan(canvas, selectedIndices, hoverIndex, isDarkMode, size) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expected = Math.round(size * dpr);
  if (canvas.width !== expected) {
    canvas.width = expected;
    canvas.height = expected;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.filter = "none";
  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const selectedSet = new Set(selectedIndices);

  for (let i = 0; i < ASTIGMATISM_FAN_LINE_COUNT; i++) {
    const angle = (i * Math.PI) / ASTIGMATISM_FAN_LINE_COUNT;
    const isSelected = selectedSet.has(i);
    const isHovered = hoverIndex === i && !isSelected;

    if (isSelected) {
      ctx.strokeStyle = isDarkMode ? "#22d3ee" : "#0891b2";
      ctx.lineWidth = 5;
    } else if (isHovered) {
      ctx.strokeStyle = isDarkMode ? "#60a5fa" : "#2563eb";
      ctx.lineWidth = 4;
    } else {
      ctx.strokeStyle = isDarkMode ? "#475569" : "#64748b";
      ctx.lineWidth = 2;
    }

    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }
}

function drawCross(canvas, lineAngle, sliderStep, isDarkMode, size) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const expected = Math.round(size * dpr);
  if (canvas.width !== expected) {
    canvas.width = expected;
    canvas.height = expected;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.filter = "none";
  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const perpAngle = (lineAngle + 90) % 180;
  const sharpBlur = sliderStep * SHARP_LINE_BLUR_PER_STEP;
  const stroke = isDarkMode ? "#e2e8f0" : "#0f172a";

  drawLine(ctx, cx, cy, perpAngle, r, PERP_LINE_BLUR_PX, stroke, 3);
  drawLine(ctx, cx, cy, lineAngle, r, sharpBlur, stroke, 4);
}

/**
 * Astigmatism fan → cross-line normalization → CYL & axis estimate.
 * Supports selecting multiple sharp/dark lines (tap to toggle).
 */
export function AstigmatismFanEngine({
  isDarkMode,
  visionOk,
  onComplete,
  showInstructions = true,
  testingEye = "left",
}) {
  const [phase, setPhase] = useState(showInstructions ? "INSTRUCTIONS" : "FAN");
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [sliderStep, setSliderStep] = useState(0);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isTouchRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const selectedAngles = selectedIndices.map(lineAngleDeg);
  const { primaryAxis: lineAxisDeg, uncertain: axisUncertain } = computePrimaryAxis(selectedAngles);
  const prescriptionAxis =
    lineAxisDeg != null ? darkestLineAngleToPrescriptionAxis(lineAxisDeg) : null;

  const coordsFromEvent = useCallback((clientX, clientY) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const hitRadius = useCallback(() => (isTouchRef.current ? 32 : 22), []);

  const emitComplete = useCallback((payload) => {
    try {
      const ok = onCompleteRef.current(payload);
      if (ok === false) return;
      completedRef.current = true;
    } catch (err) {
      console.error("[VISUAR] Astigmatism onComplete error:", err);
      completedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (phase === "FAN") {
      drawFan(canvasRef.current, selectedIndices, hoverIndex, isDarkMode, CANVAS_SIZE);
    }
  }, [selectedIndices, hoverIndex, isDarkMode, phase]);

  useEffect(() => {
    if (phase === "CROSS" && lineAxisDeg != null) {
      drawCross(canvasRef.current, lineAxisDeg, sliderStep, isDarkMode, CANVAS_SIZE);
    }
  }, [phase, lineAxisDeg, sliderStep, isDarkMode]);

  const toggleLine = useCallback((index) => {
    if (index == null) return;
    setSelectedIndices((prev) => {
      const set = new Set(prev);
      if (set.has(index)) set.delete(index);
      else set.add(index);
      return [...set].sort((a, b) => a - b);
    });
  }, []);

  const updateHover = useCallback(
    (clientX, clientY) => {
      const pt = coordsFromEvent(clientX, clientY);
      if (!pt) return;
      setHoverIndex(nearestLineIndex(pt.x, pt.y, CANVAS_SIZE, hitRadius()));
    },
    [coordsFromEvent, hitRadius]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (phase !== "FAN") return;
      e.preventDefault();
      isTouchRef.current = e.pointerType === "touch";
      const pt = coordsFromEvent(e.clientX, e.clientY);
      if (!pt) return;
      const index = nearestLineIndex(pt.x, pt.y, CANVAS_SIZE, hitRadius());
      toggleLine(index);
    },
    [phase, coordsFromEvent, hitRadius, toggleLine]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (phase !== "FAN") return;
      isTouchRef.current = e.pointerType === "touch";
      updateHover(e.clientX, e.clientY);
    },
    [phase, updateHover]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const beginCrossPhase = useCallback(() => {
    if (selectedIndices.length === 0) return;
    setSliderStep(0);
    setPhase("CROSS");
  }, [selectedIndices.length]);

  const finishCrossPhase = useCallback(() => {
    const cyl = cylinderFromNormalizationStep(sliderStep);
    emitComplete({
      eye: testingEye,
      cyl,
      axis: prescriptionAxis,
      darkestLineAngle: lineAxisDeg,
      prescriptionAxis,
      normalizationStep: sliderStep,
      selectedLines: selectedIndices,
      selectedAngles,
      axisUncertain,
      confidence: sliderStep === 0 ? 0.8 : 0.85,
      allEqual: false,
    });
  }, [
    testingEye,
    sliderStep,
    prescriptionAxis,
    lineAxisDeg,
    selectedIndices,
    selectedAngles,
    axisUncertain,
    emitComplete,
  ]);

  const handleAllEqual = useCallback(() => {
    setSelectedIndices([]);
    setHoverIndex(null);
    emitComplete({
      eye: testingEye,
      cyl: 0,
      axis: null,
      darkestLineAngle: null,
      prescriptionAxis: null,
      normalizationStep: 0,
      selectedLines: [],
      selectedAngles: [],
      axisUncertain: false,
      confidence: 0.75,
      allEqual: true,
    });
  }, [testingEye, emitComplete]);

  const fanInstruction =
    "Tap every line that looks darkest, thickest, or sharpest (tap again to deselect). If all lines look the same, choose All lines equal.";
  const crossInstruction =
    "Move the slider until the two lines look equally blurry or equally sharp, then tap Done.";

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <EyeRestReminder isDarkMode={isDarkMode} className="max-w-lg" />
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Astigmatism Fan
        </h2>
        <p className={`text-lg mb-4 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          {fanInstruction}
        </p>
        <p className={`text-sm mb-6 max-w-md ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Hold {VIEWING_DISTANCE.labelShort} from the screen. We estimate cylinder (CYL) and axis, then combine with
          your distance acuity for SPH.
        </p>
        <button
          type="button"
          onClick={() => setPhase("FAN")}
          disabled={!visionOk}
          className={`px-10 py-4 rounded-full text-lg font-bold ${
            visionOk ? "bg-cyan-500 text-white" : "bg-slate-500/40 text-slate-400 cursor-not-allowed"
          }`}
        >
          {visionOk ? "Start" : "Waiting for camera…"}
        </button>
      </div>
    );
  }

  if (phase === "CROSS") {
    const cyl = cylinderFromNormalizationStep(sliderStep);
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6">
        <p className={`text-lg font-semibold mb-2 text-center max-w-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
          {crossInstruction}
        </p>
        <p className={`text-sm mb-4 text-center ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          Axis {prescriptionAxis}°
          {selectedAngles.length > 1 ? ` · ${selectedAngles.length} sharp lines selected` : ""}
        </p>

        <div className="relative rounded-2xl overflow-hidden" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
          <canvas ref={canvasRef} style={{ display: "block", width: CANVAS_SIZE, height: CANVAS_SIZE }} />
        </div>

        <div className="w-full max-w-md mt-6 px-2">
          <div className="flex justify-between text-xs mb-2">
            <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Sharper line (A)</span>
            <span className={isDarkMode ? "text-cyan-400" : "text-cyan-700"}>CYL {cyl.toFixed(2)} D</span>
            <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Blurrier line (B)</span>
          </div>
          <input
            type="range"
            min={0}
            max={ASTIGMATISM_CYL_MAX_STEP}
            step={1}
            value={sliderStep}
            onChange={(e) => setSliderStep(Number(e.target.value))}
            className="w-full accent-cyan-500"
            aria-label="Blur normalization slider"
          />
        </div>

        <button
          type="button"
          onClick={finishCrossPhase}
          className="mt-6 px-8 py-3 rounded-full font-bold bg-cyan-500 text-white hover:bg-cyan-400"
        >
          Done — lines look equal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6">
      <p className={`text-lg font-semibold mb-2 text-center max-w-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
        {fanInstruction}
      </p>
      {selectedIndices.length > 0 && (
        <p className={`text-sm mb-3 text-center ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
          Selected: {selectedAngles.map((a) => `${a}°`).join(", ")}
          {prescriptionAxis != null ? ` → axis ${prescriptionAxis}°` : ""}
          {axisUncertain ? " (axis approximate)" : ""}
        </p>
      )}

      <div
        ref={containerRef}
        role="group"
        aria-label="Astigmatism fan lines"
        className="relative rounded-2xl overflow-hidden touch-none focus-within:ring-2 focus-within:ring-cyan-500"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, cursor: "pointer" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: CANVAS_SIZE, height: CANVAS_SIZE, pointerEvents: "none" }}
        />
      </div>

      <div className="flex flex-wrap gap-3 mt-6 justify-center">
        <button
          type="button"
          onClick={handleAllEqual}
          className={`px-6 py-3 rounded-full font-semibold transition-all ${
            isDarkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
          }`}
        >
          All lines equal
        </button>
        <button
          type="button"
          onClick={beginCrossPhase}
          disabled={selectedIndices.length === 0}
          className="px-8 py-3 rounded-full font-bold bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40"
        >
          Continue ({selectedIndices.length} selected)
        </button>
      </div>
    </div>
  );
}
