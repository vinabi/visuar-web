import { useState, useMemo } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";
import { BlurScreenerPart } from "../components/BlurScreenerPart";
import {
  BLUR_ENTRY_REASON,
  initBlurScreenerSession,
  getBlurEntryReason,
  saveBlurScreeningResult,
  setFullFlowProgress,
} from "../utils/blurScreenerSession";
import {
  buildScreeningResult,
  pathForRecommendedFlow,
  labelForRecommendedFlow,
  visionFocusForFlow,
  RECOMMENDED_FLOW,
} from "../utils/blurScreenerRouting";
import {
  DISTANCE_BLUR_ITEMS,
  NEAR_BLUR_ITEMS,
} from "../utils/blurScreenerStimuli";
import { getBlurScreenerIntro, getNearTransitionCopy } from "../utils/blurScreenerCopy";
import { setVisionFocus, VISION_FOCUS } from "../utils/visionFocus";
import { setSessionVisionFocus, startNewScreeningSession } from "../utils/screeningSession";
import { TEST_IDS } from "../utils/testCatalog";

function resolveEntryReason(location, searchParams) {
  const fromQuery = searchParams.get("entry");
  if (fromQuery === BLUR_ENTRY_REASON.BOTH || fromQuery === BLUR_ENTRY_REASON.UNSURE) {
    return fromQuery;
  }
  const fromState = location.state?.blurEntryReason;
  if (fromState === BLUR_ENTRY_REASON.BOTH || fromState === BLUR_ENTRY_REASON.UNSURE) {
    return fromState;
  }
  const stored = getBlurEntryReason();
  if (stored === BLUR_ENTRY_REASON.BOTH || stored === BLUR_ENTRY_REASON.UNSURE) {
    return stored;
  }
  return BLUR_ENTRY_REASON.UNSURE;
}

export default function BlurScreenerPage() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const entryReason = useMemo(
    () => resolveEntryReason(location, searchParams),
    [location.state, searchParams]
  );
  const intro = useMemo(() => getBlurScreenerIntro(entryReason), [entryReason]);

  const [phase, setPhase] = useState("intro");
  const [distanceStats, setDistanceStats] = useState(null);
  const [screeningResult, setScreeningResult] = useState(null);

  const ppi = useMemo(() => {
    const saved = localStorage.getItem("visuar_ppi");
    return saved ? parseFloat(saved) : 148;
  }, []);

  const panelClass = `backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 transition-colors ${
    isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"
  }`;

  const startScreener = () => {
    initBlurScreenerSession(entryReason);
    startNewScreeningSession({
      visionFocus:
        entryReason === BLUR_ENTRY_REASON.BOTH ? VISION_FOCUS.BOTH : VISION_FOCUS.UNSURE,
    });
    setPhase("distance");
  };

  const finishDistance = (stats) => {
    setDistanceStats(stats);
    setPhase("near_transition");
  };

  const finishNear = (nearStats) => {
    const result = buildScreeningResult({
      entryReason,
      distanceStats,
      nearStats,
    });
    saveBlurScreeningResult(result);
    const focus = visionFocusForFlow(result.recommendedFlow);
    setVisionFocus(focus);
    setSessionVisionFocus(focus);
    sessionStorage.setItem("visuar_focus_confirmed", "1");

    if (result.recommendedFlow === RECOMMENDED_FLOW.FULL) {
      setFullFlowProgress({
        recommendedFlow: "full",
        completedDistance: false,
        completedNear: false,
      });
    }

    setScreeningResult(result);
    setPhase("result");
  };

  const goToRecommendedTest = () => {
    if (!screeningResult) return;
    const path = pathForRecommendedFlow(screeningResult.recommendedFlow);
    if (screeningResult.recommendedFlow === RECOMMENDED_FLOW.OPTIONAL) {
      navigate("/test-selection");
      return;
    }
    navigate(path);
  };

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${
        isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-2xl mx-auto relative z-10 flex-1 p-6 md:p-8">
        <Link to="/test-selection">
          <Button
            variant="ghost"
            className={`mb-6 ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-700"}`}
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Back
          </Button>
        </Link>

        {phase === "intro" && (
          <div className={panelClass}>
            <h1 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {intro.title}
            </h1>
            <p className={`mb-4 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{intro.body}</p>
            <ul
              className={`text-sm space-y-2 mb-8 list-disc pl-5 ${
                isDarkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <li>{intro.distanceHint}</li>
              <li>5 distance letters, one at a time</li>
              <li>{intro.nearHint}</li>
              <li>5 near words, one at a time</li>
            </ul>
            <p className={`text-xs mb-6 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
              Entry: {entryReason === BLUR_ENTRY_REASON.BOTH ? "Both near & far blurry" : "Not sure"}
            </p>
            <Button
              className="w-full rounded-full bg-cyan-500 hover:bg-cyan-400 text-white h-12"
              onClick={startScreener}
            >
              Start screener
            </Button>
          </div>
        )}

        {phase === "distance" && (
          <div className={panelClass}>
            <BlurScreenerPart
              items={DISTANCE_BLUR_ITEMS}
              partTitle="Distance blur check"
              partHint="Sit 60–80 cm from the screen. Each letter appears alone."
              ppi={ppi}
              isDarkMode={isDarkMode}
              onComplete={finishDistance}
            />
          </div>
        )}

        {phase === "near_transition" && (
          <div className={`${panelClass} text-center`}>
            <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Near check next
            </h2>
            <p className={`mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              {getNearTransitionCopy(entryReason)}
            </p>
            <Button
              className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-white px-10 h-12"
              onClick={() => setPhase("near")}
            >
              Continue to near check
            </Button>
          </div>
        )}

        {phase === "near" && (
          <div className={panelClass}>
            <BlurScreenerPart
              items={NEAR_BLUR_ITEMS}
              partTitle="Near blur check"
              partHint="About 35–40 cm from the screen. Short words, one at a time."
              ppi={ppi}
              isDarkMode={isDarkMode}
              onComplete={finishNear}
            />
          </div>
        )}

        {phase === "result" && screeningResult && (
          <div className={panelClass}>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className={`w-12 h-12 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
            </div>
            <h2 className={`text-2xl font-bold text-center mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Screening complete
            </h2>
            <p className={`text-center mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              {screeningResult.message}
            </p>

            <div
              className={`rounded-2xl p-4 mb-6 text-sm space-y-2 ${
                isDarkMode ? "bg-slate-800/80 border border-slate-700" : "bg-slate-50 border border-slate-200"
              }`}
            >
              <p>
                <strong>Distance score:</strong>{" "}
                {Math.round(screeningResult.distanceScore * 100)}%
                {screeningResult.distanceWeak ? " (needs follow-up)" : " (okay)"}
              </p>
              <p>
                <strong>Near score:</strong>{" "}
                {Math.round(screeningResult.nearScore * 100)}%
                {screeningResult.nearWeak ? " (needs follow-up)" : " (okay)"}
              </p>
              <p>
                <strong>Next flow:</strong> {screeningResult.recommendedFlow}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-white h-12"
                onClick={goToRecommendedTest}
              >
                {labelForRecommendedFlow(screeningResult.recommendedFlow)}
              </Button>
              {screeningResult.recommendedFlow !== RECOMMENDED_FLOW.FULL && (
                <Button
                  variant="outline"
                  className="rounded-full h-12"
                  onClick={() => navigate(`/test/${TEST_IDS.COMPLETE}`)}
                >
                  Take full vision check anyway
                </Button>
              )}
              <Button
                variant="ghost"
                className="rounded-full h-11"
                onClick={() => navigate("/test-selection")}
              >
                Browse all tests
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
