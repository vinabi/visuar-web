import { Link, useNavigate } from "react-router-dom";
import { Eye, Mail, MessageSquare, Shield, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === "ur";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
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

      {/* Language Selector - positioned at top right */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div
        className={`flex flex-col min-h-screen items-center justify-between py-6 relative z-10 ${
          isRTL ? "rtl" : ""
        }`}
      >
        {/* Main Content */}
        <div className="text-center space-y-8 max-w-3xl">
          <div className="flex justify-center mb-8">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center animate-eye-blink transition-colors ${
                isDarkMode ? "bg-cyan-400/20" : "bg-cyan-500/10"
              }`}
            >
              <Eye
                className={`w-10 h-10 stroke-[2.5] transition-colors ${
                  isDarkMode ? "text-cyan-400" : "text-cyan-500"
                }`}
              />
            </div>
          </div>

          {/* Main Heading */}
          <h1
            className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight ${
              isRTL ? "leading-relaxed" : ""
            }`}
          >
            <span
              className={`transition-colors ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {t("home.title")}{" "}
            </span>
            <span
              className={`transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-500"
              }`}
            >
              {t("home.titleHighlight")}
            </span>
          </h1>

          {/* Subtitle */}
          {isRTL ? (
            <div className="flex flex-row-reverse items-center justify-center gap-2 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              <p
                className={`font-semibold pb-6 transition-colors ${
                  isDarkMode ? "text-cyan-400" : "text-cyan-600"
                }`}
              >
                Visuar
              </p>
              <p
                className={`text-right transition-colors ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {t("home.subtitle")}
              </p>
            </div>
          ) : (
            <p
              className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed transition-colors ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {t("home.subtitle")}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/dashboard">
              <Button
                size="lg"
                className={`text-lg h-14 px-10 text-white rounded-full shadow-lg hover:shadow-xl transition-all ${
                  isDarkMode
                    ? "bg-cyan-500 hover:bg-cyan-400"
                    : "bg-cyan-500 hover:bg-cyan-600"
                }`}
              >
                Go to Dashboard
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLogout}
              className={`text-lg h-14 px-10 backdrop-blur-sm border-2 rounded-full transition-all ${
                isDarkMode
                  ? "bg-slate-800/50 border-cyan-400/30 text-cyan-400 hover:bg-slate-700/50 hover:border-cyan-400/50"
                  : "bg-white/80 border-cyan-500/20 text-cyan-600 hover:bg-white hover:border-cyan-500/40 hover:text-cyan-700"
              }`}
            >
              {t("common.logout")}
            </Button>
          </div>
        </div>

        {/* Footer Section */}
        <div
          className={`w-full px-6 pt-8 border-t transition-colors ${
            isDarkMode ? "border-slate-700/50" : "border-slate-200/50"
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Terms & Conditions */}
              <Link
                to="/terms-and-conditions"
                className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-slate-800/50 text-slate-300 hover:text-cyan-400"
                    : "hover:bg-white/50 text-slate-700 hover:text-cyan-600"
                }`}
              >
                <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {t("common.termsConditions") || "Terms & Conditions"}
                  </p>
                  <p className={`text-xs transition-colors ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Our terms of service
                  </p>
                </div>
              </Link>

              {/* Privacy Policy */}
              <Link
                to="/privacy-policy"
                className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-slate-800/50 text-slate-300 hover:text-cyan-400"
                    : "hover:bg-white/50 text-slate-700 hover:text-cyan-600"
                }`}
              >
                <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {t("common.privacyPolicy") || "Privacy Policy"}
                  </p>
                  <p className={`text-xs transition-colors ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    How we protect your data
                  </p>
                </div>
              </Link>

              {/* FAQ */}
              <Link
                to="/faq"
                className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-slate-800/50 text-slate-300 hover:text-cyan-400"
                    : "hover:bg-white/50 text-slate-700 hover:text-cyan-600"
                }`}
              >
                <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {t("common.faq") || "FAQ"}
                  </p>
                  <p className={`text-xs transition-colors ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Frequently asked questions
                  </p>
                </div>
              </Link>

              {/* Contact Support */}
              <Link
                to="/contact-support"
                className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                  isDarkMode
                    ? "hover:bg-slate-800/50 text-slate-300 hover:text-cyan-400"
                    : "hover:bg-white/50 text-slate-700 hover:text-cyan-600"
                }`}
              >
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {t("common.contactSupport") || "Contact Support"}
                  </p>
                  <p className={`text-xs transition-colors ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Get in touch with us
                  </p>
                </div>
              </Link>
            </div>

            {/* Footer Bottom */}
            <div
              className={`py-4 border-t transition-colors ${
                isDarkMode ? "border-slate-700/50" : "border-slate-200/50"
              } text-center text-xs`}
            >
              <p className={`transition-colors ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}>
                © 2026 VISUAR. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
