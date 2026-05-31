import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Eye,
  Settings,
  LogOut,
  Loader2,
  Crown,
  Zap,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePlan } from "../context/PlanContext";
import { API_URL } from "../lib/config";
import { startNewScreeningSession } from "../utils/screeningSession";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { signOut, user, session } = useAuth();
  const { activePlanId, plan } = usePlan();

  const [testHistory, setTestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const TEST_TYPE_LABELS = {
    "snellen-acuity": "Snellen Visual Acuity",
    "contrast-sensitivity": "Contrast Sensitivity",
    "orientation-discrimination": "Orientation Discrimination",
    "rapid-recognition": "Rapid Recognition",
    "refraction-battery": "Full Refraction Battery",
    "duochrome-refinement": "Duochrome Test",
    "refraction-simulator": "Refraction Simulator",
    "astigmatism-fan": "Astigmatism Fan",
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Get user's display name
  const getUserName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  // Fetch real test history from database
  useEffect(() => {
    const fetchHistory = async () => {
      setFetchError(null);

      if (!session?.access_token) {
        console.warn("[Dashboard] No session token — user not authenticated");
        setHistoryLoading(false);
        setFetchError("not_authenticated");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/test-results`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error(`[Dashboard] API error ${res.status}:`, body);
          setFetchError(`api_error_${res.status}`);
          setHistoryLoading(false);
          return;
        }

        const data = await res.json();
        console.log(`[Dashboard] Fetched ${data.length} test records for user ${user?.email}`);

        setTestHistory(
          data.map((r) => ({
            id: r.id,
            testType: r.test_type,
            date: r.created_at,
            type: TEST_TYPE_LABELS[r.test_type] || r.test_type,
            score: r.overall_score,
            left_acuity: r.left_eye_acuity,
            right_acuity: r.right_eye_acuity,
            status: r.overall_score >= 80 ? "excellent" : r.overall_score >= 50 ? "good" : "poor",
          }))
        );
      } catch (err) {
        console.error("[Dashboard] Network error fetching history:", err);
        setFetchError("network_error");
      }
      setHistoryLoading(false);
    };
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const averageScore = testHistory.length > 0
    ? Math.round(testHistory.reduce((sum, t) => sum + t.score, 0) / testHistory.length)
    : 0;
  const latestScore = testHistory.length > 0 ? testHistory[0].score : 0;
  const scoreImprovement = testHistory.length >= 2
    ? testHistory[0].score - testHistory[testHistory.length - 1].score
    : 0;

  const downloadReport = async () => {
    if (!session?.access_token) return;
    setReportLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/test-results`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const records = res.ok ? await res.json() : [];

      const userName   = getUserName();
      const userEmail  = user?.email || "";
      const dateStr    = new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });

      const safeParse = (str, fb) => {
        try { return JSON.parse(str || "null") || fb; } catch { return fb; }
      };

      const scoreRgb = (s) =>
        s >= 80 ? [22, 163, 74] : s >= 50 ? [217, 119, 6] : [220, 38, 38];

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const W = pdf.internal.pageSize.getWidth();   // 210
      const margin = 14;
      const col = W - margin * 2;
      let y = margin;

      // ── Helpers ──────────────────────────────────────────────
      const addPage = () => { pdf.addPage(); y = margin; drawPageHeader(); };
      const ensureSpace = (needed) => { if (y + needed > 277) addPage(); };
      const hex = ([r, g, b]) => { pdf.setTextColor(r, g, b); };

      // ── Page header bar (repeated on each page) ─────────────
      const drawPageHeader = () => {
        pdf.setFillColor(8, 145, 178);
        pdf.rect(0, 0, W, 10, "F");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text("VISUAR  —  Vision Health Report", margin, 6.5);
        pdf.text(`${userName}  |  ${dateStr}`, W - margin, 6.5, { align: "right" });
      };

      // ── Cover header ─────────────────────────────────────────
      drawPageHeader();
      y = 18;

      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      hex([8, 145, 178]);
      pdf.text("VISUAR", margin, y);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      hex([100, 116, 139]);
      pdf.text("Vision University Accessibility Research", margin, y + 5);

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      hex([15, 23, 42]);
      pdf.text("Vision Health Report", W - margin, y, { align: "right" });

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      hex([100, 116, 139]);
      pdf.text(userName, W - margin, y + 5.5, { align: "right" });
      pdf.text(userEmail, W - margin, y + 9.5, { align: "right" });
      pdf.text(`Generated: ${dateStr}`, W - margin, y + 13.5, { align: "right" });

      y += 20;
      pdf.setDrawColor(8, 145, 178);
      pdf.setLineWidth(0.6);
      pdf.line(margin, y, W - margin, y);
      y += 8;

      // ── Summary stats ────────────────────────────────────────
      const stats = [
        { label: "Total Tests",   value: String(records.length),   rgb: [8, 145, 178] },
        { label: "Average Score", value: String(averageScore),      rgb: scoreRgb(averageScore) },
        { label: "Latest Score",  value: String(latestScore),       rgb: scoreRgb(latestScore) },
        { label: "Score Trend",   value: (scoreImprovement >= 0 ? "+" : "") + scoreImprovement, rgb: scoreImprovement >= 0 ? [22, 163, 74] : [220, 38, 38] },
      ];
      const cardW = (col - 9) / 4;
      stats.forEach((s, i) => {
        const x = margin + i * (cardW + 3);
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, cardW, 18, 2, 2, "FD");
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        hex(s.rgb);
        pdf.text(s.value, x + cardW / 2, y + 10, { align: "center" });
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        hex([100, 116, 139]);
        pdf.text(s.label.toUpperCase(), x + cardW / 2, y + 15, { align: "center" });
      });
      y += 26;

      // ── Section title ─────────────────────────────────────────
      pdf.setFillColor(8, 145, 178);
      pdf.rect(margin, y, 3, 6, "F");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      hex([15, 23, 42]);
      pdf.text("TEST RESULTS & AI ANALYSIS", margin + 5, y + 4.5);
      y += 12;

      // ── Per-test records ──────────────────────────────────────
      if (records.length === 0) {
        pdf.setFontSize(10);
        hex([148, 163, 184]);
        pdf.text("No test records found.", margin, y);
      }

      records.forEach((r) => {
        const findings = safeParse(r.ai_findings, []);
        const recs     = safeParse(r.ai_recommendations, []);
        const dateLabel = new Date(r.created_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });
        const typeLabel = TEST_TYPE_LABELS[r.test_type] || r.test_type;
        const score     = r.overall_score ?? 0;

        // Estimate card height to decide if we need a new page
        const cardHeight = 18
          + (r.ai_summary ? 12 : 0)
          + findings.length * 8
          + (recs.length ? recs.length * 6 + 6 : 0)
          + 6;
        ensureSpace(cardHeight);

        // Card background
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(margin, y, col, cardHeight, 2, 2, "FD");

        const cx = margin + 4;
        let cy = y + 7;

        // Test type + date
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        hex([15, 23, 42]);
        pdf.text(typeLabel, cx, cy);

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        hex([148, 163, 184]);
        pdf.text(dateLabel, cx, cy + 5);

        // Score badge (right side)
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        hex(scoreRgb(score));
        pdf.text(String(score), W - margin - 4, cy + 3, { align: "right" });
        pdf.setFontSize(9);
        hex([148, 163, 184]);
        pdf.text("/100", W - margin - 4, cy + 8, { align: "right" });

        cy += 12;

        // Acuity row
        if (r.left_eye_acuity || r.right_eye_acuity) {
          const acuity = [
            r.left_eye_acuity  ? `L: ${r.left_eye_acuity}`  : null,
            r.right_eye_acuity ? `R: ${r.right_eye_acuity}` : null,
          ].filter(Boolean).join("   |   ");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          hex([71, 85, 105]);
          pdf.text(`Visual Acuity:  ${acuity}`, cx, cy);
          cy += 6;
        }

        // AI summary
        if (r.ai_summary) {
          pdf.setFillColor(239, 246, 255);
          pdf.setDrawColor(59, 130, 246);
          pdf.setLineWidth(0.4);
          const lines = pdf.splitTextToSize(`AI Summary: ${r.ai_summary}`, col - 12);
          const sh = lines.length * 4.5 + 5;
          pdf.roundedRect(cx, cy, col - 8, sh, 1, 1, "FD");
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "normal");
          hex([30, 64, 175]);
          lines.forEach((ln, li) => pdf.text(ln, cx + 3, cy + 4 + li * 4.5));
          cy += sh + 3;
        }

        // Findings
        findings.forEach((f) => {
          const fillMap  = { success: [240,253,244], warning: [255,251,235], info: [240,249,255] };
          const borderMap = { success: [34,197,94],  warning: [245,158,11], info: [56,189,248] };
          const fill   = fillMap[f.type]   || fillMap.info;
          const border = borderMap[f.type] || borderMap.info;
          pdf.setFillColor(...fill);
          pdf.setDrawColor(...border);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(cx, cy, col - 8, 7, 1, 1, "FD");
          pdf.setLineWidth(1);
          pdf.setDrawColor(...border);
          pdf.line(cx, cy, cx, cy + 7);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          hex([15, 23, 42]);
          pdf.text((f.title || "").substring(0, 30), cx + 3, cy + 4.5);
          pdf.setFont("helvetica", "normal");
          hex([71, 85, 105]);
          const desc = pdf.splitTextToSize(f.description || "", col - 60);
          pdf.text(desc[0] || "", cx + 52, cy + 4.5);
          cy += 8;
        });

        // Recommendations
        if (recs.length) {
          cy += 2;
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "bold");
          hex([15, 23, 42]);
          pdf.text("Recommendations:", cx, cy);
          cy += 4.5;
          recs.forEach((rec) => {
            pdf.setFont("helvetica", "normal");
            hex([55, 65, 81]);
            const lines = pdf.splitTextToSize(`• ${rec}`, col - 12);
            lines.forEach((ln) => { pdf.text(ln, cx + 2, cy); cy += 4.5; });
          });
        }

        y += cardHeight + 4;
      });

      // ── Footer on last page ───────────────────────────────────
      ensureSpace(14);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, W - margin, y);
      y += 5;
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      hex([148, 163, 184]);
      const disclaimer = "VISUAR is a screening tool, not a substitute for a professional eye examination. All findings are estimates only.";
      pdf.text(disclaimer, W / 2, y, { align: "center" });
      pdf.text(`Report ID: ${Date.now()}  |  visuar.app`, W / 2, y + 4.5, { align: "center" });

      // ── Save ─────────────────────────────────────────────────
      const filename = `VISUAR_Report_${userName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(filename);

    } catch (err) {
      console.error("[VISUAR] Report generation failed:", err);
      alert("Could not generate report. Make sure you are connected to the backend.");
    }
    setReportLoading(false);
  };

  return (
    <div
      className={`min-h-screen p-4 md:p-8 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#0a0e27]"
          : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button
              variant="ghost"
              className={`transition-colors ${
                isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  : "text-slate-700 hover:text-cyan-600 hover:bg-white/60"
              }`}
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              {t("common.back")}
            </Button>
          </Link>
          <div className="flex gap-2">
            <LanguageSelector />
            <Link to="/settings">
              <Button
                variant="ghost"
                className={`transition-colors ${
                  isDarkMode
                    ? "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    : "text-slate-700 hover:text-cyan-600 hover:bg-white/60"
                }`}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              className={`transition-colors ${
                isDarkMode
                  ? "text-slate-300 hover:text-red-400 hover:bg-slate-800/50"
                  : "text-slate-700 hover:text-red-600 hover:bg-white/60"
              }`}
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content Card */}
        <div
          className={`backdrop-blur-md rounded-3xl shadow-xl p-4 sm:p-8 md:p-12 transition-colors ${
            isDarkMode
              ? "bg-[#1a1f3a]/80 border border-slate-700/50"
              : "bg-white/80 border border-white/40"
          }`}
        >
          {/* Title Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 md:mb-10">
            <div>
              <h1
                className={`text-2xl sm:text-4xl md:text-5xl font-bold mb-2 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {t("dashboard.title")}
              </h1>
              <p
                className={`text-lg transition-colors ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {t("dashboard.welcome")},{" "}
                <span
                  className={`font-semibold transition-colors ${
                    isDarkMode ? "text-cyan-400" : "text-cyan-600"
                  }`}
                >
                  {getUserName()}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
              <Link
                to="/test-selection"
                className="flex-1 sm:flex-none"
                onClick={() => startNewScreeningSession()}
              >
                <Button
                  size="lg"
                  className={`w-full sm:w-auto h-10 sm:h-14 px-4 sm:px-10 text-sm sm:text-lg text-white rounded-full shadow-lg hover:shadow-xl transition-all ${
                    isDarkMode
                      ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500"
                      : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  }`}
                >
                  <Plus className="mr-1 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  {t("dashboard.newTest")}
                </Button>
              </Link>
              <Link to="/profile" className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full sm:w-auto h-10 sm:h-14 px-4 sm:px-8 text-sm sm:text-base rounded-full transition-all ring-2 ring-offset-2 ${
                    isDarkMode
                      ? "border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 bg-slate-800/30 ring-cyan-400/60 ring-offset-[#0a0e27]"
                      : "border-cyan-500/20 text-cyan-600 hover:bg-cyan-500 hover:text-white hover:border-cyan-500 bg-transparent ring-cyan-500/40 ring-offset-white"
                  }`}
                >
                  {t("dashboard.profile")}
                </Button>
              </Link>
              <Link to="/ai-consult" className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-full sm:w-auto h-10 sm:h-14 px-4 sm:px-8 text-sm sm:text-base rounded-full transition-all ring-2 ring-offset-2 ${
                    isDarkMode
                      ? "border-fuchsia-400/30 text-fuchsia-300 hover:bg-fuchsia-400/10 hover:border-fuchsia-400/50 bg-slate-800/30 ring-fuchsia-400/40 ring-offset-[#0a0e27]"
                      : "border-fuchsia-500/20 text-fuchsia-700 hover:bg-fuchsia-500 hover:text-white hover:border-fuchsia-500 bg-transparent ring-fuchsia-500/40 ring-offset-white"
                  }`}
                >
                  AI Consult
                </Button>
              </Link>
              {activePlanId !== "pro" && (
                <Link to="/pricing" className="flex-1 sm:flex-none">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-10 sm:h-14 px-4 sm:px-8 text-sm sm:text-base rounded-full transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40"
                  >
                    <Crown className="mr-1.5 w-4 h-4 sm:w-5 sm:h-5" />
                    {activePlanId === "free" ? "Upgrade to Basic" : "Upgrade to Pro"}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 md:mb-10">
            <div
              className={`group rounded-2xl p-3 sm:p-6 border hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                isDarkMode
                  ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-400/20 shadow-lg shadow-cyan-500/10"
                  : "bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100 shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-cyan-400/20" : "bg-cyan-500/20"
                  }`}
                >
                  <Eye
                    className={`w-4 h-4 sm:w-6 sm:h-6 ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                </div>
                <Badge
                  className={`text-xs transition-all ${
                    isDarkMode
                      ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-black/20"
                      : "bg-cyan-500 text-white group-hover:bg-cyan-600"
                  }`}
                >
                  Latest
                </Badge>
              </div>
              <div
                className={`text-xl sm:text-3xl font-bold mb-1 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {latestScore}
              </div>
              <div
                className={`text-xs sm:text-sm transition-colors ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {t("dashboard.latestScore")}
              </div>
            </div>

            <div
              className={`group rounded-2xl p-3 sm:p-6 border hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                isDarkMode
                  ? "bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-400/20 shadow-lg shadow-blue-500/10"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-blue-400/20" : "bg-blue-500/20"
                  }`}
                >
                  <TrendingUp
                    className={`w-4 h-4 sm:w-6 sm:h-6 ${
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                </div>
                <Badge
                  className={`text-xs transition-all ${
                    isDarkMode
                      ? "bg-blue-500/20 border-blue-500/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-white group-hover:border-black/20"
                      : "bg-blue-500 text-white group-hover:bg-blue-600"
                  }`}
                >
                  Average
                </Badge>
              </div>
              <div
                className={`text-xl sm:text-3xl font-bold mb-1 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {averageScore}
              </div>
              <div
                className={`text-xs sm:text-sm transition-colors ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {t("dashboard.averageScore")}
              </div>
            </div>

            <div
              className={`group rounded-2xl p-3 sm:p-6 border hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                scoreImprovement >= 0
                  ? isDarkMode
                    ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-400/20 shadow-lg shadow-green-500/10"
                    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 shadow-md"
                  : isDarkMode
                  ? "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-400/20 shadow-lg shadow-red-500/10"
                  : "bg-gradient-to-br from-red-50 to-rose-50 border-red-100 shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
                    scoreImprovement >= 0
                      ? isDarkMode
                        ? "bg-green-400/20"
                        : "bg-green-500/20"
                      : isDarkMode
                      ? "bg-red-400/20"
                      : "bg-red-500/20"
                  }`}
                >
                  {scoreImprovement >= 0 ? (
                    <TrendingUp
                      className={`w-4 h-4 sm:w-6 sm:h-6 ${
                        isDarkMode ? "text-green-400" : "text-green-600"
                      }`}
                    />
                  ) : (
                    <TrendingDown
                      className={`w-4 h-4 sm:w-6 sm:h-6 ${
                        isDarkMode ? "text-red-400" : "text-red-600"
                      }`}
                    />
                  )}
                </div>
                <Badge
                  className={
                    scoreImprovement >= 0
                      ? isDarkMode
                        ? "text-xs bg-green-500/20 border-green-500/30 text-green-400 group-hover:bg-green-500 group-hover:text-white group-hover:border-black/20 transition-all"
                        : "text-xs bg-green-500 text-white group-hover:bg-green-600 transition-all"
                      : isDarkMode
                      ? "text-xs bg-red-500/20 border-red-500/30 text-red-400 group-hover:bg-red-500 group-hover:text-white group-hover:border-black/20 transition-all"
                      : "text-xs bg-red-500 text-white group-hover:bg-red-600 transition-all"
                  }
                >
                  {scoreImprovement >= 0
                    ? `+${scoreImprovement}`
                    : scoreImprovement}
                </Badge>
              </div>
              <div
                className={`text-base sm:text-3xl font-bold mb-1 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {scoreImprovement >= 0
                  ? t("dashboard.improvement")
                  : "Declining"}
              </div>
              <div
                className={`text-xs sm:text-sm transition-colors ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {t("dashboard.status")}
              </div>
            </div>

            <div
              className={`group rounded-2xl p-3 sm:p-6 border hover:shadow-lg transition-all cursor-pointer active:scale-95 ${
                isDarkMode
                  ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/20 shadow-lg shadow-purple-500/10"
                  : "bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <div
                  className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
                    isDarkMode ? "bg-purple-400/20" : "bg-purple-500/20"
                  }`}
                >
                  <Calendar
                    className={`w-4 h-4 sm:w-6 sm:h-6 ${
                      isDarkMode ? "text-purple-400" : "text-purple-600"
                    }`}
                  />
                </div>
                <Badge
                  className={`text-xs transition-all ${
                    isDarkMode
                      ? "bg-purple-500/20 border-purple-500/30 text-purple-400 group-hover:bg-purple-500 group-hover:text-white group-hover:border-black/20"
                      : "bg-purple-500 text-white group-hover:bg-purple-600"
                  }`}
                >
                  Total
                </Badge>
              </div>
              <div
                className={`text-xl sm:text-3xl font-bold mb-1 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {testHistory.length}
              </div>
              <div
                className={`text-xs sm:text-sm transition-colors ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Tests Completed
              </div>
            </div>
          </div>

          {/* Upgrade Banner — shown for Free and Basic plans */}
          {activePlanId !== "pro" && (() => {
            const isFree = activePlanId === "free";
            const bannerTitle = isFree ? "You're on the Free plan" : "You're on the Basic plan";
            const bannerDesc = isFree
              ? `Limited to ${plan.maxMessages} AI messages per conversation. Upgrade to Basic for 50 messages, or Pro for unlimited.`
              : `Limited to ${plan.maxMessages} AI messages per conversation. Upgrade to Pro for unlimited messages, advanced analytics, and more.`;
            const btnText = isFree ? "Upgrade to Basic" : "Upgrade to Pro";
            return (
              <div className={`mb-8 rounded-2xl border-2 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                isDarkMode
                  ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30"
                  : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
              }`}>
                <div className={`p-3 rounded-xl flex-shrink-0 ${isDarkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
                  <Crown className={`w-6 h-6 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
                    {bannerTitle}
                  </p>
                  <p className={`text-sm mt-0.5 ${isDarkMode ? "text-amber-200/70" : "text-amber-700/80"}`}>
                    {bannerDesc}
                  </p>
                </div>
                <Link to="/pricing" className="flex-shrink-0 w-full sm:w-auto">
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-500/30 transition-all">
                    <Zap className="w-4 h-4" />
                    {btnText}
                  </button>
                </Link>
              </div>
            );
          })()}

          {/* Test History */}
          <div>
            <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
              <h2
                className={`text-xl sm:text-2xl font-bold transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {t("dashboard.testHistory")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                disabled={reportLoading || testHistory.length === 0}
                onClick={downloadReport}
                className={`shrink-0 transition-colors ${
                  isDarkMode
                    ? "border-slate-600 text-slate-300 bg-slate-800/50 hover:bg-slate-700/50"
                    : "border-slate-300 text-slate-700 bg-transparent"
                }`}
              >
                {reportLoading
                  ? <Loader2 className="mr-1 sm:mr-2 w-4 h-4 animate-spin" />
                  : <Download className="mr-1 sm:mr-2 w-4 h-4" />}
                <span className="hidden sm:inline">
                  {reportLoading ? "Generating…" : t("dashboard.downloadReport")}
                </span>
                <span className="sm:hidden">{reportLoading ? "…" : "Export"}</span>
              </Button>
            </div>

            <div className="space-y-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                  <span className={`ml-3 text-lg ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Loading history…</span>
                </div>
              ) : fetchError ? (
                <div className={`text-center py-12 rounded-xl border ${isDarkMode ? "border-red-500/30 bg-red-500/10" : "border-red-200 bg-red-50"}`}>
                  <Eye className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? "text-red-400" : "text-red-400"}`} />
                  {fetchError === "not_authenticated" ? (
                    <>
                      <p className={`text-lg font-medium ${isDarkMode ? "text-red-400" : "text-red-600"}`}>Not signed in</p>
                      <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Please log out and sign back in to view your history.</p>
                    </>
                  ) : fetchError === "network_error" ? (
                    <>
                      <p className={`text-lg font-medium ${isDarkMode ? "text-red-400" : "text-red-600"}`}>Backend Offline</p>
                      <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Start the Python backend: <code className="text-xs bg-black/20 px-1 rounded">python -m uvicorn main:app --reload</code></p>
                    </>
                  ) : (
                    <>
                      <p className={`text-lg font-medium ${isDarkMode ? "text-red-400" : "text-red-600"}`}>Could not load history</p>
                      <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Error: {fetchError}. Check the browser console for details.</p>
                    </>
                  )}
                </div>
              ) : testHistory.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${isDarkMode ? "border-slate-700/50 bg-slate-800/20" : "border-slate-200 bg-slate-50"}`}>
                  <Eye className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
                  <p className={`text-lg font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>No tests yet</p>
                  <p className={`text-sm mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Logged in as <strong>{user?.email}</strong>. Complete your first vision test to see results here.</p>
                </div>
              ) : (() => {
                const FREE_LIMIT = 3;
                const visibleTests = activePlanId === "free"
                  ? testHistory.slice(0, FREE_LIMIT)
                  : testHistory;
                const lockedCount = activePlanId === "free"
                  ? Math.max(0, testHistory.length - FREE_LIMIT)
                  : 0;

                return (
                  <>
                    {visibleTests.map((test) => (
                      <div
                        key={test.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border hover:shadow-md transition-all ${
                          isDarkMode
                            ? "bg-slate-800/30 border-slate-700/50 hover:border-cyan-400/50 hover:bg-slate-800/50"
                            : "bg-white border-slate-200 hover:border-cyan-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                              isDarkMode ? "bg-cyan-400/20" : "bg-cyan-100"
                            }`}
                          >
                            <Eye
                              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                isDarkMode ? "text-cyan-400" : "text-cyan-600"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`font-semibold text-sm sm:text-base truncate transition-colors ${
                                isDarkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {test.type}
                            </div>
                            <div
                              className={`text-xs sm:text-sm transition-colors ${
                                isDarkMode ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {new Date(test.date).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                          <div className="text-left sm:text-right">
                            <div
                              className={`text-xl sm:text-2xl font-bold transition-colors ${
                                isDarkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {test.score}
                            </div>
                            <Badge
                              className={
                                test.status === "excellent"
                                  ? isDarkMode
                                    ? "bg-green-500/20 border-green-500/30 text-green-400 transition-all"
                                    : "bg-green-500 text-white transition-all"
                                  : test.status === "good"
                                  ? isDarkMode
                                    ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 transition-all"
                                    : "bg-cyan-500 text-white transition-all"
                                  : isDarkMode
                                  ? "bg-slate-500/20 border-slate-500/30 text-slate-400 transition-all"
                                  : "bg-slate-500 text-white transition-all"
                              }
                            >
                              {test.status}
                            </Badge>
                          </div>
                          <Link to={`/results/${test.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`transition-all ${
                                isDarkMode
                                  ? "border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-slate-700/50 hover:shadow-md bg-transparent"
                                  : "border-cyan-300 text-cyan-600 hover:bg-cyan-500 hover:text-white hover:border-cyan-500 bg-transparent"
                              }`}
                            >
                              {t("dashboard.viewDetails")}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}

                    {/* Locked history rows for free plan */}
                    {lockedCount > 0 && (
                      <Link
                        to="/pricing"
                        className={`relative flex items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border transition-all overflow-hidden group ${
                          isDarkMode
                            ? "bg-slate-800/20 border-amber-500/30 hover:border-amber-400/60"
                            : "bg-amber-50/60 border-amber-200 hover:border-amber-400"
                        }`}
                      >
                        {/* Blurred fake rows */}
                        <div className="flex-1 blur-sm pointer-events-none select-none space-y-2.5">
                          {Array.from({ length: Math.min(lockedCount, 2) }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex-shrink-0 ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
                              <div className="flex-1 space-y-1.5">
                                <div className={`h-3 w-32 rounded ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
                                <div className={`h-2.5 w-20 rounded ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                              </div>
                              <div className={`h-7 w-16 rounded-lg ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
                            </div>
                          ))}
                        </div>

                        {/* Lock overlay */}
                        <div className="absolute inset-0 flex items-center justify-center gap-3">
                          <div className={`p-2 rounded-full ${isDarkMode ? "bg-amber-500/80" : "bg-amber-500"}`}>
                            <Lock className="w-4 h-4 text-white" />
                          </div>
                          <span className={`text-sm font-bold ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
                            {lockedCount} older {lockedCount === 1 ? "result" : "results"} hidden — upgrade to see full history
                          </span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            isDarkMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-amber-100 text-amber-700 border border-amber-300"
                          }`}>
                            Upgrade
                          </span>
                        </div>
                      </Link>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
