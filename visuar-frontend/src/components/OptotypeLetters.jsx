import { buildOptotypeStyles } from "../utils/visionScaling";

/**
 * Renders Sloan-style letters at a clinical cap height (CSS px).
 * Uses transform scaling to bypass browser minimum font-size limits.
 */
export function OptotypeLetters({
  letters,
  capHeightPx,
  gapRatio,
  className = "",
  letterClassName = "font-sans font-black",
  isDarkMode,
}) {
  const list = Array.isArray(letters) ? letters : String(letters || "").split("");
  const { row, text } = buildOptotypeStyles(capHeightPx, gapRatio);
  const color = isDarkMode ? "text-white" : "text-black";

  return (
    <div style={row} className={className}>
      <div style={text} className={`${letterClassName} ${color}`}>
        {list.map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
    </div>
  );
}
