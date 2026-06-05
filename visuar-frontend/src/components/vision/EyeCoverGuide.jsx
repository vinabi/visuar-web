/**
 * EyeCoverGuide — Instructional screen shown before each eye's test.
 *
 * Shows a mirror-view face: one eye open (being tested), the other blocked by
 * a same-side hand drawn at fixed SVG coordinates — no CSS transforms on SVG
 * groups (those break in several browsers and left the hand at the shoulder).
 *
 * All animations use CSS keyframes on GPU-composited properties (transform,
 * opacity) — no Framer Motion, no 3D libraries.
 *
 * Props
 *  eye        "left" | "right"  – eye being TESTED (the other one gets covered)
 *  onStart    () => void
 *  isDarkMode boolean
 */

import { memo, useState, useEffect } from "react";
import { Eye, Hand, Monitor, Ruler, AlignCenter } from "lucide-react";
import { VIEWING_DISTANCE } from "../../utils/viewingDistance";
import { DistanceAcuityWarningCard } from "../DistanceAcuityWarningCard";
import { EyeRestReminder } from "../EyeRestReminder";

// ─── Keyframes (opacity / scale only — no CSS transform on SVG groups) ────────
const KEYFRAMES = `
  @keyframes ecg-cover-pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.82; }
  }

  @keyframes ecg-open-eye-glow {
    0%, 100% { opacity: 0.55; }
    50%      { opacity: 1; }
  }

  /* Step-list slide-in on mount */
  @keyframes ecg-step-in {
    from { opacity: 0; transform: translateX(18px); }
    to   { opacity: 1; transform: translateX(0);    }
  }

  @keyframes ecg-glow {
    0%, 100% { box-shadow: 0 0 0 0    rgba(6,182,212,0.5); }
    50%      { box-shadow: 0 0 0 14px rgba(6,182,212,0);   }
  }
`;

const CYCLE = "2.8s";

// ─── AnimatedFace ─────────────────────────────────────────────────────────────
const AnimatedFace = memo(function AnimatedFace({ coverSide, isDarkMode }) {
  // Mirror view — user's left eye is on screen-left (like a webcam).
  const LEFT_EYE_X  = 78;
  const RIGHT_EYE_X = 122;
  const EYE_Y       = 88;

  const coverEyeX = coverSide === "right" ? RIGHT_EYE_X : LEFT_EYE_X;
  const isRightCover = coverSide === "right";

  // ── palette ──
  const skin      = isDarkMode ? "#4b5563" : "#fde9c8";
  const skinMid   = isDarkMode ? "#374151" : "#f9c97e";
  const skinDark  = isDarkMode ? "#1f2937" : "#e8a84e";
  const hair      = isDarkMode ? "#111827" : "#7c2d12";
  const brow      = isDarkMode ? "#9ca3af" : "#92400e";
  const eyeWhite  = isDarkMode ? "#e2e8f0" : "#ffffff";
  const iris      = isDarkMode ? "#3b82f6" : "#1d4ed8";
  const pupilC    = "#0f172a";
  const outline   = isDarkMode ? "#6b7280" : "#d97706";
  const noseMouth = isDarkMode ? "#9ca3af" : "#b45309";
  const shirtC    = isDarkMode ? "#1e3a8a" : "#1d4ed8";
  const badgeTxt  = isDarkMode ? "#f87171" : "#dc2626";
  const badgeBg   = isDarkMode ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.14)";
  const testGlow  = isDarkMode ? "rgba(34,211,238,0.35)" : "rgba(6,182,212,0.28)";

  const renderEye = (x, isOpen) => (
    <g transform={`translate(${x}, ${EYE_Y})`}>
      <path d="M -11 -17 Q 0 -23 11 -17" stroke={brow} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {isOpen ? (
        <>
          <ellipse
            rx="18"
            ry="18"
            fill="none"
            stroke={testGlow}
            strokeWidth="3"
            style={{ animation: `ecg-open-eye-glow ${CYCLE} ease-in-out infinite` }}
          />
          <ellipse rx="12.5" ry="8.5" fill={eyeWhite} stroke={outline} strokeWidth="0.8" />
          <circle r="6" fill={iris} />
          <circle r="3.2" fill={pupilC} />
          <circle cx="2.5" cy="-2" r="1.8" fill="rgba(255,255,255,0.85)" />
        </>
      ) : (
        <>
          <ellipse rx="12.5" ry="8.5" fill={eyeWhite} stroke={outline} strokeWidth="0.8" style={{ opacity: 0.35 }} />
          <path d="M -12 0 Q 0 4 12 0" stroke={outline} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}
    </g>
  );

  // Forearm path in hand-local coords (hand origin = covered eye).
  const forearm = isRightCover
    ? "M 6 10 Q 24 48 42 86"
    : "M -6 10 Q -24 48 -42 86";

  return (
    <svg
      viewBox="0 0 200 245"
      width="220"
      height="242"
      aria-hidden="true"
      style={{ overflow: "visible", display: "block" }}
    >
      <circle
        cx="100" cy="98"
        r="76"
        fill={isDarkMode ? "rgba(56,189,248,0.07)" : "rgba(6,182,212,0.06)"}
      />

      {/* Shirt + collar */}
      <path
        d="M 22 242 Q 32 198 68 192 L 82 172 L 118 172 L 132 192 Q 168 198 178 242 Z"
        fill={shirtC}
      />
      <path d="M 82 172 L 100 184 L 118 172" fill={isDarkMode ? "#1e3a8a" : "#1e40af"} />

      <rect x="86" y="152" width="28" height="22" rx="5" fill={skinMid} />

      {/* Head */}
      <ellipse cx="100" cy="96" rx="52" ry="58" fill={skin} stroke={outline} strokeWidth="1.5" />

      {/* Ears */}
      <ellipse cx="48"  cy="98" rx="7" ry="11" fill={skin} stroke={outline} strokeWidth="1.2" />
      <ellipse cx="152" cy="98" rx="7" ry="11" fill={skin} stroke={outline} strokeWidth="1.2" />

      {/* Hair — sits above brows only, never overlaps eyes */}
      <path
        d="M 46 72 Q 52 28 100 24 Q 148 28 154 72 Q 130 58 100 56 Q 70 58 46 72 Z"
        fill={hair}
        stroke={outline}
        strokeWidth="1"
      />

      {/* Eyes: open = being tested, squinted = covered side (hand sits on top) */}
      {renderEye(LEFT_EYE_X, coverSide === "right")}
      {renderEye(RIGHT_EYE_X, coverSide === "left")}

      {/* Nose + mouth */}
      <path
        d="M 97 104 Q 93 116 96 121 Q 100 125 104 121 Q 107 116 103 104"
        fill="none" stroke={noseMouth} strokeWidth="1.6" strokeLinecap="round"
      />
      <path
        d="M 83 132 Q 100 144 117 132"
        fill="none" stroke={noseMouth} strokeWidth="2.2" strokeLinecap="round"
      />

      {/* Hand + forearm — fixed at covered eye (SVG transform attribute, not CSS) */}
      <g transform={`translate(${coverEyeX}, ${EYE_Y})`}>
        <path
          d={forearm}
          stroke={skinMid}
          strokeWidth="17"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={forearm}
          stroke={outline}
          strokeWidth="18"
          strokeLinecap="round"
          fill="none"
          style={{ opacity: 0.2 }}
        />

        <g style={{ animation: `ecg-cover-pulse ${CYCLE} ease-in-out infinite` }}>
          {/* Palm fully blocks the eye */}
          <ellipse cx="0" cy="0" rx="26" ry="19" fill={skinMid} stroke={outline} strokeWidth="1.5" />
          <ellipse cx="0" cy="1" rx="22" ry="15" fill={skin} />

          {/* Fingers curl toward temple */}
          {isRightCover ? (
            <>
              <rect x="12" y="-20" width="10" height="16" rx="5" fill={skinMid} stroke={outline} strokeWidth="1" />
              <rect x="20" y="-24" width="9" height="20" rx="4.5" fill={skinMid} stroke={outline} strokeWidth="1" />
              <rect x="27" y="-22" width="8" height="18" rx="4" fill={skinMid} stroke={outline} strokeWidth="1" />
              <line x1="14" y1="-6" x2="14" y2="-2" stroke={skinDark} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="22" y1="-6" x2="22" y2="-2" stroke={skinDark} strokeWidth="1.2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <rect x="-22" y="-20" width="10" height="16" rx="5" fill={skinMid} stroke={outline} strokeWidth="1" />
              <rect x="-29" y="-24" width="9" height="20" rx="4.5" fill={skinMid} stroke={outline} strokeWidth="1" />
              <rect x="-35" y="-22" width="8" height="18" rx="4" fill={skinMid} stroke={outline} strokeWidth="1" />
              <line x1="-16" y1="-6" x2="-16" y2="-2" stroke={skinDark} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="-24" y1="-6" x2="-24" y2="-2" stroke={skinDark} strokeWidth="1.2" strokeLinecap="round" />
            </>
          )}
        </g>
      </g>

      {/* COVER badge — directly above the blocked eye */}
      <g transform={`translate(${coverEyeX}, ${EYE_Y - 34})`}>
        <rect x="-24" y="-10" width="48" height="18" rx="9" fill={badgeBg} stroke={badgeTxt} strokeWidth="1.2" />
        <text
          x="0" y="3"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill={badgeTxt}
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.6"
        >
          COVER
        </text>
      </g>

      <text
        x="100" y="239"
        textAnchor="middle"
        fontSize="9.5"
        fill={isDarkMode ? "rgba(148,163,184,0.65)" : "rgba(100,116,139,0.65)"}
        fontFamily="system-ui, sans-serif"
      >
        ↕  maintain {VIEWING_DISTANCE.labelShort} from screen
      </text>
    </svg>
  );
});

// ─── Instruction steps ────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: Hand,
    label: (side) => `Cover your ${side} eye with your palm`,
    detail: "Cup your hand flat — don't press hard or squint.",
    color: "text-blue-500",
    bg: (d) => d ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-100",
  },
  {
    icon: AlignCenter,
    label: () => "Sit upright and face the screen straight",
    detail: "Keep your head level — don't tilt or lean forward.",
    color: "text-cyan-500",
    bg: (d) => d ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-100",
  },
  {
    icon: Monitor,
    label: () => "Focus on the letter or shape in the center",
    detail: "Don't look away from the screen while answering.",
    color: "text-indigo-500",
    bg: (d) => d ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100",
  },
  {
    icon: Ruler,
    label: () => `Stay ${VIEWING_DISTANCE.label} from the screen`,
    detail: "About one arm's length is the correct testing distance.",
    color: "text-violet-500",
    bg: (d) => d ? "bg-violet-500/10 border-violet-500/20" : "bg-violet-50 border-violet-100",
  },
];

// ─── Main export ───────────────────────────────────────────────────────────────
export const EyeCoverGuide = memo(function EyeCoverGuide({
  eye = "left",
  onStart,
  isDarkMode,
  showDistanceAcuityGuide = false,
}) {
  const coverSide  = eye === "left" ? "right" : "left";
  const coverLabel = coverSide.toUpperCase();
  const testLabel  = eye.toUpperCase();

  const [distanceAck, setDistanceAck] = useState(false);
  useEffect(() => {
    setDistanceAck(false);
  }, [eye, showDistanceAcuityGuide]);

  const canStart = !showDistanceAcuityGuide || distanceAck;

  return (
    <div className="w-full flex flex-col items-center">
      <style>{KEYFRAMES}</style>
      <EyeRestReminder isDarkMode={isDarkMode} />

      {/* ── Header ── */}
      <div className="text-center mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3 ${
          isDarkMode
            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
            : "bg-cyan-50 text-cyan-700 border border-cyan-200"
        }`}>
          <Eye className="w-3.5 h-3.5" />
          Testing your {testLabel} eye
        </div>
        <h2 className={`text-2xl md:text-3xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Cover Your <span className="text-red-500">{coverLabel}</span> Eye
        </h2>
        <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Match the pose below — then cover the same eye before pressing Start
        </p>
      </div>

      {showDistanceAcuityGuide && (
        <DistanceAcuityWarningCard
          isDarkMode={isDarkMode}
          requireAcknowledgement
          acknowledged={distanceAck}
          onAcknowledgedChange={setDistanceAck}
          className="mb-6 max-w-2xl"
        />
      )}

      {/* ── Body: cover image + steps ── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 w-full max-w-2xl">

        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <AnimatedFace coverSide={coverSide} isDarkMode={isDarkMode} />

          {/* Eye legend */}
          <div className={`flex items-center gap-2 text-xs font-semibold mt-1 ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}>
            <span className={`flex items-center gap-1 ${
              coverSide === "left" ? "text-red-500 font-bold" : ""
            }`}>
              <span className={`w-2 h-2 rounded-full inline-block ${
                coverSide === "left" ? "bg-red-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"
              }`} />
              Your LEFT
            </span>
            <span className={isDarkMode ? "text-slate-700" : "text-slate-300"}>|</span>
            <span className={`flex items-center gap-1 ${
              coverSide === "right" ? "text-red-500 font-bold" : ""
            }`}>
              Your RIGHT
              <span className={`w-2 h-2 rounded-full inline-block ${
                coverSide === "right" ? "bg-red-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"
              }`} />
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 flex flex-col gap-3 w-full">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${step.bg(isDarkMode)}`}
                style={{
                  animation: "ecg-step-in 0.45s ease-out both",
                  animationDelay: `${i * 90}ms`,
                }}
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                  isDarkMode ? "bg-slate-800" : "bg-white"
                }`}>
                  <Icon className={`w-4.5 h-4.5 ${step.color}`} style={{ width: 18, height: 18 }} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${
                    isDarkMode ? "text-slate-200" : "text-slate-800"
                  }`}>
                    {step.label(coverLabel)}
                  </p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${
                    isDarkMode ? "text-slate-500" : "text-slate-500"
                  }`}>
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Start button ── */}
      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className={`mt-8 px-14 py-4 rounded-full text-base font-bold transition-all duration-150 select-none ${
          canStart
            ? isDarkMode
              ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/30 active:scale-95"
              : "bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/35 active:scale-95"
            : isDarkMode
              ? "bg-slate-700 text-slate-500 cursor-not-allowed shadow-none"
              : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
        }`}
        style={canStart ? { animation: "ecg-glow 2.6s ease-in-out infinite" } : undefined}
      >
        I'm Ready — Start {testLabel} Eye Test
      </button>

      <p className={`mt-3 text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
        {showDistanceAcuityGuide && !canStart
          ? "Check the box above to continue"
          : "The camera will verify your position before the test begins"}
      </p>
    </div>
  );
});
