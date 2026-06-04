import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import {
  DISTANCE_ACUITY_EMPHASIS,
  DISTANCE_ACUITY_ACK_LABEL,
  DISTANCE_ACUITY_WARNING_BODY,
  DISTANCE_ACUITY_WARNING_FOOTER,
  DISTANCE_ACUITY_WARNING_TITLE,
} from "../utils/distanceAcuityInstructions";

const PULSE_KEYFRAMES = `
@keyframes visuar-warn-border-pulse {
  0%, 100% {
    border-color: #F59E0B;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
  50% {
    border-color: #D97706;
    box-shadow: 0 0 0 5px rgba(245, 158, 11, 0.22);
  }
}
@keyframes visuar-warn-icon-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.88; transform: scale(1.06); }
}
`;

/**
 * High-visibility distance acuity warning — distinct from blue instruction panels.
 * Optional checkbox gates parent Start actions when requireAcknowledgement is true.
 */
export const DistanceAcuityWarningCard = memo(function DistanceAcuityWarningCard({
  isDarkMode = false,
  requireAcknowledgement = false,
  acknowledged = false,
  onAcknowledgedChange,
  className = "",
}) {
  const cardStyle = isDarkMode
    ? {
        background: "rgba(120, 53, 15, 0.35)",
        border: "2px solid #F59E0B",
      }
    : {
        background: "#FFF4E5",
        border: "2px solid #F59E0B",
      };

  const titleColor = isDarkMode ? "#FBBF24" : "#B45309";
  const bodyColor = isDarkMode ? "#FDE68A" : "#92400E";
  const footerColor = isDarkMode ? "#FCD34D" : "#78350F";

  return (
    <div className={`w-full ${className}`}>
      <style>{PULSE_KEYFRAMES}</style>
      <div
        className="rounded-xl px-4 py-4 text-left"
        style={{
          ...cardStyle,
          animation: "visuar-warn-border-pulse 2.5s ease-in-out infinite",
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: isDarkMode ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)",
              animation: "visuar-warn-icon-pulse 2.5s ease-in-out infinite",
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: "#F59E0B" }} strokeWidth={2.5} />
          </div>
          <p
            className="text-sm font-black uppercase tracking-wide leading-snug pt-1"
            style={{ color: titleColor }}
          >
            <span className="mr-1.5" aria-hidden>
              ⚠️
            </span>
            {DISTANCE_ACUITY_WARNING_TITLE}
          </p>
        </div>

        <p className="text-sm leading-relaxed mb-3" style={{ color: bodyColor }}>
          {DISTANCE_ACUITY_WARNING_BODY}
        </p>

        <p
          className="text-center text-xl md:text-2xl font-black uppercase tracking-tight mb-3 py-2 px-2 rounded-lg"
          style={{
            color: isDarkMode ? "#FB923C" : "#C2410C",
            background: isDarkMode ? "rgba(234, 88, 12, 0.15)" : "rgba(251, 146, 60, 0.2)",
          }}
        >
          {DISTANCE_ACUITY_EMPHASIS}
        </p>

        <p className="text-xs leading-relaxed mb-3" style={{ color: footerColor }}>
          {DISTANCE_ACUITY_WARNING_FOOTER}
        </p>

        {requireAcknowledgement && (
          <label
            className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t"
            style={{ borderColor: isDarkMode ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.45)" }}
          >
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => onAcknowledgedChange?.(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 rounded border-2 border-amber-500 text-amber-600 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm font-semibold leading-snug" style={{ color: bodyColor }}>
              {DISTANCE_ACUITY_ACK_LABEL}
            </span>
          </label>
        )}
      </div>
    </div>
  );
});
