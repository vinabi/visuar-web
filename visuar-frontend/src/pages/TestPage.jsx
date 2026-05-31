import { useState, useRef, useEffect, useCallback } from "react";
import { calcConsistencyScore, calcFatigueLevel, calcSessionStability, scoreLabel } from "../utils/metricsEngine";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Camera, CheckCircle2, Lock, Eye, EyeOff,
  AlertTriangle, Activity, Ruler, Mic, Monitor
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { speakInstruction } from "../utils/speech";
import { Button } from "@/components/ui/Button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

import { PPICalibrator } from "../components/PPICalibrator";
import { SnellenEngine } from "../components/SnellenEngine";
import { JaegerEngine } from "../components/JaegerEngine";
import { NearFarSwitchingEngine } from "../components/NearFarSwitchingEngine";
import { VisionFocusStep } from "../components/VisionFocusStep";
import { AssessmentProgress } from "../components/AssessmentProgress";
import { ContrastEngine } from "../components/ContrastEngine";
import { isDistanceOkForMode, VIEWING } from "../utils/visionScaling";
import { TEST_DISTANCE_CM, VIEWING_DISTANCE } from "../utils/viewingDistance";
import {
  STEP,
  VISION_FOCUS,
  getVisionFocus,
  setVisionFocus,
  buildAssessmentPlan,
  resolveFocusAfterScreener,
  getStepViewingMode,
} from "../utils/visionFocus";
import { OrientationEngine } from "../components/OrientationEngine";
import { LandoltCEngine } from "../components/LandoltCEngine";
import { ColorVisionEngine } from "../components/ColorVisionEngine";
import { RapidRecognitionEngine } from "../components/RapidRecognitionEngine";
import { DuochromeEngine } from "../components/DuochromeEngine";
import { RefractionSimulatorEngine } from "../components/RefractionSimulatorEngine";
import { AstigmatismFanEngine } from "../components/AstigmatismFanEngine";
import { RefractionBatteryProgress } from "../components/RefractionBatteryProgress";
import { EyeCoverGuide } from "../components/vision/EyeCoverGuide";
import { API_URL, WS_URL } from "../lib/config";
import { estimateDiopterFromResult, DIOPTER_ESTIMATE_DISCLAIMER, buildTestEyePrescription } from "../utils/diopterEstimate";
import { acuityToScore, formatAcuityLabel } from "../utils/acuityUnits";
import { buildEyePrescription, refractionOverallScore } from "../utils/refractionFusion";
import { getCorrectionMode, setCorrectionMode, CORRECTION_MODE } from "../utils/correctionMode";
import { GlassesValidationStep } from "../components/GlassesValidationStep";
import {
  appendScreeningResult,
  startNewScreeningSession,
  getScreeningSession,
  getActiveSessionResults,
  getSessionSphereForEye,
  refreshSessionEstimate,
  setSessionVisionFocus,
} from "../utils/screeningSession";
import {
  normalizeTestResultRecord,
  buildFinalScreeningEstimate,
  buildGeminiScreeningPayload,
  computeSingleDiopterD,
  CONFIDENCE,
} from "../utils/finalEstimate";
import { SessionEstimatePanel } from "../components/SessionEstimatePanel";
import { getTestById } from "../utils/testCatalog";
import {
  getSnellenLevels,
  getJaegerLevels,
  isQuickMode,
} from "../utils/testStimuli";
import {
  contrastAbilityLabel,
  contrastReliabilityLabel,
  buildContrastPlainMeaning,
  formatFaintestContrastRead,
} from "../utils/contrastResults";
import { persistTestResult } from "../utils/lastTestResult";

const IMPLEMENTED_TESTS = [
  "snellen-acuity",
  "jaeger-acuity",
  "near-far-switching",
  "contrast-sensitivity",
  "orientation-discrimination",
  "landolt-acuity",
  "color-vision",
  "rapid-recognition",
  "refraction-battery",
  "duochrome-refinement",
  "refraction-simulator",
  "astigmatism-fan",
  "complete",
];

// ─── Constants ───────────────────────────────────────────
const PRECHECK_LOCK_MS = 3000;
const EYE_VIOLATION_THRESHOLD_MS = 5000; // 5s of both-open → warning
const EYE_WARNING_COUNTDOWN_S = 5;       // 5s countdown before restart
const MAX_VIOLATIONS = 3;

function mapNumericConfidence(pct) {
  if (typeof pct === "string") return pct;
  if (pct >= 75) return CONFIDENCE.HIGHER;
  if (pct >= 50) return CONFIDENCE.MEDIUM;
  return CONFIDENCE.LOW;
}

const fetchAIAnalysis = async (testType, testData) => {
  try {
    const context = { test_type: testType, ...testData };
    const res = await fetch(`${API_URL}/api/analyze-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    const ai = await res.json();
    return {
      // For DB storage (stringified)
      ai_findings: JSON.stringify(ai.findings || []),
      ai_recommendations: JSON.stringify(ai.recommendations || []),
      ai_summary: ai.summary || "",
      // For display in results page (keep original)
      aiAnalysis: {
        findings: ai.findings || [],
        recommendations: ai.recommendations || [],
        summary: ai.summary || "",
      },
    };
  } catch (err) {
    console.error("[VISUAR] AI analysis error:", err);
    return {
      ai_findings: null,
      ai_recommendations: null,
      ai_summary: null,
      aiAnalysis: { findings: [], recommendations: [], summary: "" },
    };
  }
};

// Returns true if the current device is a mobile phone or tablet.
// Uses both screen width (<1024 px) and touch/UA heuristics so that
// a 768 px browser window on a desktop still shows the gate, while
// a 1024 px iPad landscape triggers it as well.
function useIsMobileOrTablet() {
  const check = () => {
    const w = window.innerWidth;
    const ua = navigator.userAgent || "";
    const touchDevice = /android|iphone|ipad|ipod|tablet|mobile|mobi/i.test(ua);
    return touchDevice || w < 1024;
  };
  const [isMobile, setIsMobile] = useState(check);
  useEffect(() => {
    const handler = () => setIsMobile(check());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function TestPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const quickMode = isQuickMode(testId, searchParams);
  const snellenLevels = getSnellenLevels(quickMode);
  const jaegerLevels = getJaegerLevels(quickMode);
  const navigate = useNavigate();
  const { session } = useAuth();

  const isMobileOrTablet = useIsMobileOrTablet();

  const isCompleteAssessment = testId === "complete";
  const isSnellenTest = testId === "snellen-acuity";
  const isJaegerTest = testId === "jaeger-acuity";
  const isNearFarTest = testId === "near-far-switching";
  const isContrastTest = testId === "contrast-sensitivity";
  const isOrientationTest = testId === "orientation-discrimination";
  const isLandoltTest = testId === "landolt-acuity";
  const isColorVisionTest = testId === "color-vision";
  const isRapidTest = testId === "rapid-recognition";
  const isRefractionBattery = testId === "refraction-battery";
  const isDuochromeTest = testId === "duochrome-refinement";
  const isRefractionSimulatorTest = testId === "refraction-simulator";
  const isAstigmatismTest = testId === "astigmatism-fan";
  const isRefractionSubTest = isDuochromeTest || isRefractionSimulatorTest || isAstigmatismTest;
  const isRefractionFlow = isRefractionBattery || isRefractionSubTest;
  const isImplemented = IMPLEMENTED_TESTS.includes(testId);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ─── Master State ────────────────────────────────────
  const [testPhase, setTestPhase] = useState(() => {
    if (testId === "complete") return "VISION_FOCUS";
    const saved = localStorage.getItem("visuar_ppi");
    return saved ? "SETUP_CAMERA" : "SETUP_PPI";
  });
  const [visionFocusDraft, setVisionFocusDraft] = useState(() => getVisionFocus());
  const [assessmentPlan, setAssessmentPlan] = useState(() =>
    testId === "complete" ? buildAssessmentPlan(getVisionFocus()) : []
  );
  const [assessmentStepIndex, setAssessmentStepIndex] = useState(0);
  const [currentJaegerIndex, setCurrentJaegerIndex] = useState(0);
  const [jaegerResetToken, setJaegerResetToken] = useState(0);
  const [viewingMode, setViewingMode] = useState("distance");
  const completeResultsRef = useRef({
    distance: { left: null, right: null },
    near: { left: null, right: null },
    contrast: null,
    orientation: null,
    rapid: null,
    nearFar: null,
  });
  const screenerRef = useRef({ snellenPassed: null, jaegerPassed: null });
  const activeAssessmentStep = assessmentPlan[assessmentStepIndex] || null;
  const isScreenerStep =
    activeAssessmentStep === STEP.SCREENER_SNELLEN ||
    activeAssessmentStep === STEP.SCREENER_JAEGER;
  const [ppi, setPpi] = useState(() => {
    const saved = localStorage.getItem("visuar_ppi");
    return saved ? parseFloat(saved) : 148;
  });
  const [testingEye, setTestingEye] = useState("left");
  const [correctionMode, setCorrectionModeState] = useState(() => getCorrectionMode());

  // Camera / WS
  const [cameraPermission, setCameraPermission] = useState("idle");
  const [cameraError, setCameraError] = useState(null); // "NotAllowedError" | "NotFoundError" | "NotReadableError" | other
  const [visionResult, setVisionResult] = useState(null);
  const [fps, setFps] = useState(0);

  // Snellen state
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  // Incremented whenever we need the engine to hard-reset even if
  // acuityLevel hasn't changed (e.g. violation restart at level 0).
  const [snellenResetToken, setSnellenResetToken] = useState(0);
  // Incremented on each eye-cover violation for contrast/orientation tests
  // so their engines remount (full reset) when the user returns from PRE_CHECK.
  const [nonSnellenResetToken, setNonSnellenResetToken] = useState(0);
  // Prevents handleSnellenLevelResult from being called twice for the
  // same level (stale voice result arriving in the 200 ms timer window).
  const levelResultFiredRef = useRef(false);

  // Results
  const resultsRef = useRef({ left: null, right: null });

  // Snellen letter-level metrics accumulator (across both eyes)
  const snellenLetterTimingsRef = useRef([]);
  const snellenLevelProgressionRef = useRef([]);
  const snellenPauseCountRef = useRef(0);

  // Per-eye results for contrast / orientation / rapid tests
  const contrastEyeResultsRef = useRef({ left: null, right: null });
  const orientationEyeResultsRef = useRef({ left: null, right: null });
  const landoltEyeResultsRef = useRef({ left: null, right: null });
  const rapidEyeResultsRef = useRef({ left: null, right: null });

  // Refraction battery / sub-test orchestration
  const [refractionSubPhase, setRefractionSubPhase] = useState("snellen");
  const [snellenSubPhase, setSnellenSubPhase] = useState("acuity");
  const [jaegerSubPhase, setJaegerSubPhase] = useState("acuity");
  const refractionBufferRef = useRef({ left: {}, right: {} });
  const [refractionEngineKey, setRefractionEngineKey] = useState(0);
  const [sessionEstimate, setSessionEstimate] = useState(null);
  const pendingNavRef = useRef(null);

  const showSnellenEngine =
    (isSnellenTest && snellenSubPhase === "acuity") ||
    (isCompleteAssessment &&
      (activeAssessmentStep === STEP.SNELLEN ||
        activeAssessmentStep === STEP.SCREENER_SNELLEN)) ||
    (isRefractionBattery && refractionSubPhase === "snellen");
  const showJaegerEngine =
    (isJaegerTest && jaegerSubPhase === "acuity") ||
    (isCompleteAssessment &&
      (activeAssessmentStep === STEP.JAEGER || activeAssessmentStep === STEP.SCREENER_JAEGER));
  const showNearFarEngine =
    isNearFarTest || (isCompleteAssessment && activeAssessmentStep === STEP.NEAR_FAR);
  const showContrastInAssessment =
    isContrastTest || (isCompleteAssessment && activeAssessmentStep === STEP.CONTRAST);
  const showOrientationInAssessment =
    isOrientationTest || (isCompleteAssessment && activeAssessmentStep === STEP.ORIENTATION);
  const showLandoltEngine = isLandoltTest;
  const showColorVisionEngine = isColorVisionTest;
  const showRapidInAssessment =
    isRapidTest || (isCompleteAssessment && activeAssessmentStep === STEP.RAPID);
  const showDuochromeEngine =
    isDuochromeTest || (isRefractionBattery && refractionSubPhase === "duochrome");
  const showSimulatorEngine =
    isRefractionSimulatorTest || (isRefractionBattery && refractionSubPhase === "simulator");
  const showAstigmatismEngine =
    isAstigmatismTest ||
    (isRefractionBattery && refractionSubPhase === "astigmatism") ||
    (isSnellenTest && snellenSubPhase === "astigmatism") ||
    (isJaegerTest && jaegerSubPhase === "astigmatism");

  // Pre-check lock
  const lockStartRef = useRef(null);
  const [lockProgress, setLockProgress] = useState(0);

  // Eye violation tracking
  const [eyeWarningVisible, setEyeWarningVisible] = useState(false);
  const [eyeWarningCountdown, setEyeWarningCountdown] = useState(EYE_WARNING_COUNTDOWN_S);
  const [violationCount, setViolationCount] = useState(0);
  const eyeBadSinceRef = useRef(null);
  // Prevents finishEye from running twice if a stale callback fires during async save
  const finishingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const visionResultRef = useRef(visionResult);
  visionResultRef.current = visionResult;

  // Always-current language ref so voice effects don't go stale
  const langRef = useRef(i18n.language);
  langRef.current = i18n.language;

  useEffect(() => {
    if (isJaegerTest) {
      setViewingMode("near");
      return;
    }
    if (!isCompleteAssessment || !activeAssessmentStep) return;
    const mode = getStepViewingMode(activeAssessmentStep);
    setViewingMode(mode === "alternating" ? "distance" : mode);
  }, [isCompleteAssessment, isJaegerTest, activeAssessmentStep]);

  // ─── Camera ──────────────────────────────────────────
  const stopCamera = useCallback(() => {
    // Stop all video tracks and close stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    // Disconnect video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Close WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    // Clear frame capture interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const requestCamera = useCallback(async () => {
    setCameraPermission("requesting");
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("NotSupportedError");
      setCameraPermission("denied");
      return;
    }

    const tryAcquire = async (constraints) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraPermission("granted");
    };

    try {
      // First attempt: preferred resolution
      await tryAcquire({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
    } catch (firstErr) {
      console.warn("[VISUAR] Camera first attempt failed:", firstErr.name, "— retrying with basic constraints");
      // Wait 800 ms to let any previous stream finish releasing on Windows
      await new Promise((r) => setTimeout(r, 800));
      try {
        // Second attempt: minimal constraints (any camera)
        await tryAcquire({ video: true });
      } catch (err) {
        setCameraError(err?.name || "UnknownError");
        setCameraPermission("denied");
      }
    }
  }, []);

  useEffect(() => {
    if (cameraPermission !== "granted" || !streamRef.current) return;
    if (videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      // Setting srcObject programmatically does not reliably trigger autoPlay
      // in all browsers — explicit play() is required.
      videoRef.current.play().catch((e) => console.warn("[VISUAR] video.play():", e));
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    let isWaiting = false;
    let waitSince = 0;

    const releaseWait = () => {
      isWaiting = false;
      waitSince = 0;
    };

    ws.onerror = () => releaseWait();
    ws.onclose = () => releaseWait();

    ws.onmessage = (event) => {
      releaseWait();
      try {
        const data = JSON.parse(event.data);
        if (data.eye_state === "left_covered") data.eye_state = "right_covered";
        else if (data.eye_state === "right_covered") data.eye_state = "left_covered";
        else if (data.eye_state === "left_closed") data.eye_state = "right_closed";
        else if (data.eye_state === "right_closed") data.eye_state = "left_closed";
        setVisionResult(data);

        frameCountRef.current += 1;
        const now = Date.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
          frameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }
      } catch (e) { console.error("[WS] parse error", e); }
    };

    const iv = setInterval(() => {
      if (isWaiting && waitSince && Date.now() - waitSince > 600) {
        releaseWait();
      }
      if (!isWaiting && videoRef.current && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN && videoRef.current.videoWidth > 0) {
        isWaiting = true;
        waitSince = Date.now();
        const c = canvasRef.current;
        c.width = videoRef.current.videoWidth;
        c.height = videoRef.current.videoHeight;
        c.getContext("2d").drawImage(videoRef.current, 0, 0, c.width, c.height);
        try {
          wsRef.current.send(c.toDataURL("image/jpeg", 0.95));
        } catch {
          releaseWait();
        }
      }
    }, 33);
    intervalRef.current = iv;

    return () => { clearInterval(iv); ws.close(); };
  }, [cameraPermission]);

  // Stop camera when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Auto-request camera as soon as SETUP_CAMERA phase is entered
  useEffect(() => {
    if (testPhase === "SETUP_CAMERA" && isImplemented && cameraPermission === "idle" && !isMobileOrTablet) {
      requestCamera();
    }
  }, [testPhase, isImplemented, cameraPermission, requestCamera]);

  // ─── Pre-check lock timer ────────────────────────────
  const badSinceRef = useRef(null);
  const GRACE_MS = 500;

  useEffect(() => {
    if (testPhase !== "PRE_CHECK") {
      lockStartRef.current = null;
      badSinceRef.current = null;
      setLockProgress(0);
      return;
    }
    const expectedCover = testingEye === "left" ? "right_covered" : "left_covered";
    const tick = setInterval(() => {
      const vr = visionResultRef.current;
      if (!vr) return;
      const viewMode =
        isJaegerTest ||
        activeAssessmentStep === STEP.JAEGER ||
        activeAssessmentStep === STEP.SCREENER_JAEGER
          ? "near"
          : viewingMode === "near"
            ? "near"
            : "distance";
      const distOk =
        isDistanceOkForMode(vr, viewMode) || vr.distance_status === "ok";
      // Binocular tests (colour vision) don't require eye cover
      const ok = vr.face_detected && distOk && (isColorVisionTest || vr.eye_state === expectedCover);
      if (ok) {
        badSinceRef.current = null;
        if (!lockStartRef.current) lockStartRef.current = Date.now();
        const elapsed = Date.now() - lockStartRef.current;
        setLockProgress(Math.min(1, elapsed / PRECHECK_LOCK_MS));
        if (elapsed >= PRECHECK_LOCK_MS) {
          setEyeWarningVisible(false);
          eyeBadSinceRef.current = null;
          setTestPhase("TESTING");
        }
      } else {
        if (!badSinceRef.current) badSinceRef.current = Date.now();
        else if (Date.now() - badSinceRef.current > GRACE_MS) {
          lockStartRef.current = null;
          setLockProgress(0);
        }
      }
    }, 100);
    return () => clearInterval(tick);
  }, [testPhase, testingEye]);

  // ─── Eye violation monitor (during TESTING, all implemented tests) ──────────
  useEffect(() => {
    if (testPhase !== "TESTING") {
      eyeBadSinceRef.current = null;
      setEyeWarningVisible(false);
      return;
    }

    const expectedCover = testingEye === "left" ? "right_covered" : "left_covered";
    const tick = setInterval(() => {
      const vr = visionResultRef.current;
      if (!vr || !vr.face_detected) return;

      // Colour vision is binocular — eye cover not required
      const eyeOk = isColorVisionTest || vr.eye_state === expectedCover;

      if (eyeOk) {
        eyeBadSinceRef.current = null;
        setEyeWarningVisible(false);
        setEyeWarningCountdown(EYE_WARNING_COUNTDOWN_S);
      } else {
        if (!eyeBadSinceRef.current) {
          eyeBadSinceRef.current = Date.now();
        } else if (Date.now() - eyeBadSinceRef.current > EYE_VIOLATION_THRESHOLD_MS) {
          setEyeWarningVisible(true);
        }
      }
    }, 200);
    return () => clearInterval(tick);
  }, [testPhase, testingEye]);

  // ─── Eye warning countdown ──────────────────────────
  useEffect(() => {
    if (!eyeWarningVisible) {
      setEyeWarningCountdown(EYE_WARNING_COUNTDOWN_S);
      return;
    }
    const tick = setInterval(() => {
      setEyeWarningCountdown((prev) => {
        if (prev <= 1) {
          // BUG FIX: Don't call navigate() or setViolationCount inside a state
          // updater — schedule side-effects via a timeout instead.
          setTimeout(() => {
            setViolationCount((v) => {
              const newV = v + 1;
              if (newV >= MAX_VIOLATIONS) {
                // Too many violations — fail the test
                const failPayload = {
                  leftEye: resultsRef.current.left || { acuity: null, diopter: null },
                  rightEye: resultsRef.current.right || { acuity: null, diopter: null },
                  timestamp: new Date().toISOString(),
                  unreliable: true,
                };
                if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
                navigate(`/results/${testId || "snellen-acuity"}`, { state: failPayload });
              }
              return newV;
            });
            setCurrentLevelIndex(0);
            // Snellen: hard-reset engine even if level index didn't change
            setSnellenResetToken((t) => t + 1);
            levelResultFiredRef.current = false;
            // Contrast/Orientation: remount engine from scratch (key includes token)
            setNonSnellenResetToken((t) => t + 1);
            if (isRefractionFlow) setRefractionEngineKey((k) => k + 1);
            setEyeWarningVisible(false);
            setTestPhase("PRE_CHECK");
            eyeBadSinceRef.current = null;
          }, 0);
          return EYE_WARNING_COUNTDOWN_S;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [eyeWarningVisible, navigate, testId]);

  // ─── Calibrate ─────────────────────────────────────────
  const handleCalibrate = useCallback(async () => {
    if (!canvasRef.current) return;
    const b64 = canvasRef.current.toDataURL("image/jpeg", 0.95);
    try {
      const res = await fetch(`${API_URL}/api/vision/calibrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, distance: TEST_DISTANCE_CM }),
      });
      const data = await res.json();
      if (data.success) {
        setTestPhase("GLASSES_VALIDATION");
      } else {
        alert("Calibration failed — make sure your face is visible.");
      }
    } catch (err) {
      console.error("Calibration error:", err);
      alert("Could not reach the backend. Is the server running?");
    }
  }, [isContrastTest, isOrientationTest]);

  // ─── Diopter estimation ────────────────────────────────
  const computeDiopter = useCallback(
    (acuityStr, unit = "decimal") =>
      estimateDiopterFromResult({ acuity: acuityStr, unit }),
    []
  );

  const buildEyeRxFromBuffer = useCallback((eye, unit = "decimal") => {
    const buf = refractionBufferRef.current[eye] || {};
    return buildTestEyePrescription({
      acuity: buf.acuity,
      unit,
      cylinderD: buf.cyl ?? 0,
      axis: buf.axis,
      forceNear: unit === "jaeger",
    });
  }, []);

  const beginAstigmatismPhase = useCallback((setSubPhase) => {
    setSubPhase("astigmatism");
    setTestingEye("left");
    setRefractionEngineKey((k) => k + 1);
    finishingRef.current = false;
    setIsSaving(false);
    levelResultFiredRef.current = false;
    setTestPhase("INSTRUCTION");
  }, []);

  const offerResultsWithSessionSummary = useCallback(
    (path, payload) => {
      const visionFocus = getVisionFocus();
      const estimate = refreshSessionEstimate({ visionFocus, correctionMode });
      const enriched = {
        ...payload,
        finalEstimate: estimate,
        visionFocus,
        correctionMode,
      };
      setSessionEstimate(estimate);
      pendingNavRef.current = { path, state: enriched };
      const slug = path.replace(/^\/results\//, "");
      if (slug) persistTestResult(slug, enriched);
      setIsSaving(false);
      finishingRef.current = false;
      stopCamera();
      setTestPhase("SESSION_SUMMARY");
    },
    [correctionMode, stopCamera]
  );

  // Refraction sub-phase when starting a standalone refraction test
  useEffect(() => {
    if (isDuochromeTest) setRefractionSubPhase("duochrome");
    else if (isRefractionSimulatorTest) setRefractionSubPhase("simulator");
    else if (isAstigmatismTest) setRefractionSubPhase("astigmatism");
    else if (isRefractionBattery) setRefractionSubPhase("snellen");
  }, [isDuochromeTest, isRefractionSimulatorTest, isAstigmatismTest, isRefractionBattery]);

  const getRefractionInitialD = useCallback(
    (eye) => {
      const buf = refractionBufferRef.current[eye];
      return buf?.duochromeD ?? buf?.snellenD ?? buf?.simulatorD ?? -1.5;
    },
    []
  );

  const getRefractionAcuity = useCallback(
    (eye) => refractionBufferRef.current[eye]?.acuity || "0.50",
    []
  );

  const finalizeRefractionResults = useCallback(async () => {
    finishingRef.current = true;
    setIsSaving(true);

    const visionFocus = getVisionFocus();
    const testMeta = getTestById(testId || "refraction-battery");
    const tid = testId || "refraction-battery";

    if (isAstigmatismTest && !isRefractionBattery) {
      const buildAstigEye = (eye) => {
        const buf = refractionBufferRef.current[eye] || {};
        const sessionSph = getSessionSphereForEye(eye);
        const rx = buildTestEyePrescription({
          acuity: buf.acuity,
          unit: "decimal",
          cylinderD: buf.cyl ?? 0,
          axis: buf.axis,
        });
        const sph = sessionSph ?? rx.sph;
        return {
          ...rx,
          sph,
          sphereD: sph,
          diopter: sph,
          singleDiopterD: computeSingleDiopterD(sph, rx.cyl),
        };
      };

      ["left", "right"].forEach((eye) => {
        const eyeData = buildAstigEye(eye);
        appendScreeningResult(
          normalizeTestResultRecord({
            testName: testMeta?.title || "Astigmatism Fan",
            testId: tid,
            eye,
            visionFocus,
            correctionMode,
            estimatedSphereD: eyeData.sphereD,
            estimatedCylinderD: eyeData.cylinderD,
            estimatedAxis: eyeData.axis,
            singleDiopterD: eyeData.singleDiopterD,
            usedInFinalEstimate: true,
            usedInSessionAverage: false,
          })
        );
      });
      const left = buildAstigEye("left");
      const right = buildAstigEye("right");
      const payload = {
        leftEye: left,
        rightEye: right,
        testType: tid,
        timestamp: new Date().toISOString(),
      };
      offerResultsWithSessionSummary(`/results/${tid}`, payload);
      return;
    }

    const recordDuochromeOnly = isDuochromeTest && !isRefractionBattery;
    const recordSimOnly = isRefractionSimulatorTest && !isRefractionBattery;

    let left;
    let right;

    if (recordDuochromeOnly || recordSimOnly) {
      left = {
        diopter: refractionBufferRef.current.left?.duochromeD ?? refractionBufferRef.current.left?.simulatorD,
        sph: refractionBufferRef.current.left?.duochromeD ?? refractionBufferRef.current.left?.simulatorD,
        cyl: refractionBufferRef.current.left?.cyl ?? 0,
        axis: refractionBufferRef.current.left?.axis,
        singleDiopterD: computeSingleDiopterD(
          refractionBufferRef.current.left?.duochromeD ?? refractionBufferRef.current.left?.simulatorD,
          refractionBufferRef.current.left?.cyl
        ),
        confidence: 70,
      };
      right = {
        diopter: refractionBufferRef.current.right?.duochromeD ?? refractionBufferRef.current.right?.simulatorD,
        sph: refractionBufferRef.current.right?.duochromeD ?? refractionBufferRef.current.right?.simulatorD,
        cyl: refractionBufferRef.current.right?.cyl ?? 0,
        axis: refractionBufferRef.current.right?.axis,
        singleDiopterD: computeSingleDiopterD(
          refractionBufferRef.current.right?.duochromeD ?? refractionBufferRef.current.right?.simulatorD,
          refractionBufferRef.current.right?.cyl
        ),
        confidence: 70,
      };
    } else {
      left = buildEyePrescription({
        ...refractionBufferRef.current.left,
        metrics: {
          snellenConsistency: 0.9,
          duochromeAgreed: 0.9,
          simulatorConsistency: refractionBufferRef.current.left?.simulatorConsistency ?? 0.85,
          contrastFactor: 1,
        },
      });
      right = buildEyePrescription({
        ...refractionBufferRef.current.right,
        metrics: {
          snellenConsistency: 0.9,
          duochromeAgreed: 0.9,
          simulatorConsistency: refractionBufferRef.current.right?.simulatorConsistency ?? 0.85,
          contrastFactor: 1,
        },
      });
    }

    const overallScore = refractionOverallScore(left, right);

    ["left", "right"].forEach((eye) => {
      const rx = eye === "left" ? left : right;
      const buf = refractionBufferRef.current[eye] || {};
      const estimatedSphereD = rx.sph ?? rx.diopter ?? buf.duochromeD ?? buf.simulatorD;

      appendScreeningResult(
        normalizeTestResultRecord({
          testName: testMeta?.title || "Refraction Battery",
          testId: tid,
          eye,
          visionFocus,
          correctionMode,
          rawResult: rx.acuity,
          unit: recordDuochromeOnly || recordSimOnly ? undefined : "decimal",
          estimatedSphereD,
          estimatedCylinderD: rx.cyl,
          estimatedAxis: rx.axis,
          singleDiopterD: rx.singleDiopterD ?? computeSingleDiopterD(estimatedSphereD, rx.cyl),
          confidenceScore: rx.confidence,
        })
      );
    });

    const sessionData = getScreeningSession();
    const finalEstimate = buildFinalScreeningEstimate(getActiveSessionResults(), {
      visionFocus,
      correctionMode,
      sessionId: sessionData.sessionId,
    });
    finalEstimate.leftEye = {
      ...finalEstimate.leftEye,
      sphereD: left.sph ?? left.diopter,
      cylinderD: left.cyl,
      axis: left.axis,
      singleDiopterD: left.singleDiopterD ?? finalEstimate.leftEye?.singleDiopterD,
      sessionAverageDiopterD:
        finalEstimate.leftEye?.sessionAverageDiopterD ?? left.singleDiopterD,
      distanceAcuity: left.acuity,
      confidence: finalEstimate.leftEye?.confidence ?? mapNumericConfidence(left.confidence),
      testCount: finalEstimate.leftEye?.testCount,
    };
    finalEstimate.rightEye = {
      ...finalEstimate.rightEye,
      sphereD: right.sph ?? right.diopter,
      cylinderD: right.cyl,
      axis: right.axis,
      singleDiopterD: right.singleDiopterD ?? finalEstimate.rightEye?.singleDiopterD,
      sessionAverageDiopterD:
        finalEstimate.rightEye?.sessionAverageDiopterD ?? right.singleDiopterD,
      distanceAcuity: right.acuity,
      confidence: finalEstimate.rightEye?.confidence ?? mapNumericConfidence(right.confidence),
      testCount: finalEstimate.rightEye?.testCount,
    };

    const payload = {
      leftEye: left,
      rightEye: right,
      finalEstimate,
      visionFocus,
      correctionMode,
      timestamp: new Date().toISOString(),
      overallScore,
      testType: tid,
      singleTestWarning: finalEstimate.singleTestWarning,
    };

    if (session?.access_token) {
      try {
        const aiData = await fetchAIAnalysis("screening", buildGeminiScreeningPayload(finalEstimate, {
          refractionResult: {
            leftSphereD: left.sph ?? left.diopter ?? null,
            rightSphereD: right.sph ?? right.diopter ?? null,
            leftCylinderD: left.cyl ?? 0,
            rightCylinderD: right.cyl ?? 0,
            leftAxis: left.axis ?? null,
            rightAxis: right.axis ?? null,
            leftAcuity: left.acuity ?? null,
            rightAcuity: right.acuity ?? null,
          },
          testsCompleted: finalEstimate.testsUsed || [],
        }));
        payload.aiAnalysis = aiData.aiAnalysis;
        await fetch(`${API_URL}/api/test-results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            test_type: tid,
            left_eye_acuity: left.acuity,
            right_eye_acuity: right.acuity,
            left_eye_diopter: finalEstimate.leftEye?.sessionAverageDiopterD ?? left.sph,
            right_eye_diopter: finalEstimate.rightEye?.sessionAverageDiopterD ?? right.sph,
            overall_score: overallScore,
            result_json: JSON.stringify({
              left,
              right,
              raw: refractionBufferRef.current,
              finalEstimate,
              correctionMode,
              visionFocus,
            }),
            ai_findings: aiData.ai_findings,
            ai_recommendations: aiData.ai_recommendations,
            ai_summary: aiData.ai_summary,
          }),
        });
      } catch (err) {
        console.error("[VISUAR] Refraction save error:", err);
      }
    }

    offerResultsWithSessionSummary(`/results/${tid}`, payload);
  }, [
    session,
    testId,
    correctionMode,
    isAstigmatismTest,
    isRefractionBattery,
    isDuochromeTest,
    isRefractionSimulatorTest,
    offerResultsWithSessionSummary,
  ]);

  const advanceRefractionAfterEye = useCallback(() => {
    if (testingEye === "left") {
      setTestingEye("right");
      setCurrentLevelIndex(0);
      setSnellenResetToken((t) => t + 1);
      levelResultFiredRef.current = false;
      snellenPauseCountRef.current = 0;
      if (isRefractionBattery) setRefractionSubPhase("snellen");
      setRefractionEngineKey((k) => k + 1);
      setTestPhase("INSTRUCTION");
    } else {
      finalizeRefractionResults();
    }
  }, [testingEye, isRefractionBattery, finalizeRefractionResults]);

  const handleDuochromeComplete = useCallback(
    (result) => {
      const eye = testingEye;
      const baseD = result.duochromeD;
      refractionBufferRef.current[eye] = {
        ...refractionBufferRef.current[eye],
        duochromeD: baseD,
        snellenD: refractionBufferRef.current[eye]?.snellenD ?? baseD,
        simulatorD: refractionBufferRef.current[eye]?.simulatorD ?? baseD,
      };

      if (isRefractionBattery) {
        setRefractionSubPhase("simulator");
        setRefractionEngineKey((k) => k + 1);
        return;
      }

      if (isDuochromeTest) {
        resultsRef.current[eye] = {
          duochromeD: result.duochromeD,
          diopter: result.duochromeD,
        };
        advanceRefractionAfterEye();
      }
    },
    [testingEye, isRefractionBattery, isDuochromeTest, advanceRefractionAfterEye]
  );

  const handleSimulatorComplete = useCallback(
    (result) => {
      const eye = testingEye;
      const simD = result.simulatorD;
      refractionBufferRef.current[eye] = {
        ...refractionBufferRef.current[eye],
        simulatorD: simD,
        snellenD: refractionBufferRef.current[eye]?.snellenD ?? simD,
        duochromeD: refractionBufferRef.current[eye]?.duochromeD ?? simD,
        simulatorConsistency: result.simulatorConsistency,
      };

      if (isRefractionBattery) {
        setRefractionSubPhase("astigmatism");
        setRefractionEngineKey((k) => k + 1);
        return;
      }

      if (isRefractionSimulatorTest) {
        resultsRef.current[eye] = {
          simulatorD: result.simulatorD,
          diopter: result.simulatorD,
        };
        advanceRefractionAfterEye();
      }
    },
    [testingEye, isRefractionBattery, isRefractionSimulatorTest, advanceRefractionAfterEye]
  );

  const finalizeSnellenRef = useRef(null);
  const finalizeJaegerRef = useRef(null);

  const handleAstigmatismComplete = useCallback(
    (result) => {
      const eye = testingEye;
      refractionBufferRef.current[eye] = {
        ...refractionBufferRef.current[eye],
        cyl: result.cyl,
        axis: result.axis,
      };

      if (isSnellenTest && snellenSubPhase === "astigmatism") {
        if (testingEye === "left") {
          setTestingEye("right");
          setRefractionEngineKey((k) => k + 1);
          setTestPhase("INSTRUCTION");
          return;
        }
        finalizeSnellenRef.current?.();
        return;
      }

      if (isJaegerTest && jaegerSubPhase === "astigmatism") {
        if (testingEye === "left") {
          setTestingEye("right");
          setRefractionEngineKey((k) => k + 1);
          setTestPhase("INSTRUCTION");
          return;
        }
        finalizeJaegerRef.current?.();
        return;
      }

      if (isAstigmatismTest && !isRefractionBattery) {
        refractionBufferRef.current[eye] = {
          cyl: result.cyl,
          axis: result.axis,
        };
        advanceRefractionAfterEye();
        return;
      }

      if (isRefractionBattery) {
        const prescription = buildEyePrescription({
          ...refractionBufferRef.current[eye],
          metrics: {
            simulatorConsistency: refractionBufferRef.current[eye]?.simulatorConsistency ?? 0.85,
          },
        });
        resultsRef.current[eye] = prescription;
        advanceRefractionAfterEye();
      }
    },
    [testingEye, isAstigmatismTest, isRefractionBattery, isSnellenTest, snellenSubPhase, isJaegerTest, jaegerSubPhase, advanceRefractionAfterEye]
  );

  // ─── Save results to database ──────────────────────────
  const saveResultsToDB = useCallback(async (payload) => {
    if (!session?.access_token) return;
    try {
      const leftScore = acuityToScore(payload.leftEye?.acuity);
      const rightScore = acuityToScore(payload.rightEye?.acuity);
      const overallScore = Math.round((leftScore + rightScore) / 2);

      const visionFocus = getVisionFocus();
      ["left", "right"].forEach((eye) => {
        const eyeData = payload[`${eye}Eye`];
        if (!eyeData) return;
        const sphereD = eyeData.sph ?? eyeData.diopter;
        const cyl = eyeData.cyl ?? 0;
        const axis = eyeData.axis ?? null;
        appendScreeningResult(
          normalizeTestResultRecord({
            testName: "Snellen Acuity",
            testId: "snellen-acuity",
            eye,
            visionFocus,
            correctionMode,
            rawResult: eyeData.acuity,
            unit: "decimal",
            distanceAcuity: eyeData.acuity,
            estimatedSphereD: sphereD,
            estimatedCylinderD: cyl,
            estimatedAxis: axis,
            singleDiopterD: computeSingleDiopterD(sphereD, cyl),
            confidenceScore: 55,
          })
        );
      });
      const sessionData = getScreeningSession();
      const finalEstimate = buildFinalScreeningEstimate(sessionData.results, {
        visionFocus,
        correctionMode,
      });
      payload.finalEstimate = finalEstimate;
      payload.correctionMode = correctionMode;
      payload.visionFocus = visionFocus;
      payload.diopterDisclaimer = DIOPTER_ESTIMATE_DISCLAIMER;

      const aiData = await fetchAIAnalysis(
        "screening",
        buildGeminiScreeningPayload(finalEstimate, {
          overall_score: overallScore,
          snellenResult: {
            leftAcuity: payload.leftEye?.acuity ?? null,
            rightAcuity: payload.rightEye?.acuity ?? null,
          },
          fatigueSignals: {
            fatigueLevel: payload.fatigueLevel ?? "None",
            pauseCount: payload.pauseCount ?? 0,
            consistencyScore: payload.consistencyScore ?? 100,
            sessionStability: payload.sessionStability ?? 100,
          },
          reliabilitySignals: {
            accuracy: payload.accuracy ?? 0,
            consistencyScore: payload.consistencyScore ?? 100,
          },
        })
      );

      payload.aiAnalysis = aiData.aiAnalysis;

      const saveRes = await fetch(`${API_URL}/api/test-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          test_type: testId || "snellen-acuity",
          left_eye_acuity: payload.leftEye?.acuity || null,
          right_eye_acuity: payload.rightEye?.acuity || null,
          left_eye_diopter: payload.leftEye?.diopter || null,
          right_eye_diopter: payload.rightEye?.diopter || null,
          overall_score: overallScore,
          ai_findings: aiData.ai_findings,
          ai_recommendations: aiData.ai_recommendations,
          ai_summary: aiData.ai_summary,
        }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        console.error(`[VISUAR] Save failed ${saveRes.status}:`, errBody);
        alert(`Warning: results could not be saved to your history (${saveRes.status}). Check that you are signed in.`);
      } else {
        console.log("[VISUAR] Snellen results saved to DB.");
      }
    } catch (err) {
      console.error("[VISUAR] Failed to save results:", err);
      alert("Warning: results could not be saved — backend may be offline.");
    }
  }, [session, testId, correctionMode, offerResultsWithSessionSummary]);

  const finalizeStandaloneSnellenResults = useCallback(async () => {
    finishingRef.current = true;
    setIsSaving(true);

    const leftEye = buildEyeRxFromBuffer("left", "decimal");
    const rightEye = buildEyeRxFromBuffer("right", "decimal");
    const allTimings = snellenLetterTimingsRef.current;
    const responseTimes = allTimings.map((t) => t.responseTime);
    const correctCount = allTimings.filter((t) => t.correct).length;
    const accuracy = allTimings.length > 0
      ? Math.round((correctCount / allTimings.length) * 100)
      : 0;
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    const fastestResponse = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const slowestResponse = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const consistencyScore = calcConsistencyScore(responseTimes);
    const fatigueLevel = calcFatigueLevel(allTimings);
    const sessionStability = calcSessionStability(snellenPauseCountRef.current);
    const overallScore = Math.round(
      (acuityToScore(leftEye.acuity) + acuityToScore(rightEye.acuity)) / 2
    );

    const payload = {
      leftEye,
      rightEye,
      timestamp: new Date().toISOString(),
      overallScore,
      accuracy,
      avgResponseTime,
      fastestResponse,
      slowestResponse,
      consistencyScore,
      fatigueLevel,
      sessionStability,
      pauseCount: snellenPauseCountRef.current,
      responseTimes,
      levelProgression: snellenLevelProgressionRef.current,
    };
    await saveResultsToDB(payload);
    offerResultsWithSessionSummary(`/results/${testId || "snellen-acuity"}`, payload);
  }, [buildEyeRxFromBuffer, saveResultsToDB, offerResultsWithSessionSummary, testId]);

  const finalizeStandaloneJaegerResults = useCallback(async () => {
    finishingRef.current = true;
    setIsSaving(true);
    const visionFocus = getVisionFocus();
    const leftEye = buildEyeRxFromBuffer("left", "jaeger");
    const rightEye = buildEyeRxFromBuffer("right", "jaeger");

    ["left", "right"].forEach((eye) => {
      const eyeData = eye === "left" ? leftEye : rightEye;
      if (!eyeData?.acuity) return;
      appendScreeningResult(
        normalizeTestResultRecord({
          testName: "Jaeger Near Acuity",
          testId: "jaeger-acuity",
          eye,
          visionFocus,
          correctionMode,
          rawResult: eyeData.acuity,
          unit: "jaeger",
          nearAcuity: eyeData.acuity,
          estimatedSphereD: eyeData.sph,
          estimatedCylinderD: eyeData.cyl,
          estimatedAxis: eyeData.axis,
          singleDiopterD: eyeData.singleDiopterD,
        })
      );
    });

    const payload = {
      leftEye,
      rightEye,
      timestamp: new Date().toISOString(),
      visionFocus,
      correctionMode,
    };
    offerResultsWithSessionSummary("/results/jaeger-acuity", payload);
  }, [buildEyeRxFromBuffer, correctionMode, offerResultsWithSessionSummary]);

  useEffect(() => {
    finalizeSnellenRef.current = finalizeStandaloneSnellenResults;
    finalizeJaegerRef.current = finalizeStandaloneJaegerResults;
  }, [finalizeStandaloneSnellenResults, finalizeStandaloneJaegerResults]);

  const resetForNextAssessmentStep = useCallback(() => {
    setTestingEye("left");
    setCurrentLevelIndex(0);
    setCurrentJaegerIndex(0);
    setSnellenResetToken((t) => t + 1);
    setJaegerResetToken((t) => t + 1);
    setNonSnellenResetToken((t) => t + 1);
    levelResultFiredRef.current = false;
    finishingRef.current = false;
    resultsRef.current = { left: null, right: null };
    contrastEyeResultsRef.current = { left: null, right: null };
    orientationEyeResultsRef.current = { left: null, right: null };
    rapidEyeResultsRef.current = { left: null, right: null };
    setTestPhase("INSTRUCTION");
  }, []);

  const finalizeCompleteAssessment = useCallback(async () => {
    finishingRef.current = true;
    setIsSaving(true);
    const focus = getVisionFocus();
    const dist = completeResultsRef.current.distance;
    const near = completeResultsRef.current.near;
    const leftAcuity = dist.left?.acuity || near.left?.acuity;
    const rightAcuity = dist.right?.acuity || near.right?.acuity;
    const overallScore = Math.round(
      (acuityToScore(leftAcuity) + acuityToScore(rightAcuity)) / 2
    );

    const payload = {
      testType: "complete",
      visionFocus: focus,
      screeningFocusReported: focus,
      distanceAcuity: { left: dist.left?.acuity ?? null, right: dist.right?.acuity ?? null },
      nearAcuity: { left: near.left?.acuity ?? null, right: near.right?.acuity ?? null },
      leftEye: dist.left || near.left || { acuity: null, diopter: null },
      rightEye: dist.right || near.right || { acuity: null, diopter: null },
      contrastData: completeResultsRef.current.contrast,
      orientationData: completeResultsRef.current.orientation,
      rapidData: completeResultsRef.current.rapid,
      nearFarData: completeResultsRef.current.nearFar,
      overallScore,
      timestamp: new Date().toISOString(),
    };

    if (session?.access_token) {
      try {
        const finalEstimate = {
          visionFocus: focus,
          correctionMode,
          leftEye: {
            distanceAcuity: dist.left?.acuity,
            nearAcuity: near.left?.acuity,
            estimatedSphereD: dist.left?.diopter ?? near.left?.diopter,
            confidence: CONFIDENCE.MEDIUM,
            correctionMode,
          },
          rightEye: {
            distanceAcuity: dist.right?.acuity,
            nearAcuity: near.right?.acuity,
            estimatedSphereD: dist.right?.diopter ?? near.right?.diopter,
            confidence: CONFIDENCE.MEDIUM,
            correctionMode,
          },
          testsUsed: ["Complete assessment"],
        };
        payload.finalEstimate = finalEstimate;
        const aiData = await fetchAIAnalysis("screening", {
          screening_explanation: true,
          visionFocus: focus,
          correctionMode,
          testsUsed: finalEstimate.testsUsed,
          leftEye: finalEstimate.leftEye,
          rightEye: finalEstimate.rightEye,
          single_test_warning: false,
          overall_score: overallScore,
        });
        payload.aiAnalysis = aiData.aiAnalysis;
        await fetch(`${API_URL}/api/test-results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            test_type: "complete",
            left_eye_acuity: dist.left?.acuity || near.left?.acuity || null,
            right_eye_acuity: dist.right?.acuity || near.right?.acuity || null,
            left_eye_diopter: dist.left?.diopter ?? null,
            right_eye_diopter: dist.right?.diopter ?? null,
            overall_score: overallScore,
            result_json: JSON.stringify(payload),
            ai_findings: aiData.ai_findings,
            ai_recommendations: aiData.ai_recommendations,
            ai_summary: aiData.ai_summary,
          }),
        });
      } catch (err) {
        console.error("[VISUAR] Complete assessment save error:", err);
      }
    }
    stopCamera();
    navigate("/results/complete", { state: payload });
  }, [session, navigate, stopCamera, correctionMode]);

  const advanceAssessmentStep = useCallback(() => {
    const step = assessmentPlan[assessmentStepIndex];
    if (step === STEP.SCREENER_JAEGER && getVisionFocus() === VISION_FOCUS.UNSURE) {
      const resolved = resolveFocusAfterScreener({
        snellenPassed: screenerRef.current.snellenPassed,
        jaegerPassed: screenerRef.current.jaegerPassed,
      });
      setVisionFocus(resolved);
      const newPlan = buildAssessmentPlan(resolved, { includeScreeners: false });
      setAssessmentPlan(newPlan);
      setAssessmentStepIndex(0);
      resetForNextAssessmentStep();
      return;
    }

    const next = assessmentStepIndex + 1;
    if (next >= assessmentPlan.length) {
      finalizeCompleteAssessment();
      return;
    }
    setAssessmentStepIndex(next);
    resetForNextAssessmentStep();
  }, [
    assessmentPlan,
    assessmentStepIndex,
    finalizeCompleteAssessment,
    resetForNextAssessmentStep,
  ]);

  // ─── Contrast test completion (per-eye) ───────────────
  const handleContrastComplete = useCallback(
    async (contrastResults) => {
      if (testingEye === "left") {
        contrastEyeResultsRef.current.left = contrastResults;
        finishingRef.current = false;
        setTestingEye("right");
        // Show guide again so the user knows to switch hands for the other eye
        setTestPhase("INSTRUCTION");
        return;
      }

      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsSaving(true);

      contrastEyeResultsRef.current.right = contrastResults;
      const L = contrastEyeResultsRef.current.left || contrastResults;
      const R = contrastResults;

      const overallScore = Math.round((L.contrastScore + R.contrastScore) / 2);
      const worstFatigue = [L.fatigueLevel, R.fatigueLevel].includes("Significant")
        ? "Significant" : [L.fatigueLevel, R.fatigueLevel].includes("Mild") ? "Mild" : "None";

      const _lowestPct = Math.min(
        L.faintestContrastPercent ?? L.lowestContrastValue ?? 70,
        R.faintestContrastPercent ?? R.lowestContrastValue ?? 70
      );
      const mergedData = {
        leftEye: L,
        rightEye: R,
        contrastScore: overallScore,
        totalLevels: Math.max(L.totalLevels || 15, R.totalLevels || 15),
        lowestContrastValue: _lowestPct,
        faintestContrastPercent: _lowestPct,
        accuracy: Math.round(((L.accuracy || 0) + (R.accuracy || 0)) / 2),
        avgResponseTime: Math.round(((L.avgResponseTime || 0) + (R.avgResponseTime || 0)) / 2),
        fastestResponse: Math.min(L.fastestResponse || 9999, R.fastestResponse || 9999),
        slowestResponse: Math.max(L.slowestResponse || 0, R.slowestResponse || 0),
        fatigueLevel: worstFatigue,
        consistencyScore: Math.round(((L.consistencyScore ?? 100) + (R.consistencyScore ?? 100)) / 2),
        sessionStability: Math.round(((L.sessionStability ?? 100) + (R.sessionStability ?? 100)) / 2),
        pauseCount: (L.pauseCount || 0) + (R.pauseCount || 0),
        precisionLevel: Math.max(L.precisionLevel || 0, R.precisionLevel || 0),
        levelProgression: [...(L.levelProgression || []), ...(R.levelProgression || [])],
        responseTimes: [...(L.responseTimes || []), ...(R.responseTimes || [])],
        roundResults: [...(L.roundResults || []), ...(R.roundResults || [])],
      };

      let aiAnalysis = { findings: [], recommendations: [], summary: "" };
      if (session?.access_token) {
        try {
          const _contrastAbility = contrastAbilityLabel(overallScore);
          const _contrastReliability = contrastReliabilityLabel({ accuracy: mergedData.accuracy, fatigueLevel: mergedData.fatigueLevel });
          const _contrastPlainMeaning = buildContrastPlainMeaning({ contrastScore: overallScore, accuracy: mergedData.accuracy, fatigueLevel: mergedData.fatigueLevel, reliability: _contrastReliability });
          const _faintestRead = formatFaintestContrastRead(mergedData.faintestContrastPercent ?? mergedData.lowestContrastValue);
          const aiData = await fetchAIAnalysis("contrast_sensitivity", {
            screening_explanation: true,
            test_type: "contrast_sensitivity",
            contrastResult: {
              ability: _contrastAbility,
              reliability: _contrastReliability,
              faintestContrastRead: _faintestRead,
              accuracyPercent: mergedData.accuracy,
              fatigueLevel: mergedData.fatigueLevel,
              plainMeaning: _contrastPlainMeaning,
            },
            fatigueSignals: {
              fatigueLevel: mergedData.fatigueLevel,
              pauseCount: mergedData.pauseCount,
              consistencyScore: mergedData.consistencyScore,
              sessionStability: mergedData.sessionStability,
            },
            reliabilitySignals: {
              accuracy: mergedData.accuracy,
              reliability: _contrastReliability,
              consistencyScore: mergedData.consistencyScore,
            },
            leftEye: L ? {
              contrastAbility: contrastAbilityLabel(L.contrastScore),
              reliability: contrastReliabilityLabel({ accuracy: L.accuracy, fatigueLevel: L.fatigueLevel }),
              faintestContrastRead: formatFaintestContrastRead(L.faintestContrastPercent ?? L.lowestContrastValue),
              accuracyPercent: L.accuracy,
              fatigueLevel: L.fatigueLevel,
            } : null,
            rightEye: R ? {
              contrastAbility: contrastAbilityLabel(R.contrastScore),
              reliability: contrastReliabilityLabel({ accuracy: R.accuracy, fatigueLevel: R.fatigueLevel }),
              faintestContrastRead: formatFaintestContrastRead(R.faintestContrastPercent ?? R.lowestContrastValue),
              accuracyPercent: R.accuracy,
              fatigueLevel: R.fatigueLevel,
            } : null,
            safetyNote: "VISUAR is a screening tool, not a medical prescription. Please visit an eye care professional before buying glasses or changing your prescription.",
          });

          aiAnalysis = aiData.aiAnalysis;

          const saveRes = await fetch(`${API_URL}/api/test-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              test_type: "contrast-sensitivity",
              overall_score: overallScore,
              left_eye_acuity: null,
              right_eye_acuity: null,
              left_eye_diopter: null,
              right_eye_diopter: null,
              ai_findings: aiData.ai_findings,
              ai_recommendations: aiData.ai_recommendations,
              ai_summary: aiData.ai_summary,
            }),
          });
          if (!saveRes.ok) {
            const errBody = await saveRes.json().catch(() => ({}));
            console.error(`[VISUAR] Contrast save failed ${saveRes.status}:`, errBody);
            alert(`Warning: contrast results could not be saved (${saveRes.status}). Check you are signed in and backend is running.`);
          } else {
            console.log("[VISUAR] Contrast results saved to DB.");
          }
        } catch (err) {
          console.error("[VISUAR] Failed to save contrast results:", err);
          alert("Warning: contrast results could not be saved — backend may be offline.");
        }
      }
      if (isCompleteAssessment) {
        completeResultsRef.current.contrast = { ...mergedData, aiAnalysis };
        finishingRef.current = false;
        setIsSaving(false);
        advanceAssessmentStep();
        return;
      }

      const visionFocus = getVisionFocus();
      appendScreeningResult(
        normalizeTestResultRecord({
          testName: "Contrast Sensitivity",
          testId: "contrast-sensitivity",
          eye: "both",
          visionFocus,
          correctionMode,
          rawResult: `Level ${mergedData.contrastLevelPassed ?? mergedData.lowestContrastValue}%`,
          usedInFinalEstimate: false,
          usedInSessionAverage: false,
        })
      );
      const payload = {
        contrastData: {
          ...mergedData,
          contrastLevelPassed: mergedData.contrastLevelPassed ?? mergedData.lowestContrastValue,
          supportingResultOnly: true,
          aiAnalysis,
        },
        timestamp: new Date().toISOString(),
      };
      offerResultsWithSessionSummary("/results/contrast-sensitivity", payload);
    },
    [
      session,
      testingEye,
      isCompleteAssessment,
      advanceAssessmentStep,
      offerResultsWithSessionSummary,
      correctionMode,
    ]
  );

  // ─── Orientation test completion (per-eye) ────────────
  const handleOrientationComplete = useCallback(
    async (orientationResults) => {
      if (testingEye === "left") {
        orientationEyeResultsRef.current.left = orientationResults;
        finishingRef.current = false;
        setTestingEye("right");
        setTestPhase("INSTRUCTION");
        return;
      }

      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsSaving(true);

      orientationEyeResultsRef.current.right = orientationResults;
      const L = orientationEyeResultsRef.current.left || orientationResults;
      const R = orientationResults;

      const overallScore = Math.round((L.orientationScore + R.orientationScore) / 2);
      const worstFatigue = [L.fatigueLevel, R.fatigueLevel].includes("Significant")
        ? "Significant" : [L.fatigueLevel, R.fatigueLevel].includes("Mild") ? "Mild" : "None";

      const mergedData = {
        leftEye: L,
        rightEye: R,
        orientationScore: overallScore,
        thresholdLevel: Math.max(L.thresholdLevel ?? 0, R.thresholdLevel ?? 0),
        accuracy: Math.round(((L.accuracy || 0) + (R.accuracy || 0)) / 2),
        avgResponseTime: Math.round(((L.avgResponseTime || 0) + (R.avgResponseTime || 0)) / 2),
        fastestResponse: Math.min(L.fastestResponse || 9999, R.fastestResponse || 9999),
        slowestResponse: Math.max(L.slowestResponse || 0, R.slowestResponse || 0),
        fatigueLevel: worstFatigue,
        consistencyScore: Math.round(((L.consistencyScore ?? 100) + (R.consistencyScore ?? 100)) / 2),
        sessionStability: Math.round(((L.sessionStability ?? 100) + (R.sessionStability ?? 100)) / 2),
        pauseCount: (L.pauseCount || 0) + (R.pauseCount || 0),
        precisionLevel: Math.max(L.precisionLevel || 0, R.precisionLevel || 0),
        levelProgression: [...(L.levelProgression || []), ...(R.levelProgression || [])],
        responseTimes: [...(L.responseTimes || []), ...(R.responseTimes || [])],
        roundResults: [...(L.roundResults || []), ...(R.roundResults || [])],
      };

      let aiAnalysis = { findings: [], recommendations: [], summary: "" };
      if (session?.access_token) {
        try {
          const aiData = await fetchAIAnalysis("orientation_discrimination", {
            overall_score: overallScore,
            accuracy_percent: mergedData.accuracy,
            avg_response_ms: mergedData.avgResponseTime,
            fatigue: mergedData.fatigueLevel,
            consistency_score: mergedData.consistencyScore,
            session_stability: mergedData.sessionStability,
            left_eye: L ? { orientation_score: L.orientationScore, accuracy: L.accuracy, threshold_px: L.thresholdLevel, fatigue: L.fatigueLevel } : null,
            right_eye: R ? { orientation_score: R.orientationScore, accuracy: R.accuracy, threshold_px: R.thresholdLevel, fatigue: R.fatigueLevel } : null,
          });

          aiAnalysis = aiData.aiAnalysis;

          const saveRes = await fetch(`${API_URL}/api/test-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              test_type: "orientation-discrimination",
              overall_score: overallScore,
              left_eye_acuity: null,
              right_eye_acuity: null,
              left_eye_diopter: null,
              right_eye_diopter: null,
              ai_findings: aiData.ai_findings,
              ai_recommendations: aiData.ai_recommendations,
              ai_summary: aiData.ai_summary,
            }),
          });
          if (!saveRes.ok) {
            const errBody = await saveRes.json().catch(() => ({}));
            console.error(`[VISUAR] Orientation save failed ${saveRes.status}:`, errBody);
            alert(`Warning: orientation results could not be saved (${saveRes.status}). Check you are signed in and backend is running.`);
          } else {
            console.log("[VISUAR] Orientation results saved to DB.");
          }
        } catch (err) {
          console.error("[VISUAR] Failed to save orientation results:", err);
          alert("Warning: orientation results could not be saved — backend may be offline.");
        }
      }
      if (isCompleteAssessment) {
        completeResultsRef.current.orientation = { ...mergedData, aiAnalysis };
        finishingRef.current = false;
        setIsSaving(false);
        advanceAssessmentStep();
        return;
      }

      stopCamera();
      navigate(`/results/orientation-discrimination`, {
        state: { orientationData: { ...mergedData, aiAnalysis }, timestamp: new Date().toISOString() },
      });
    },
    [session, navigate, stopCamera, testingEye, isCompleteAssessment, advanceAssessmentStep]
  );

  // ─── Colour Vision completion (binocular — single pass) ──
  const handleColorVisionComplete = useCallback(
    async (results) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsSaving(true);

      let aiAnalysis = { findings: [], recommendations: [], summary: "" };
      if (session?.access_token) {
        try {
          const aiData = await fetchAIAnalysis("color_vision", {
            overall_score: results.score,
            cvd_risk: results.cvdRisk,
            cvd_type: results.cvdType,
            accuracy: results.accuracySc,
            total_plates: results.totalPlates,
            level1_errors: results.l1Errors,
            level1_total: results.l1Total,
          });
          aiAnalysis = aiData.aiAnalysis;

          const saveRes = await fetch(`${API_URL}/api/test-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              test_type: "color-vision",
              overall_score: results.score,
              left_eye_acuity: null,
              right_eye_acuity: null,
              left_eye_diopter: null,
              right_eye_diopter: null,
              ai_findings: aiData.ai_findings,
              ai_recommendations: aiData.ai_recommendations,
              ai_summary: aiData.ai_summary,
            }),
          });
          if (!saveRes.ok) {
            const errBody = await saveRes.json().catch(() => ({}));
            console.error(`[VISUAR] Color vision save failed ${saveRes.status}:`, errBody);
          } else {
            console.log("[VISUAR] Colour vision results saved to DB.");
          }
        } catch (err) {
          console.error("[VISUAR] Failed to save colour vision results:", err);
        }
      }

      stopCamera();
      navigate(`/results/color-vision`, {
        state: { colorVisionData: { ...results, aiAnalysis }, timestamp: new Date().toISOString() },
      });
    },
    [session, navigate, stopCamera]
  );

  // ─── Landolt C acuity completion (per-eye) ────────────
  const handleLandoltComplete = useCallback(
    async (landoltResults) => {
      if (testingEye === "left") {
        landoltEyeResultsRef.current.left = landoltResults;
        finishingRef.current = false;
        setTestingEye("right");
        setTestPhase("INSTRUCTION");
        return;
      }

      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsSaving(true);

      landoltEyeResultsRef.current.right = landoltResults;
      const L = landoltEyeResultsRef.current.left || landoltResults;
      const R = landoltResults;

      const overallScore = Math.round((L.landoltScore + R.landoltScore) / 2);
      const worstFatigue = [L.fatigueLevel, R.fatigueLevel].includes("Significant")
        ? "Significant" : [L.fatigueLevel, R.fatigueLevel].includes("Mild") ? "Mild" : "None";

      const mergedData = {
        leftEye: L,
        rightEye: R,
        landoltScore: overallScore,
        leftAcuity: L.thresholdAcuity,
        rightAcuity: R.thresholdAcuity,
        leftDiopter: L.estimatedSphereD,
        rightDiopter: R.estimatedSphereD,
        thresholdAcuity: R.thresholdAcuity,
        accuracy: Math.round(((L.accuracy || 0) + (R.accuracy || 0)) / 2),
        avgResponseTime: Math.round(((L.avgResponseTime || 0) + (R.avgResponseTime || 0)) / 2),
        fastestResponse: Math.min(L.fastestResponse || 9999, R.fastestResponse || 9999),
        slowestResponse: Math.max(L.slowestResponse || 0, R.slowestResponse || 0),
        fatigueLevel: worstFatigue,
        consistencyScore: Math.round(((L.consistencyScore ?? 100) + (R.consistencyScore ?? 100)) / 2),
        sessionStability: Math.round(((L.sessionStability ?? 100) + (R.sessionStability ?? 100)) / 2),
        pauseCount: (L.pauseCount || 0) + (R.pauseCount || 0),
        precisionLevel: Math.max(L.precisionLevel || 0, R.precisionLevel || 0),
        levelProgression: [...(L.levelProgression || []), ...(R.levelProgression || [])],
        responseTimes: [...(L.responseTimes || []), ...(R.responseTimes || [])],
        roundResults: [...(L.roundResults || []), ...(R.roundResults || [])],
      };

      let aiAnalysis = { findings: [], recommendations: [], summary: "" };
      if (session?.access_token) {
        try {
          const aiData = await fetchAIAnalysis("landolt_acuity", {
            overall_score: overallScore,
            accuracy_percent: mergedData.accuracy,
            avg_response_ms: mergedData.avgResponseTime,
            fatigue: mergedData.fatigueLevel,
            consistency_score: mergedData.consistencyScore,
            session_stability: mergedData.sessionStability,
            left_eye: { acuity: L.thresholdAcuity, estimated_sphere_d: L.estimatedSphereD, landolt_score: L.landoltScore },
            right_eye: { acuity: R.thresholdAcuity, estimated_sphere_d: R.estimatedSphereD, landolt_score: R.landoltScore },
          });

          aiAnalysis = aiData.aiAnalysis;

          const saveRes = await fetch(`${API_URL}/api/test-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              test_type: "landolt-acuity",
              overall_score: overallScore,
              left_eye_acuity: L.thresholdAcuity,
              right_eye_acuity: R.thresholdAcuity,
              left_eye_diopter: L.estimatedSphereD,
              right_eye_diopter: R.estimatedSphereD,
              ai_findings: aiData.ai_findings,
              ai_recommendations: aiData.ai_recommendations,
              ai_summary: aiData.ai_summary,
            }),
          });
          if (!saveRes.ok) {
            const errBody = await saveRes.json().catch(() => ({}));
            console.error(`[VISUAR] Landolt save failed ${saveRes.status}:`, errBody);
            alert(`Warning: Landolt results could not be saved (${saveRes.status}). Check you are signed in and backend is running.`);
          } else {
            console.log("[VISUAR] Landolt results saved to DB.");
          }
        } catch (err) {
          console.error("[VISUAR] Failed to save Landolt results:", err);
          alert("Warning: Landolt results could not be saved — backend may be offline.");
        }
      }

      stopCamera();
      navigate(`/results/landolt-acuity`, {
        state: { landoltData: { ...mergedData, aiAnalysis }, timestamp: new Date().toISOString() },
      });
    },
    [session, navigate, stopCamera, testingEye]
  );

  // ─── Rapid Recognition test completion (per-eye) ────────
  const handleRapidComplete = useCallback(
    async (rapidResults) => {
      if (testingEye === "left") {
        rapidEyeResultsRef.current.left = rapidResults;
        finishingRef.current = false;
        setTestingEye("right");
        setTestPhase("INSTRUCTION");
        return;
      }

      if (finishingRef.current) return;
      finishingRef.current = true;
      setIsSaving(true);

      rapidEyeResultsRef.current.right = rapidResults;
      const L = rapidEyeResultsRef.current.left || rapidResults;
      const R = rapidResults;

      const overallScore = Math.round((L.rapidScore + R.rapidScore) / 2);
      const worstFatigue = [L.fatigueLevel, R.fatigueLevel].includes("Significant")
        ? "Significant"
        : [L.fatigueLevel, R.fatigueLevel].includes("Mild")
        ? "Mild"
        : "None";

      const mergedData = {
        leftEye: L,
        rightEye: R,
        rapidScore: overallScore,
        highestLevel: Math.max(L.highestLevel ?? 0, R.highestLevel ?? 0),
        accuracy: Math.round(((L.accuracy || 0) + (R.accuracy || 0)) / 2),
        avgResponseTime: Math.round(((L.avgResponseTime || 0) + (R.avgResponseTime || 0)) / 2),
        fastestResponse: Math.min(L.fastestResponse || 9999, R.fastestResponse || 9999),
        slowestResponse: Math.max(L.slowestResponse || 0, R.slowestResponse || 0),
        fatigueLevel: worstFatigue,
        consistencyScore: Math.round(((L.consistencyScore ?? 100) + (R.consistencyScore ?? 100)) / 2),
        sessionStability: Math.round(((L.sessionStability ?? 100) + (R.sessionStability ?? 100)) / 2),
        pauseCount: (L.pauseCount || 0) + (R.pauseCount || 0),
        precisionLevel: Math.max(L.precisionLevel || 0, R.precisionLevel || 0),
        levelProgression: [...(L.levelProgression || []), ...(R.levelProgression || [])],
        responseTimes: [...(L.responseTimes || []), ...(R.responseTimes || [])],
        roundResults: [...(L.roundResults || []), ...(R.roundResults || [])],
      };

      let aiAnalysis = { findings: [], recommendations: [], summary: "" };
      if (session?.access_token) {
        try {
          const aiData = await fetchAIAnalysis("rapid_recognition", {
            overall_score: overallScore,
            accuracy_percent: mergedData.accuracy,
            avg_response_ms: mergedData.avgResponseTime,
            fatigue: mergedData.fatigueLevel,
            consistency_score: mergedData.consistencyScore,
            session_stability: mergedData.sessionStability,
            highest_level: mergedData.highestLevel,
            left_eye: L ? { rapid_score: L.rapidScore, accuracy: L.accuracy, highest_level: L.highestLevel, fatigue: L.fatigueLevel } : null,
            right_eye: R ? { rapid_score: R.rapidScore, accuracy: R.accuracy, highest_level: R.highestLevel, fatigue: R.fatigueLevel } : null,
          });

          aiAnalysis = aiData.aiAnalysis;

          const saveRes = await fetch(`${API_URL}/api/test-results`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              test_type: "rapid-recognition",
              overall_score: overallScore,
              left_eye_acuity: null,
              right_eye_acuity: null,
              left_eye_diopter: null,
              right_eye_diopter: null,
              ai_findings: aiData.ai_findings,
              ai_recommendations: aiData.ai_recommendations,
              ai_summary: aiData.ai_summary,
            }),
          });
          if (!saveRes.ok) {
            const errBody = await saveRes.json().catch(() => ({}));
            console.error(`[VISUAR] Rapid save failed ${saveRes.status}:`, errBody);
            alert(`Warning: rapid recognition results could not be saved (${saveRes.status}). Check you are signed in and backend is running.`);
          } else {
            console.log("[VISUAR] Rapid recognition results saved to DB.");
          }
        } catch (err) {
          console.error("[VISUAR] Failed to save rapid recognition results:", err);
          alert("Warning: rapid recognition results could not be saved — backend may be offline.");
        }
      }
      if (isCompleteAssessment) {
        completeResultsRef.current.rapid = { ...mergedData, aiAnalysis };
        finishingRef.current = false;
        setIsSaving(false);
        advanceAssessmentStep();
        return;
      }

      stopCamera();
      navigate(`/results/rapid-recognition`, {
        state: { rapidData: { ...mergedData, aiAnalysis }, timestamp: new Date().toISOString() },
      });
    },
    [session, navigate, stopCamera, testingEye, isCompleteAssessment, advanceAssessmentStep]
  );

  // ─── Finish one eye ────────────────────────────────────
  const finishEye = useCallback(
    async (acuity) => {
      if (finishingRef.current) return; // prevent double-call during async save
      const diopter = computeDiopter(acuity, "decimal");

      if (isRefractionBattery) {
        refractionBufferRef.current[testingEye] = {
          ...refractionBufferRef.current[testingEye],
          acuity,
          snellenD: diopter,
        };
        setRefractionSubPhase("duochrome");
        setRefractionEngineKey((k) => k + 1);
        return;
      }

      if (isCompleteAssessment && activeAssessmentStep === STEP.SNELLEN) {
        completeResultsRef.current.distance[testingEye] = { acuity, diopter };
        if (testingEye === "left") {
          setTestingEye("right");
          setCurrentLevelIndex(0);
          setSnellenResetToken((t) => t + 1);
          levelResultFiredRef.current = false;
          setTestPhase("INSTRUCTION");
          return;
        }
        advanceAssessmentStep();
        return;
      }

      if (isSnellenTest) {
        refractionBufferRef.current[testingEye] = {
          ...refractionBufferRef.current[testingEye],
          acuity,
          snellenD: diopter,
        };
        if (testingEye === "left") {
          setTestingEye("right");
          setCurrentLevelIndex(0);
          setSnellenResetToken((t) => t + 1);
          levelResultFiredRef.current = false;
          snellenPauseCountRef.current = 0;
          setTestPhase("INSTRUCTION");
          return;
        }
        beginAstigmatismPhase(setSnellenSubPhase);
        return;
      }

      resultsRef.current[testingEye] = { acuity, diopter };

      if (testingEye === "left") {
        setTestingEye("right");
        setCurrentLevelIndex(0);
        setSnellenResetToken((t) => t + 1);
        levelResultFiredRef.current = false;
        snellenPauseCountRef.current = 0;
        // Show guide before the right-eye test
        setTestPhase("INSTRUCTION");
      } else {
        finishingRef.current = true;
        setIsSaving(true);

        // Build full metrics from accumulated letter timings
        const allTimings = snellenLetterTimingsRef.current;
        const responseTimes = allTimings.map((t) => t.responseTime);
        const correctCount = allTimings.filter((t) => t.correct).length;
        const accuracy = allTimings.length > 0
          ? Math.round((correctCount / allTimings.length) * 100)
          : 0;
        const avgResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;
        const fastestResponse = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
        const slowestResponse = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
        const consistencyScore = calcConsistencyScore(responseTimes);
        const fatigueLevel = calcFatigueLevel(allTimings);
        const sessionStability = calcSessionStability(snellenPauseCountRef.current);

        const leftScore = acuityToScore(resultsRef.current.left?.acuity);
        const rightScore = acuityToScore(resultsRef.current.right?.acuity);
        const overallScore = Math.round((leftScore + rightScore) / 2);

        const payload = {
          leftEye: resultsRef.current.left,
          rightEye: resultsRef.current.right,
          timestamp: new Date().toISOString(),
          // Analytics
          overallScore,
          accuracy,
          avgResponseTime,
          fastestResponse,
          slowestResponse,
          consistencyScore,
          fatigueLevel,
          sessionStability,
          pauseCount: snellenPauseCountRef.current,
          responseTimes,
          levelProgression: snellenLevelProgressionRef.current,
        };
        console.log("[VISUAR] Test complete:", payload);
        await saveResultsToDB(payload);
        offerResultsWithSessionSummary(`/results/${testId || "snellen-acuity"}`, payload);
      }
    },
    [
      testingEye,
      computeDiopter,
      testId,
      saveResultsToDB,
      offerResultsWithSessionSummary,
      isRefractionBattery,
      isSnellenTest,
      isCompleteAssessment,
      activeAssessmentStep,
      advanceAssessmentStep,
      beginAstigmatismPhase,
    ]
  );

  const finishJaegerEye = useCallback(
    (acuity) => {
      const diopter = acuity ? computeDiopter(acuity, "jaeger") : null;

      if (isCompleteAssessment && activeAssessmentStep === STEP.JAEGER) {
        completeResultsRef.current.near[testingEye] = { acuity, diopter };
        if (testingEye === "left") {
          setTestingEye("right");
          setCurrentJaegerIndex(0);
          setJaegerResetToken((t) => t + 1);
          levelResultFiredRef.current = false;
          setTestPhase("INSTRUCTION");
          return;
        }
        advanceAssessmentStep();
        return;
      }

      if (isJaegerTest) {
        refractionBufferRef.current[testingEye] = {
          ...refractionBufferRef.current[testingEye],
          acuity,
          snellenD: diopter,
        };
        if (testingEye === "left") {
          setTestingEye("right");
          setCurrentJaegerIndex(0);
          setJaegerResetToken((t) => t + 1);
          levelResultFiredRef.current = false;
          setTestPhase("INSTRUCTION");
          return;
        }
        beginAstigmatismPhase(setJaegerSubPhase);
        return;
      }

      resultsRef.current[testingEye] = { acuity, diopter };
      if (testingEye === "left") {
        setTestingEye("right");
        setCurrentJaegerIndex(0);
        setJaegerResetToken((t) => t + 1);
        levelResultFiredRef.current = false;
        setTestPhase("INSTRUCTION");
      } else {
        finishingRef.current = true;
        setIsSaving(true);
        const visionFocus = getVisionFocus();
        ["left", "right"].forEach((eye) => {
          const eyeData = resultsRef.current[eye];
          if (!eyeData?.acuity) return;
          const sphereD = computeDiopter(eyeData.acuity, "jaeger");
          appendScreeningResult(
            normalizeTestResultRecord({
              testName: "Jaeger Near Acuity",
              testId: "jaeger-acuity",
              eye,
              visionFocus,
              correctionMode,
              rawResult: eyeData.acuity,
              unit: "jaeger",
              nearAcuity: eyeData.acuity,
              estimatedSphereD: sphereD,
              singleDiopterD: computeSingleDiopterD(sphereD, 0),
            })
          );
        });
        const payload = {
          leftEye: resultsRef.current.left,
          rightEye: resultsRef.current.right,
          timestamp: new Date().toISOString(),
          visionFocus,
          correctionMode,
        };
        offerResultsWithSessionSummary("/results/jaeger-acuity", payload);
      }
    },
    [
      testingEye,
      isJaegerTest,
      isCompleteAssessment,
      activeAssessmentStep,
      advanceAssessmentStep,
      offerResultsWithSessionSummary,
      computeDiopter,
      correctionMode,
      beginAstigmatismPhase,
    ]
  );

  const handleJaegerLevelResult = useCallback(
    (passed, levelIndex) => {
      if (levelResultFiredRef.current) return;
      levelResultFiredRef.current = true;

      if (isCompleteAssessment && activeAssessmentStep === STEP.SCREENER_JAEGER) {
        screenerRef.current.jaegerPassed = passed;
        advanceAssessmentStep();
        return;
      }

      if (passed) {
        if (levelIndex < jaegerLevels.length - 1) {
          levelResultFiredRef.current = false;
          setCurrentJaegerIndex(levelIndex + 1);
        } else {
          finishJaegerEye(jaegerLevels[jaegerLevels.length - 1]);
        }
      } else {
        finishJaegerEye(levelIndex > 0 ? jaegerLevels[levelIndex - 1] : null);
      }
    },
    [finishJaegerEye, isCompleteAssessment, activeAssessmentStep, advanceAssessmentStep, jaegerLevels]
  );

  const handleNearFarComplete = useCallback(
    (data) => {
      if (isCompleteAssessment) {
        completeResultsRef.current.nearFar = data;
        advanceAssessmentStep();
        return;
      }
      stopCamera();
      navigate("/results/near-far-switching", {
        state: { nearFarData: data, timestamp: new Date().toISOString() },
      });
    },
    [isCompleteAssessment, advanceAssessmentStep, navigate, stopCamera]
  );

  // ─── Snellen level handler ────────────────────────────
  const handleSnellenLevelResult = useCallback(
    (passed, levelIndex, levelMetrics) => {
      if (levelResultFiredRef.current) return;
      levelResultFiredRef.current = true;

      if (isCompleteAssessment && activeAssessmentStep === STEP.SCREENER_SNELLEN) {
        screenerRef.current.snellenPassed = passed;
        advanceAssessmentStep();
        return;
      }

      // Accumulate per-letter metrics
      if (levelMetrics?.letterTimings) {
        snellenLetterTimingsRef.current.push(...levelMetrics.letterTimings);
      }
      snellenLevelProgressionRef.current.push({ levelIndex, passed, eye: testingEye });

      if (passed) {
        if (levelIndex < snellenLevels.length - 1) {
          levelResultFiredRef.current = false;
          setCurrentLevelIndex(levelIndex + 1);
        } else {
          finishEye(snellenLevels[snellenLevels.length - 1]);
        }
      } else {
        finishEye(levelIndex > 0 ? snellenLevels[levelIndex - 1] : null);
      }
    },
    [finishEye, testingEye, isCompleteAssessment, activeAssessmentStep, advanceAssessmentStep, snellenLevels]
  );

  // ─── Derived state ─────────────────────────────────────
  const expectedCover = testingEye === "left" ? "right_covered" : "left_covered";
  const coveredEyeLabel = testingEye === "left" ? "RIGHT" : "LEFT";
  const testingEyeLabel = testingEye === "left" ? "LEFT" : "RIGHT";

  // Grace-period test pause (face + distance only)
  const testBadSinceRef = useRef(null);
  const [isTestPaused, setIsTestPaused] = useState(false);
  const wasPausedGlobalRef = useRef(false);

  useEffect(() => {
    if (testPhase !== "TESTING") {
      testBadSinceRef.current = null;
      setIsTestPaused(false);
      wasPausedGlobalRef.current = false;
      return;
    }
    const tick = setInterval(() => {
      const vr = visionResultRef.current;
      const viewMode =
        isJaegerTest ||
        activeAssessmentStep === STEP.JAEGER ||
        activeAssessmentStep === STEP.SCREENER_JAEGER
          ? "near"
          : viewingMode === "near"
            ? "near"
            : "distance";
      const ok =
        vr &&
        vr.face_detected &&
        (isDistanceOkForMode(vr, viewMode) || vr.distance_status === "ok");
      if (ok) {
        testBadSinceRef.current = null;
        wasPausedGlobalRef.current = false;
        setIsTestPaused(false);
      } else {
        if (!testBadSinceRef.current) testBadSinceRef.current = Date.now();
        else if (Date.now() - testBadSinceRef.current > 2000) {
          if (!wasPausedGlobalRef.current) {
            wasPausedGlobalRef.current = true;
            if (showSnellenEngine) snellenPauseCountRef.current += 1;
          }
          setIsTestPaused(true);
        }
      }
    }, 200);
    return () => clearInterval(tick);
  }, [testPhase, showSnellenEngine]);

  const isConditionsMet = !isTestPaused;

  // ─── Voice guidance ─────────────────────────────────────
  // Phase transitions: initial instruction for each step
  useEffect(() => {
    if (testPhase === "SETUP_PPI") {
      speakInstruction("setup_ppi", langRef.current);
    } else if (testPhase === "SETUP_CAMERA") {
      speakInstruction("setup_camera", langRef.current);
    } else if (testPhase === "PRE_CHECK") {
      speakInstruction(
        testingEye === "left" ? "pre_check_right" : "pre_check_left",
        langRef.current
      );
    } else if (testPhase === "TESTING" && showSnellenEngine) {
      speakInstruction("test_start_snellen", langRef.current);
    }
  }, [testPhase, testingEye]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eye cover violation during active Snellen test
  useEffect(() => {
    if (!eyeWarningVisible) return;
    speakInstruction(
      testingEye === "left" ? "eye_violation_right" : "eye_violation_left",
      langRef.current
    );
  }, [eyeWarningVisible, testingEye]);

  // Face / distance lost during active test (rising-edge only)
  const voicePausedRef = useRef(false);
  useEffect(() => {
    if (testPhase !== "TESTING") { voicePausedRef.current = false; return; }
    if (isTestPaused && !voicePausedRef.current) {
      voicePausedRef.current = true;
      speakInstruction("face_lost_test", langRef.current);
    } else if (!isTestPaused) {
      voicePausedRef.current = false;
    }
  }, [isTestPaused, testPhase]);

  // Test complete / saving
  useEffect(() => {
    if (!isSaving) return;
    speakInstruction("test_complete", langRef.current);
  }, [isSaving]);

  // Distance / face guidance during camera setup — fires once per state change
  const lastDistVoiceRef = useRef(null);
  useEffect(() => {
    if (testPhase !== "SETUP_CAMERA") { lastDistVoiceRef.current = null; return; }
    if (!visionResult) return;
    let key = null;
    if (!visionResult.face_detected) {
      key = "face_not_detected_camera";
    } else if (visionResult.distance_status !== "ok") {
      const d = visionResult.distance_cm || 0;
      key = d > 0 && d < 45 ? "move_farther" : "move_closer";
    }
    if (!key || key === lastDistVoiceRef.current) return;
    lastDistVoiceRef.current = key;
    speakInstruction(key, langRef.current);
  }, [testPhase, visionResult]);

  // Ongoing PRE_CHECK coaching: if conditions stay wrong, remind every ~5 s
  // (speech.js cooldown enforces the interval; we poll visionResultRef cheaply)
  useEffect(() => {
    if (testPhase !== "PRE_CHECK") return;
    let badSince = null;
    const iv = setInterval(() => {
      const vr = visionResultRef.current;
      if (!vr) return;
      let key = null;
      if (!vr.face_detected) {
        key = "pre_check_face_issue";
      } else if (vr.distance_status !== "ok") {
        key = "pre_check_distance_issue";
      } else if (vr.eye_state !== expectedCover) {
        key = testingEye === "left" ? "pre_check_right" : "pre_check_left";
      }
      if (!key) { badSince = null; return; }
      if (!badSince) badSince = Date.now();
      if (Date.now() - badSince >= 4000) speakInstruction(key, langRef.current);
    }, 500);
    return () => clearInterval(iv);
  }, [testPhase, testingEye, expectedCover]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ────────────────────────────────────────────

  // ── Desktop-only gate ─────────────────────────────────
  if (isMobileOrTablet) {
    return (
      <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${
        isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}>
        <AnimatedBackground isDarkMode={isDarkMode} />
        <div className="absolute top-6 right-6 z-20"><LanguageSelector /></div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className={`w-full max-w-md rounded-3xl shadow-2xl p-8 text-center transition-colors ${
            isDarkMode ? "bg-[#1a1f3a]/90 border border-slate-700/50" : "bg-white/90 border border-slate-200"
          }`}>

            {/* Icon */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isDarkMode ? "bg-cyan-500/15" : "bg-cyan-50"
            }`}>
              <Monitor className={`w-10 h-10 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>

            <h1 className={`text-2xl font-black mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Desktop Required
            </h1>

            <p className={`text-base mb-4 leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Vision tests need a <span className="font-semibold">laptop or desktop computer</span> to run accurately.
            </p>

            <ul className={`text-sm text-left space-y-2.5 mb-6 px-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {[
                "A full-size screen for readable test letters",
                "A webcam for eye-tracking and distance measurement",
                `Enough screen distance (${VIEWING_DISTANCE.label}) for valid results`,
              ].map((reason) => (
                <li key={reason} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"
                  }`}>✓</span>
                  {reason}
                </li>
              ))}
            </ul>

            <p className={`text-xs mb-6 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              The rest of the VISUAR app — dashboard, results, AI consultant — works on any device.
            </p>

            <button
              onClick={() => navigate("/dashboard")}
              className="w-full h-12 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm transition-all active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${
      isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
    }`}>
      <AnimatedBackground isDarkMode={isDarkMode} />
      <div className="absolute top-6 right-6 z-20"><LanguageSelector /></div>

      {/* Saving overlay — shown briefly after right eye test before navigation */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className={`px-10 py-8 rounded-3xl text-center shadow-2xl ${
            isDarkMode ? "bg-[#1a1f3a] border border-slate-700" : "bg-white border border-slate-200"
          }`}>
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Saving results…</p>
          </div>
        </div>
      )}

      {/* Persistent hidden video + canvas */}
      <video ref={videoRef} autoPlay playsInline muted
        style={{ position: "fixed", top: "-9999px", left: "-9999px", width: 320, height: 240, pointerEvents: "none" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ── EYE VIOLATION WARNING OVERLAY ── */}
      {eyeWarningVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className={`max-w-lg w-full mx-4 p-8 rounded-3xl text-center shadow-2xl ${
            isDarkMode ? "bg-red-950/90 border border-red-500/50" : "bg-white border-2 border-red-300"
          }`}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
              <h2 className={`text-3xl font-black ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                Eye Cover Violation
              </h2>
            </div>
            <p className={`text-lg mb-6 ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
              You are not covering the correct eye. Please cover your <strong>{coveredEyeLabel}</strong> eye to continue.
            </p>
            <div className="text-6xl font-black text-red-500 animate-pulse mb-4">
              {eyeWarningCountdown}
            </div>
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Test will restart in {eyeWarningCountdown}s · Violation {violationCount + 1}/{MAX_VIOLATIONS}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto relative z-10 flex flex-col flex-1 p-4 md:p-6">
        <Link to="/dashboard" onClick={() => {
          stopCamera();
        }}>
          <Button variant="ghost" className={`mb-4 transition-colors ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-700"}`}>
            <ArrowLeft className="mr-2 w-4 h-4" /> {t("common.back")}
          </Button>
        </Link>

        {/* ═══ NOT IMPLEMENTED ═══ */}
        {!isImplemented && (
          <div className={`flex-1 flex flex-col items-center justify-center backdrop-blur-md rounded-3xl shadow-xl p-12 text-center transition-colors ${
            isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDarkMode ? "bg-slate-700/50" : "bg-slate-100"}`}>
              <Activity className={`w-10 h-10 ${isDarkMode ? "text-slate-400" : "text-slate-400"}`} />
            </div>
            <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Coming Soon
            </h2>
            <p className={`text-lg max-w-md ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              This test is not implemented yet. Check back in a future update.
            </p>
            <Link to="/test-selection" className="mt-8">
              <Button className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-white px-8 h-12">
                Choose Another Test
              </Button>
            </Link>
          </div>
        )}

        {/* ═══ PHASE: SESSION SUMMARY ═══ */}
        {isImplemented && testPhase === "SESSION_SUMMARY" && sessionEstimate && (
          <div
            className={`flex-1 flex flex-col items-center justify-center backdrop-blur-md rounded-3xl shadow-xl p-8 ${
              isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80"
            }`}
          >
            <SessionEstimatePanel
              estimate={sessionEstimate}
              isDarkMode={isDarkMode}
              onViewFullResult={() => {
                const nav = pendingNavRef.current;
                if (nav) {
                  const slug = nav.path.replace(/^\/results\//, "");
                  if (slug) persistTestResult(slug, nav.state);
                  navigate(nav.path, { state: nav.state });
                }
              }}
            />
          </div>
        )}

        {/* ═══ PHASE: VISION FOCUS ═══ */}
        {isImplemented && testPhase === "VISION_FOCUS" && (
          <div
            className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 transition-colors ${
              isDarkMode
                ? "bg-[#1a1f3a]/80 border border-slate-700/50"
                : "bg-white/80 border border-white/40"
            }`}
          >
            <VisionFocusStep
              value={visionFocusDraft}
              onChange={setVisionFocusDraft}
              onContinue={() => {
                startNewScreeningSession({ visionFocus: visionFocusDraft });
                setVisionFocus(visionFocusDraft);
                setSessionVisionFocus(visionFocusDraft);
                setAssessmentPlan(buildAssessmentPlan(visionFocusDraft));
                setAssessmentStepIndex(0);
                screenerRef.current = { snellenPassed: null, jaegerPassed: null };
                const saved = localStorage.getItem("visuar_ppi");
                setTestPhase(saved ? "SETUP_CAMERA" : "SETUP_PPI");
              }}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* ═══ PHASE: PPI CALIBRATION ═══ */}
        {isImplemented && testPhase === "SETUP_PPI" && (
          <div className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 transition-colors ${
            isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"
          }`}>
            <PPICalibrator
              onCalibrate={(val) => {
                localStorage.setItem("visuar_ppi", String(val));
                setPpi(val);
                setTestPhase("SETUP_CAMERA");
              }}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* ═══ PHASE: CAMERA + DISTANCE CALIBRATION ═══ */}
        {isImplemented && testPhase === "SETUP_CAMERA" && (
          <div className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 text-center transition-colors ${
            isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
              <Ruler className={`w-8 h-8 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
            </div>
            <h2 className={`text-3xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>Distance Calibration</h2>
            <p className={`mb-2 max-w-lg mx-auto ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Sit approximately{" "}
              <strong>
                {isJaegerTest ||
                activeAssessmentStep === STEP.JAEGER ||
                activeAssessmentStep === STEP.SCREENER_JAEGER
                  ? VIEWING.near.label
                  : VIEWING.distance.label}
              </strong>{" "}
              from your screen, then click Calibrate.
            </p>
            <div className={`mb-6 max-w-lg mx-auto p-3 rounded-xl text-sm font-medium ${
              isDarkMode ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border border-cyan-100"
            }`}>
              💡 <strong>Tip:</strong> Sit {VIEWING_DISTANCE.label} from the screen (about arm's length)
            </div>

            {/* Camera states */}
            {cameraPermission === "requesting" && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Requesting camera access…
                </p>
              </div>
            )}

            {cameraPermission === "denied" && (
              <div className="flex flex-col items-center gap-5 max-w-lg mx-auto">
                {cameraError === "NotFoundError" ? (
                  <div className={`w-full rounded-2xl p-5 text-left ${isDarkMode ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
                    <p className={`font-semibold mb-1 ${isDarkMode ? "text-red-400" : "text-red-700"}`}>No camera found</p>
                    <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                      No webcam detected. If your camera was just used by another test, wait a few seconds and click <strong>Retry Camera</strong>. On Windows, you may also need to allow camera access in Settings → Privacy → Camera.
                    </p>
                  </div>
                ) : cameraError === "NotSupportedError" ? (
                  <div className={`w-full rounded-2xl p-5 text-left ${isDarkMode ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
                    <p className={`font-semibold mb-1 ${isDarkMode ? "text-red-400" : "text-red-700"}`}>Camera not supported</p>
                    <p className={`text-sm ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                      Your browser does not support camera access. Please use Chrome, Edge, or Firefox on a device with a webcam.
                    </p>
                  </div>
                ) : cameraError === "NotReadableError" ? (
                  <div className={`w-full rounded-2xl p-5 text-left ${isDarkMode ? "bg-amber-500/10 border border-amber-500/30" : "bg-amber-50 border border-amber-200"}`}>
                    <p className={`font-semibold mb-1 ${isDarkMode ? "text-amber-400" : "text-amber-700"}`}>Camera is in use</p>
                    <p className={`text-sm ${isDarkMode ? "text-amber-300" : "text-amber-600"}`}>
                      Your camera is being used by another application (e.g. Zoom, Teams). Close that app and click Retry.
                    </p>
                  </div>
                ) : (
                  /* NotAllowedError or anything else — show step-by-step guide */
                  <div className={`w-full rounded-2xl p-5 text-left ${isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-200"}`}>
                    <p className={`font-semibold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Camera permission was blocked
                    </p>
                    <p className={`text-sm mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                      Your browser blocked camera access. Follow these steps to allow it:
                    </p>
                    <ol className={`text-sm space-y-2 list-none ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      <li className="flex items-start gap-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>1</span>
                        <span>Click the <strong>lock / camera icon</strong> in the browser address bar (top left of the URL bar)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>2</span>
                        <span>Find <strong>Camera</strong> in the list and set it to <strong>Allow</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>3</span>
                        <span>Reload the page if prompted, then click <strong>Retry Camera</strong> below</span>
                      </li>
                    </ol>
                  </div>
                )}
                <Button size="lg" className="h-12 px-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white" onClick={requestCamera}>
                  <Camera className="mr-2 w-5 h-5" /> Retry Camera
                </Button>
              </div>
            )}

            {(cameraPermission === "idle") && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-cyan-500/40 border-t-cyan-500 rounded-full animate-spin" />
                <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Starting camera…
                </p>
              </div>
            )}

            {cameraPermission === "granted" && (
              <div className="flex flex-col items-center gap-4">
                <MirrorPreview videoRef={videoRef} className="w-full max-w-md rounded-2xl shadow-inner" faceOk={!!(visionResult?.face_detected && visionResult?.distance_status === "ok")} faceDetected={!!visionResult?.face_detected} />
                {visionResult && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Distance:</span>
                      <span className={`text-2xl font-black tabular-nums ${visionResult.distance_status === "ok" ? "text-green-500" : "text-amber-500"}`}>
                        {visionResult.distance_cm != null
                          ? `${visionResult.distance_cm} cm`
                          : visionResult.face_detected
                            ? "Calculating…"
                            : "No face detected"}
                      </span>
                      {visionResult.distance_status === "ok" && visionResult.face_detected && (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      )}
                    </div>
                    {!visionResult.face_detected && visionResult.distance_cm == null && (
                      <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        Center your face in the camera preview
                      </p>
                    )}
                  </div>
                )}
                <Button size="lg" className="h-14 px-12 rounded-full" onClick={handleCalibrate}>
                  <CheckCircle2 className="mr-2 w-5 h-5" /> Calibrate at {VIEWING_DISTANCE.labelShort}
                </Button>
              </div>
            )}

            {/* Re-calibrate screen link */}
            <div className="mt-6">
              <button
                onClick={() => {
                  localStorage.removeItem("visuar_ppi");
                  setTestPhase("SETUP_PPI");
                }}
                className={`text-sm underline underline-offset-2 transition-colors ${
                  isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Re-calibrate screen (PPI: {Math.round(ppi)})
              </button>
            </div>
          </div>
        )}

        {/* ═══ PHASE: GLASSES / FACE VALIDATION ═══ */}
        {isImplemented && testPhase === "GLASSES_VALIDATION" && (
          <div
            className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 transition-colors ${
              isDarkMode
                ? "bg-[#1a1f3a]/80 border border-slate-700/50"
                : "bg-white/80 border border-white/40"
            }`}
          >
            <GlassesValidationStep
              testId={testId}
              visionResult={visionResult}
              isDarkMode={isDarkMode}
              mirrorPreview={
                cameraPermission === "granted" ? (
                  <MirrorPreview videoRef={videoRef} className="w-full" />
                ) : null
              }
              onContinue={(mode) => {
                setCorrectionMode(mode);
                setCorrectionModeState(mode);
                setTestPhase("INSTRUCTION");
              }}
            />
          </div>
        )}

        {/* ═══ PHASE: INSTRUCTION (eye-cover guide or binocular notice) ═══ */}
        {isImplemented && testPhase === "INSTRUCTION" && (
          <div className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 transition-colors ${
            isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"
          }`}>
            {isColorVisionTest ? (
              <div className="flex flex-col items-center text-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isDarkMode ? "bg-cyan-500/20" : "bg-cyan-100"}`}>
                  <svg viewBox="0 0 32 32" className="w-8 h-8"><circle cx="10" cy="16" r="7" fill="#e03030" opacity="0.85" /><circle cx="22" cy="16" r="7" fill="#30aa30" opacity="0.85" /><circle cx="16" cy="16" r="7" fill="#e08030" opacity="0.75" /></svg>
                </div>
                <h2 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Colour Vision Test</h2>
                <p className={`text-lg max-w-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Keep <strong>both eyes open</strong> for this test — no eye covering needed.
                  Position yourself comfortably in front of the camera.
                </p>
                <button
                  onClick={() => setTestPhase("PRE_CHECK")}
                  className="mt-2 px-10 py-4 rounded-full text-lg font-bold bg-cyan-500 hover:bg-cyan-400 text-white transition-all shadow-lg"
                >
                  Continue
                </button>
              </div>
            ) : (
              <EyeCoverGuide
                eye={testingEye}
                isDarkMode={isDarkMode}
                onStart={() => setTestPhase("PRE_CHECK")}
              />
            )}
          </div>
        )}

        {/* ═══ PHASE: PRE-CHECK ═══ */}
        {isImplemented && testPhase === "PRE_CHECK" && (
          <div className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-10 text-center transition-colors ${
            isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80 border border-white/40"
          }`}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <EyeOff className={`w-8 h-8 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
              <h2 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Cover Your {coveredEyeLabel} Eye
              </h2>
            </div>
            <p className={`text-lg mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              We're testing your <strong>{testingEyeLabel} eye</strong>. Cover the other eye with your hand.
            </p>

            <div className="flex flex-col items-center gap-6">
              <div className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
                <MirrorPreview videoRef={videoRef} className="w-full" faceOk={!!(visionResult?.face_detected && visionResult?.distance_status === "ok")} faceDetected={!!visionResult?.face_detected} />
                {visionResult && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm p-4 flex justify-around text-white">
                    <StatusIndicator label="Distance" ok={visionResult.distance_status === "ok"}
                      valueOk={visionResult.distance_cm ? `${visionResult.distance_cm} cm ✓` : "---"}
                      valueBad={visionResult.distance_cm ? `${visionResult.distance_cm} cm` : "No face"} />
                    <StatusIndicator label="Eye Cover" ok={visionResult.eye_state === expectedCover}
                      valueOk={`${coveredEyeLabel} Covered ✓`}
                      valueBad={visionResult.eye_state.replace(/_/g, " ").toUpperCase()} />
                  </div>
                )}
              </div>

              <div className="w-full max-w-xl">
                <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
                  <div className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-cyan-500 to-green-500"
                    style={{ width: `${lockProgress * 100}%` }} />
                </div>
                {lockProgress > 0 ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-green-500 font-bold animate-pulse text-lg">
                    <Lock className="w-5 h-5" /> Locking in… ({Math.round(lockProgress * 100)}%)
                  </div>
                ) : (
                  <p className={`mt-3 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Hold position for 3 seconds to begin
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PHASE: ACTIVE TEST ═══ */}
        {isImplemented && (
          <div style={{ display: testPhase === "TESTING" ? "flex" : "none" }} className="gap-5 flex-1 min-h-0">
            <div className={`flex-1 rounded-3xl shadow-xl flex flex-col items-center justify-center transition-colors overflow-hidden ${
              isDarkMode ? "bg-[#0d1117] border border-slate-800" : "bg-white border border-slate-200"
            }`}>
              {isCompleteAssessment && testPhase === "TESTING" && (
                <AssessmentProgress
                  plan={assessmentPlan}
                  currentIndex={assessmentStepIndex}
                  isDarkMode={isDarkMode}
                />
              )}
              {isRefractionBattery && testPhase === "TESTING" && (
                <RefractionBatteryProgress currentStep={refractionSubPhase} isDarkMode={isDarkMode} />
              )}
              {showSnellenEngine && (
                <SnellenEngine
                  key={`${testingEye}-${snellenResetToken}-${activeAssessmentStep}`}
                  ppi={ppi}
                  acuityLevel={snellenLevels[currentLevelIndex]}
                  levelIndex={currentLevelIndex}
                  onLevelResult={handleSnellenLevelResult}
                  isDarkMode={isDarkMode}
                  testingEye={testingEye}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  coveredEyeLabel={coveredEyeLabel}
                  resetToken={snellenResetToken}
                  screenerMode={activeAssessmentStep === STEP.SCREENER_SNELLEN}
                  acuityLevels={snellenLevels}
                  quickMode={quickMode}
                />
              )}
              {showJaegerEngine && (
                <JaegerEngine
                  key={`${testingEye}-j-${jaegerResetToken}-${activeAssessmentStep}`}
                  ppi={ppi}
                  jaegerLevel={jaegerLevels[currentJaegerIndex]}
                  levelIndex={currentJaegerIndex}
                  onLevelResult={handleJaegerLevelResult}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  coveredEyeLabel={coveredEyeLabel}
                  resetToken={jaegerResetToken}
                  screenerMode={activeAssessmentStep === STEP.SCREENER_JAEGER}
                  jaegerLevels={jaegerLevels}
                  quickMode={quickMode}
                />
              )}
              {showNearFarEngine && (
                <NearFarSwitchingEngine
                  key={`nf-${nonSnellenResetToken}`}
                  ppi={ppi}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  visionResult={visionResult}
                  coveredEyeLabel={coveredEyeLabel}
                  onTestComplete={handleNearFarComplete}
                />
              )}
              {showContrastInAssessment && (
                <ContrastEngine
                  key={`${testingEye}-${nonSnellenResetToken}`}
                  ppi={ppi}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onTestComplete={handleContrastComplete}
                  lang={i18n.language}
                  quickMode={quickMode}
                />
              )}
              {showOrientationInAssessment && (
                <OrientationEngine
                  key={`${testingEye}-${nonSnellenResetToken}`}
                  ppi={ppi}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onTestComplete={handleOrientationComplete}
                  lang={i18n.language}
                />
              )}
              {showColorVisionEngine && (
                <ColorVisionEngine
                  key={`cv-${nonSnellenResetToken}`}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet}
                  onTestComplete={handleColorVisionComplete}
                />
              )}
              {showLandoltEngine && (
                <LandoltCEngine
                  key={`${testingEye}-landolt-${nonSnellenResetToken}`}
                  ppi={ppi}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onTestComplete={handleLandoltComplete}
                />
              )}
              {showRapidInAssessment && (
                <RapidRecognitionEngine
                  key={`${testingEye}-${nonSnellenResetToken}`}
                  ppi={ppi}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onTestComplete={handleRapidComplete}
                  lang={i18n.language}
                />
              )}
              {showDuochromeEngine && (
                <DuochromeEngine
                  key={`${testingEye}-duo-${refractionEngineKey}`}
                  ppi={ppi}
                  initialDiopter={getRefractionInitialD(testingEye)}
                  acuityLevel={getRefractionAcuity(testingEye)}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onComplete={handleDuochromeComplete}
                  showInstructions={!isRefractionBattery}
                  quickMode={quickMode}
                />
              )}
              {showSimulatorEngine && (
                <RefractionSimulatorEngine
                  key={`${testingEye}-sim-${refractionEngineKey}`}
                  ppi={ppi}
                  initialDiopter={getRefractionInitialD(testingEye)}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onComplete={handleSimulatorComplete}
                  showInstructions={!isRefractionBattery}
                  quickMode={quickMode}
                />
              )}
              {showAstigmatismEngine && (
                <>
                  {(isSnellenTest && snellenSubPhase === "astigmatism") ||
                  (isJaegerTest && jaegerSubPhase === "astigmatism") ? (
                    <div
                      className={`mb-3 px-4 py-2 rounded-xl text-sm font-semibold text-center ${
                        isDarkMode
                          ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
                          : "bg-violet-50 text-violet-800 border border-violet-200"
                      }`}
                    >
                      Astigmatism check — tap the lines that look darkest or sharpest
                    </div>
                  ) : null}
                  <AstigmatismFanEngine
                  key={`${testingEye}-fan-${refractionEngineKey}`}
                  isDarkMode={isDarkMode}
                  visionOk={testPhase === "TESTING" && isConditionsMet && !eyeWarningVisible}
                  onComplete={handleAstigmatismComplete}
                  showInstructions={!isRefractionBattery && !isSnellenTest && !isJaegerTest}
                />
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className={`w-64 xl:w-72 shrink-0 rounded-3xl shadow-xl overflow-hidden flex flex-col transition-colors ${
              isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"
            }`}>
              <div className="relative">
                <MirrorPreview videoRef={videoRef} className="w-full" />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {fps} FPS
                </div>
              </div>
              <div className="p-4 space-y-4 flex-1">
                {isRefractionFlow ? (
                  <>
                    <TelemetryRow label="Testing Eye" value={testingEyeLabel} color="text-cyan-500" />
                    <TelemetryRow
                      label="Step"
                      value={refractionSubPhase.toUpperCase()}
                      color="text-violet-500"
                    />
                    <TelemetryRow label="Distance"
                      value={visionResult?.distance_cm ? `${visionResult.distance_cm} cm` : "---"}
                      color={visionResult?.distance_status === "ok" ? "text-green-500" : "text-red-500"} />
                    <TelemetryRow label="Eye Cover"
                      value={visionResult?.eye_state?.replace(/_/g, " ").toUpperCase() || "---"}
                      color={visionResult?.eye_state === expectedCover ? "text-green-500" : "text-amber-500"} />
                  </>
                ) : isSnellenTest ? (
                  <>
                    <TelemetryRow label="Testing Eye" value={testingEyeLabel} color="text-cyan-500" />
                    <TelemetryRow label="Distance"
                      value={visionResult?.distance_cm ? `${visionResult.distance_cm} cm` : "---"}
                      color={visionResult?.distance_status === "ok" ? "text-green-500" : "text-red-500"} />
                    <TelemetryRow label="Eye State"
                      value={visionResult?.eye_state?.replace(/_/g, " ").toUpperCase() || "---"}
                      color={
                        visionResult?.eye_state === expectedCover ? "text-green-500"
                        : visionResult?.eye_state === "both_open" ? "text-red-500"
                        : "text-amber-500"
                      } />
                    <div className={`pt-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <TelemetryRow label="Acuity (decimal)" value={formatAcuityLabel(snellenLevels[currentLevelIndex])}
                        color={isDarkMode ? "text-white" : "text-slate-900"} large />
                    </div>
                    {violationCount > 0 && (
                      <div className={`p-2 rounded-lg text-xs font-medium ${isDarkMode ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"}`}>
                        ⚠ Eye violations: {violationCount}/{MAX_VIOLATIONS}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <TelemetryRow label="Testing Eye" value={testingEyeLabel} color="text-cyan-500" />
                    <TelemetryRow label="Distance"
                      value={visionResult?.distance_cm ? `${visionResult.distance_cm} cm` : "---"}
                      color={visionResult?.distance_status === "ok" ? "text-green-500" : "text-red-500"} />
                    <TelemetryRow label="Eye Cover"
                      value={visionResult?.eye_state?.replace(/_/g, " ").toUpperCase() || "---"}
                      color={visionResult?.eye_state === expectedCover ? "text-green-500" : "text-amber-500"} />
                    <div className={`pt-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                      <TelemetryRow label="Mode"
                        value="MONOCULAR"
                        color={isDarkMode ? "text-white" : "text-slate-900"} large />
                    </div>
                  </>
                )}

                {/* Exit Test button */}
                <div className={`pt-3 border-t ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                  <button
                    onClick={() => setShowExitConfirm(true)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      isDarkMode
                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                        : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                    }`}
                  >
                    ✕ Exit Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* ═══ EXIT CONFIRMATION MODAL ═══ */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center ${
            isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
          }`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDarkMode ? "bg-red-500/15" : "bg-red-50"
            }`}>
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Exit Test?
            </h2>
            <p className={`text-sm mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Your progress will be lost. The camera will be stopped and you will be taken back to the dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  isDarkMode
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                Continue Test
              </button>
              <button
                onClick={() => { stopCamera(); navigate("/dashboard"); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-red-500 hover:bg-red-600 text-white"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────

function drawFaceGuides(ctx, W, H, faceOk, faceDetected) {
  const cx   = W / 2;
  const cy   = H / 2 - H * 0.02;
  const rx   = W * 0.22;
  const ry   = H * 0.40;
  const now  = Date.now();

  // Three states: green=locked, red=face detected but out of position, cyan=waiting
  const alarm = faceDetected && !faceOk;
  const c0 = faceOk ? "0,220,120" : alarm ? "220,50,50" : "0,210,230";
  const C  = (a) => `rgba(${c0},${a})`;
  // Alarm pulse — makes opacity throb on red elements
  const alarmPulse = alarm ? 0.55 + 0.45 * Math.abs(Math.sin(now / 280)) : 1;
  const Y  = (a) => `rgba(255,210,0,${a})`;     // yellow accent
  const W2 = (a) => `rgba(255,255,255,${a})`;   // white

  const pad  = 10;
  const bL   = cx - rx - pad;
  const bR   = cx + rx + pad;
  const bT   = cy - ry - pad;
  const bB   = cy + ry + pad;
  const bLen = Math.min(W, H) * 0.09;

  ctx.save();

  // ── 1. Faint grid ─────────────────────────────────────────
  ctx.strokeStyle = C(0.07);
  ctx.lineWidth = 0.6;
  ctx.setLineDash([]);
  const gs = Math.round(W / 14);
  for (let x = 0; x <= W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y <= H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // ── 2. Animated scan sweep (clipped to oval) ──────────────
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const scanPct = (now % 2400) / 2400;
  const scanY   = cy - ry + ry * 2 * scanPct;
  const sg = ctx.createLinearGradient(0, scanY - 36, 0, scanY + 6);
  sg.addColorStop(0, C(0));
  sg.addColorStop(1, C(0.32));
  ctx.fillStyle = sg;
  ctx.fillRect(cx - rx, scanY - 36, rx * 2, 42);
  ctx.strokeStyle = C(0.65);
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(cx - rx, scanY); ctx.lineTo(cx + rx, scanY); ctx.stroke();
  ctx.restore();

  // ── 3. Crosshairs ─────────────────────────────────────────
  ctx.strokeStyle = W2(0.15);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 7]);
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

  // ── 4. Outer glow oval ────────────────────────────────────
  ctx.strokeStyle = C(alarm ? 0.25 * alarmPulse : 0.15);
  ctx.lineWidth = alarm ? 14 : 10;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, Math.PI * 2); ctx.stroke();

  // ── 5. Main dashed oval ───────────────────────────────────
  ctx.strokeStyle = C(alarm ? 0.92 * alarmPulse : 0.88);
  ctx.lineWidth = alarm ? 3 : 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();

  // ── 6. Radial tick marks every 30° ────────────────────────
  ctx.setLineDash([]);
  for (let deg = 0; deg < 360; deg += 30) {
    const rad   = (deg * Math.PI) / 180;
    const major = deg % 90 === 0;
    const len   = major ? 11 : 6;
    const ix    = cx + rx * Math.cos(rad);
    const iy    = cy + ry * Math.sin(rad);
    const ox    = cx + (rx + len) * Math.cos(rad);
    const oy    = cy + (ry + len) * Math.sin(rad);
    ctx.strokeStyle = major ? C(0.85) : C(0.45);
    ctx.lineWidth   = major ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
  }

  // ── 7. Eye-position reticles (animated pulse) ─────────────
  const eyeY    = cy - ry * 0.18;
  const eyeOffX = rx * 0.46;
  const pulse   = 0.5 + 0.5 * Math.sin(now / 500);
  [cx - eyeOffX, cx + eyeOffX].forEach((ex) => {
    // pulsing outer ring
    ctx.strokeStyle = Y(0.35 + 0.35 * pulse);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(ex, eyeY, 13 + 2 * pulse, 0, Math.PI * 2); ctx.stroke();
    // static inner ring
    ctx.strokeStyle = Y(0.75);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(ex, eyeY, 7, 0, Math.PI * 2); ctx.stroke();
    // crosshair
    ctx.strokeStyle = Y(0.60);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex - 10, eyeY); ctx.lineTo(ex + 10, eyeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, eyeY - 10); ctx.lineTo(ex, eyeY + 10); ctx.stroke();
    // center dot
    ctx.fillStyle = Y(0.85);
    ctx.beginPath(); ctx.arc(ex, eyeY, 2, 0, Math.PI * 2); ctx.fill();
  });

  // ── 8. Nose bridge guide (subtle vertical dash) ───────────
  ctx.strokeStyle = W2(0.12);
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(cx, eyeY + 10);
  ctx.lineTo(cx, cy + ry * 0.30);
  ctx.stroke();

  // ── 9. Head-angle wings (top of oval) ─────────────────────
  const topY = cy - ry;
  ctx.strokeStyle = Y(0.55);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx - rx * 0.70, topY - ry * 0.14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx + rx * 0.70, topY - ry * 0.14); ctx.stroke();
  // small tick at wing tips
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5;
  [[cx - rx * 0.70, topY - ry * 0.14], [cx + rx * 0.70, topY - ry * 0.14]].forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.moveTo(wx - 4, wy); ctx.lineTo(wx + 4, wy); ctx.stroke();
  });

  // ── 10. Chin guide arc (bottom of oval) ───────────────────
  ctx.strokeStyle = Y(0.30);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.55, rx * 0.35, ry * 0.12, 0, 0, Math.PI);
  ctx.stroke();

  // ── 11. Corner brackets + corner squares ──────────────────
  ctx.setLineDash([]);
  ctx.strokeStyle = C(0.92);
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(bL + bLen, bT); ctx.lineTo(bL, bT); ctx.lineTo(bL, bT + bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bR - bLen, bT); ctx.lineTo(bR, bT); ctx.lineTo(bR, bT + bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bL + bLen, bB); ctx.lineTo(bL, bB); ctx.lineTo(bL, bB - bLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bR - bLen, bB); ctx.lineTo(bR, bB); ctx.lineTo(bR, bB - bLen); ctx.stroke();
  // corner filled squares
  ctx.fillStyle = C(0.92);
  const sq = 4;
  [[bL,bT],[bR,bT],[bL,bB],[bR,bB]].forEach(([x,y]) => ctx.fillRect(x-sq/2,y-sq/2,sq,sq));
  // secondary inner bracket lines (thinner)
  ctx.strokeStyle = C(0.30);
  ctx.lineWidth = 1;
  const bLen2 = bLen * 0.5;
  ctx.beginPath(); ctx.moveTo(bL + bLen2, bT + 5); ctx.lineTo(bL + 5, bT + 5); ctx.lineTo(bL + 5, bT + bLen2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bR - bLen2, bT + 5); ctx.lineTo(bR - 5, bT + 5); ctx.lineTo(bR - 5, bT + bLen2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bL + bLen2, bB - 5); ctx.lineTo(bL + 5, bB - 5); ctx.lineTo(bL + 5, bB - bLen2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bR - bLen2, bB - 5); ctx.lineTo(bR - 5, bB - 5); ctx.lineTo(bR - 5, bB - bLen2); ctx.stroke();

  // ── 12. Side ruler (left) ─────────────────────────────────
  const rX = bL - 14;
  ctx.strokeStyle = C(0.28);
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(rX, bT); ctx.lineTo(rX, bB); ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    const y = bT + ((bB - bT) / 8) * i;
    ctx.beginPath(); ctx.moveTo(rX, y); ctx.lineTo(rX - (i % 4 === 0 ? 7 : 3), y); ctx.stroke();
  }

  // ── 13. Distance arc decorations (top corners) ────────────
  ctx.strokeStyle = C(0.20);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.arc(bL, bT, 22, 0, Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(bR, bT, 22, Math.PI / 2, Math.PI); ctx.stroke();

  // ── 14. HUD labels ────────────────────────────────────────
  const fs = Math.round(H * 0.032);
  ctx.setLineDash([]);
  ctx.font = `bold ${fs}px monospace`;
  ctx.textAlign = "left";
  ctx.fillStyle = C(0.60);
  ctx.fillText("FACE SCAN", bL, bT - 14);
  ctx.font = `${Math.round(H * 0.026)}px monospace`;
  ctx.fillStyle = C(0.35);
  ctx.textAlign = "right";
  ctx.fillText("VISUAR", bR, bT - 14);

  // animated status label at bottom
  ctx.textAlign = "center";
  if (faceOk) {
    ctx.font = `bold ${Math.round(H * 0.034)}px monospace`;
    ctx.fillStyle = C(0.92);
    ctx.fillText("✓ POSITION LOCKED", cx, bB + H * 0.048);
  } else if (alarm) {
    // flashing warning text
    ctx.font = `bold ${Math.round(H * 0.032)}px monospace`;
    ctx.fillStyle = C(alarmPulse);
    ctx.fillText("⚠ ALIGN FACE IN OVAL", cx, bB + H * 0.048);
  } else {
    const dots = ".".repeat((Math.floor(now / 380) % 3) + 1);
    ctx.font = `${Math.round(H * 0.030)}px monospace`;
    ctx.fillStyle = C(0.70);
    ctx.fillText(`SCANNING${dots}`, cx, bB + H * 0.048);
  }

  // ── 15. Center dot ────────────────────────────────────────
  ctx.fillStyle = C(0.90);
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function MirrorPreview({ videoRef, className = "", faceOk = false, faceDetected = false }) {
  const mirrorCanvasRef = useRef(null);
  const rafRef = useRef(null);
  const faceOkRef       = useRef(faceOk);
  const faceDetectedRef = useRef(faceDetected);
  faceOkRef.current       = faceOk;
  faceDetectedRef.current = faceDetected;

  useEffect(() => {
    let active = true;
    const draw = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = mirrorCanvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        const ctx = canvas.getContext("2d");
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        drawFaceGuides(ctx, canvas.width, canvas.height, faceOkRef.current, faceDetectedRef.current);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { active = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [videoRef]);

  return <canvas ref={mirrorCanvasRef} className={className} style={{ display: "block", background: "#000" }} />;
}

function StatusIndicator({ label, ok, valueOk, valueBad }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className={`font-bold text-sm ${ok ? "text-green-400" : "text-red-400"}`}>{ok ? valueOk : valueBad}</div>
    </div>
  );
}

function TelemetryRow({ label, value, color = "text-white", large = false }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">{label}</div>
      <div className={`${large ? "text-xl" : "text-sm"} font-bold ${color} uppercase`}>{value}</div>
    </div>
  );
}
