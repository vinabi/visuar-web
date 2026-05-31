import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check if Supabase already processed the recovery token before this component mounted
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setValidSession(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.auth.updateUser({ password });
      if (supabaseError) throw supabaseError;
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      setError(err.message || "Failed to update password.");
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

      <div className="w-full max-w-md relative z-10">
        <div
          className={`backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 space-y-6 transition-colors ${
            isDarkMode
              ? "bg-[#1a1f3a]/90 border border-slate-700/50 shadow-cyan-400/10"
              : "bg-white/80 shadow-cyan-500/10"
          }`}
        >
          <div className="text-center space-y-2">
            <h1
              className={`text-3xl md:text-4xl font-bold transition-colors ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Set New Password
            </h1>
            <p className={`transition-colors ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {validSession
                ? "Enter your new password below."
                : "Waiting for password recovery session…"}
            </p>
          </div>

          {!validSession && !success && (
            <p className={`text-sm text-center ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              If you arrived here from the reset email, please wait a moment for the session to load.
            </p>
          )}

          {validSession && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  New Password
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`pl-11 h-12 focus:border-cyan-500 focus:ring-cyan-500 ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                        : "border-slate-200 bg-white/50"
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`pl-11 h-12 focus:border-cyan-500 focus:ring-cyan-500 ${
                      isDarkMode
                        ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                        : "border-slate-200 bg-white/50"
                    }`}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white text-lg rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center">
              Password updated! Redirecting to dashboard…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
