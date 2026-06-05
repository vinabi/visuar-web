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
  ZoomIn,
  Loader2,
  Crown,
  Zap,
  Lock,
  ChevronRight,
  Sparkles,
  BarChart3,
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
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

const PLAN_META = {
  free: { label: "Free", icon: Lock, accent: "amber" },
  basic: { label: "Basic", icon: Zap, accent: "cyan" },
  pro: { label: "Pro", icon: Crown, accent: "purple" },
};

function scoreTone(score) {
  if (score >= 80) return "emerald";
  if (score >= 50) return "cyan";
  return "slate";
}

function StatCard({ isDarkMode, icon: Icon, badge, value, label, tone = "cyan", children }) {
  const tones = {
    cyan: isDarkMode
      ? "from-cyan-500/10 to-blue-500/10 border-cyan-400/20 shadow-cyan-500/10"
      : "from-cyan-50 to-blue-50 border-cyan-100",
    blue: isDarkMode
      ? "from-blue-500/10 to-indigo-500/10 border-blue-400/20 shadow-blue-500/10"
      : "from-blue-50 to-indigo-50 border-blue-100",
    emerald: isDarkMode
      ? "from-green-500/10 to-emerald-500/10 border-green-400/20 shadow-green-500/10"
      : "from-green-50 to-emerald-50 border-green-100",
    rose: isDarkMode
      ? "from-red-500/10 to-rose-500/10 border-red-400/20 shadow-red-500/10"
      : "from-red-50 to-rose-50 border-red-100",
    purple: isDarkMode
      ? "from-purple-500/10 to-pink-500/10 border-purple-400/20 shadow-purple-500/10"
      : "from-purple-50 to-pink-50 border-purple-100",
  };
  const iconBg = {
    cyan: isDarkMode ? "bg-cyan-400/20 text-cyan-400" : "bg-cyan-500/15 text-cyan-600",
    blue: isDarkMode ? "bg-blue-400/20 text-blue-400" : "bg-blue-500/15 text-blue-600",
    emerald: isDarkMode ? "bg-green-400/20 text-green-400" : "bg-green-500/15 text-green-600",
    rose: isDarkMode ? "bg-red-400/20 text-red-400" : "bg-red-500/15 text-red-600",
    purple: isDarkMode ? "bg-purple-400/20 text-purple-400" : "bg-purple-500/15 text-purple-600",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] bg-gradient-to-br shadow-md ${tones[tone]}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${iconBg[tone]}`}>
          <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
        </div>
        {badge}
      </div>
      <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
        {value}
      </div>
      <div className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        {label}
      </div>
      {children}
    </div>
  );
}

function HistorySkeleton({ isDarkMode }) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`rounded-2xl border p-4 sm:p-5 animate-pulse ${
            isDarkMode ? "bg-slate-800/30 border-slate-700/50" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-2/3 rounded ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />
              <div className={`h-3 w-1/3 rounded ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("ur") ? "ur-PK" : "en-US";

  const statusLabel = (status) => {
    const key = {
      excellent: "dashboard.excellent",
      good: "dashboard.good",
      fair: "dashboard.fair",
      poor: "dashboard.statusPoor",
    }[status];
    return key ? t(key) : status;
  };
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { signOut, user, session } = useAuth();
  const { activePlanId, plan } = usePlan();

  const [testHistory, setTestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const testTypeLabel = (testType) =>
    t(`testCatalog.tests.${testType}.title`, { defaultValue: testType });

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
    const token = session?.access_token;
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const fetchHistory = async () => {
      setFetchError(null);
      setHistoryLoading(true);

      try {
        const res = await fetchWithTimeout(
          `${API_URL}/api/test-results`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
          15000
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error(`[Dashboard] API error ${res.status}:`, body);
          if (!cancelled) setFetchError(`api_error_${res.status}`);
          return;
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          console.error("[Dashboard] Unexpected API response:", data);
          if (!cancelled) setFetchError("api_error_invalid");
          return;
        }

        console.log(`[Dashboard] Fetched ${data.length} test records for user ${user?.email}`);

        if (!cancelled) {
          setTestHistory(
            data.map((r) => ({
              id: r.id,
              testType: r.test_type,
              date: r.created_at,
              type: testTypeLabel(r.test_type),
              score: r.overall_score,
              left_acuity: r.left_eye_acuity,
              right_acuity: r.right_eye_acuity,
              status: r.overall_score >= 80 ? "excellent" : r.overall_score >= 50 ? "good" : "poor",
            }))
          );
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.name === "AbortError") {
          if (!cancelled) setFetchError("network_error");
          return;
        }
        console.error("[Dashboard] Network error fetching history:", err);
        if (!cancelled) setFetchError("network_error");
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

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
        const typeLabel = testTypeLabel(r.test_type);
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
      alert(t("dashboard.reportConnectionError"));
    }
    setReportLoading(false);
  };

  const planMeta = PLAN_META[activePlanId] || PLAN_META.free;
  const PlanIcon = planMeta.icon;
  const planBtnLabel =
    activePlanId === "pro"
      ? t("dashboard.changePlan", { defaultValue: "Change Plan" })
      : activePlanId === "free"
        ? t("dashboard.upgradeToBasic")
        : t("dashboard.upgradeToPro");

  const ghostBtn = isDarkMode
    ? "text-slate-300 hover:text-white hover:bg-slate-800/50"
    : "text-slate-700 hover:text-cyan-600 hover:bg-white/60";

  const quickActions = [
    {
      to: "/test-selection",
      label: t("dashboard.newTest"),
      icon: Plus,
      primary: true,
      onClick: () => startNewScreeningSession(),
    },
    { to: "/profile", label: t("dashboard.profile"), icon: Eye },
    { to: "/ai-consult", label: t("dashboard.aiConsult"), icon: Sparkles, accent: "fuchsia" },
    { to: "/pricing", label: planBtnLabel, icon: Crown, accent: "amber" },
  ];

  return (
    <div
      className={`min-h-screen pb-24 sm:pb-8 px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 relative overflow-x-hidden transition-colors duration-300 ${
        isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-4 sm:space-y-6 overflow-visible">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className={`rounded-full ${ghostBtn}`}>
              <ArrowLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("common.back")}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSelector isDarkMode={isDarkMode} />
            <Link to="/settings#easier-reading" title={t("settings.readingAssist")}>
              <Button variant="ghost" size="icon-sm" className={`rounded-full ${ghostBtn}`}>
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon-sm" className={`rounded-full ${ghostBtn}`}>
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon-sm" className={`rounded-full ${ghostBtn} hover:!text-red-400`} onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section
          className={`relative overflow-hidden rounded-3xl border p-5 sm:p-8 md:p-10 backdrop-blur-md shadow-xl ${
            isDarkMode
              ? "bg-[#1a1f3a]/85 border-slate-700/50"
              : "bg-white/85 border-white/60"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-purple-500/8" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                    activePlanId === "pro"
                      ? isDarkMode
                        ? "bg-purple-500/15 border-purple-400/30 text-purple-300"
                        : "bg-purple-50 border-purple-200 text-purple-700"
                      : activePlanId === "basic"
                        ? isDarkMode
                          ? "bg-cyan-500/15 border-cyan-400/30 text-cyan-300"
                          : "bg-cyan-50 border-cyan-200 text-cyan-700"
                        : isDarkMode
                          ? "bg-amber-500/15 border-amber-400/30 text-amber-300"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  <PlanIcon className="w-3.5 h-3.5" />
                  {planMeta.label} Plan
                </span>
                {testHistory.length > 0 && (
                  <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {testHistory.length} test{testHistory.length !== 1 ? "s" : ""} recorded
                  </span>
                )}
              </div>
              <h1 className={`text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {t("dashboard.title")}
              </h1>
              <p className={`mt-2 text-sm sm:text-lg ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {t("dashboard.welcome")},{" "}
                <span className={`font-semibold ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                  {getUserName()}
                </span>
              </p>
            </div>
            {/* Desktop quick actions */}
            <div className="hidden md:grid grid-cols-2 xl:grid-cols-4 gap-2 w-full lg:w-auto lg:min-w-[32rem]">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} onClick={action.onClick}>
                  <Button
                    size="lg"
                    className={`w-full h-12 rounded-2xl text-sm font-semibold transition-all ${
                      action.primary
                        ? isDarkMode
                          ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                          : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                        : action.accent === "amber"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-500/25"
                          : action.accent === "fuchsia"
                            ? isDarkMode
                              ? "border border-fuchsia-400/30 text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20"
                              : "border border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100"
                            : isDarkMode
                              ? "border border-cyan-400/30 text-cyan-300 bg-slate-800/40 hover:bg-slate-800/70"
                              : "border border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50"
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile quick actions — horizontal scroll */}
          <div className="md:hidden mt-5 -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} onClick={action.onClick} className="snap-start shrink-0">
                  <Button
                    size="lg"
                    className={`h-11 px-4 rounded-2xl text-sm font-semibold whitespace-nowrap ${
                      action.primary
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                        : action.accent === "amber"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                          : isDarkMode
                            ? "border border-slate-600 text-slate-200 bg-slate-800/60"
                            : "border border-slate-200 text-slate-700 bg-white"
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            isDarkMode={isDarkMode}
            icon={Eye}
            tone={scoreTone(latestScore)}
            badge={
              <Badge className={isDarkMode ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-500 text-white"}>
                {t("dashboard.latest")}
              </Badge>
            }
            value={latestScore}
            label={t("dashboard.latestScore")}
          />
          <StatCard
            isDarkMode={isDarkMode}
            icon={BarChart3}
            tone="blue"
            badge={
              <Badge className={isDarkMode ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-blue-500 text-white"}>
                {t("dashboard.average")}
              </Badge>
            }
            value={averageScore}
            label={t("dashboard.averageScore")}
          />
          <StatCard
            isDarkMode={isDarkMode}
            icon={scoreImprovement >= 0 ? TrendingUp : TrendingDown}
            tone={scoreImprovement >= 0 ? "emerald" : "rose"}
            badge={
              <Badge
                className={
                  scoreImprovement >= 0
                    ? isDarkMode ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-green-500 text-white"
                    : isDarkMode ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-500 text-white"
                }
              >
                {testHistory.length >= 2 ? `${scoreImprovement >= 0 ? "+" : ""}${scoreImprovement}` : "—"}
              </Badge>
            }
            value={testHistory.length >= 2 ? (scoreImprovement >= 0 ? t("dashboard.improvement") : t("dashboard.declining")) : "—"}
            label={t("dashboard.status")}
          />
          <StatCard
            isDarkMode={isDarkMode}
            icon={Calendar}
            tone="purple"
            badge={
              <Badge className={isDarkMode ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-purple-500 text-white"}>
                {t("dashboard.total")}
              </Badge>
            }
            value={testHistory.length}
            label={t("dashboard.testsCompleted")}
          />
        </section>

        {/* Plan banner */}
        {activePlanId !== "pro" ? (
          <section
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
              isDarkMode
                ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30"
                : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
            }`}
          >
            <div className={`p-3 rounded-xl shrink-0 ${isDarkMode ? "bg-amber-500/20" : "bg-amber-100"}`}>
              <Crown className={`w-6 h-6 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm sm:text-base ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
                {activePlanId === "free" ? t("dashboard.freePlanTitle") : t("dashboard.basicPlanTitle")}
              </p>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? "text-amber-200/70" : "text-amber-700/80"}`}>
                {activePlanId === "free"
                  ? t("dashboard.freePlanDesc", { count: plan.maxMessages })
                  : t("dashboard.basicPlanDesc", { count: plan.maxMessages })}
              </p>
            </div>
            <Link to="/pricing" className="w-full sm:w-auto shrink-0">
              <Button className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold shadow-md">
                <Zap className="w-4 h-4" />
                {activePlanId === "free" ? t("dashboard.upgradeBasic") : t("dashboard.upgradePro")}
              </Button>
            </Link>
          </section>
        ) : (
          <section
            className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isDarkMode
                ? "bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/25"
                : "bg-gradient-to-r from-purple-50 to-cyan-50 border-purple-100"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${isDarkMode ? "bg-purple-500/20" : "bg-purple-100"}`}>
                <Sparkles className={`w-5 h-5 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
              </div>
              <div>
                <p className={`font-bold text-sm sm:text-base ${isDarkMode ? "text-purple-200" : "text-purple-800"}`}>
                  Pro plan active
                </p>
                <p className={`text-xs sm:text-sm ${isDarkMode ? "text-purple-300/70" : "text-purple-600/80"}`}>
                  Unlimited AI, full history, and personalized analysis unlocked.
                </p>
              </div>
            </div>
            <Link to="/pricing" className="w-full sm:w-auto">
              <Button variant="outline" className={`w-full sm:w-auto rounded-xl font-semibold ${isDarkMode ? "border-purple-400/40 text-purple-300 hover:bg-purple-500/10" : "border-purple-200 text-purple-700 hover:bg-purple-50"}`}>
                {t("dashboard.changePlan", { defaultValue: "Change Plan" })}
              </Button>
            </Link>
          </section>
        )}

        {/* Test History */}
        <section
          className={`rounded-3xl border p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-xl ${
            isDarkMode ? "bg-[#1a1f3a]/80 border-slate-700/50" : "bg-white/80 border-white/50"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {t("dashboard.testHistory")}
              </h2>
              <p className={`text-xs sm:text-sm mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Tap any result to view full analysis
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={reportLoading || testHistory.length === 0}
              onClick={downloadReport}
              className={`shrink-0 rounded-xl h-10 px-4 ${
                isDarkMode
                  ? "border-slate-600 text-slate-300 bg-slate-800/50 hover:bg-slate-700/50"
                  : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
              }`}
            >
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{reportLoading ? t("dashboard.generatingReport") : t("dashboard.downloadReport")}</span>
              <span className="sm:hidden">{reportLoading ? "…" : t("dashboard.export")}</span>
            </Button>
          </div>

          {historyLoading ? (
            <HistorySkeleton isDarkMode={isDarkMode} />
          ) : fetchError ? (
            <div className={`text-center py-10 sm:py-14 rounded-2xl border px-4 ${isDarkMode ? "border-red-500/30 bg-red-500/10" : "border-red-200 bg-red-50"}`}>
              <Eye className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
              <>
                <p className={`text-base sm:text-lg font-semibold ${isDarkMode ? "text-red-400" : "text-red-600"}`}>{t("dashboard.backendOffline")}</p>
                <p className={`text-sm mt-1 max-w-md mx-auto ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t("dashboard.backendOfflineDesc")}
                </p>
              </>
            </div>

          ) : testHistory.length === 0 ? (
            <div className={`text-center py-12 sm:py-16 rounded-2xl border px-4 ${isDarkMode ? "border-slate-700/50 bg-slate-800/20" : "border-slate-200 bg-slate-50"}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-cyan-500/15" : "bg-cyan-100"}`}>
                <Eye className={`w-8 h-8 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />

              </div>
              <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-800"}`}>{t("dashboard.noTestsYet")}</p>
              <p className={`text-sm mt-1 max-w-sm mx-auto ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {t("dashboard.noTestsDesc", { email: user?.email })}
              </p>
              <Link to="/test-selection" onClick={() => startNewScreeningSession()} className="inline-block mt-6">
                <Button className="rounded-full px-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold shadow-lg">
                  <Plus className="w-4 h-4" />
                  {t("dashboard.newTest")}
                </Button>
              </Link>
            </div>
          ) : (() => {
            const FREE_LIMIT = 3;
            const visibleTests = activePlanId === "free" ? testHistory.slice(0, FREE_LIMIT) : testHistory;
            const lockedCount = activePlanId === "free" ? Math.max(0, testHistory.length - FREE_LIMIT) : 0;


            return (
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                {visibleTests.map((test) => (
                  <Link
                    key={test.id}
                    to={`/results/${test.id}`}
                    className={`group block rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] ${
                      isDarkMode
                        ? "bg-slate-800/40 border-slate-700/50 hover:border-cyan-400/40"
                        : "bg-white border-slate-200 hover:border-cyan-300 hover:shadow-cyan-100/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? "bg-cyan-400/15" : "bg-cyan-50"}`}>
                          <Eye className={`w-5 h-5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-sm sm:text-base leading-snug line-clamp-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            {test.type}
                          </p>
                          <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {new Date(test.date).toLocaleDateString(dateLocale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          {(test.left_acuity || test.right_acuity) && (
                            <p className={`text-xs mt-2 truncate ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {test.left_acuity && `L ${test.left_acuity}`}
                              {test.left_acuity && test.right_acuity && " · "}
                              {test.right_acuity && `R ${test.right_acuity}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div
                          className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                            test.status === "excellent"
                              ? isDarkMode ? "text-green-400" : "text-green-600"
                              : test.status === "good"
                                ? isDarkMode ? "text-cyan-400" : "text-cyan-600"
                                : isDarkMode ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          {test.score}
                        </div>
                        <Badge
                          className={
                            test.status === "excellent"
                              ? isDarkMode ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-green-500 text-white"
                              : test.status === "good"
                                ? isDarkMode ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-500 text-white"
                                : isDarkMode ? "bg-slate-500/20 text-slate-400 border-slate-500/30" : "bg-slate-500 text-white"
                          }
                        >
                          {statusLabel(test.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${isDarkMode ? "border-slate-700/60 text-cyan-400" : "border-slate-100 text-cyan-600"}`}>
                      <span>{t("dashboard.viewDetails")}</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}

                {lockedCount > 0 && (
                  <Link
                    to="/pricing"
                    className={`relative md:col-span-2 rounded-2xl border overflow-hidden min-h-[7rem] transition-all hover:shadow-md ${
                      isDarkMode
                        ? "bg-slate-800/20 border-amber-500/30 hover:border-amber-400/50"
                        : "bg-amber-50/80 border-amber-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="absolute inset-0 p-4 blur-[3px] pointer-events-none select-none opacity-60">
                      <div className="grid md:grid-cols-2 gap-3">
                        {[1, 2].map((i) => (
                          <div key={i} className={`h-20 rounded-xl ${isDarkMode ? "bg-slate-700/50" : "bg-slate-200/80"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3 p-6 text-center sm:text-left">
                      <div className={`p-2.5 rounded-full ${isDarkMode ? "bg-amber-500/80" : "bg-amber-500"}`}>
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm sm:text-base font-bold ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
                          {t("dashboard.hiddenResults", { count: lockedCount })}
                        </p>
                        <p className={`text-xs sm:text-sm ${isDarkMode ? "text-amber-200/70" : "text-amber-700/80"}`}>
                          {t("dashboard.upgradeHistoryHint", { defaultValue: "Upgrade to unlock your full test history" })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${isDarkMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                        {t("dashboard.upgrade")}
                      </span>
                    </div>
                  </Link>
                )}

              </div>
            );
          })()}
        </section>
      </div>


      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          className={`mx-auto max-w-lg rounded-2xl border p-2 shadow-2xl backdrop-blur-xl ${
            isDarkMode ? "bg-[#1a1f3a]/95 border-slate-700/60" : "bg-white/95 border-slate-200"
          }`}
        >
          <Link to="/test-selection" onClick={() => startNewScreeningSession()} className="block">
            <Button className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg">
              <Plus className="w-5 h-5" />
              {t("dashboard.newTest")}
            </Button>
          </Link>

        </div>
      </div>
    </div>
  );
}
