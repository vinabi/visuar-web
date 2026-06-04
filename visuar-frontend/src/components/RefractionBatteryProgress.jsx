const FAR_STEPS = [
  { id: "snellen", label: "Acuity" },
  { id: "duochrome", label: "Duochrome" },
  { id: "simulator", label: "Refine" },
];

const NEAR_STEPS = [
  { id: "jaeger", label: "Near acuity" },
  { id: "near_far", label: "Near–far" },
  { id: "duochrome", label: "Duochrome" },
  { id: "simulator", label: "Refine" },
];

export function RefractionBatteryProgress({ currentStep, isDarkMode, variant = "far" }) {
  const steps = variant === "near" ? NEAR_STEPS : FAR_STEPS;
  const idx = steps.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-4 px-4">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div
            key={step.id}
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              active
                ? "bg-cyan-500 text-white"
                : done
                  ? isDarkMode
                    ? "bg-green-500/20 text-green-400"
                    : "bg-green-100 text-green-700"
                  : isDarkMode
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-100 text-slate-400"
            }`}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
