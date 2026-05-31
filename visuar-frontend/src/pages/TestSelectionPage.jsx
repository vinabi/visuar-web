import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, Lock, Crown, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { VisionFocusStep } from "@/components/VisionFocusStep";
import { useTheme } from "../context/ThemeContext";
import { usePlan } from "../context/PlanContext";
import {
  VISION_FOCUS,
  getVisionFocus,
  setVisionFocus,
} from "../utils/visionFocus";
import {
  getTestsForFocus,
  getRecommendedAssessmentPath,
  TEST_IDS,
  planUnlocksTest,
  PLAN_LABELS,
} from "../utils/testCatalog";
import { startNewScreeningSession, setSessionVisionFocus } from "../utils/screeningSession";

function TestCard({ test, isDarkMode, locked, requiredPlan }) {
  // Coming-soon (not available and not just plan-locked)
  if (!test.available && !locked) {
    return (
      <div
        className={`relative rounded-2xl p-6 shadow-lg cursor-not-allowed opacity-60 ${
          isDarkMode
            ? "bg-[#1a1f3a]/50 border border-slate-700/30"
            : "bg-white/60 border border-white/40"
        }`}
      >
        <span className="text-xs px-3 py-1 rounded-full bg-slate-700/70 text-slate-500">
          Coming Soon
        </span>
        <h3 className={`text-lg font-bold mt-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          {test.title}
        </h3>
      </div>
    );
  }

  // Plan-locked
  if (locked) {
    const PlanIcon = requiredPlan === "pro" ? Crown : Zap;
    const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
    return (
      <Link
        to="/pricing"
        className={`group relative rounded-2xl p-6 shadow-lg transition-all overflow-hidden ${
          isDarkMode
            ? "bg-[#1a1f3a]/80 border border-amber-500/30 hover:border-amber-400/60"
            : "bg-white/90 border border-amber-200 hover:border-amber-400"
        }`}
      >
        {/* Blurred content overlay */}
        <div className="blur-sm pointer-events-none select-none">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-slate-700" : "bg-slate-100"}`}>
              <Eye className={`w-6 h-6 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${isDarkMode ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-400"}`}>
              {test.badge}
            </span>
          </div>
          <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {test.title}
          </h3>
          <p className={`text-sm ${isDarkMode ? "text-slate-600" : "text-slate-300"}`}>
            {test.description}
          </p>
        </div>

        {/* Lock badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/10 dark:bg-black/30 rounded-2xl">
          <div className={`p-3 rounded-full ${requiredPlan === "pro" ? "bg-amber-500/90" : "bg-cyan-600/90"}`}>
            <Lock className="w-5 h-5 text-white" />
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow">
            <PlanIcon className={`w-3 h-3 ${requiredPlan === "pro" ? "text-amber-500" : "text-cyan-500"}`} />
            <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
              {planLabel} plan required
            </span>
          </span>
          <span className={`text-[11px] font-medium mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Tap to upgrade
          </span>
        </div>
      </Link>
    );
  }

  // Available
  return (
    <Link
      to={`/test/${test.id}`}
      className={`group backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all ${
        isDarkMode
          ? "bg-[#1a1f3a]/80 border border-slate-700/50 hover:border-cyan-400/50"
          : "bg-white/90 border border-white/60 hover:border-cyan-300"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isDarkMode ? "bg-cyan-400/20" : "bg-cyan-100"
          }`}
        >
          <Eye className={`w-6 h-6 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${
            isDarkMode ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700"
          }`}
        >
          {test.badge}
        </span>
      </div>
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          {test.title}
        </h3>
        <span className={`text-xs shrink-0 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
          {test.duration}
        </span>
      </div>
      <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        {test.description}
      </p>
    </Link>
  );
}

export default function TestSelectionPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { activePlanId } = usePlan();
  const [phase, setPhase] = useState(
    sessionStorage.getItem("visuar_focus_confirmed") ? "tests" : "focus"
  );
  const [focusDraft, setFocusDraft] = useState(getVisionFocus);

  const { sectionTitle, mainTests, supportingTests } = getTestsForFocus(
    phase === "tests" ? getVisionFocus() : focusDraft
  );
  const focus = getVisionFocus();
  const recommendedPath = getRecommendedAssessmentPath(focus);

  const handleFocusContinue = () => {
    startNewScreeningSession({ visionFocus: focusDraft });
    setVisionFocus(focusDraft);
    setSessionVisionFocus(focusDraft);
    sessionStorage.setItem("visuar_focus_confirmed", "1");
    setPhase("tests");
  };

  const handleChangeFocus = () => {
    setPhase("focus");
    sessionStorage.removeItem("visuar_focus_confirmed");
  };

  return (
    <div
      className={`min-h-screen p-8 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-6xl mx-auto relative z-10">
        <Link to="/dashboard">
          <Button
            variant="ghost"
            className={`mb-8 ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-700"}`}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            {t("testSelection.back")}
          </Button>
        </Link>

        {phase === "focus" && (
          <div
            className={`max-w-xl mx-auto backdrop-blur-md rounded-3xl shadow-xl p-8 ${
              isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80"
            }`}
          >
            <VisionFocusStep
              value={focusDraft}
              onChange={setFocusDraft}
              onContinue={handleFocusContinue}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {phase === "tests" && (
          <>
            <div className="text-center mb-8">
              <h1
                className={`text-4xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                {sectionTitle}
              </h1>
              <p className={`text-lg ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t("testSelection.subtitle")}
              </p>
              <button
                type="button"
                onClick={handleChangeFocus}
                className="mt-3 text-sm text-cyan-500 hover:underline"
              >
                Change vision focus
              </button>
            </div>

            {focus === VISION_FOCUS.UNSURE && (
              <div
                className={`mb-8 p-6 rounded-2xl text-center ${
                  isDarkMode ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-50 border border-cyan-100"
                }`}
              >
                <p className={`mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  Not sure where blur is worst? Start with a short screener (one Snellen row and one Jaeger line),
                  then we will recommend distance, near, or complete tests.
                </p>
                <Link to={`/test/${TEST_IDS.COMPLETE}`}>
                  <Button className="rounded-full bg-cyan-500 text-white px-8">
                    Run short screener
                  </Button>
                </Link>
              </div>
            )}

            {mainTests.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {mainTests.map((test) => {
                  const locked = !planUnlocksTest(activePlanId, test.planTier || "free");
                  return (
                    <TestCard
                      key={test.id}
                      test={test}
                      isDarkMode={isDarkMode}
                      locked={locked}
                      requiredPlan={test.planTier}
                    />
                  );
                })}
              </div>
            )}

            {supportingTests.length > 0 && (
              <>
                <h2
                  className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  Supporting tests
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  {supportingTests.map((test) => {
                    const locked = !planUnlocksTest(activePlanId, test.planTier || "free");
                    return (
                      <TestCard
                        key={test.id}
                        test={test}
                        isDarkMode={isDarkMode}
                        locked={locked}
                        requiredPlan={test.planTier}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <div className="text-center">
              <Link to={recommendedPath}>
                <Button
                  size="lg"
                  className={`h-14 px-12 text-lg rounded-full text-white ${
                    isDarkMode ? "bg-gradient-to-r from-cyan-500 to-cyan-600" : "bg-gradient-to-r from-cyan-500 to-blue-500"
                  }`}
                >
                  Start Recommended Assessment
                </Button>
              </Link>
              <p className={`mt-4 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Best for a more reliable estimated eyesight number.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
