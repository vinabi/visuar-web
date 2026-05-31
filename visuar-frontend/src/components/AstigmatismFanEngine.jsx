import { useState, useEffect, useRef, useCallback } from "react";
import { linesToAxis, linesToCylinder } from "../utils/refractionMath";
import {
  ASTIGMATISM_FAN_LINE_COUNT,
  computePrimaryAxis,
} from "../utils/testStimuli";

const CANVAS_SIZE = 360;

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
    // Full line from one edge through center to the opposite edge
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

function drawFan(canvas, selectedOrder, hoverIndex, isDarkMode, size) {
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
  ctx.fillStyle = isDarkMode ? "#0d1117" : "#ffffff";
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const selected = new Set(selectedOrder);

  for (let i = 0; i < ASTIGMATISM_FAN_LINE_COUNT; i++) {
    const angle = (i * Math.PI) / ASTIGMATISM_FAN_LINE_COUNT;
    const isSelected = selected.has(i);
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
    // Full line from edge to edge through center (proper clock-dial appearance)
    ctx.moveTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }
}

/**
 * Clock-dial / fan chart for astigmatism axis and cylinder estimate.
 */
export function AstigmatismFanEngine({
  isDarkMode,
  visionOk,
  onComplete,
  showInstructions = true,
}) {
  const [phase, setPhase] = useState(showInstructions ? "INSTRUCTIONS" : "TESTING");
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [hoverIndex, setHoverIndex] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isTouchRef = useRef(false);

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

  const hitRadius = useCallback(() => (isTouchRef.current ? 24 : 16), []);

  useEffect(() => {
    if (phase === "TESTING") {
      drawFan(canvasRef.current, selectedOrder, hoverIndex, isDarkMode, CANVAS_SIZE);
    }
  }, [selectedOrder, hoverIndex, isDarkMode, phase]);

  const toggleLine = useCallback((index) => {
    if (index == null) return;
    setSelectedOrder((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
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
      e.preventDefault();
      isTouchRef.current = e.pointerType === "touch";
      const pt = coordsFromEvent(e.clientX, e.clientY);
      if (!pt) return;
      const index = nearestLineIndex(pt.x, pt.y, CANVAS_SIZE, hitRadius());
      toggleLine(index);
    },
    [coordsFromEvent, hitRadius, toggleLine]
  );

  const handlePointerMove = useCallback(
    (e) => {
      isTouchRef.current = e.pointerType === "touch";
      updateHover(e.clientX, e.clientY);
    },
    [updateHover]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const submit = useCallback(() => {
    if (selectedOrder.length === 0) return;
    const selectedAngles = selectedOrder.map(lineAngleDeg);
    const { primaryAxis, uncertain } = computePrimaryAxis(selectedAngles);
    const axisFromLines = linesToAxis(selectedOrder);
    const axis = primaryAxis ?? axisFromLines;
    const cyl = linesToCylinder(selectedOrder, false);
    const confidence = uncertain ? 0.45 : selectedOrder.length === 1 ? 0.75 : 0.65;

    onComplete({
      cyl,
      axis,
      primaryAxis: axis,
      selectedAngle: axis,
      selectedAngles,
      selectedLines: selectedOrder,
      axisUncertain: uncertain,
      confidence,
      allEqual: false,
    });
  }, [selectedOrder, onComplete]);

  const handleAllEqual = useCallback(() => {
    onComplete({
      cyl: 0,
      axis: null,
      primaryAxis: null,
      selectedAngle: null,
      selectedAngles: [],
      selectedLines: [],
      axisUncertain: false,
      confidence: 0.7,
      allEqual: true,
    });
  }, [onComplete]);

  const instructionText =
    "Select all lines that look darkest, sharpest, or clearest. You can select more than one. Press Submit when done.";

  if (phase === "INSTRUCTIONS") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center">
        <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Astigmatism Fan Test
        </h2>
        <p className={`text-lg mb-6 max-w-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          {instructionText}
        </p>
        <button
          type="button"
          onClick={() => setPhase("TESTING")}
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

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6">
      <p className={`text-lg font-semibold mb-2 text-center max-w-lg ${isDarkMode ? "text-white" : "text-slate-800"}`}>
        {instructionText}
      </p>
      {selectedOrder.length > 0 && (
        <p className={`text-sm mb-3 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
          Selected: {selectedOrder.map((i) => `${lineAngleDeg(i)}°`).join(", ")} — tap again to deselect
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
          className={`px-6 py-3 rounded-full font-semibold ${
            isDarkMode ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-800"
          }`}
        >
          All lines equal
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={selectedOrder.length === 0}
          className="px-8 py-3 rounded-full font-bold bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
