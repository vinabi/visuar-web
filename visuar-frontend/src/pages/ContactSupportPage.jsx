import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "../context/ThemeContext";

export default function ContactSupportPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate form submission (replace with actual API call if needed)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
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
      <div className="max-w-6xl mx-auto px-4 py-12 pt-24 relative z-10">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className={`text-4xl font-bold mb-4 transition-colors ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {t("contact.title") || "Contact Support"}
          </h1>
          <p
            className={`text-lg transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {t("contact.subtitle") ||
              "We're here to help. Reach out to us anytime"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            {/* Contact Methods */}
            <div
              className={`p-8 rounded-2xl backdrop-blur-sm border ${
                isDarkMode
                  ? "bg-gray-900/50 border-gray-700/50"
                  : "bg-white/70 border-white/50"
              } shadow-lg`}
            >
              <h2
                className={`text-2xl font-bold mb-6 transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {t("contact.getInTouch") || "Get In Touch"}
              </h2>

              {/* Email */}
              <div className="flex gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode
                      ? "bg-cyan-500/20"
                      : "bg-cyan-100"
                  }`}
                >
                  <Mail
                    className={`w-6 h-6 ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`font-semibold transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {t("contact.email") || "Email"}
                  </h3>
                  <a
                    href="mailto:support@visuar.edu"
                    className={`transition-colors ${
                      isDarkMode
                        ? "text-cyan-400 hover:text-cyan-300"
                        : "text-cyan-600 hover:text-cyan-700"
                    }`}
                  >
                    support@visuar.edu
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode
                      ? "bg-cyan-500/20"
                      : "bg-cyan-100"
                  }`}
                >
                  <Phone
                    className={`w-6 h-6 ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`font-semibold transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {t("contact.phone") || "Phone"}
                  </h3>
                  <a
                    href="tel:+923215551234"
                    className={`transition-colors ${
                      isDarkMode
                        ? "text-cyan-400 hover:text-cyan-300"
                        : "text-cyan-600 hover:text-cyan-700"
                    }`}
                  >
                    +92 321 555-1234
                  </a>
                </div>
              </div>

              {/* Location */}
              <div className="flex gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode
                      ? "bg-cyan-500/20"
                      : "bg-cyan-100"
                  }`}
                >
                  <MapPin
                    className={`w-6 h-6 ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`font-semibold transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {t("contact.address") || "Address"}
                  </h3>
                  <p
                    className={`transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    University Vision Lab
                    <br />
                    Karachi, Pakistan
                  </p>
                </div>
              </div>

              {/* Business Hours */}
              <div className="flex gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDarkMode
                      ? "bg-cyan-500/20"
                      : "bg-cyan-100"
                  }`}
                >
                  <Clock
                    className={`w-6 h-6 ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`font-semibold transition-colors ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {t("contact.businessHours") || "Business Hours"}
                  </h3>
                  <p
                    className={`transition-colors ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Monday - Friday: 9:00 AM - 6:00 PM
                    <br />
                    Saturday: 10:00 AM - 4:00 PM
                  </p>
                </div>
              </div>
            </div>

            {/* Support Links */}
            <div
              className={`p-6 rounded-2xl backdrop-blur-sm border ${
                isDarkMode
                  ? "bg-gray-900/50 border-gray-700/50"
                  : "bg-white/70 border-white/50"
              }`}
            >
              <h3
                className={`font-bold mb-4 transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {t("contact.quickLinks") || "Quick Links"}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/faq")}
                  className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "hover:bg-cyan-500/10 text-cyan-400"
                      : "hover:bg-cyan-50/50 text-cyan-600"
                  }`}
                >
                  {t("contact.faqLink") || "FAQ"}
                </button>
                <button
                  onClick={() => navigate("/terms-and-conditions")}
                  className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "hover:bg-cyan-500/10 text-cyan-400"
                      : "hover:bg-cyan-50/50 text-cyan-600"
                  }`}
                >
                  {t("contact.tacLink") || "Terms & Conditions"}
                </button>
                <button
                  onClick={() => navigate("/privacy-policy")}
                  className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? "hover:bg-cyan-500/10 text-cyan-400"
                      : "hover:bg-cyan-50/50 text-cyan-600"
                  }`}
                >
                  {t("contact.privacyLink") || "Privacy Policy"}
                </button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div
            className={`p-8 rounded-2xl backdrop-blur-sm border ${
              isDarkMode
                ? "bg-gray-900/50 border-gray-700/50"
                : "bg-white/70 border-white/50"
            } shadow-lg`}
          >
            <h2
              className={`text-2xl font-bold mb-6 transition-colors ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              {t("contact.sendMessage") || "Send us a Message"}
            </h2>

            {submitted && (
              <div
                className={`mb-6 px-4 py-3 rounded-lg border transition-colors ${
                  isDarkMode
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-green-50 border-green-200 text-green-700"
                }`}
              >
                {t("contact.successMessage") ||
                  "Thank you! Your message has been sent successfully. We'll get back to you soon."}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className={`font-medium transition-colors ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  {t("contact.name") || "Full Name"}
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("contact.namePlaceholder") || "John Doe"}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className={`font-medium transition-colors ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  {t("contact.email") || "Email"}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("contact.emailPlaceholder") || "you@example.com"}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label
                  htmlFor="subject"
                  className={`font-medium transition-colors ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  {t("contact.subject") || "Subject"}
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder={t("contact.subjectPlaceholder") || "How can we help?"}
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={`h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label
                  htmlFor="message"
                  className={`font-medium transition-colors ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  {t("contact.message") || "Message"}
                </Label>
                <textarea
                  id="message"
                  name="message"
                  placeholder={t("contact.messagePlaceholder") ||
                    "Please describe your issue or question..."}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className={`w-full p-3 rounded-lg focus:border-cyan-500 focus:ring-cyan-500 transition-colors resize-none ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  } border`}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className={`w-full h-12 text-white text-lg rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode
                    ? "bg-cyan-500 hover:bg-cyan-400"
                    : "bg-cyan-500 hover:bg-cyan-600"
                }`}
              >
                {loading
                  ? t("common.loading") || "Loading..."
                  : t("contact.sendButton") || "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
