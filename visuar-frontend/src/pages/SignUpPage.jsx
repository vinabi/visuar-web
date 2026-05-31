import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function SignUpPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the terms and privacy policy");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;

      navigate("/onboarding");
    } catch (error) {
      setError(error.message || t("signup.signupError"));
    } finally {
      setLoading(false);
    }
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

      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div
          className={`backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 space-y-6 transition-colors ${
            isDarkMode
              ? "bg-[#1a1f3a]/90 border border-slate-700/50 shadow-cyan-400/10"
              : "bg-white/80 shadow-cyan-500/10"
          }`}
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1
              className={`text-3xl md:text-4xl font-bold transition-colors ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {t("signup.title")}
            </h1>
            <p
              className={`transition-colors ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {t("signup.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Full Name Field */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className={`font-medium transition-colors ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {t("signup.fullName")}
              </Label>
              <div className="relative">
                <User
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  }`}
                />
                <Input
                  id="name"
                  type="text"
                  placeholder={t("signup.fullNamePlaceholder")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={`pl-11 h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={`font-medium transition-colors ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {t("signup.email")}
              </Label>
              <div className="relative">
                <Mail
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  }`}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("signup.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`pl-11 h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={`font-medium transition-colors ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {t("signup.password")}
              </Label>
              <div className="relative">
                <Lock
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    isDarkMode ? "text-slate-500" : "text-slate-400"
                  }`}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("signup.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`pl-11 pr-11 h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDarkMode
                      ? "text-slate-500 hover:text-slate-300"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className={`mt-1 ${
                  isDarkMode ? "border-slate-600" : "border-slate-300"
                }`}
              />
              <label
                htmlFor="terms"
                className={`text-sm leading-relaxed cursor-pointer transition-colors ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {t("signup.agreeToTerms") || "I agree to the"}{" "}
                <Link
                  to="/terms-and-conditions"
                  className={`font-medium transition-colors ${
                    isDarkMode
                      ? "text-cyan-400 hover:text-cyan-300"
                      : "text-cyan-500 hover:text-cyan-600"
                  }`}
                >
                  {t("common.termsConditions") || "Terms & Privacy Policy"}
                </Link>
              </label>
            </div>

            {/* Sign Up Button */}
            <Button
              type="submit"
              className={`w-full h-12 text-white text-lg rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode
                  ? "bg-cyan-500 hover:bg-cyan-400"
                  : "bg-cyan-500 hover:bg-cyan-600"
              }`}
              disabled={!agreedToTerms || loading}
            >
              {loading ? t("common.loading") : t("signup.signupButton")}
            </Button>

            {/* Login Link */}
            <p
              className={`text-center transition-colors ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {t("signup.haveAccount") + " "}
              <Link
                to="/login"
                className={`font-medium transition-colors ${
                  isDarkMode
                    ? "text-cyan-400 hover:text-cyan-300"
                    : "text-cyan-500 hover:text-cyan-600"
                }`}
              >
                {t("signup.loginLink")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
