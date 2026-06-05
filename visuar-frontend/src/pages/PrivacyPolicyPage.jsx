import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#0a0e27]"
          : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className={`absolute top-6 left-6 z-20 flex items-center gap-2 p-2 rounded-lg transition-colors ${
          isDarkMode
            ? "hover:bg-cyan-400/10 text-cyan-400"
            : "hover:bg-cyan-500/10 text-cyan-600"
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">{t("common.back") || "Back"}</span>
      </button>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 pt-24 relative z-10">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className={`text-4xl font-bold mb-4 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {t("privacy.title") || "Privacy Policy"}
          </h1>
          <p
            className={`text-sm transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {t("privacy.lastUpdated") || "Last Updated: May 2026"}
          </p>
        </div>

        {/* Content */}
        <div
          className={`space-y-8 ${
            isDarkMode
              ? "bg-gradient-to-br from-gray-900/50 to-gray-800/30"
              : "bg-white/70"
          } p-8 rounded-2xl backdrop-blur-sm border ${
            isDarkMode ? "border-gray-700/50" : "border-white/50"
          } shadow-lg`}
        >
          {/* Section 1: Introduction */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">1.</span>
              {t("privacy.section1") || "Introduction"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section1Content") ||
                "At VISUAR, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and website."}
            </p>
          </section>

          {/* Section 2: Information We Collect */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">2.</span>
              {t("privacy.section2") || "Information We Collect"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section2Content") ||
                "We collect information you provide directly to us, such as email, name, health information, and profile data. We also automatically collect technical information like IP address, browser type, and device information."}
            </p>
          </section>

          {/* Section 3: How We Use Your Information */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">3.</span>
              {t("privacy.section3") || "How We Use Your Information"}
            </h2>
            <ul
              className={`list-disc list-inside space-y-2 leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <li>
                {t("privacy.section3Item1") ||
                  "To provide and improve our services"}
              </li>
              <li>
                {t("privacy.section3Item2") ||
                  "To personalize your experience"}
              </li>
              <li>
                {t("privacy.section3Item3") ||
                  "To send you updates and announcements"}
              </li>
              <li>
                {t("privacy.section3Item4") ||
                  "To conduct research and analytics"}
              </li>
              <li>
                {t("privacy.section3Item5") ||
                  "To comply with legal obligations"}
              </li>
            </ul>
          </section>

          {/* Section 4: Data Security */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">4.</span>
              {t("privacy.section4") || "Data Security"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section4Content") ||
                "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction."}
            </p>
          </section>

          {/* Section 5: Data Sharing */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">5.</span>
              {t("privacy.section5") || "Data Sharing"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section5Content1") ||
                "We do not sell or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and conducting our business."}
            </p>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section5Content2") ||
                "We may also disclose information when required by law or to protect our rights and the rights of our users."}
            </p>
          </section>

          {/* Section 6: Cookies */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">6.</span>
              {t("privacy.section6") || "Cookies and Tracking"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section6Content") ||
                "We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings."}
            </p>
          </section>

          {/* Section 7: User Rights */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">7.</span>
              {t("privacy.section7") || "Your Rights"}
            </h2>
            <ul
              className={`list-disc list-inside space-y-2 leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <li>
                {t("privacy.section7Item1") ||
                  "Right to access your personal data"}
              </li>
              <li>
                {t("privacy.section7Item2") ||
                  "Right to correct inaccurate data"}
              </li>
              <li>
                {t("privacy.section7Item3") ||
                  "Right to request deletion of data"}
              </li>
              <li>
                {t("privacy.section7Item4") ||
                  "Right to withdraw consent"}
              </li>
            </ul>
          </section>

          {/* Section 8: Health Data */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">8.</span>
              {t("privacy.section8") || "Health Data Privacy"}
            </h2>
            <div
              className={`p-4 rounded-lg border-l-4 ${
                isDarkMode
                  ? "bg-amber-500/10 border-amber-500/50"
                  : "bg-amber-50 border-amber-400"
              }`}
            >
              <p
                className={`leading-relaxed transition-colors ${
                  isDarkMode ? "text-amber-200" : "text-amber-900"
                }`}
              >
                {t("privacy.section8Content") ||
                  "Your health and vision data are treated as sensitive information with enhanced privacy protections. We comply with all applicable health data regulations."}
              </p>
            </div>
          </section>

          {/* Section 9: Children's Privacy */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">9.</span>
              {t("privacy.section9") || "Children's Privacy"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section9Content") ||
                "VISUAR is not intended for children under 18. We do not knowingly collect information from children. If we discover we have collected information from a child, we will promptly delete it."}
            </p>
          </section>

          {/* Section 10: Policy Changes */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">10.</span>
              {t("privacy.section10") || "Changes to This Policy"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section10Content") ||
                "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated effective date."}
            </p>
          </section>

          {/* Section 11: Contact Us */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">11.</span>
              {t("privacy.section11") || "Contact Us"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("privacy.section11Content") ||
                "If you have questions about this Privacy Policy, please contact us at:"}
            </p>
            <div
              className={`mt-4 p-4 rounded-lg ${
                isDarkMode
                  ? "bg-gray-800/50 border border-gray-700"
                  : "bg-gray-50 border border-gray-200"
              }`}
            >
              <p
                className={`font-semibold transition-colors ${
                  isDarkMode ? "text-cyan-400" : "text-cyan-600"
                }`}
              >
                VISUAR Privacy Team
              </p>
              <p
                className={`text-sm transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Email: privacy@visuar.edu
              </p>
              <p
                className={`text-sm transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                University Vision Lab
              </p>
            </div>
          </section>
        </div>

        {/* Back Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => navigate(-1)}
            className="px-8 py-3 rounded-lg font-semibold transition-all"
          >
            {t("common.goBack") || "Go Back"}
          </Button>
        </div>
      </div>
    </div>
  );
}
