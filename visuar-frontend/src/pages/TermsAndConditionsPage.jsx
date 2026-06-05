import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";

export default function TermsAndConditionsPage() {
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
            {t("tac.title") || "Terms and Conditions"}
          </h1>
          <p
            className={`text-sm transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {t("tac.lastUpdated") || "Last Updated: May 2026"}
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
              {t("tac.section1") || "Introduction"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section1Content") ||
                "Welcome to VISUAR (Vision University Accessibility Research Application). These Terms and Conditions govern your use of our website, mobile application, and services. By accessing or using VISUAR, you agree to be bound by these terms. If you do not agree with any part of these terms, you may not use our service."}
            </p>
          </section>

          {/* Section 2: Service Description */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">2.</span>
              {t("tac.section2") || "Service Description"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section2Content") ||
                "VISUAR is a comprehensive vision testing and screening application designed to provide accessible, AI-powered vision assessment. Our platform combines vision tracking, eye movement analysis, and clinical data analysis to support vision health research and assessment."}
            </p>
          </section>

          {/* Section 3: User Responsibilities */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">3.</span>
              {t("tac.section3") || "User Responsibilities"}
            </h2>
            <ul
              className={`list-disc list-inside space-y-2 leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <li>
                {t("tac.section3Item1") ||
                  "You are responsible for maintaining the confidentiality of your account credentials."}
              </li>
              <li>
                {t("tac.section3Item2") ||
                  "You agree not to use the service for any unlawful or harmful purposes."}
              </li>
              <li>
                {t("tac.section3Item3") ||
                  "You must provide accurate information when registering and using our services."}
              </li>
              <li>
                {t("tac.section3Item4") ||
                  "You agree not to attempt to gain unauthorized access to our systems or data."}
              </li>
            </ul>
          </section>

          {/* Section 4: Intellectual Property */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">4.</span>
              {t("tac.section4") || "Intellectual Property Rights"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section4Content") ||
                "All content, code, design, and features of VISUAR are the intellectual property of the development team. You may not reproduce, distribute, or transmit any content without explicit written permission."}
            </p>
          </section>

          {/* Section 5: Data Privacy and Security */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">5.</span>
              {t("tac.section5") || "Data Privacy and Security"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section5Content1") ||
                "Your privacy is important to us. We collect and process your personal data in accordance with applicable privacy laws."}
            </p>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section5Content2") ||
                "Health and vision data collected during tests are stored securely and used only for improving our services and research purposes."}
            </p>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section5Content3") ||
                "We implement industry-standard security measures to protect your information from unauthorized access."}
            </p>
          </section>

          {/* Section 6: Medical Disclaimer */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">6.</span>
              {t("tac.section6") || "Medical Disclaimer"}
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
                {t("tac.section6Content1") ||
                  "VISUAR is not a substitute for professional medical diagnosis or treatment. The results provided by our AI analysis are for informational purposes only."}
              </p>
              <p
                className={`leading-relaxed transition-colors mt-2 ${
                  isDarkMode ? "text-amber-200" : "text-amber-900"
                }`}
              >
                {t("tac.section6Content2") ||
                  "Always consult with a qualified eye care professional for proper diagnosis and treatment of eye conditions."}
              </p>
            </div>
          </section>

          {/* Section 7: Limitation of Liability */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">7.</span>
              {t("tac.section7") || "Limitation of Liability"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section7Content") ||
                "To the fullest extent permitted by law, VISUAR and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service."}
            </p>
          </section>

          {/* Section 8: Service Availability */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">8.</span>
              {t("tac.section8") || "Service Availability"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section8Content") ||
                "While we strive to maintain continuous service availability, VISUAR may experience downtime for maintenance, updates, or unforeseen technical issues. We are not liable for any damage or loss caused by service interruptions."}
            </p>
          </section>

          {/* Section 9: Third-Party Services */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">9.</span>
              {t("tac.section9") || "Third-Party Services"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section9Content") ||
                "VISUAR integrates with third-party services such as Supabase for authentication and Google Gemini for AI analysis. We are not responsible for the policies or practices of these third parties. Please review their terms and privacy policies."}
            </p>
          </section>

          {/* Section 10: Modifications */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">10.</span>
              {t("tac.section10") || "Modifications to Terms"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section10Content") ||
                "We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting. Your continued use of VISUAR after modifications constitutes your acceptance of the updated terms."}
            </p>
          </section>

          {/* Section 11: Governing Law */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">11.</span>
              {t("tac.section11") || "Governing Law"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section11Content") ||
                "These Terms and Conditions are governed by and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions."}
            </p>
          </section>

          {/* Section 12: Contact Information */}
          <section className="space-y-4">
            <h2
              className={`text-2xl font-bold flex items-center gap-3 transition-colors ${
                isDarkMode ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              <span className="text-xl">12.</span>
              {t("tac.section12") || "Contact Information"}
            </h2>
            <p
              className={`leading-relaxed transition-colors ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              {t("tac.section12Content") ||
                "If you have questions or concerns about these Terms and Conditions, please contact us at:"}
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
                VISUAR Development Team
              </p>
              <p
                className={`text-sm transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Email: support@visuar.edu
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

        {/* Acceptance Button */}
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
