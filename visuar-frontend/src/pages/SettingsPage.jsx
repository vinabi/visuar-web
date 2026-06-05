import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Monitor,
  Globe,
  HelpCircle,
  LogOut,
  Moon,
  Sun,
  ZoomIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ReadingAssistPicker } from "../components/ReadingAssistPicker";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();

  useEffect(() => {
    if (location.hash === "#easier-reading") {
      document.getElementById("easier-reading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Get user's display name
  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#0a0e27]"
          : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      <div className="w-full max-w-2xl relative z-10">
        <Link to="/dashboard">
          <Button
            variant="ghost"
            className={`mb-6 transition-colors ${
              isDarkMode
                ? "text-slate-300 hover:text-white hover:bg-slate-800/50"
                : "text-slate-700 hover:text-cyan-600 hover:bg-white/60"
            }`}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            {t("common.back")}
          </Button>
        </Link>

        <div
          className={`rounded-3xl shadow-xl p-8 md:p-12 transition-colors ${
            isDarkMode
              ? "bg-[#1a1f3a]/90 backdrop-blur-md border border-slate-700/50"
              : "bg-white/80 backdrop-blur-md border border-white/40"
          }`}
        >
          <div className="mb-10">
            <h1
              className={`text-4xl font-bold mb-2 transition-colors ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {t("settings.title")}
            </h1>
            <p
              className={`transition-colors ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              <span
                className={`font-semibold ${
                  isDarkMode ? "text-cyan-400" : "text-cyan-600"
                }`}
              >
                {getUserName()}
              </span>{" "}
              - {t("settings.general")}
            </p>
          </div>

          <div className="space-y-6">
            {/* Appearance */}
            <div
              className={`pb-6 border-b transition-colors ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <Monitor
                  className={`w-5 h-5 ${
                    isDarkMode ? "text-cyan-400" : "text-cyan-600"
                  }`}
                />
                {t("settings.theme")}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    className={`font-medium transition-colors ${
                      isDarkMode ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    {t("settings.dark")}
                  </Label>
                  <p
                    className={`text-sm transition-colors ${
                      isDarkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {t("settings.darkModeHint")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className={`w-12 h-12 rounded-xl transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-cyan-400 hover:bg-slate-700/50"
                      : "border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  onClick={toggleDarkMode}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Easier reading */}
            <div
              id="easier-reading"
              className={`pb-6 border-b transition-colors scroll-mt-24 ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <ZoomIn
                  className={`w-5 h-5 ${
                    isDarkMode ? "text-cyan-400" : "text-cyan-600"
                  }`}
                />
                {t("settings.readingAssist")}
              </h3>
              <ReadingAssistPicker isDarkMode={isDarkMode} />
            </div>

            {/* Notifications */}
            <div
              className={`pb-6 border-b transition-colors ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <Bell
                  className={`w-5 h-5 ${
                    isDarkMode ? "text-cyan-400" : "text-cyan-600"
                  }`}
                />
                {t("settings.notifications")}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label
                    className={`font-medium transition-colors ${
                      isDarkMode ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    {t("settings.testReminders")}
                  </Label>
                  <input
                    type="checkbox"
                    className={`w-5 h-5 rounded transition-colors ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-800/50 text-cyan-400"
                        : "border-slate-300 text-cyan-500"
                    }`}
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className={`font-medium transition-colors ${
                      isDarkMode ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    {t("settings.emailNotifications")}
                  </Label>
                  <input
                    type="checkbox"
                    className={`w-5 h-5 rounded transition-colors ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-800/50 text-cyan-400"
                        : "border-slate-300 text-cyan-500"
                    }`}
                    defaultChecked
                  />
                </div>
              </div>
            </div>

            {/* Language */}
            <div
              className={`pb-6 border-b transition-colors ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <Globe
                  className={`w-5 h-5 ${
                    isDarkMode ? "text-cyan-400" : "text-cyan-600"
                  }`}
                />
                {t("settings.language")}
              </h3>
              <LanguageSelector className="w-full" isDarkMode={isDarkMode} />
            </div>

            {/* Help & Support */}
            <div
              className={`pb-6 border-b transition-colors ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                <HelpCircle
                  className={`w-5 h-5 ${
                    isDarkMode ? "text-cyan-400" : "text-cyan-600"
                  }`}
                />
                {t("settings.helpSupport")}
              </h3>
              <div className="space-y-2">
                <Link to="/faq">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start transition-colors ${
                      isDarkMode
                        ? "text-slate-200 hover:bg-slate-800/50 hover:text-cyan-400"
                        : "text-slate-700 hover:bg-cyan-100 hover:text-cyan-700"
                    }`}
                  >
                    {t("common.faq")}
                  </Button>
                </Link>
                <Link to="/contact-support">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start transition-colors ${
                      isDarkMode
                        ? "text-slate-200 hover:bg-slate-800/50 hover:text-cyan-400"
                        : "text-slate-700 hover:bg-cyan-100 hover:text-cyan-700"
                    }`}
                  >
                    {t("common.contactSupport")}
                  </Button>
                </Link>
                <Link to="/privacy-policy">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start transition-colors ${
                      isDarkMode
                        ? "text-slate-200 hover:bg-slate-800/50 hover:text-cyan-400"
                        : "text-slate-700 hover:bg-cyan-100 hover:text-cyan-700"
                    }`}
                  >
                    {t("common.privacyPolicy")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Logout */}
            <div>
              <Button
                onClick={handleLogout}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                {t("common.logout")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
