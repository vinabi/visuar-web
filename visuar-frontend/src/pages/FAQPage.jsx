import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";

export default function FAQPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: t("faq.q1") || "What is VISUAR?",
      answer:
        t("faq.a1") ||
        "VISUAR is a comprehensive vision testing and screening application designed to provide accessible, AI-powered vision assessment. It combines vision tracking, eye movement analysis, and clinical data analysis to support vision health research.",
    },
    {
      id: 2,
      question: t("faq.q2") || "How accurate are the vision tests?",
      answer:
        t("faq.a2") ||
        "Our tests use advanced eye-tracking technology and AI analysis to provide reliable results. However, VISUAR is not a replacement for professional eye exams. Always consult with an eye care professional for accurate diagnosis.",
    },
    {
      id: 3,
      question: t("faq.q3") || "Is my data secure?",
      answer:
        t("faq.a3") ||
        "Yes, we use industry-standard encryption and security measures. Your personal and health data are protected and stored securely. We never share your data with third parties without consent.",
    },
    {
      id: 4,
      question: t("faq.q4") || "Do I need special equipment?",
      answer:
        t("faq.a4") ||
        "No special equipment is needed. You just need a computer or device with a webcam and an internet connection. The app uses your device's camera for eye tracking.",
    },
    {
      id: 5,
      question: t("faq.q5") || "How long does a test take?",
      answer:
        t("faq.a5") ||
        "A complete vision assessment typically takes 10-15 minutes depending on the tests selected. Individual tests take 2-5 minutes each.",
    },
    {
      id: 6,
      question: t("faq.q6") || "Can I retake tests?",
      answer:
        t("faq.a6") ||
        "Yes, you can retake tests anytime. We recommend spacing tests a few days apart for the most accurate comparison of your vision health over time.",
    },
    {
      id: 7,
      question: t("faq.q7") || "What does the AI analysis provide?",
      answer:
        t("faq.a7") ||
        "The AI analysis provides clinical findings, personalized recommendations, and a summary of your test results. It helps identify potential vision issues and suggests lifestyle changes that may help.",
    },
    {
      id: 8,
      question: t("faq.q8") || "Is VISUAR available on mobile?",
      answer:
        t("faq.a8") ||
        "Currently, VISUAR is optimized for desktop and tablet use. Mobile support is being developed for future releases.",
    },
    {
      id: 9,
      question: t("faq.q9") || "How do I download my test results?",
      answer:
        t("faq.a9") ||
        "After completing a test, you can view detailed results and download them as a PDF report from the results page.",
    },
    {
      id: 10,
      question: t("faq.q10") || "What languages are supported?",
      answer:
        t("faq.a10") ||
        "VISUAR currently supports English and Urdu. More languages will be added in future updates.",
    },
  ];

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

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
            {t("faq.title") || "Frequently Asked Questions"}
          </h1>
          <p
            className={`text-lg transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {t("faq.subtitle") ||
              "Find answers to common questions about VISUAR"}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className={`rounded-xl overflow-hidden transition-all duration-300 border ${
                isDarkMode
                  ? "bg-gray-900/50 border-gray-700/50 hover:border-cyan-500/50"
                  : "bg-white/70 border-white/50 hover:border-cyan-400/50"
              }`}
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                  expandedFAQ === faq.id
                    ? isDarkMode
                      ? "bg-cyan-500/10"
                      : "bg-cyan-50/50"
                    : ""
                }`}
              >
                <h3
                  className={`text-lg font-semibold text-left transition-colors ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {faq.question}
                </h3>
                {expandedFAQ === faq.id ? (
                  <ChevronUp
                    className={`w-5 h-5 flex-shrink-0 ml-2 transition-colors ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                ) : (
                  <ChevronDown
                    className={`w-5 h-5 flex-shrink-0 ml-2 transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  />
                )}
              </button>

              {expandedFAQ === faq.id && (
                <div
                  className={`px-6 pb-4 border-t ${
                    isDarkMode ? "border-gray-700/50" : "border-white/30"
                  }`}
                >
                  <p
                    className={`leading-relaxed transition-colors ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Support CTA */}
        <div
          className={`mt-12 p-8 rounded-2xl text-center border ${
            isDarkMode
              ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30"
              : "bg-gradient-to-r from-cyan-50/50 to-blue-50/50 border-cyan-200/50"
          }`}
        >
          <h3
            className={`text-2xl font-bold mb-3 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {t("faq.stillNeedHelp") || "Still need help?"}
          </h3>
          <p
            className={`transition-colors mb-4 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {t("faq.contactSupport") ||
              "Contact our support team for more information"}
          </p>
          <button
            onClick={() => navigate("/contact-support")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              isDarkMode
                ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                : "bg-cyan-500 hover:bg-cyan-600 text-white"
            }`}
          >
            {t("faq.contactNow") || "Contact Support"}
          </button>
        </div>
      </div>
    </div>
  );
}
