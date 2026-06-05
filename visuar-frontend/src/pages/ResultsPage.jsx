import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, Download, Share2, CheckCircle2,
  AlertTriangle, Info, TrendingUp, Eye, Activity, Sparkles, Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { scoreLabel, scoreHex } from "../utils/metricsEngine";
import { formatPrescription } from "../utils/refractionMath";
import { DIOPTER_ESTIMATE_DISCLAIMER } from "../utils/diopterEstimate";
import {
  acuityToScore,
  acuityStatus,
  formatAcuityLabel,
  parseAcuityDecimal,
  snellenEquivalent,
} from "../utils/acuityUnits";
import { loadPersistedTestResult } from "../utils/lastTestResult";
import { VISION_FOCUS_LABELS } from "../utils/visionFocus";
import { API_URL } from "../lib/config";
import { ScreeningResultCards } from "../components/ScreeningResultCards";
import { TestResultsAIInsight } from "../components/TestResultsAIInsight";
import {
  ProGatedAIContent,
  AIExplanationPlaceholder,
  useProAIExplanations,
} from "../components/ProGatedAIContent";
import { useResultsAIAnalysis } from "../hooks/useResultsAIAnalysis";
import { onboardingAPI } from "../lib/api";
import { emptyAiAnalysis } from "../lib/aiAnalysis";
import { LandoltAcuitySummary } from "../components/LandoltAcuitySummary";
import { landoltReportFromStoredDecimal } from "../utils/landoltAcuity";
import { TestPrescriptionCard } from "../components/TestPrescriptionCard";
import { enrichLegacyEyeEstimate, computeSingleDiopterD } from "../utils/finalEstimate";
import { correctionModeLabel } from "../utils/correctionMode";
import {
  contrastAbilityLabel,
  contrastReliabilityLabel,
  buildContrastPlainMeaning,
  buildContrastRecommendations,
  formatFaintestContrastRead,
  hardestLevelDisplay,
} from "../utils/contrastResults";

const REFRACTION_TEST_TYPES = [
  "refraction-battery",
  "duochrome-refinement",
  "refraction-simulator",
  "astigmatism-fan",
];

// ─── Visual components ───────────────────────────────────

function ScoreRing({ score, size = 120, label, sub }) {
  const sw = size * 0.08;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const hex = scoreHex(score);
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="rgba(100,116,139,0.2)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={hex} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black text-black" style={{ fontSize: size * 0.22, lineHeight: 1 }}>{score}</span>
        {label && <span className="text-slate-400 font-medium text-center leading-tight" style={{ fontSize: size * 0.095 }}>{label}</span>}
        {sub && <span style={{ fontSize: size * 0.082, color: hex }} className="font-bold mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

function MiniRing({ score, size = 64, label }) {
  const sw = size * 0.1;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const hex = scoreHex(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(100,116,139,0.2)" strokeWidth={sw} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={hex} strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-white" style={{ fontSize: size * 0.25 }}>{score}</span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-400 text-center leading-tight">{label}</span>}
    </div>
  );
}

function StatBar({ label, value, detail, status, isDarkMode }) {
  const colors = {
    excellent: { bar: "bg-green-500", badge: isDarkMode ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-green-100 text-green-700" },
    good: { bar: "bg-cyan-500", badge: isDarkMode ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-cyan-100 text-cyan-700" },
    moderate: { bar: "bg-amber-500", badge: isDarkMode ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-amber-100 text-amber-700" },
    poor: { bar: "bg-red-500", badge: isDarkMode ? "bg-red-500/20 border-red-500/30 text-red-400" : "bg-red-100 text-red-700" },
  };
  const c = colors[status] || colors.moderate;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}>{label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>{status}</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-700/60" : "bg-slate-100"}`}>
        <div className={`h-full rounded-full ${c.bar} transition-all duration-700`}
          style={{ width: `${Math.max(4, value)}%` }} />
      </div>
      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{detail}</p>
    </div>
  );
}

function ResponseChart({ responseTimes, roundResults, isDarkMode }) {
  if (!responseTimes || responseTimes.length === 0) return null;
  const maxT = Math.max(...responseTimes, 500);
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Response Time per Round
      </p>
      <div className="flex items-end gap-0.5 h-14">
        {responseTimes.map((t, i) => {
          const h = Math.max(8, (t / maxT) * 100);
          const ok = roundResults?.[i]?.correct ?? true;
          return (
            <div key={i} title={`Round ${i + 1}: ${(t / 1000).toFixed(1)}s · ${ok ? "✓" : "✗"}`}
              className={`rounded-t-sm transition-all ${ok ? "bg-green-500/70 hover:bg-green-500" : "bg-red-500/60 hover:bg-red-500"}`}
              style={{ height: `${h}%`, flex: 1 }} />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className={`text-[10px] ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>Round 1</span>
        <span className={`text-[10px] ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>Round {responseTimes.length}</span>
      </div>
    </div>
  );
}

function LevelDots({ levelProgression, maxLevel, isDarkMode }) {
  if (!levelProgression || levelProgression.length === 0) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        Difficulty Progression
      </p>
      <div className="flex gap-1 flex-wrap">
        {levelProgression.map((level, i) => {
          const intensity = Math.max(0.25, level / Math.max(maxLevel, 1));
          return (
            <div key={i} title={`Round ${i + 1}: Level ${level + 1}`}
              className="w-2.5 h-2.5 rounded-full bg-cyan-400 transition-all"
              style={{ opacity: intensity }} />
          );
        })}
      </div>
    </div>
  );
}

function FindingCard({ f, isDarkMode }) {
  const styles = {
    success: isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200",
    warning: isDarkMode ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200",
    info: isDarkMode ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200",
  };
  const icons = {
    success: <CheckCircle2 className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />,
    warning: <AlertTriangle className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />,
    info: <Info className={`w-5 h-5 shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />,
  };
  return (
    <div className={`flex gap-4 p-4 rounded-xl border ${styles[f.type] || styles.info}`}>
      <div className="mt-0.5">{icons[f.type] || icons.info}</div>
      <div>
        <h4 className={`font-semibold text-sm mb-0.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{f.title}</h4>
        <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{f.description}</p>
        {f.description_ur && (
          <p className={`text-sm leading-relaxed mt-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {f.description_ur}
          </p>
        )}
      </div>
    </div>
  );
}

function ResultsShell({ title, date, isDarkMode, children }) {
  const { t } = useTranslation();
  return (
    <div className={`min-h-screen p-4 md:p-8 relative overflow-hidden transition-colors ${isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"}`}>
      <AnimatedBackground isDarkMode={isDarkMode} />
      <div className="absolute top-6 right-6 z-20"><LanguageSelector /></div>
      <div className="max-w-5xl mx-auto relative z-10">
        <Link to="/dashboard">
          <Button variant="ghost" className={`mb-6 ${isDarkMode ? "text-slate-300 hover:bg-slate-800/50 hover:text-white" : "text-slate-700 hover:text-cyan-600 hover:bg-white/60"}`}>
            <ArrowLeft className="mr-2 w-4 h-4" />{t("common.back")}
          </Button>
        </Link>
        <div className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 ${isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"}`}>
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4 ${isDarkMode ? "bg-green-500/20 border border-green-500/30 text-green-400" : "bg-green-100 border border-green-200 text-green-700"}`}>
              <CheckCircle2 className="w-4 h-4" />{t("test.testCompleted")}
            </div>
            <h1 className={`text-3xl md:text-4xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>{title}</h1>
            <p className={`text-base ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("test.completedOn")} {date}</p>
          </div>
          {children}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/test-selection">
              <Button size="lg" className={`h-13 px-10 rounded-full font-bold ${isDarkMode ? "bg-cyan-500 hover:bg-cyan-400 text-white" : "bg-cyan-500 hover:bg-cyan-600 text-white"}`}>{t("test.retakeTest")}</Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className={`h-13 px-10 border-2 rounded-full bg-transparent font-bold ${isDarkMode ? "border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/10" : "border-cyan-500/30 text-cyan-600 hover:bg-cyan-50"}`}>{t("test.backToDashboard")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function diopterLabel(d) {
  if (d == null) return "N/A";
  const abs = Math.abs(d).toFixed(2);
  if (d < -0.25) return `−${abs} D (estimated distance glasses)`;
  if (d > 0.25) return `+${abs} D (estimated reading glasses)`;
  return `${abs} D (plano / normal range)`;
}
function rtStatus(ms) { return ms < 1500 ? "excellent" : ms < 2500 ? "good" : ms < 3500 ? "moderate" : "poor"; }
function accStatus(pct) { return pct >= 80 ? "excellent" : pct >= 65 ? "good" : pct >= 50 ? "moderate" : "poor"; }
function fatigueStatus(f) { return f === "None" ? "excellent" : f === "Mild" ? "good" : "moderate"; }
function consStatus(c) { return c >= 80 ? "excellent" : c >= 60 ? "good" : c >= 40 ? "moderate" : "poor"; }
function stabStatus(s) { return s >= 90 ? "excellent" : s >= 70 ? "good" : s >= 50 ? "moderate" : "poor"; }
function rtNorm(ms) { return Math.max(5, Math.round(100 - ms / 50)); }

// ─── Main Component ──────────────────────────────────────

export default function ResultsPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { testId } = useParams();
  const location = useLocation();
  const { session } = useAuth();
  const resultState = location.state;
  const persistedState = !resultState && testId ? loadPersistedTestResult(testId) : null;

  // ── Fetch from DB when navigating from dashboard (numeric ID) or slug without state ──
  const isNumericId = testId && /^\d+$/.test(testId);
  const [fetchedRecord, setFetchedRecord] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (!session?.access_token) return;
    onboardingAPI
      .getProfile()
      .then((p) => {
        if (p) setUserProfile({ diet_habits: p.diet_habits, screen_time: p.screen_time });
      })
      .catch(() => {});
  }, [session?.access_token]);

  useEffect(() => {
    if (resultState || persistedState) return;
    if (!session?.access_token || !testId) return;
    setFetchLoading(true);
    const headers = { Authorization: `Bearer ${session.access_token}` };
    const load = isNumericId
      ? fetch(`${API_URL}/api/test-results/${testId}`, { headers }).then((res) =>
          res.ok ? res.json() : null
        )
      : fetch(`${API_URL}/api/test-results`, { headers })
          .then((res) => (res.ok ? res.json() : []))
          .then((list) => {
            if (!Array.isArray(list)) return null;
            return list.find((r) => r.test_type === testId) ?? null;
          });

    load
      .then((data) => { if (data) setFetchedRecord(data); })
      .catch((err) => console.error("[ResultsPage] fetch error:", err))
      .finally(() => setFetchLoading(false));
  }, [isNumericId, testId, session, resultState, persistedState]);

  // ── Determine effective test type ────────────────────────
  const effectiveTestType = isNumericId && fetchedRecord
    ? fetchedRecord.test_type
    : testId;

  const isContrastTest = effectiveTestType === "contrast-sensitivity";
  const isOrientationTest = effectiveTestType === "orientation-discrimination";
  const isLandoltTest = effectiveTestType === "landolt-acuity";
  const isColorVisionTest = effectiveTestType === "color-vision";
  const isRapidTest = effectiveTestType === "rapid-recognition";
  const isRefractionTest = REFRACTION_TEST_TYPES.includes(effectiveTestType);
  const isCompleteAssessment = effectiveTestType === "complete";
  const isJaegerTest = effectiveTestType === "jaeger-acuity";
  const isNearFarTest = effectiveTestType === "near-far-switching";

  // ── Build data from fetched DB record (history view) ─────
  const fromDB = isNumericId && fetchedRecord;

  const parseSafe = (str, fallback = []) => {
    try { return JSON.parse(str || "null") || fallback; } catch { return fallback; }
  };

  const fetchedAI = fromDB ? {
    findings: parseSafe(fetchedRecord.ai_findings, []),
    recommendations: parseSafe(fetchedRecord.ai_recommendations, []),
    summary: fetchedRecord.ai_summary || "",
  } : null;

  // Synthesise contrastData / orientationData / snellenData from DB record
  const dbRapidData = fromDB && isRapidTest ? {
    rapidScore: fetchedRecord.overall_score,
    highestLevel: 0, accuracy: 0, avgResponseTime: 0,
    fatigueLevel: "None", consistencyScore: 100, sessionStability: 100,
    pauseCount: 0, precisionLevel: 0, levelProgression: [], responseTimes: [],
    roundResults: [], fastestResponse: 0, slowestResponse: 0,
    aiAnalysis: fetchedAI,
  } : null;

  const dbContrastData = fromDB && isContrastTest ? {
    contrastScore: fetchedRecord.overall_score,
    accuracy: 0, lowestContrastValue: null, avgResponseTime: 0,
    fatigueLevel: "None", consistencyScore: 100, sessionStability: 100,
    pauseCount: 0, precisionLevel: 0, levelProgression: [], responseTimes: [],
    roundResults: [], fastestResponse: 0, slowestResponse: 0,
    aiAnalysis: fetchedAI,
  } : null;

  const dbOrientationData = fromDB && isOrientationTest ? {
    orientationScore: fetchedRecord.overall_score,
    accuracy: 0, thresholdLevel: null, avgResponseTime: 0,
    fatigueLevel: "None", consistencyScore: 100, sessionStability: 100,
    pauseCount: 0, precisionLevel: 0, levelProgression: [], responseTimes: [],
    roundResults: [], fastestResponse: 0, slowestResponse: 0,
    aiAnalysis: fetchedAI,
  } : null;

  const dbColorVisionData = fromDB && isColorVisionTest ? {
    score: fetchedRecord.overall_score,
    colorVisionScore: fetchedRecord.overall_score,
    cvdRisk: "Unknown", cvdType: "Unknown",
    accuracySc: 0, speedSc: 0, l1Errors: 0, l1Total: 0,
    totalPlates: 14, rounds: [], pauseCount: 0,
    aiAnalysis: fetchedAI,
  } : null;

  const dbLandoltParsed = fromDB && isLandoltTest && fetchedRecord.result_json
    ? parseSafe(fetchedRecord.result_json, null)
    : null;

  const dbLandoltLeft =
    dbLandoltParsed?.left || landoltReportFromStoredDecimal(fetchedRecord?.left_eye_acuity);
  const dbLandoltRight =
    dbLandoltParsed?.right || landoltReportFromStoredDecimal(fetchedRecord?.right_eye_acuity);

  const dbLandoltData = fromDB && isLandoltTest ? {
    landoltScore: fetchedRecord.overall_score,
    leftEye: dbLandoltLeft,
    rightEye: dbLandoltRight,
    leftAcuity: dbLandoltLeft?.snellen6,
    rightAcuity: dbLandoltRight?.snellen6,
    leftDecimal: dbLandoltLeft?.decimalScore,
    rightDecimal: dbLandoltRight?.decimalScore,
    thresholdDecimal: dbLandoltRight?.decimalScore,
    thresholdAcuity: dbLandoltRight?.snellen6,
    thresholdSnellen20: dbLandoltRight?.snellen20,
    interpretation: dbLandoltRight?.interpretation,
    accuracy: 0,
    avgResponseTime: 0,
    fatigueLevel: "None",
    consistencyScore: 100,
    sessionStability: 100,
    pauseCount: 0,
    precisionLevel: 0,
    levelProgression: [],
    responseTimes: [],
    roundResults: [],
    fastestResponse: 0,
    slowestResponse: 0,
    aiAnalysis: fetchedAI,
  } : null;

  const dbRefractionParsed = fromDB && isRefractionTest && fetchedRecord.result_json
    ? parseSafe(fetchedRecord.result_json, null)
    : null;

  const dbRefractionState = fromDB && isRefractionTest ? {
    leftEye: dbRefractionParsed?.left || {
      acuity: fetchedRecord.left_eye_acuity,
      sph: fetchedRecord.left_eye_diopter,
      diopter: fetchedRecord.left_eye_diopter,
    },
    rightEye: dbRefractionParsed?.right || {
      acuity: fetchedRecord.right_eye_acuity,
      sph: fetchedRecord.right_eye_diopter,
      diopter: fetchedRecord.right_eye_diopter,
    },
    overallScore: fetchedRecord.overall_score,
    timestamp: fetchedRecord.created_at,
    aiAnalysis: fetchedAI,
  } : null;

  const refractionData = resultState?.leftEye ? resultState : dbRefractionState;

  const dbSnellenState = fromDB && !isContrastTest && !isOrientationTest && !isLandoltTest && !isColorVisionTest && !isRefractionTest && !isCompleteAssessment && !isJaegerTest && !isNearFarTest ? {
    leftEye: {
      acuity: fetchedRecord.left_eye_acuity,
      diopter: fetchedRecord.left_eye_diopter,
      sph: fetchedRecord.left_eye_diopter,
    },
    rightEye: {
      acuity: fetchedRecord.right_eye_acuity,
      diopter: fetchedRecord.right_eye_diopter,
      sph: fetchedRecord.right_eye_diopter,
    },
    overallScore: fetchedRecord.overall_score,
    timestamp: fetchedRecord.created_at,
    aiAnalysis: fetchedAI,
  } : null;

  const contrastData = resultState?.contrastData || dbContrastData;
  const orientationData = resultState?.orientationData || dbOrientationData;
  const colorVisionData = resultState?.colorVisionData || dbColorVisionData;
  const landoltData = resultState?.landoltData || dbLandoltData;
  const rapidData = resultState?.rapidData || dbRapidData;

  // ── AI analysis (state → DB → on-mount fetch) ───────────
  const initialAi =
    contrastData?.aiAnalysis ||
    orientationData?.aiAnalysis ||
    colorVisionData?.aiAnalysis ||
    landoltData?.aiAnalysis ||
    rapidData?.aiAnalysis ||
    refractionData?.aiAnalysis ||
    resultState?.aiAnalysis ||
    persistedState?.aiAnalysis ||
    fetchedAI ||
    emptyAiAnalysis();

  const effectiveSnellenState = resultState || persistedState || dbSnellenState;
  const proAiEnabled = useProAIExplanations();

  const { aiAnalysis, aiLoading: aiFetchLoading } = useResultsAIAnalysis({
    testType: effectiveTestType,
    ctx: {
      resultState: resultState || persistedState,
      persistedState,
      effectiveResultState: effectiveSnellenState,
      contrastData,
      orientationData,
      colorVisionData,
      landoltData,
      rapidData,
      refractionData,
      userProfile,
    },
    initialAi,
    userProfile,
    persistSlug: testId && !isNumericId ? testId : null,
    enabled: proAiEnabled,
  });

  const aiLoading = fetchLoading || aiFetchLoading;

  // ── Effective result state for Snellen ───────────────────
  const effectiveResultState = effectiveSnellenState;

  const dateStr = new Date(
    resultState?.timestamp || persistedState?.timestamp || fetchedRecord?.created_at || Date.now()
  ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Loading state while fetching history record ──────────
  if (fetchLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"}`}>
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  const testTitles = {
    "snellen-acuity": "Distance Eyesight Number Test",
    "jaeger-acuity": "Near Eyesight Number Test",
    "near-far-switching": "Near–Far Switching",
    complete: "Complete Vision Assessment",
    "contrast-sensitivity": "Contrast Sensitivity",
    "orientation-discrimination": "Orientation Discrimination",
    "landolt-acuity": "Landolt C Acuity",
    "color-vision": "Colour Vision",
    "rapid-recognition": "Rapid Recognition",
    "refraction-battery": "Full Refraction Battery",
    "duochrome-refinement": "Duochrome Refinement",
    "refraction-simulator": "Refraction Simulator",
    "astigmatism-fan": "Astigmatism Fan",
  };

  // ── Shared analytics section renderer ─────────────────
  function AnalyticsSection({ responseTimes, roundResults, levelProgression, maxLevel, consistencyScore, sessionStability, fatigueLevel, avgResponseTime, pauseCount, accuracy }) {
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    return (
      <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
        <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          <Activity className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
          Session Analytics
        </h3>

        {/* Mini rings row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <MiniRing score={accuracy ?? 0} size={62} label="Accuracy" />
          <MiniRing score={consistencyScore ?? 100} size={62} label="Consistency" />
          <MiniRing score={sessionStability ?? 100} size={62} label="Stability" />
          <MiniRing score={rtNorm(avgResponseTime ?? 1500)} size={62} label="Speed" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-center">
          {[
            { label: "Avg Speed", val: `${((avgResponseTime ?? 0) / 1000).toFixed(1)}s` },
            { label: "Consistency", val: scoreLabel(consistencyScore ?? 100) },
            { label: "Stability", val: scoreLabel(sessionStability ?? 100) },
            { label: "Pauses", val: `${pauseCount ?? 0}` },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-3 ${isDarkMode ? "bg-slate-700/50" : "bg-white border border-slate-100"}`}>
              <div className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>{s.val}</div>
              <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="space-y-5">
          <ResponseChart responseTimes={responseTimes} roundResults={roundResults} isDarkMode={isDarkMode} />
          <LevelDots levelProgression={levelProgression} maxLevel={maxLevel} isDarkMode={isDarkMode} />
        </div>
      </div>
    );
  }

  function FindingsSection({ findings, recommendations }) {
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    const useAiFindings = proAiEnabled && aiAnalysis?.findings?.length > 0;
    const useAiRecs = proAiEnabled && aiAnalysis?.recommendations?.length > 0;
    const displayFindings = useAiFindings ? aiAnalysis.findings : findings;
    const displayRecs = useAiRecs ? aiAnalysis.recommendations : recommendations;
    const aiSummary = proAiEnabled
      ? aiAnalysis?.summary || aiAnalysis?.screening?.summary_en
      : null;
    const showFindingsSkeleton = proAiEnabled && aiFetchLoading && displayFindings.length === 0;
    const showRecsSkeleton = proAiEnabled && aiFetchLoading && displayRecs.length === 0;

    const aiSummaryBlock = aiSummary ? (
      <div
        className={`rounded-2xl p-4 mb-4 flex gap-3 items-start ${
          isDarkMode ? "bg-purple-500/10 border border-purple-500/25" : "bg-purple-50 border border-purple-200"
        }`}
      >
        <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
        <div className="flex-1">
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-purple-200" : "text-purple-800"}`}>
            <span className="font-semibold">AI Summary: </span>
            {aiSummary}
          </p>
          {aiAnalysis?.summary_ur && (
            <p
              className={`text-sm leading-relaxed mt-2 ${
                isDarkMode ? "text-purple-300" : "text-purple-700"
              }`}
            >
              {aiAnalysis.summary_ur}
            </p>
          )}
        </div>
      </div>
    ) : null;

    const aiInsightBlock = proAiEnabled ? (
      <TestResultsAIInsight
        ai={aiAnalysis}
        isDarkMode={isDarkMode}
        loading={aiFetchLoading && !(aiAnalysis?.summary || aiAnalysis?.findings?.length)}
      />
    ) : (
      <div
        className={`rounded-2xl mt-6 ${
          isDarkMode
            ? "bg-gradient-to-br from-purple-500/8 to-cyan-500/8 border border-purple-500/20"
            : "bg-gradient-to-br from-purple-50 to-cyan-50 border border-purple-100"
        }`}
      >
        <AIExplanationPlaceholder isDarkMode={isDarkMode} />
      </div>
    );

    return (
      <>
        <ProGatedAIContent isDarkMode={isDarkMode} className="mb-4">
          {proAiEnabled ? (
            <>
              {aiSummaryBlock}
              <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
                <h3
                  className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  <Eye className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                  Key Findings
                  {showFindingsSkeleton && (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400 ml-1" />
                  )}
                  {!showFindingsSkeleton && useAiFindings && (
                    <span
                      className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                        isDarkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      AI
                    </span>
                  )}
                </h3>
                {showFindingsSkeleton ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-16 rounded-xl animate-pulse ${
                          isDarkMode ? "bg-slate-700/50" : "bg-slate-100"
                        }`}
                      />
                    ))}
                  </div>
                ) : displayFindings.length > 0 ? (
                  <div className="space-y-3">
                    {displayFindings.map((f, i) => (
                      <FindingCard key={i} f={f} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    No additional findings for this test.
                  </p>
                )}
              </div>

              <div
                className={`rounded-2xl p-6 mb-6 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-blue-500/8 to-cyan-500/8 border border-blue-500/20"
                    : "bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100"
                }`}
              >
                <h3
                  className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  <TrendingUp className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                  Recommendations
                  {!showRecsSkeleton && useAiRecs && (
                    <span
                      className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                        isDarkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      AI
                    </span>
                  )}
                </h3>
                {showRecsSkeleton ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-10 rounded-xl animate-pulse ${
                          isDarkMode ? "bg-slate-700/50" : "bg-slate-100"
                        }`}
                      />
                    ))}
                  </div>
                ) : displayRecs.length > 0 ? (
                  <div className="space-y-3">
                    {displayRecs.map((rec, i) => (
                      <div key={i} className="flex gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDarkMode ? "bg-cyan-400" : "bg-cyan-500"
                            }`}
                          />
                        </div>
                        <p
                          className={`text-sm leading-relaxed ${
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Recommendations will appear when AI analysis completes.
                  </p>
                )}
              </div>
              {aiInsightBlock}
            </>
          ) : (
            aiInsightBlock
          )}
        </ProGatedAIContent>

        {proAiEnabled ? null : (
          <>
            <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
              <h3
                className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <Eye className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                Key Findings
              </h3>
              {displayFindings.length > 0 ? (
                <div className="space-y-3">
                  {displayFindings.map((f, i) => (
                    <FindingCard key={i} f={f} isDarkMode={isDarkMode} />
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  No additional findings for this test.
                </p>
              )}
            </div>

            <div
              className={`rounded-2xl p-6 mb-6 ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500/8 to-cyan-500/8 border border-blue-500/20"
                  : "bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100"
              }`}
            >
              <h3
                className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <TrendingUp className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                Recommendations
              </h3>
              {displayRecs.length > 0 ? (
                <div className="space-y-3">
                  {displayRecs.map((rec, i) => (
                    <div key={i} className="flex gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDarkMode ? "bg-cyan-400" : "bg-cyan-500"
                          }`}
                        />
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        {rec}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  No recommendations for this test.
                </p>
              )}
            </div>
          </>
        )}
      </>
    );
  }

  // ── Contrast Sensitivity Results ─────────────────────────
  if (isContrastTest && contrastData) {
    const {
      contrastScore,
      accuracy = 0,
      lowestContrastValue,
      contrastLevelPassed,
      faintestContrastPercent,
      fatigueLevel = "None",
      precisionLevel = 0,
      totalLevels = 15,
      consistencyScore = 100,
      sessionStability = 100,
      pauseCount = 0,
      levelProgression = [],
      responseTimes = [],
      roundResults = [],
      avgResponseTime = 0,
      fastestResponse = 0,
      slowestResponse = 0,
    } = contrastData;

    const faintestRaw =
      faintestContrastPercent ?? contrastLevelPassed ?? lowestContrastValue;
    const ability = contrastAbilityLabel(contrastScore);
    const reliability = contrastReliabilityLabel({ accuracy, fatigueLevel });
    const levelInfo = hardestLevelDisplay(precisionLevel, totalLevels);
    const plainMeaning = buildContrastPlainMeaning({
      contrastScore,
      accuracy,
      fatigueLevel,
      reliability,
    });
    const recs = buildContrastRecommendations({
      contrastScore,
      accuracy,
      fatigueLevel,
      reliability,
    });

    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";

    const findings = [
      {
        type: reliability === "Low" ? "warning" : "success",
        title: `Contrast ability: ${ability}`,
        description: `Reliability: ${reliability}. ${plainMeaning}`,
      },
      {
        type: "info",
        title: "Screening only",
        description: "This is a screening result, not a clinical diagnosis.",
      },
    ];

    const mainRows = [
      { label: "Contrast ability", value: ability },
      { label: "Reliability", value: reliability },
      { label: "Faintest contrast read", value: formatFaintestContrastRead(faintestRaw) },
      { label: "Accuracy", value: `${accuracy}% of responses correct` },
      { label: "Fatigue", value: fatigueLevel },
    ];

    return (
      <ResultsShell title="Contrast Sensitivity Results" date={dateStr} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100"}`}>
          <h2 className={`text-2xl font-black mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Contrast screening summary
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {mainRows.map((row) => (
              <div
                key={row.label}
                className={`rounded-xl p-4 ${isDarkMode ? "bg-slate-800/60" : "bg-white/90 border border-slate-100"}`}
              >
                <div className={`text-xs font-semibold uppercase mb-1 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  {row.label}
                </div>
                <div className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
          <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
            <strong>Plain meaning:</strong> {plainMeaning}
          </p>
        </div>

        {contrastData.leftEye && contrastData.rightEye && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[{ label: "Left Eye", data: contrastData.leftEye }, { label: "Right Eye", data: contrastData.rightEye }].map(({ label: eyeLabel, data: eye }) => {
              const eyeAbility = contrastAbilityLabel(eye.contrastScore);
              const eyeRel = contrastReliabilityLabel({ accuracy: eye.accuracy, fatigueLevel: eye.fatigueLevel });
              return (
                <div key={eyeLabel} className={`rounded-2xl p-5 ${panel}`}>
                  <h4 className={`font-bold mb-3 flex items-center gap-2 text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    <Eye className="w-4 h-4 text-cyan-500" /> {eyeLabel}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      Contrast ability: <strong>{eyeAbility}</strong>
                    </div>
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      Reliability: <strong>{eyeRel}</strong>
                    </div>
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                      Faintest contrast read:{" "}
                      <strong>{formatFaintestContrastRead(eye.lowestContrastValue ?? eye.contrastLevelPassed)}</strong>
                    </div>
                    <div className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                      Accuracy: {eye.accuracy}% · Fatigue: {eye.fatigueLevel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <details className={`rounded-2xl p-6 mb-6 ${panel}`}>
          <summary className={`text-lg font-bold cursor-pointer ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Advanced details
          </summary>
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <StatBar label="Contrast score" value={contrastScore} detail={`Screening score · ${ability}`} status={contrastScore >= 70 ? "good" : contrastScore >= 40 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Recognition accuracy" value={accuracy} detail={`${accuracy}% of responses correct`} status={accStatus(accuracy)} isDarkMode={isDarkMode} />
            <StatBar label="Response speed" value={rtNorm(avgResponseTime)} detail={`${(avgResponseTime / 1000).toFixed(2)}s avg · ${(fastestResponse / 1000).toFixed(2)}s fastest`} status={rtStatus(avgResponseTime)} isDarkMode={isDarkMode} />
            <StatBar label="Response consistency" value={consistencyScore} detail={scoreLabel(consistencyScore) + " timing regularity"} status={consStatus(consistencyScore)} isDarkMode={isDarkMode} />
            <StatBar label="Session stability" value={sessionStability} detail={`${pauseCount} interruption${pauseCount !== 1 ? "s" : ""} during test`} status={stabStatus(sessionStability)} isDarkMode={isDarkMode} />
            <StatBar label="Visual fatigue" value={fatigueStatus(fatigueLevel) === "excellent" ? 90 : fatigueStatus(fatigueLevel) === "good" ? 65 : 35} detail={`${fatigueLevel} fatigue observed`} status={fatigueStatus(fatigueLevel)} isDarkMode={isDarkMode} />
          </div>
        </details>

        <AnalyticsSection
          responseTimes={responseTimes}
          roundResults={roundResults}
          levelProgression={levelProgression}
          maxLevel={Math.max(1, totalLevels - 1)}
          consistencyScore={consistencyScore}
          sessionStability={sessionStability}
          fatigueLevel={fatigueLevel}
          avgResponseTime={avgResponseTime}
          pauseCount={pauseCount}
          accuracy={accuracy}
        />

        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Orientation Discrimination Results ────────────────────
  if (isOrientationTest && orientationData) {
    const {
      orientationScore, accuracy = 0, thresholdLevel, avgResponseTime = 0,
      fatigueLevel = "None", consistencyScore = 100, sessionStability = 100,
      pauseCount = 0, precisionLevel = 0, levelProgression = [], responseTimes = [],
      roundResults = [], fastestResponse = 0, slowestResponse = 0,
    } = orientationData;

    const label = scoreLabel(orientationScore);
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";

    const findings = [];
    if (orientationScore >= 70) {
      findings.push({ type: "success", title: "Strong Orientation Discrimination", description: `You identified orientations at ${thresholdLevel}px stimulus size, indicating good visual precision.` });
    } else {
      findings.push({ type: "warning", title: "Reduced Orientation Precision", description: `Your threshold was ${thresholdLevel}px. Difficulty with fine orientation differences may affect precision tasks.` });
    }
    if (fatigueLevel !== "None") findings.push({ type: "info", title: `${fatigueLevel} Visual Fatigue`, description: "Performance decreased over the session. Consider resting your eyes before retesting." });
    findings.push({ type: "info", title: "Screening Estimate", description: "This is a screening tool, not a clinical diagnosis. Confirm with an eye care professional." });

    const recs = [];
    if (orientationScore < 60) recs.push("Schedule a comprehensive eye exam — reduced orientation precision may reflect refractive errors or other vision issues.");
    if (fatigueLevel !== "None") recs.push("Practice the 20-20-20 rule: every 20 minutes, look 20 feet away for 20 seconds.");
    recs.push("Ensure optimal lighting when performing detail-oriented visual tasks.");
    recs.push("Retest periodically to monitor your orientation discrimination ability over time.");

    return (
      <ResultsShell title="Orientation Discrimination Results" date={dateStr} isDarkMode={isDarkMode}>
        {/* Hero score */}
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={orientationScore} size={130} label="Score" sub={label} />
            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Orientation Score: <span style={{ color: scoreHex(orientationScore) }}>{label}</span>
              </h2>
              <p className={`text-base mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {accuracy}% accuracy · Precision Level {precisionLevel + 1}/8 · Threshold: {thresholdLevel}px
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: `${(avgResponseTime / 1000).toFixed(1)}s`, l: "Avg Speed" },
                  { v: `${(fastestResponse / 1000).toFixed(1)}s`, l: "Fastest" },
                  { v: `${thresholdLevel}px`, l: "Threshold" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 text-center ${isDarkMode ? "bg-slate-800/60" : "bg-white/80 border border-slate-100"}`}>
                    <div className={`text-lg font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>{s.v}</div>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Per-eye comparison */}
        {orientationData.leftEye && orientationData.rightEye && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[{ label: "Left Eye", data: orientationData.leftEye }, { label: "Right Eye", data: orientationData.rightEye }].map(({ label: eyeLabel, data: eye }) => (
              <div key={eyeLabel} className={`rounded-2xl p-5 ${panel}`}>
                <h4 className={`font-bold mb-3 flex items-center gap-2 text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  <Eye className="w-4 h-4 text-cyan-500" /> {eyeLabel}
                </h4>
                <div className="flex items-center gap-4">
                  <ScoreRing score={eye.orientationScore} size={72} label="Score" />
                  <div className="space-y-1 text-sm">
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>Accuracy: <strong>{eye.accuracy}%</strong></div>
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>Threshold: <strong>{eye.thresholdLevel}px</strong></div>
                    <div className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Fatigue: {eye.fatigueLevel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed metrics */}
        <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
          <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            <Activity className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            Detailed Metrics
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            <StatBar label="Orientation Score" value={orientationScore} detail={`${label} precision · Threshold ${thresholdLevel}px`} status={orientationScore >= 70 ? "good" : orientationScore >= 40 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Recognition Accuracy" value={accuracy} detail={`${accuracy}% of responses correct`} status={accStatus(accuracy)} isDarkMode={isDarkMode} />
            <StatBar label="Response Speed" value={rtNorm(avgResponseTime)} detail={`${(avgResponseTime / 1000).toFixed(2)}s avg · ${(fastestResponse / 1000).toFixed(2)}s fastest`} status={rtStatus(avgResponseTime)} isDarkMode={isDarkMode} />
            <StatBar label="Response Consistency" value={consistencyScore} detail={scoreLabel(consistencyScore) + " timing regularity"} status={consStatus(consistencyScore)} isDarkMode={isDarkMode} />
            <StatBar label="Session Stability" value={sessionStability} detail={`${pauseCount} interruption${pauseCount !== 1 ? "s" : ""} during test`} status={stabStatus(sessionStability)} isDarkMode={isDarkMode} />
            <StatBar label="Visual Fatigue" value={fatigueStatus(fatigueLevel) === "excellent" ? 90 : fatigueStatus(fatigueLevel) === "good" ? 65 : 35} detail={`${fatigueLevel} fatigue observed`} status={fatigueStatus(fatigueLevel)} isDarkMode={isDarkMode} />
          </div>
        </div>

        <AnalyticsSection
          responseTimes={responseTimes} roundResults={roundResults}
          levelProgression={levelProgression} maxLevel={7}
          consistencyScore={consistencyScore} sessionStability={sessionStability}
          fatigueLevel={fatigueLevel} avgResponseTime={avgResponseTime}
          pauseCount={pauseCount} accuracy={accuracy}
        />

        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Landolt C Acuity Results ──────────────────────────────
  if (isLandoltTest && landoltData) {
    const {
      landoltScore, accuracy = 0, avgResponseTime = 0,
      thresholdAcuity, leftAcuity, rightAcuity, leftDiopter, rightDiopter,
      fatigueLevel = "None", consistencyScore = 100, sessionStability = 100,
      pauseCount = 0, levelProgression = [], responseTimes = [],
      roundResults = [], fastestResponse = 0, slowestResponse = 0,
    } = landoltData;

    const label = scoreLabel(landoltScore);
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    const fmtD = (d) => (d == null ? "—" : `${d > 0 ? "+" : ""}${Number(d).toFixed(2)} D`);

    const bestDecimal = landoltData.thresholdDecimal ?? landoltData.rightDecimal ?? landoltData.leftDecimal;
    const bestSnellen20 = landoltData.thresholdSnellen20 ?? landoltData.rightSnellen20;
    const bestInterpretation = landoltData.interpretation ?? landoltData.rightInterpretation;

    const findings = [];
    if (bestInterpretation) {
      findings.push({
        type: bestDecimal >= 1 ? "success" : bestDecimal >= 0.5 ? "info" : "warning",
        title: "Resolving power result",
        description: bestInterpretation,
      });
    }
    const bestAcuity = bestSnellen20 || thresholdAcuity || rightAcuity || leftAcuity;
    if (landoltScore >= 70) {
      findings.push({ type: "success", title: "Sharp Resolving Power", description: `You reliably resolved gaps down to decimal ${bestDecimal ?? "—"} (${bestAcuity}).` });
    } else {
      findings.push({ type: "warning", title: "Reduced Acuity Threshold", description: `Your last passed tier was decimal ${bestDecimal ?? "—"} (${bestAcuity}). Fine-detail blur may indicate uncorrected refractive error.` });
    }
    if (landoltData.leftDecimal != null && landoltData.rightDecimal != null && landoltData.leftDecimal !== landoltData.rightDecimal) {
      findings.push({ type: "info", title: "Between-Eye Difference", description: `Left decimal ${landoltData.leftDecimal} vs right ${landoltData.rightDecimal}. Worth mentioning at an eye exam.` });
    }
    if (fatigueLevel !== "None") findings.push({ type: "info", title: `${fatigueLevel} Visual Fatigue`, description: "Performance declined over the session. Rest your eyes before retesting." });
    findings.push({ type: "info", title: "Screening Estimate", description: "This is a screening tool, not a clinical diagnosis. Confirm with an eye care professional." });

    const recs = [];
    if (landoltScore < 60) recs.push("Schedule a comprehensive eye exam — a reduced acuity threshold may reflect uncorrected refractive error.");
    if (leftAcuity && rightAcuity && leftAcuity !== rightAcuity) recs.push("Mention the difference between your eyes to your optometrist.");
    if (fatigueLevel !== "None") recs.push("Practice the 20-20-20 rule: every 20 minutes, look 20 feet away for 20 seconds.");
    recs.push("Re-run this test in good, glare-free lighting to confirm your threshold.");

    return (
      <ResultsShell title="Landolt C Acuity Results" date={dateStr} isDarkMode={isDarkMode}>
        <p className={`text-sm mb-6 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          Landolt C measures <strong>resolving power</strong> (smallest gap you can distinguish) — not letter recognition.
          Results are stored as <strong>decimal acuity</strong> and shown in clinic-style Snellen formats.
        </p>

        {/* Hero score */}
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={landoltScore} size={130} label="Score" sub={label} />
            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Best eye (right): decimal <span style={{ color: scoreHex(landoltScore) }}>{bestDecimal ?? "—"}</span>
              </h2>
              <p className={`text-base mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {bestSnellen20 || bestAcuity} · {accuracy}% session accuracy
              </p>
              {bestInterpretation && (
                <p className={`text-sm italic ${isDarkMode ? "text-cyan-300" : "text-cyan-800"}`}>
                  {bestInterpretation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Per-eye structured results */}
        {landoltData.leftEye && landoltData.rightEye && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <LandoltAcuitySummary eye={landoltData.leftEye} title="Left eye" isDarkMode={isDarkMode} />
            <LandoltAcuitySummary eye={landoltData.rightEye} title="Right eye" isDarkMode={isDarkMode} />
          </div>
        )}

        {/* Detailed metrics */}
        <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
          <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            <Activity className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            Detailed Metrics
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            <StatBar label="Acuity Score" value={landoltScore} detail={`${label} · threshold ${bestAcuity}`} status={landoltScore >= 70 ? "good" : landoltScore >= 40 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Recognition Accuracy" value={accuracy} detail={`${accuracy}% of responses correct`} status={accStatus(accuracy)} isDarkMode={isDarkMode} />
            <StatBar label="Response Speed" value={rtNorm(avgResponseTime)} detail={`${(avgResponseTime / 1000).toFixed(2)}s avg · ${(fastestResponse / 1000).toFixed(2)}s fastest`} status={rtStatus(avgResponseTime)} isDarkMode={isDarkMode} />
            <StatBar label="Response Consistency" value={consistencyScore} detail={scoreLabel(consistencyScore) + " timing regularity"} status={consStatus(consistencyScore)} isDarkMode={isDarkMode} />
            <StatBar label="Session Stability" value={sessionStability} detail={`${pauseCount} interruption${pauseCount !== 1 ? "s" : ""} during test`} status={stabStatus(sessionStability)} isDarkMode={isDarkMode} />
            <StatBar label="Visual Fatigue" value={fatigueStatus(fatigueLevel) === "excellent" ? 90 : fatigueStatus(fatigueLevel) === "good" ? 65 : 35} detail={`${fatigueLevel} fatigue observed`} status={fatigueStatus(fatigueLevel)} isDarkMode={isDarkMode} />
          </div>
        </div>

        <AnalyticsSection
          responseTimes={responseTimes} roundResults={roundResults}
          levelProgression={levelProgression} maxLevel={9}
          consistencyScore={consistencyScore} sessionStability={sessionStability}
          fatigueLevel={fatigueLevel} avgResponseTime={avgResponseTime}
          pauseCount={pauseCount} accuracy={accuracy}
        />

        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Colour Vision Results ─────────────────────────────────
  if (isColorVisionTest && colorVisionData) {
    const {
      score: cvScore = 0,
      cvdRisk = "Unknown",
      cvdType = "Unknown",
      accuracySc = 0,
      speedSc = 0,
      l1Errors = 0,
      l1Total = 0,
      totalPlates = 14,
      rounds = [],
      pauseCount = 0,
    } = colorVisionData;

    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    const label = scoreLabel(cvScore);

    // Per-level breakdown from rounds
    const levelStats = [1, 2, 3, 4].map((lv) => {
      const lvRounds = rounds.filter((r) => r.level === lv);
      const correct = lvRounds.filter((r) => r.correct).length;
      return { level: lv, total: lvRounds.length, correct, pct: lvRounds.length > 0 ? Math.round((correct / lvRounds.length) * 100) : null };
    });
    const levelNames = ["", "Screening", "Moderate", "Hard", "Diagnostic"];

    // Risk badge colours
    const riskColor = cvdRisk === "None" ? "text-green-500" : cvdRisk === "Low" ? "text-yellow-500" : cvdRisk === "High" ? "text-red-500" : "text-orange-500";
    const riskBg    = cvdRisk === "None" ? (isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200")
                    : cvdRisk === "Low"  ? (isDarkMode ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200")
                    : isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200";

    const findings = [];
    if (cvdRisk === "None") {
      findings.push({ type: "success", title: "Normal Colour Vision", description: "You correctly identified all screening plates. No red-green colour deficiency detected." });
    } else if (cvdRisk === "Low") {
      findings.push({ type: "info", title: "Possible Mild Colour Deficiency", description: `You missed ${l1Errors} of ${l1Total} screening plate(s). A mild colour deficiency may be present.` });
    } else if (cvdRisk === "Moderate") {
      findings.push({ type: "warning", title: "Moderate Colour Deficiency Indicated", description: `Difficulty on ${l1Errors} of ${l1Total} screening plates. A moderate ${cvdType} deficiency is likely.` });
    } else {
      findings.push({ type: "warning", title: "Significant Colour Deficiency Indicated", description: `Missed ${l1Errors} of ${l1Total} screening plates. A significant ${cvdType} deficiency is strongly indicated.` });
    }
    findings.push({ type: "info", title: "Screening Tool Only", description: "This is a procedural screening test, not a clinical diagnosis. Confirm results with an optometrist using a certified Ishihara test kit." });

    const recs = [];
    if (cvdRisk !== "None") recs.push("Schedule a comprehensive colour vision assessment with an eye care professional.");
    if (cvdRisk === "High" || cvdRisk === "Moderate") recs.push("Inform employers or institutions that require accurate colour discrimination.");
    recs.push("Colour vision deficiency is usually hereditary and permanent, but assistive tools (e.g., EnChroma) may help in some cases.");
    recs.push("Re-test in good, evenly lit conditions to confirm this result.");

    const correctCount = rounds.filter((r) => r.correct).length;
    const accuracy     = rounds.length > 0 ? Math.round((correctCount / rounds.length) * 100) : 0;
    const avgRt        = rounds.length > 0 ? Math.round(rounds.reduce((a, r) => a + r.rt, 0) / rounds.length) : 0;

    return (
      <ResultsShell title="Colour Vision Results" date={dateStr} isDarkMode={isDarkMode}>

        {/* Hero score + risk banner */}
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={cvScore} size={130} label="Score" sub={label} />
            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Colour Score: <span style={{ color: scoreHex(cvScore) }}>{label}</span>
              </h2>
              <p className={`text-base mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {accuracy}% accuracy · {correctCount}/{totalPlates} plates correct
              </p>

              {/* CVD Risk badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${riskBg} ${riskColor}`}>
                <span className="text-base">
                  {cvdRisk === "None" ? "✓" : cvdRisk === "Low" ? "⚠" : "⚠"}
                </span>
                CVD Risk: {cvdRisk}
                {cvdRisk !== "None" && cvdType !== "Unknown" && (
                  <span className="font-normal opacity-75"> — {cvdType}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Per-level breakdown */}
        {rounds.length > 0 && (
          <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
            <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Performance by Difficulty
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {levelStats.map(({ level, total, correct, pct }) => {
                if (total === 0) return null;
                const lvColor = pct === null ? "text-slate-400" : pct >= 75 ? "text-green-500" : pct >= 50 ? "text-yellow-500" : "text-red-500";
                const lvBg = pct === null ? "" : pct >= 75 ? (isDarkMode ? "border-green-500/30" : "border-green-200") : pct >= 50 ? (isDarkMode ? "border-yellow-500/30" : "border-yellow-200") : (isDarkMode ? "border-red-500/30" : "border-red-200");
                return (
                  <div key={level} className={`rounded-xl p-4 border ${panel} ${lvBg} text-center`}>
                    <div className={`text-2xl font-black ${lvColor}`}>
                      {pct !== null ? `${pct}%` : "—"}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Level {level}: {levelNames[level]}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {correct}/{total} correct
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed metrics */}
        <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
          <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            <Activity className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            Detailed Metrics
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            <StatBar label="Colour Vision Score" value={cvScore} detail={`${label} · ${correctCount}/${totalPlates} plates correct`} status={cvScore >= 70 ? "good" : cvScore >= 40 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Recognition Accuracy" value={accuracy} detail={`${accuracy}% of plates identified correctly`} status={accStatus(accuracy)} isDarkMode={isDarkMode} />
            <StatBar label="Accuracy Component" value={accuracySc} detail="Difficulty-weighted plate accuracy" status={accStatus(accuracySc)} isDarkMode={isDarkMode} />
            <StatBar label="Response Confidence" value={speedSc} detail={`${(avgRt / 1000).toFixed(1)}s avg per plate · faster = more decisive`} status={speedSc >= 70 ? "good" : speedSc >= 45 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Screening Accuracy" value={l1Total > 0 ? Math.round(((l1Total - l1Errors) / l1Total) * 100) : 100} detail={`Level 1 plates: ${l1Total - l1Errors}/${l1Total} correct`} status={l1Errors === 0 ? "good" : l1Errors <= 1 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Session Stability" value={Math.max(40, 100 - pauseCount * 10)} detail={`${pauseCount} interruption${pauseCount !== 1 ? "s" : ""} during test`} status={pauseCount === 0 ? "good" : pauseCount <= 2 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
          </div>
        </div>

        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Rapid Recognition Results ─────────────────────────────
  if (isRapidTest && rapidData) {
    const {
      rapidScore, highestLevel = 0, accuracy = 0, avgResponseTime = 0,
      fatigueLevel = "None", consistencyScore = 100, sessionStability = 100,
      pauseCount = 0, precisionLevel = 0, levelProgression = [], responseTimes = [],
      roundResults = [], fastestResponse = 0, slowestResponse = 0,
    } = rapidData;

    const label = scoreLabel(rapidScore);
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    const speedScore = Math.max(0, Math.round(100 - (avgResponseTime / 2500) * 100));
    const levelNames = ["Beginner", "Novice", "Intermediate", "Skilled", "Advanced", "Expert", "Master", "Elite"];
    const levelName = levelNames[Math.min(highestLevel, levelNames.length - 1)];

    const findings = [];
    if (rapidScore >= 70) {
      findings.push({ type: "success", title: "Strong Rapid Recognition", description: `You identified symbols at difficulty level ${highestLevel + 1}/8 with ${accuracy}% accuracy, indicating fast and reliable visual processing.` });
    } else if (rapidScore >= 40) {
      findings.push({ type: "info", title: "Moderate Recognition Speed", description: `You reached difficulty level ${highestLevel + 1}/8 with ${accuracy}% accuracy. With practice, response speed and recognition threshold can improve.` });
    } else {
      findings.push({ type: "warning", title: "Reduced Visual Processing Speed", description: `Recognition at level ${highestLevel + 1}/8 with ${accuracy}% accuracy suggests slower visual processing. Consider an eye exam to rule out refractive issues.` });
    }
    if (avgResponseTime > 1500) findings.push({ type: "info", title: "Response Time Above Average", description: `Your average response time was ${(avgResponseTime / 1000).toFixed(1)}s. Fatigue, refractive error, or ambient glare can slow recognition speed.` });
    if (fatigueLevel !== "None") findings.push({ type: "info", title: `${fatigueLevel} Visual Fatigue`, description: "Accuracy decreased in the second half of the test. Consider resting your eyes and retesting." });
    findings.push({ type: "info", title: "Screening Estimate", description: "This is a screening tool, not a clinical diagnosis. Confirm findings with a qualified eye care professional." });

    const recs = [];
    if (rapidScore < 55) recs.push("Schedule a comprehensive eye exam — slower visual processing can reflect uncorrected refractive error or early neurological changes.");
    if (avgResponseTime > 1800) recs.push("Minimize screen glare and ensure optimal ambient lighting during visual tasks.");
    if (fatigueLevel !== "None") recs.push("Apply the 20-20-20 rule: every 20 minutes look at something 20 feet away for 20 seconds.");
    recs.push("Regular aerobic exercise is associated with improved visual processing speed.");
    recs.push("Retest periodically to track your rapid recognition threshold over time.");

    return (
      <ResultsShell title="Rapid Recognition Results" date={dateStr} isDarkMode={isDarkMode}>
        {/* Hero score */}
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={rapidScore} size={130} label="Score" sub={label} />
            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Recognition Speed: <span style={{ color: scoreHex(rapidScore) }}>{label}</span>
              </h2>
              <p className={`text-base mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {accuracy}% accuracy · Level {highestLevel + 1}/8 ({levelName}) · Fatigue: {fatigueLevel}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: `${(avgResponseTime / 1000).toFixed(1)}s`, l: "Avg Response" },
                  { v: `${(fastestResponse / 1000).toFixed(1)}s`, l: "Fastest" },
                  { v: `${highestLevel + 1}/8`, l: "Peak Level" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 text-center ${isDarkMode ? "bg-slate-800/60" : "bg-white/80 border border-slate-100"}`}>
                    <div className={`text-lg font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>{s.v}</div>
                    <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Per-eye comparison */}
        {rapidData.leftEye && rapidData.rightEye && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[{ label: "Left Eye", data: rapidData.leftEye }, { label: "Right Eye", data: rapidData.rightEye }].map(({ label: eyeLabel, data: eye }) => (
              <div key={eyeLabel} className={`rounded-2xl p-5 ${panel}`}>
                <h4 className={`font-bold mb-3 flex items-center gap-2 text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  <Eye className="w-4 h-4 text-cyan-500" /> {eyeLabel}
                </h4>
                <div className="flex items-center gap-4">
                  <ScoreRing score={eye.rapidScore} size={72} label="Score" />
                  <div className="space-y-1 text-sm">
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>Accuracy: <strong>{eye.accuracy}%</strong></div>
                    <div className={isDarkMode ? "text-slate-300" : "text-slate-700"}>Peak Level: <strong>{(eye.highestLevel ?? 0) + 1}/8</strong></div>
                    <div className={isDarkMode ? "text-slate-400" : "text-slate-500"}>Fatigue: {eye.fatigueLevel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed metrics */}
        <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
          <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            <Activity className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            Detailed Metrics
          </h3>
          <div className="grid md:grid-cols-2 gap-5">
            <StatBar label="Recognition Score" value={rapidScore} detail={`${label} · Peak difficulty level ${highestLevel + 1}/8`} status={rapidScore >= 70 ? "good" : rapidScore >= 40 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Response Accuracy" value={accuracy} detail={`${accuracy}% of arrows identified correctly`} status={accStatus(accuracy)} isDarkMode={isDarkMode} />
            <StatBar label="Processing Speed" value={speedScore} detail={`${(avgResponseTime / 1000).toFixed(2)}s avg · ${(fastestResponse / 1000).toFixed(2)}s fastest`} status={speedScore >= 70 ? "excellent" : speedScore >= 45 ? "good" : speedScore >= 25 ? "moderate" : "poor"} isDarkMode={isDarkMode} />
            <StatBar label="Response Consistency" value={consistencyScore} detail={scoreLabel(consistencyScore) + " timing regularity"} status={consStatus(consistencyScore)} isDarkMode={isDarkMode} />
            <StatBar label="Session Stability" value={sessionStability} detail={`${pauseCount} interruption${pauseCount !== 1 ? "s" : ""} during test`} status={stabStatus(sessionStability)} isDarkMode={isDarkMode} />
            <StatBar label="Visual Fatigue" value={fatigueStatus(fatigueLevel) === "excellent" ? 90 : fatigueStatus(fatigueLevel) === "good" ? 65 : 35} detail={`${fatigueLevel} fatigue observed`} status={fatigueStatus(fatigueLevel)} isDarkMode={isDarkMode} />
          </div>
        </div>

        <AnalyticsSection
          responseTimes={responseTimes} roundResults={roundResults}
          levelProgression={levelProgression} maxLevel={7}
          consistencyScore={consistencyScore} sessionStability={sessionStability}
          fatigueLevel={fatigueLevel} avgResponseTime={avgResponseTime}
          pauseCount={pauseCount} accuracy={accuracy}
        />

        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Refraction / prescription results ────────────────────
  if (isRefractionTest && refractionData?.leftEye && refractionData?.rightEye) {
    const L = refractionData.leftEye;
    const R = refractionData.rightEye;
    const overall = refractionData.overallScore ?? Math.round(
      ((L.confidence ?? 70) + (R.confidence ?? 70)) / 2
    );
    const title = testTitles[effectiveTestType] || "Screening Results";
    const finalEstimate = refractionData.finalEstimate || {
      leftEye: enrichLegacyEyeEstimate({
        sphereD: L.sph ?? L.diopter,
        cylinderD: L.cyl,
        axis: L.axis,
        singleDiopterD: L.singleDiopterD ?? computeSingleDiopterD(L.sph ?? L.diopter, L.cyl),
        sessionAverageDiopterD:
          L.sessionAverageDiopterD ?? L.singleDiopterD ?? computeSingleDiopterD(L.sph ?? L.diopter, L.cyl),
        distanceAcuity: L.acuity,
        correctionMode: refractionData.correctionMode || "uncorrected",
        confidence:
          typeof L.confidence === "string"
            ? L.confidence
            : L.confidence >= 75
              ? "Higher"
              : L.confidence >= 50
                ? "Medium"
                : "Low",
      }),
      rightEye: enrichLegacyEyeEstimate({
        sphereD: R.sph ?? R.diopter,
        cylinderD: R.cyl,
        axis: R.axis,
        singleDiopterD: R.singleDiopterD ?? computeSingleDiopterD(R.sph ?? R.diopter, R.cyl),
        sessionAverageDiopterD:
          R.sessionAverageDiopterD ?? R.singleDiopterD ?? computeSingleDiopterD(R.sph ?? R.diopter, R.cyl),
        distanceAcuity: R.acuity,
        correctionMode: refractionData.correctionMode || "uncorrected",
        confidence:
          typeof R.confidence === "string"
            ? R.confidence
            : R.confidence >= 75
              ? "Higher"
              : R.confidence >= 50
                ? "Medium"
                : "Low",
      }),
      correctionMode: refractionData.correctionMode,
      singleTestWarning: refractionData.singleTestWarning,
      testsUsed: refractionData.finalEstimate?.testsUsed,
    };

    const findings = [
      {
        type: "info",
        title: "Screening estimate",
        description: "Approximate diopter values combine Distance Eyesight Number, duochrome, and refraction simulator when available. Not an exact prescription.",
      },
    ];
    const recs = [
      "Share these screening results with an eye care professional before buying glasses.",
      "Retest with consistent lighting and calibrated screen distance.",
    ];

    return (
      <ResultsShell title={title} date={dateStr} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20" : "bg-gradient-to-br from-violet-50 to-cyan-50 border border-violet-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={overall} size={130} label="Screening" sub={scoreLabel(overall)} />
            <div className="flex-1 text-center md:text-left">
              <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Estimated eyesight number
              </h2>
              <p className={`text-base ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {correctionModeLabel(refractionData.correctionMode || "uncorrected")}
              </p>
            </div>
          </div>
        </div>
        <ScreeningResultCards estimate={finalEstimate} isDarkMode={isDarkMode} />
        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Complete assessment (distance + near) ─────────────────
  if (isCompleteAssessment && resultState) {
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    const focus = resultState.visionFocus || resultState.screeningFocusReported;
    const dist = resultState.distanceAcuity || {};
    const near = resultState.nearAcuity || {};
    const overall = resultState.overallScore ?? 70;

    const findings = [
      {
        type: "info",
        title: "Screening Assessment Complete",
        description: `Tests were ordered based on your reported focus: ${VISION_FOCUS_LABELS[focus] || focus}. This is screening only, not a diagnosis.`,
      },
    ];
    if (dist.left || dist.right) {
      findings.push({
        type: "success",
        title: "Distance Acuity Recorded",
        description: `Left ${dist.left || "—"}, Right ${dist.right || "—"} (Distance Eyesight Number test at calibrated distance).`,
      });
    }
    if (near.left || near.right) {
      findings.push({
        type: "success",
        title: "Near Acuity Recorded",
        description: `Left ${near.left || "—"}, Right ${near.right || "—"} (Near Eyesight Number test at 60–80 cm).`,
      });
    }
    findings.push({
      type: "warning",
      title: "Professional Follow-up",
      description: "If blur continues or worsens, schedule a comprehensive exam with an optometrist or ophthalmologist.",
    });

    const recs = [
      "Keep browser zoom at 100% and recalibrate PPI before retesting.",
      "Share distance and near acuity results with your eye care provider.",
      "Use the 20-20-20 rule during prolonged screen use.",
    ];

    return (
      <ResultsShell title={testTitles.complete} date={dateStr} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-violet-50 border border-cyan-100"}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={overall} size={130} label="Overall" sub={scoreLabel(overall)} />
            <div className="flex-1 space-y-3">
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                Reported focus: <strong className={isDarkMode ? "text-white" : "text-slate-900"}>{VISION_FOCUS_LABELS[focus] || focus}</strong>
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className={`rounded-xl p-4 ${panel}`}>
                  <p className="text-xs font-bold uppercase text-cyan-500 mb-2">Distance acuity</p>
                  <p className={`font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>L: {dist.left || "—"} · R: {dist.right || "—"}</p>
                </div>
                <div className={`rounded-xl p-4 ${panel}`}>
                  <p className="text-xs font-bold uppercase text-violet-500 mb-2">Near acuity</p>
                  <p className={`font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>L: {near.left || "—"} · R: {near.right || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <FindingsSection findings={findings} recommendations={recs} />
      </ResultsShell>
    );
  }

  // ── Jaeger near acuity ───────────────────────────────────
  if (isJaegerTest && resultState?.leftEye) {
    const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";
    const le = resultState.leftEye;
    const re = resultState.rightEye;
    const formatJaegerEye = (eye) => {
      if (!eye?.acuity) return { main: "—", sub: "" };
      const main = eye.jaegerJ || eye.acuity;
      const sub =
        eye.detailLabel ||
        (eye.nearDecimal != null && eye.diopter != null
          ? `${eye.nearLevel || ""} · near ${eye.nearDecimal} · +${Number(eye.diopter).toFixed(2)} D est.`
          : "");
      return { main, sub };
    };
    const left = formatJaegerEye(le);
    const right = formatJaegerEye(re);
    return (
      <ResultsShell title={testTitles["jaeger-acuity"]} date={dateStr} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
          <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Near Eyesight Number Test
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
              <p className="text-sm text-slate-500">Left eye</p>
              <p className="text-2xl font-black text-violet-500">{left.main}</p>
              {left.sub && <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{left.sub}</p>}
            </div>
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
              <p className="text-sm text-slate-500">Right eye</p>
              <p className="text-2xl font-black text-violet-500">{right.main}</p>
              {right.sub && <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{right.sub}</p>}
            </div>
          </div>
        </div>
        <TestPrescriptionCard
          leftEye={resultState.leftEye}
          rightEye={resultState.rightEye}
          isDarkMode={isDarkMode}
          title="Estimated prescription from this test"
        />
        <FindingsSection
          findings={[
            {
              type: "info",
              title: "Near vision screening",
              description:
                "J-numbers and near decimal values are derived from the smallest row passed: decimal ≈ (8÷N)×(40÷distance cm). Reading add (+D) follows the near-decimal table — screening only, not a prescription.",
            },
          ]}
          recommendations={["Schedule an eye exam if near blur affects daily tasks.", "Ensure adequate lighting for close work."]}
        />
      </ResultsShell>
    );
  }

  // ── Near–far switching ───────────────────────────────────
  if (isNearFarTest && resultState?.nearFarData) {
    const nf = resultState.nearFarData;
    return (
      <ResultsShell title={testTitles["near-far-switching"]} date={dateStr} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl p-6 mb-6 text-center ${isDarkMode ? "bg-slate-800/40" : "bg-slate-50"}`}>
          <ScoreRing score={nf.nearFarScore ?? 70} size={120} label="Score" />
          <p className={`mt-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            {nf.roundsPassed ?? 0} of {nf.totalRounds ?? 4} distance switches passed
          </p>
        </div>
        <FindingsSection
          findings={[{ type: "info", title: "Accommodation exercise", description: "This test samples your ability to read lines after shifting between near and far viewing distances." }]}
          recommendations={["Practice smooth focus changes when moving between screen and distant objects.", "If switching feels slow or blurry, mention it at your next eye exam."]}
        />
      </ResultsShell>
    );
  }

  // ── Snellen Visual Acuity Results ────────────────────────
  const snellenData = effectiveResultState;
  const hasReal = Boolean(
    snellenData?.leftEye?.acuity && snellenData?.rightEye?.acuity
  );

  const leftAcuity = hasReal ? snellenData.leftEye.acuity : null;
  const rightAcuity = hasReal ? snellenData.rightEye.acuity : null;
  const leftDiopter = hasReal ? snellenData.leftEye.diopter : null;
  const rightDiopter = hasReal ? snellenData.rightEye.diopter : null;
  const leftScore = acuityToScore(leftAcuity);
  const rightScore = acuityToScore(rightAcuity);
  const snellenOverall = hasReal
    ? Math.round((leftScore + rightScore) / 2)
    : (snellenData?.overallScore ?? null);

  // Analytics from new fields (may be absent on older results)
  const sAccuracy = snellenData?.accuracy ?? 0;
  const sAvgRT = snellenData?.avgResponseTime ?? 0;
  const sFastest = snellenData?.fastestResponse ?? 0;
  const sConsistency = snellenData?.consistencyScore ?? 100;
  const sStability = snellenData?.sessionStability ?? 100;
  const sPauseCount = snellenData?.pauseCount ?? 0;
  const sFatigue = snellenData?.fatigueLevel ?? "None";
  const sResponseTimes = snellenData?.responseTimes ?? [];
  const sLevelProg = snellenData?.levelProgression ?? [];
  const hasAnalytics = sResponseTimes.length > 0;

  const snellenLabel = scoreLabel(snellenOverall);
  const panel = isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200";

  function buildSnellenFindings(la, ra, ld, rd) {
    const f = [];
    if (la && ra) {
      const worstDecimal = Math.min(parseAcuityDecimal(la), parseAcuityDecimal(ra));
      const worstLabel = formatAcuityLabel(worstDecimal);
      if (worstDecimal >= 1.0) {
        f.push({
          type: "success",
          title: "Excellent Visual Acuity",
          description: `Both eyes test at decimal ${worstLabel} or better — normal vision at 60–80 cm (≈ ${snellenEquivalent(worstLabel)} at 6 m).`,
        });
      } else if (worstDecimal >= 0.5) {
        f.push({
          type: "info",
          title: "Mild Reduction Detected",
          description: `Visual acuity is slightly below average (decimal ${worstLabel}). A formal refraction check is recommended.`,
        });
      } else {
        f.push({
          type: "warning",
          title: "Reduced Acuity Detected",
          description: `Visual acuity (decimal ${worstLabel}) is below the normal range. A comprehensive eye exam is strongly recommended.`,
        });
      }
    }
    if (la !== ra && la && ra) {
      f.push({
        type: "info",
        title: "Inter-eye Difference",
        description: `Left (decimal ${formatAcuityLabel(la)}) and right (decimal ${formatAcuityLabel(ra)}) differ. Anisometropia may warrant further assessment.`,
      });
    }
    if ((Math.abs(ld || 0) > 1) || (Math.abs(rd || 0) > 1)) {
      f.push({
        type: "warning",
        title: "Refractive Error Estimated",
        description: "Estimated diopter values suggest meaningful refractive error. Consult an optometrist for precise measurement.",
      });
    }
    f.push({
      type: "info",
      title: "Estimated spherical vision only",
      description: DIOPTER_ESTIMATE_DISCLAIMER,
    });
    return f;
  }

  function buildSnellenRecs(la, ra, ld, rd) {
    const r = [];
    const worstDecimal = Math.min(parseAcuityDecimal(la || "1.0"), parseAcuityDecimal(ra || "1.0"));
    if (worstDecimal < 0.5) {
      r.push("Schedule a full optometric exam — reduced acuity may benefit from corrective lenses or treatment.");
    }
    if (Math.abs(ld || 0) > 0.5 || Math.abs(rd || 0) > 0.5) r.push("Consider an up-to-date prescription check with your optometrist.");
    r.push("Follow the 20-20-20 rule to reduce digital eye strain during screen use.");
    r.push("Maintain good lighting conditions when reading or working closely.");
    r.push("Retest periodically — annual vision screening is recommended for most adults.");
    return r;
  }

  const snellenFindings = hasReal
    ? buildSnellenFindings(leftAcuity, rightAcuity, leftDiopter, rightDiopter)
    : [{ type: "info", title: "No Test Data", description: "Complete a Distance Eyesight Number test to see your results here." }];
  const snellenRecs = hasReal ? buildSnellenRecs(leftAcuity, rightAcuity, leftDiopter, rightDiopter) : [];

  if (!hasReal) {
    return (
      <ResultsShell title="Distance Eyesight Number Test Results" date={dateStr} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl p-10 mb-6 text-center ${isDarkMode ? "bg-slate-800/40 border border-slate-700/40" : "bg-slate-50 border border-slate-200"}`}>
          <Eye className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
          <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            No results yet
          </h2>
          <p className={`text-sm max-w-md mx-auto mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Finish a Distance Eyesight Number test and tap <strong>View full result</strong> on the summary screen, or open a saved
            result from your dashboard history.
          </p>
          <Link to="/test/snellen-acuity">
            <Button className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-white px-8">
              Start Distance Eyesight Number test
            </Button>
          </Link>
        </div>
        <FindingsSection findings={snellenFindings} recommendations={snellenRecs} />
      </ResultsShell>
    );
  }

  return (
    <ResultsShell title="Distance Eyesight Number Test Results" date={dateStr} isDarkMode={isDarkMode}>
      {/* Hero score */}
      <div className={`rounded-2xl p-6 mb-6 ${isDarkMode ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20" : "bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100"}`}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreRing score={snellenOverall} size={130} label="Vision Score" sub={snellenLabel} />
          <div className="flex-1 text-center md:text-left">
            <h2 className={`text-2xl font-black mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Overall Vision: <span style={{ color: scoreHex(snellenOverall) }}>{snellenLabel}</span>
            </h2>
            {hasReal && (
              <p className={`text-base mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Left: decimal {formatAcuityLabel(leftAcuity) || "N/A"} · Right: decimal {formatAcuityLabel(rightAcuity) || "N/A"}
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { v: leftAcuity ? formatAcuityLabel(leftAcuity) : "—", l: "Left Eye (decimal)" },
                { v: rightAcuity ? formatAcuityLabel(rightAcuity) : "—", l: "Right Eye (decimal)" },
                { v: diopterLabel(leftDiopter), l: "L Refraction" },
                { v: diopterLabel(rightDiopter), l: "R Refraction" },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl p-3 text-center ${isDarkMode ? "bg-slate-800/60" : "bg-white/80 border border-slate-100"}`}>
                  <div className={`text-sm font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>{s.v}</div>
                  <div className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className={`text-xs leading-relaxed mb-6 ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
        {DIOPTER_ESTIMATE_DISCLAIMER}
      </p>

      {hasReal && (
        <TestPrescriptionCard
          leftEye={snellenData.leftEye}
          rightEye={snellenData.rightEye}
          isDarkMode={isDarkMode}
          title="Estimated prescription from this test"
        />
      )}

      {/* Per-eye metric bars */}
      <div className={`rounded-2xl p-6 mb-6 ${panel}`}>
        <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          <Activity className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
          Detailed Metrics
        </h3>
        <div className="grid md:grid-cols-2 gap-5">
          <StatBar label="Left Eye Acuity" value={leftScore} detail={leftAcuity || "Not measured"} status={acuityStatus(leftAcuity)} isDarkMode={isDarkMode} />
          <StatBar label="Right Eye Acuity" value={rightScore} detail={rightAcuity || "Not measured"} status={acuityStatus(rightAcuity)} isDarkMode={isDarkMode} />
          <StatBar label="Left Eye Refraction" value={Math.max(0, 100 - Math.abs(leftDiopter || 0) * 15)} detail={diopterLabel(leftDiopter)} status={Math.abs(leftDiopter || 0) < 1 ? "excellent" : Math.abs(leftDiopter || 0) < 2 ? "good" : "moderate"} isDarkMode={isDarkMode} />
          <StatBar label="Right Eye Refraction" value={Math.max(0, 100 - Math.abs(rightDiopter || 0) * 15)} detail={diopterLabel(rightDiopter)} status={Math.abs(rightDiopter || 0) < 1 ? "excellent" : Math.abs(rightDiopter || 0) < 2 ? "good" : "moderate"} isDarkMode={isDarkMode} />
          {hasAnalytics && <>
            <StatBar label="Response Consistency" value={sConsistency} detail={scoreLabel(sConsistency) + " timing regularity"} status={consStatus(sConsistency)} isDarkMode={isDarkMode} />
            <StatBar label="Session Stability" value={sStability} detail={`${sPauseCount} interruption${sPauseCount !== 1 ? "s" : ""} during test`} status={stabStatus(sStability)} isDarkMode={isDarkMode} />
          </>}
        </div>
      </div>

      {/* Analytics charts — only when new data is present */}
      {hasAnalytics && (
        <AnalyticsSection
          responseTimes={sResponseTimes} roundResults={sResponseTimes.map((_, i) => ({ correct: true }))}
          levelProgression={sLevelProg.map((l) => l.levelIndex || 0)} maxLevel={6}
          consistencyScore={sConsistency} sessionStability={sStability}
          fatigueLevel={sFatigue} avgResponseTime={sAvgRT}
          pauseCount={sPauseCount} accuracy={sAccuracy}
        />
      )}

      {snellenData?.finalEstimate && (
        <ScreeningResultCards estimate={snellenData.finalEstimate} isDarkMode={isDarkMode} />
      )}
      <FindingsSection findings={snellenFindings} recommendations={snellenRecs} />
    </ResultsShell>
  );
}
