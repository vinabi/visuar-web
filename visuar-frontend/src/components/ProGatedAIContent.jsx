import { Link } from "react-router-dom";
import { Crown, Lock } from "lucide-react";
import { usePlan } from "../context/PlanContext";

/**
 * Wraps AI summary / explanation blocks. Pro users see content; others see a blurred preview + upgrade CTA.
 */
export function ProGatedAIContent({ children, isDarkMode, className = "" }) {
  const { activePlanId } = usePlan();
  const isPro = activePlanId === "pro";

  if (isPro) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div
        className="blur-md select-none pointer-events-none max-h-[420px] overflow-hidden"
        aria-hidden
      >
        {children}
      </div>
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center ${
          isDarkMode ? "bg-[#0a0e27]/75" : "bg-white/80"
        }`}
      >
        <div className="p-3 rounded-full bg-amber-500/90 shadow-lg">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <p className={`text-sm font-bold max-w-xs ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          AI explanations are included with Pro
        </p>
        <p className={`text-xs max-w-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          Upgrade to unlock personalized summaries, findings, and lifestyle guidance for your results.
        </p>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white transition-colors"
        >
          <Crown className="w-3.5 h-3.5" />
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}

export function useProAIExplanations() {
  const { activePlanId } = usePlan();
  return activePlanId === "pro";
}

/** Basic and Pro plans persist test results to the database; Free shows results only. */
export function useCanPersistTestResults() {
  const { activePlanId } = usePlan();
  return activePlanId === "basic" || activePlanId === "pro";
}

/** Blurred stand-in so free users see the AI section shape without readable text. */
export function AIExplanationPlaceholder({ isDarkMode }) {
  const line = isDarkMode ? "bg-slate-600/80" : "bg-slate-300";
  return (
    <div className="space-y-6 p-6">
      <div className={`h-5 w-40 rounded ${line}`} />
      <div className={`h-4 w-full rounded ${line}`} />
      <div className={`h-4 w-[92%] rounded ${line}`} />
      <div className={`h-4 w-[85%] rounded ${line}`} />
      <div className={`h-5 w-36 rounded mt-4 ${line}`} />
      <div className={`h-4 w-full rounded ${line}`} />
      <div className={`h-4 w-[88%] rounded ${line}`} />
      <div className={`h-20 w-full rounded-xl mt-2 ${line}`} />
    </div>
  );
}
