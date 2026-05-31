/**
 * EyeCoverGuide — Animated instructional screen shown before each eye's test.
 *
 * Shows a face with a skin-toned arm sweeping up from the shoulder to cover
 * the correct eye. The arm is clearly connected so the user understands they
 * should raise their own hand to block that eye.
 *
 * All animations use CSS keyframes on GPU-composited properties (transform,
 * opacity) — no Framer Motion, no 3D libraries.
 *
 * Props
 *  eye        "left" | "right"  – eye being TESTED (the other one gets covered)
 *  onStart    () => void
 *  isDarkMode boolean
 */

import { memo } from "react";
import { Eye, Hand, Monitor, Ruler, AlignCenter } from "lucide-react";
import { VIEWING_DISTANCE } from "../../utils/viewingDistance";

// ─── Keyframes ────────────────────────────────────────────────────────────────
// "ecg-" prefix to avoid collisions.
// Arm comes from below-right (for right eye) or below-left (for left eye),
// holds clearly in place for ~70 % of the cycle, then descends.
const KEYFRAMES = `
  @keyframes ecg-arm-right {
    0%,  4%   { transform: translate(60px, 120px); opacity: 0; }
    15%, 82%  { transform: translate(0,     0);    opacity: 1; }
    93%, 100% { transform: translate(60px, 120px); opacity: 0; }
  }
  @keyframes ecg-arm-left {
    0%,  4%   { transform: translate(-60px, 120px); opacity: 0; }
    15%, 82%  { transform: translate(0,      0);    opacity: 1; }
    93%, 100% { transform: translate(-60px, 120px); opacity: 0; }
  }

  /* Covered eye fades out as arm arrives, reappears as arm leaves */
  @keyframes ecg-eye-out {
    0%,  12%  { opacity: 1; }
    20%, 84%  { opacity: 0; }
    92%, 100% { opacity: 1; }
  }

  /* "COVER" badge next to the eye — pulses while arm is present */
  @keyframes ecg-badge {
    0%,  12%  { opacity: 0; }
    20%, 84%  { opacity: 1; }
    92%, 100% { opacity: 0; }
  }

  /* Gentle breathing on the whole SVG */
  @keyframes ecg-breathe {
    0%, 100% { transform: scale(1);     }
    50%      { transform: scale(1.018); }
  }

  /* Step-list slide-in on mount */
  @keyframes ecg-step-in {
    from { opacity: 0; transform: translateX(18px); }
    to   { opacity: 1; transform: translateX(0);    }
  }

  /* Button glow pulse */
  @keyframes ecg-glow {
    0%, 100% { box-shadow: 0 0 0 0    rgba(6,182,212,0.5); }
    50%      { box-shadow: 0 0 0 14px rgba(6,182,212,0);   }
  }
`;

const CYCLE = "4.5s";

// ─── AnimatedFace ─────────────────────────────────────────────────────────────
const AnimatedFace = memo(function AnimatedFace({ coverSide, isDarkMode }) {
  // Mirror convention: LEFT_EYE_X = user's left eye on screen-left
  const LEFT_EYE_X  = 78;
  const RIGHT_EYE_X = 122;
  const EYE_Y       = 84;

  const handX   = coverSide === "right" ? RIGHT_EYE_X : LEFT_EYE_X;
  const armAnim = coverSide === "right" ? "ecg-arm-right" : "ecg-arm-left";

  // ── palette ──
  const skin      = isDarkMode ? "#4b5563" : "#fde9c8";
  const skinMid   = isDarkMode ? "#374151" : "#f9c97e";   // slightly darker — arm
  const skinDark  = isDarkMode ? "#1f2937" : "#e8a84e";   // knuckle lines
  const hair      = isDarkMode ? "#111827" : "#7c2d12";
  const brow      = isDarkMode ? "#9ca3af" : "#92400e";
  const eyeWhite  = isDarkMode ? "#e2e8f0" : "#ffffff";
  const iris      = isDarkMode ? "#3b82f6" : "#1d4ed8";
  const pupilC    = "#0f172a";
  const outline   = isDarkMode ? "#6b7280" : "#d97706";
  const noseMouth = isDarkMode ? "#9ca3af" : "#b45309";
  const shirtC    = isDarkMode ? "#1e3a8a" : "#1d4ed8";
  const badgeTxt  = isDarkMode ? "#f87171" : "#dc2626";
  const badgeBg   = isDarkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.12)";

  // Forearm curve direction: for right cover the arm sweeps down-right; left → down-left
  const armCurve = coverSide === "right"
    ? "M 10 18 Q 36 68 58 108"   // down-right
    : "M -10 18 Q -36 68 -58 108"; // down-left

  return (
    <svg
      viewBox="0 0 200 245"
      width="220"
      height="242"
      aria-hidden="true"
      style={{
        animation: `ecg-breathe ${CYCLE} ease-in-out infinite`,
        willChange: "transform",
        overflow: "visible",
        display: "block",
      }}
    >
      {/* Soft glow disc behind head */}
      <circle
        cx="100" cy="98"
        r="76"
        fill={isDarkMode ? "rgba(56,189,248,0.07)" : "rgba(6,182,212,0.06)"}
      />

      {/* ── Shirt + collar ── */}
      <path
        d="M 22 242 Q 32 198 68 192 L 82 172 L 118 172 L 132 192 Q 168 198 178 242 Z"
        fill={shirtC}
      />
      <path d="M 82 172 L 100 184 L 118 172" fill={isDarkMode ? "#1e3a8a" : "#1e40af"} />

      {/* ── Neck ── */}
      <rect x="86" y="152" width="28" height="22" rx="5" fill={skinMid} />

      {/* ── Head ── */}
      <ellipse cx="100" cy="96" rx="52" ry="58" fill={skin} stroke={outline} strokeWidth="1.5" />

      {/* ── Hair (clipPath keeps it to top half) ── */}
      <defs>
        <clipPath id="ecg-hair-clip">
          <rect x="0" y="0" width="200" height="94" />
        </clipPath>
      </defs>
      <ellipse
        cx="100" cy="84"
        rx="55" ry="56"
        fill={hair}
        clipPath="url(#ecg-hair-clip)"
      />

      {/* ── Ears ── */}
      <ellipse cx="48"  cy="98" rx="7" ry="11" fill={skin} stroke={outline} strokeWidth="1.2" />
      <ellipse cx="152" cy="98" rx="7" ry="11" fill={skin} stroke={outline} strokeWidth="1.2" />

      {/* ════ LEFT EYE (user's left, screen-left) ════ */}
      <g
        transform={`translate(${LEFT_EYE_X}, ${EYE_Y})`}
        style={
          coverSide === "left"
            ? { animation: `ecg-eye-out ${CYCLE} ease-in-out infinite` }
            : undefined
        }
      >
        {/* eyebrow */}
        <path d="M -11 -17 Q 0 -23 11 -17" stroke={brow} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* white */}
        <ellipse rx="12.5" ry="8.5" fill={eyeWhite} stroke={outline} strokeWidth="0.8" />
        {/* iris */}
        <circle r="6" fill={iris} />
        {/* pupil */}
        <circle r="3.2" fill={pupilC} />
        {/* shine */}
        <circle cx="2.5" cy="-2" r="1.8" fill="rgba(255,255,255,0.8)" />
      </g>

      {/* ════ RIGHT EYE (user's right, screen-right) ════ */}
      <g
        transform={`translate(${RIGHT_EYE_X}, ${EYE_Y})`}
        style={
          coverSide === "right"
            ? { animation: `ecg-eye-out ${CYCLE} ease-in-out infinite` }
            : undefined
        }
      >
        <path d="M -11 -17 Q 0 -23 11 -17" stroke={brow} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse rx="12.5" ry="8.5" fill={eyeWhite} stroke={outline} strokeWidth="0.8" />
        <circle r="6" fill={iris} />
        <circle r="3.2" fill={pupilC} />
        <circle cx="2.5" cy="-2" r="1.8" fill="rgba(255,255,255,0.8)" />
      </g>

      {/* ── Nose ── */}
      <path
        d="M 97 104 Q 93 116 96 121 Q 100 125 104 121 Q 107 116 103 104"
        fill="none" stroke={noseMouth} strokeWidth="1.6" strokeLinecap="round"
      />

      {/* ── Mouth ── */}
      <path
        d="M 83 132 Q 100 144 117 132"
        fill="none" stroke={noseMouth} strokeWidth="2.2" strokeLinecap="round"
      />

      {/* ════ ARM + HAND (animated, drawn on top of face) ════
           The group is anchored at the eye being covered.
           The forearm path curves down toward the shoulder.
           The palm + fingers sit above the anchor. */}
      <g
        transform={`translate(${handX}, ${EYE_Y})`}
        style={{
          animation: `${armAnim} ${CYCLE} cubic-bezier(0.34,1.46,0.64,1) infinite`,
          willChange: "transform, opacity",
        }}
      >
        {/* Forearm (thick rounded stroke, skin-toned — looks like user's own arm) */}
        <path
          d={armCurve}
          stroke={skinMid}
          strokeWidth="22"
          strokeLinecap="round"
          fill="none"
        />
        {/* Forearm outline for depth */}
        <path
          d={armCurve}
          stroke={outline}
          strokeWidth="23"
          strokeLinecap="round"
          fill="none"
          style={{ opacity: 0.25 }}
        />

        {/* Palm body — wide enough to visually cover the eye region */}
        <rect x="-26" y="-14" width="52" height="38" rx="13" fill={skinMid} stroke={outline} strokeWidth="1.5" />

        {/* 4 Fingers (pointing away from palm, upward since arm is upright) */}
        <rect x="-22" y="-54" width="11" height="42" rx="5.5" fill={skinMid} stroke={outline} strokeWidth="1.2" />
        <rect x="-9"  y="-60" width="11" height="48" rx="5.5" fill={skinMid} stroke={outline} strokeWidth="1.2" />
        <rect x="4"   y="-60" width="11" height="48" rx="5.5" fill={skinMid} stroke={outline} strokeWidth="1.2" />
        <rect x="17"  y="-54" width="11" height="42" rx="5.5" fill={skinMid} stroke={outline} strokeWidth="1.2" />

        {/* Knuckle line accents */}
        <line x1="-16" y1="-15" x2="-16" y2="-9" stroke={skinDark} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-3"  y1="-15" x2="-3"  y2="-9" stroke={skinDark} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10"  y1="-15" x2="10"  y2="-9" stroke={skinDark} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="23"  y1="-15" x2="23"  y2="-9" stroke={skinDark} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* ── "COVER" badge — appears in sync with the arm ── */}
      <g
        transform={`translate(${handX}, ${EYE_Y - 30})`}
        style={{ animation: `ecg-badge ${CYCLE} ease-in-out infinite` }}
      >
        <rect x="-22" y="-10" width="44" height="18" rx="9" fill={badgeBg} stroke={badgeTxt} strokeWidth="1" />
        <text
          x="0" y="3"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill={badgeTxt}
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          COVER
        </text>
      </g>

      {/* ── Distance hint at bottom ── */}
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
export const EyeCoverGuide = memo(function EyeCoverGuide({ eye = "left", onStart, isDarkMode }) {
  const coverSide  = eye === "left" ? "right" : "left";
  const coverLabel = coverSide.toUpperCase();
  const testLabel  = eye.toUpperCase();

  return (
    <div className="w-full flex flex-col items-center">
      <style>{KEYFRAMES}</style>

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
          Watch the animation — then do the same before pressing Start
        </p>
      </div>

      {/* ── Body: face animation + steps ── */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 w-full max-w-2xl">

        {/* Face */}
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
        onClick={onStart}
        className={`mt-8 px-14 py-4 rounded-full text-base font-bold transition-all duration-150 active:scale-95 select-none ${
          isDarkMode
            ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/30"
            : "bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/35"
        }`}
        style={{ animation: "ecg-glow 2.6s ease-in-out infinite" }}
      >
        I'm Ready — Start {testLabel} Eye Test
      </button>

      <p className={`mt-3 text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
        The camera will verify your position before the test begins
      </p>
    </div>
  );
});
