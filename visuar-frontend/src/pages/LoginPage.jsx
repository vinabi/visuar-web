import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function LoginPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigate("/dashboard");
    } catch (error) {
      setError(error.message || t("login.loginError"));
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
              {t("login.title")}
            </h1>
            <p
              className={`transition-colors ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {t("login.subtitle")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div
                className={`px-4 py-3 rounded-lg border transition-colors ${
                  isDarkMode
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={`font-medium transition-colors ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {t("login.email")}
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
                  placeholder={t("login.emailPlaceholder")}
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
                {t("login.password")}
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
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`pl-11 pr-11 h-12 focus:border-cyan-500 focus:ring-cyan-500 transition-colors ${
                    isDarkMode
                      ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white/50"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-cyan-500 hover:text-cyan-600 text-sm font-medium"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white text-lg rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("common.loading") : t("login.loginButton")}
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-slate-600">
              {t("login.noAccount") + " "}
              <Link
                to="/signup"
                className="text-cyan-500 hover:text-cyan-600 font-medium"
              >
                {t("login.signupLink")}
              </Link>
            </p>

            {/* Terms & Conditions Link */}
            <p
              className={`text-center text-xs transition-colors ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {t("common.by_continuing")} 
              <Link
                to="/terms-and-conditions"
                className="text-cyan-500 hover:text-cyan-600 font-medium ml-1"
              >
                {t("common.termsConditions")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
