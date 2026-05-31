/**
 * Presents Landolt C results in three user-facing formats + clinical interpretation.
 */

export function LandoltAcuitySummary({ eye, isDarkMode, title }) {
  if (!eye?.decimalScore && eye?.decimalScore !== 0) return null;

  const panel = isDarkMode
    ? "bg-slate-800/60 border border-slate-700/50"
    : "bg-white/90 border border-slate-100";

  const rows = [
    { label: "Decimal score", value: String(eye.decimalScore) },
    { label: "Snellen (6 m)", value: eye.snellen6 || eye.thresholdAcuity || "—" },
    { label: "Snellen (20 ft)", value: eye.snellen20 || eye.thresholdSnellen20 || "—" },
    {
      label: "Est. spherical (SPH)",
      value: eye.estimatedDiopter || (eye.estimatedSphereD != null ? `${eye.estimatedSphereD} D` : "—"),
    },
  ];

  return (
    <div className={`rounded-2xl p-5 ${panel}`}>
      {title && (
        <h4
          className={`font-bold mb-3 text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}
        >
          {title}
        </h4>
      )}
      <div className="space-y-2 text-sm mb-4">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{row.label}</span>
            <span className={`font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {eye.interpretation && (
        <p
          className={`text-sm leading-relaxed rounded-xl p-3 ${
            isDarkMode ? "bg-cyan-500/10 text-cyan-100" : "bg-cyan-50 text-cyan-900"
          }`}
        >
          <span className="font-semibold">Clinical interpretation: </span>
          {eye.interpretation}
        </p>
      )}
    </div>
  );
}
