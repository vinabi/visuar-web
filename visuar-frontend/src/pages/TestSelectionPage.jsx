import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  getUnsureBrowseSections,
  getRecommendedAssessmentPath,
  getRecommendedAssessmentLabel,
  getBlurScreenerPath,
  SAFETY_COPY,
  TEST_IDS,
  planUnlocksTest,
  getPlanLabel,
} from "../utils/testCatalog";
import { startNewScreeningSession, setSessionVisionFocus } from "../utils/screeningSession";

function badgeStyles(test, isDarkMode) {
  const isEyesightNumberRecommended =
    test.badgeKey === "recommended" &&
    (test.id === TEST_IDS.SNELLEN || test.id === TEST_IDS.JAEGER);
  if (isEyesightNumberRecommended) {
    return isDarkMode ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700";
  }
  return isDarkMode ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700";
}

function TestCard({ test, isDarkMode, locked, requiredPlan, visionFocus, t }) {
  if (!test.available && !locked) {
    return (
      <div
        className={`test-selection-hover-zoom relative rounded-2xl p-6 shadow-lg cursor-not-allowed opacity-60 ${
          isDarkMode
            ? "bg-[#1a1f3a]/50 border border-slate-700/30"
            : "bg-white/60 border border-white/40"
        }`}
      >
        <span className="text-xs px-3 py-1 rounded-full bg-slate-700/70 text-slate-500">
          {t("testCatalog.comingSoon")}
        </span>
        <h3 className={`text-lg font-bold mt-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          {test.title}
        </h3>
      </div>
    );
  }

  if (locked) {
    const PlanIcon = requiredPlan === "pro" ? Crown : Zap;
    const planLabel = getPlanLabel(requiredPlan, t);
    return (
      <Link
        to="/pricing"
        className={`test-selection-hover-zoom group relative rounded-2xl p-6 shadow-lg overflow-visible ${
          isDarkMode
            ? "bg-[#1a1f3a]/80 border border-amber-500/30 hover:border-amber-400/60"
            : "bg-white/90 border border-amber-200 hover:border-amber-400"
        }`}
      >
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/10 dark:bg-black/30 rounded-2xl">
          <div className={`p-3 rounded-full ${requiredPlan === "pro" ? "bg-amber-500/90" : "bg-cyan-600/90"}`}>
            <Lock className="w-5 h-5 text-white" />
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow">
            <PlanIcon className={`w-3 h-3 ${requiredPlan === "pro" ? "text-amber-500" : "text-cyan-500"}`} />
            <span className={isDarkMode ? "text-slate-200" : "text-slate-700"}>
              {t("testCatalog.planRequired", { plan: planLabel })}
            </span>
          </span>
        </div>
      </Link>
    );
  }

  const testTo =
    test.id === TEST_IDS.BLUR_SCREENER && visionFocus
      ? getBlurScreenerPath(visionFocus)
      : `/test/${test.id}`;

  return (
    <Link
      to={testTo}
      className={`test-selection-hover-zoom group backdrop-blur-sm rounded-2xl p-6 shadow-lg ${
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
          className={`text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${badgeStyles(test, isDarkMode)}`}
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

function TestGrid({ tests, isDarkMode, activePlanId, visionFocus, t }) {
  if (!tests.length) return null;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 overflow-visible py-1">
      {tests.map((test) => {
        const locked = !planUnlocksTest(activePlanId, test.planTier || "free");
        return (
          <TestCard
            key={test.id}
            test={test}
            isDarkMode={isDarkMode}
            locked={locked}
            requiredPlan={test.planTier}
            visionFocus={visionFocus}
            t={t}
          />
        );
      })}
    </div>
  );
}

export default function TestSelectionPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const { activePlanId } = usePlan();
  const navigate = useNavigate();
  const [phase, setPhase] = useState(
    sessionStorage.getItem("visuar_focus_confirmed") ? "tests" : "focus"
  );
  const [focusDraft, setFocusDraft] = useState(getVisionFocus);

  const activeFocus = phase === "tests" ? getVisionFocus() : focusDraft;
  const focus = getVisionFocus();
  const catalog = useMemo(
    () => getTestsForFocus(activeFocus, t),
    [activeFocus, t, i18n.language]
  );
  const { sectionTitle, sectionSubtitle, routingCopy, mainTests, supportingTests } = catalog;
  const recommendedPath = getRecommendedAssessmentPath(focus);
  const recommendedLabel = getRecommendedAssessmentLabel(focus, t);
  const unsureBrowse = useMemo(
    () => (focus === VISION_FOCUS.UNSURE ? getUnsureBrowseSections(t) : null),
    [focus, t, i18n.language]
  );

  const handleFocusContinue = () => {
    startNewScreeningSession({ visionFocus: focusDraft });
    setVisionFocus(focusDraft);
    setSessionVisionFocus(focusDraft);
    sessionStorage.setItem("visuar_focus_confirmed", "1");
    if (focusDraft === VISION_FOCUS.UNSURE || focusDraft === VISION_FOCUS.BOTH) {
      navigate(getBlurScreenerPath(focusDraft));
      return;
    }
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
        <LanguageSelector isDarkMode={isDarkMode} />
      </div>

      <div className="w-full max-w-6xl mx-auto relative z-10 overflow-visible">
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
            className={`max-w-xl mx-auto backdrop-blur-md rounded-3xl shadow-xl p-8 overflow-visible ${
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
            <div className="text-center mb-6">
              <h1
                className={`text-4xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                {sectionTitle}
              </h1>
              <p className={`text-lg ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {sectionSubtitle}
              </p>
              <p className={`mt-2 text-sm ${isDarkMode ? "text-cyan-400/90" : "text-cyan-700"}`}>
                {routingCopy}
              </p>
              <p className={`mt-3 text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                {t(SAFETY_COPY)}
              </p>
              <button
                type="button"
                onClick={handleChangeFocus}
                className="mt-3 text-sm text-cyan-500 hover:underline"
              >
                {t("testCatalog.changeVisionFocus")}
              </button>
            </div>

            {(focus === VISION_FOCUS.UNSURE || focus === VISION_FOCUS.BOTH) && (
              <div
                className={`mb-8 p-6 rounded-2xl text-center ${
                  isDarkMode ? "bg-cyan-500/10 border border-cyan-500/20" : "bg-cyan-50 border border-cyan-100"
                }`}
              >
                <p className={`mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  {focus === VISION_FOCUS.UNSURE
                    ? t("testCatalog.screenerUnsure")
                    : t("testCatalog.screenerBoth")}
                </p>
                <Button
                  className="rounded-full bg-cyan-500 text-white px-8"
                  onClick={() => navigate(getBlurScreenerPath(focus))}
                >
                  {t("testCatalog.startBlurScreener")}
                </Button>
              </div>
            )}

            {mainTests.length > 0 && (
              <>
                <h2
                  className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  {focus === VISION_FOCUS.UNSURE ? t("testCatalog.screener") : t("testCatalog.recommendedTests")}
                </h2>
                <TestGrid
                  tests={mainTests}
                  isDarkMode={isDarkMode}
                  activePlanId={activePlanId}
                  visionFocus={focus}
                  t={t}
                />
              </>
            )}

            {supportingTests.length > 0 && (
              <>
                <h2
                  className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  {t("testCatalog.supportingTests")}
                </h2>
                <TestGrid
                  tests={supportingTests}
                  isDarkMode={isDarkMode}
                  activePlanId={activePlanId}
                  visionFocus={focus}
                  t={t}
                />
              </>
            )}

            {unsureBrowse && (
              <div className="mt-4 space-y-10">
                <p
                  className={`text-sm text-center ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                >
                  {t("testCatalog.browseByFocus")}
                </p>
                {[
                  { key: "distance", section: unsureBrowse.distance },
                  { key: "near", section: unsureBrowse.nearVision },
                ].map(({ key, section }) => (
                  <div key={key}>
                    <h2
                      className={`text-lg font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}
                    >
                      {section.title}
                    </h2>
                    <p
                      className={`text-sm mb-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                    >
                      {section.sectionSubtitle}
                    </p>
                    <h3
                      className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                        isDarkMode ? "text-slate-500" : "text-slate-500"
                      }`}
                    >
                      {t("testCatalog.recommendedTests")}
                    </h3>
                    <TestGrid
                      tests={section.mainTests}
                      isDarkMode={isDarkMode}
                      activePlanId={activePlanId}
                      visionFocus={focus}
                      t={t}
                    />
                    {section.supportingTests.length > 0 && (
                      <>
                        <h3
                          className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
                            isDarkMode ? "text-slate-500" : "text-slate-500"
                          }`}
                        >
                          {t("testCatalog.supportingTests")}
                        </h3>
                        <TestGrid
                          tests={section.supportingTests}
                          isDarkMode={isDarkMode}
                          activePlanId={activePlanId}
                          visionFocus={focus}
                          t={t}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {focus !== VISION_FOCUS.UNSURE && focus !== VISION_FOCUS.BOTH && (
              <div className="text-center">
                <Link to={recommendedPath}>
                  <Button
                    size="lg"
                    className={`h-14 px-12 text-lg rounded-full text-white ${
                      isDarkMode
                        ? "bg-gradient-to-r from-cyan-500 to-cyan-600"
                        : "bg-gradient-to-r from-cyan-500 to-blue-500"
                    }`}
                  >
                    {recommendedLabel}
                  </Button>
                </Link>
                <p className={`mt-4 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  {t("testCatalog.batteryHint")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
