/**
 * ISO 8596 Landolt C — SVG ring with gap.
 * Stroke thickness and gap width each equal 1/5 of the outer diameter.
 */

const deg2rad = (d) => (d * Math.PI) / 180;

/**
 * @param {number} size - SVG viewBox width/height (px)
 * @param {number} gapAngleDeg - Gap centre: 0=right, 90=down, 180=left, 270=up (screen coords)
 * @param {number} [grayVal=30] - Ring grey level 0–255
 */
export function LandoltCSvg({ size, gapAngleDeg, grayVal = 30 }) {
  const diameter = size;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = diameter / 5;
  const midR = diameter / 2 - stroke / 2;
  const halfGap = stroke / midR / 2;
  const a = deg2rad(gapAngleDeg);
  const start = a + halfGap;
  const end = a - halfGap + Math.PI * 2;
  const large = end - start > Math.PI ? 1 : 0;

  const x0 = cx + midR * Math.cos(start);
  const y0 = cy + midR * Math.sin(start);
  const x1 = cx + midR * Math.cos(end);
  const y1 = cy + midR * Math.sin(end);

  const d = `M ${x0} ${y0} A ${midR} ${midR} 0 ${large} 1 ${x1} ${y1}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      role="img"
      aria-label="Landolt C optotype"
    >
      <rect width={size} height={size} fill="rgb(250,250,250)" />
      <path
        d={d}
        fill="none"
        stroke={`rgb(${grayVal},${grayVal},${grayVal})`}
        strokeWidth={stroke}
        strokeLinecap="butt"
      />
    </svg>
  );
}
