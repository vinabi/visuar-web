import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Clock, Eye, AlertCircle, HeartPulse, Languages,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { onboardingAPI } from "../lib/api";
import { VISION_FOCUS, setVisionFocus } from "../utils/visionFocus";
import { AnimatedBackground } from "@/components/AnimatedBackground";

// ── Shared UI helpers ──────────────────────────────────────────────────────────

function YesNoCard({ label, value, onChange, isDarkMode }) {
  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
        {label}
      </p>
      <div className="flex gap-3">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              value === opt
                ? "border-cyan-500 bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                : isDarkMode
                  ? "border-slate-600 text-slate-300 hover:border-cyan-500/60"
                  : "border-slate-200 text-slate-600 hover:border-cyan-400"
            }`}
          >
            {opt ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectCard({ label, options, value, onChange, isDarkMode }) {
  return (
    <div className="space-y-2">
      <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
              value === opt.value
                ? "border-cyan-500 bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                : isDarkMode
                  ? "border-slate-600 text-slate-300 hover:border-cyan-500/60"
                  : "border-slate-200 text-slate-600 hover:border-cyan-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "About You",       subtitle: "Let's start with some basic info",          icon: User },
  { id: 2, title: "Daily Habits",    subtitle: "Tell us about your daily routine",           icon: Clock },
  { id: 3, title: "Your Eyes",       subtitle: "Share your vision habits",                   icon: Eye },
  { id: 4, title: "Symptoms",        subtitle: "Have you noticed any of these?",             icon: AlertCircle },
  { id: 5, title: "Health History",  subtitle: "Help us understand your health background",  icon: HeartPulse },
  { id: 6, title: "Preferences",     subtitle: "Almost done — a few final touches",          icon: Languages },
];

const TOTAL = STEPS.length;

// ── Initial form state ─────────────────────────────────────────────────────────

const INITIAL = {
  age: "",
  gender: "",
  occupation: "",
  average_screen_time: "",
  sleep_hours: "",
  outdoor_activity_hours: "",
  water_intake: "",
  screen_usage_type: "",
  wears_glasses: null,
  wears_contacts: null,
  blurry_vision: null,
  night_vision_difficulty: null,
  vision_focus: "",
  headaches_after_screen: null,
  dry_or_irritated_eyes: null,
  eye_fatigue: null,
  has_diabetes: null,
  has_high_blood_pressure: null,
  family_vision_history: null,
  preferred_language: "",
  additional_notes: "",
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { onboardingCompleted, markOnboardingComplete, user } = useAuth();
  const { isDarkMode } = useTheme();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If already completed, skip to dashboard
  useEffect(() => {
    if (onboardingCompleted) {
      navigate("/dashboard", { replace: true });
    }
  }, [onboardingCompleted, navigate]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // ── Per-step validation ──────────────────────────────────────────────────────

  const validateStep = () => {
    setError("");
    if (step === 1) {
      if (!form.age || Number(form.age) < 1 || Number(form.age) > 120) {
        setError("Please enter a valid age between 1 and 120.");
        return false;
      }
      if (!form.gender) { setError("Please select your gender."); return false; }
      if (!form.occupation.trim()) { setError("Please enter your occupation."); return false; }
    }
    if (step === 2) {
      if (!form.average_screen_time) { setError("Please select your daily screen time."); return false; }
      if (!form.sleep_hours) { setError("Please select your sleep duration."); return false; }
      if (!form.outdoor_activity_hours) { setError("Please select your outdoor activity."); return false; }
      if (!form.water_intake) { setError("Please select your water intake."); return false; }
      if (!form.screen_usage_type) { setError("Please select your primary screen use."); return false; }
    }
    if (step === 3) {
      if (form.wears_glasses === null) { setError("Please answer all vision questions."); return false; }
      if (form.wears_contacts === null) { setError("Please answer all vision questions."); return false; }
      if (form.blurry_vision === null) { setError("Please answer all vision questions."); return false; }
      if (form.night_vision_difficulty === null) { setError("Please answer all vision questions."); return false; }
      if (!form.vision_focus) { setError("Please tell us where you notice blur most."); return false; }
    }
    if (step === 4) {
      if (form.headaches_after_screen === null) { setError("Please answer all symptom questions."); return false; }
      if (form.dry_or_irritated_eyes === null) { setError("Please answer all symptom questions."); return false; }
      if (form.eye_fatigue === null) { setError("Please answer all symptom questions."); return false; }
    }
    if (step === 5) {
      if (form.has_diabetes === null) { setError("Please answer all medical history questions."); return false; }
      if (form.has_high_blood_pressure === null) { setError("Please answer all medical history questions."); return false; }
      if (form.family_vision_history === null) { setError("Please answer all medical history questions."); return false; }
    }
    if (step === 6) {
      if (!form.preferred_language) { setError("Please select your preferred language."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL));
  };

  const handleBack = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const formatApiError = (e) => {
    const detail = e?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(" ");
    }
    return e?.message || "Failed to save your profile. Please try again.";
  };

  const handleSkip = async () => {
    setSaving(true);
    setError("");
    try {
      await onboardingAPI.skipProfile();
      markOnboardingComplete();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    setError("");
    try {
      await onboardingAPI.saveProfile({
        ...form,
        age: form.age ? Number(form.age) : null,
        occupation: form.occupation?.trim() || null,
        additional_notes: form.additional_notes?.trim() || null,
        is_completed: true,
      });
      if (form.vision_focus) setVisionFocus(form.vision_focus);
      markOnboardingComplete();
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Progress ─────────────────────────────────────────────────────────────────

  const progress = ((step - 1) / (TOTAL - 1)) * 100;
  const StepIcon = STEPS[step - 1].icon;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#0a0e27]"
          : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      <div className="w-full max-w-xl relative z-10">
        {/* Card */}
        <div
          className={`backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transition-colors ${
            isDarkMode
              ? "bg-[#1a1f3a]/90 border border-slate-700/50 shadow-cyan-400/10"
              : "bg-white/80 shadow-cyan-500/10"
          }`}
        >
          {/* Top progress bar */}
          <div className="h-1.5 w-full bg-slate-200/40">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-8 md:p-10 space-y-7">
            {/* Skip onboarding */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className={`text-sm font-medium underline-offset-2 hover:underline disabled:opacity-50 ${
                  isDarkMode ? "text-slate-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600"
                }`}
              >
                Skip for now
              </button>
            </div>

            {/* Step header */}
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isDarkMode ? "bg-cyan-500/20" : "bg-cyan-50"
                }`}
              >
                <StepIcon className="w-6 h-6 text-cyan-500" />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-widest mb-0.5 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                  Step {step} of {TOTAL}
                </p>
                <h2 className={`text-xl font-bold leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {STEPS[step - 1].title}
                </h2>
                <p className={`text-sm mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {STEPS[step - 1].subtitle}
                </p>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                    s.id < step
                      ? "bg-cyan-500"
                      : s.id === step
                        ? "bg-cyan-400"
                        : isDarkMode ? "bg-slate-700" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* ── STEP 1: About You ──────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                {/* Age */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    How old are you?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 24"
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                    className={`w-full h-12 px-4 rounded-xl border-2 text-sm outline-none transition-colors ${
                      isDarkMode
                        ? "bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                        : "bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                    }`}
                  />
                </div>

                {/* Gender */}
                <SelectCard
                  label="Gender"
                  value={form.gender}
                  onChange={(v) => set("gender", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "male",            label: "Male" },
                    { value: "female",          label: "Female" },
                    { value: "non-binary",      label: "Non-binary" },
                    { value: "prefer-not-say",  label: "Prefer not to say" },
                  ]}
                />

                {/* Occupation */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    What is your occupation?
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer, Student, Doctor…"
                    value={form.occupation}
                    onChange={(e) => set("occupation", e.target.value)}
                    className={`w-full h-12 px-4 rounded-xl border-2 text-sm outline-none transition-colors ${
                      isDarkMode
                        ? "bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                        : "bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: Daily Habits ────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <SelectCard
                  label="Average daily screen time"
                  value={form.average_screen_time}
                  onChange={(v) => set("average_screen_time", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "<1hr",   label: "< 1 hr" },
                    { value: "1-3hrs", label: "1 – 3 hrs" },
                    { value: "3-6hrs", label: "3 – 6 hrs" },
                    { value: "6-9hrs", label: "6 – 9 hrs" },
                    { value: "9+hrs",  label: "9 + hrs" },
                  ]}
                />

                <SelectCard
                  label="Average sleep duration"
                  value={form.sleep_hours}
                  onChange={(v) => set("sleep_hours", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "<5hrs",  label: "< 5 hrs" },
                    { value: "5-6hrs", label: "5 – 6 hrs" },
                    { value: "6-7hrs", label: "6 – 7 hrs" },
                    { value: "7-8hrs", label: "7 – 8 hrs" },
                    { value: "8+hrs",  label: "8 + hrs" },
                  ]}
                />

                <SelectCard
                  label="Average outdoor activity per day"
                  value={form.outdoor_activity_hours}
                  onChange={(v) => set("outdoor_activity_hours", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "none",       label: "None" },
                    { value: "<30min",     label: "< 30 min" },
                    { value: "30min-1hr",  label: "30 min – 1 hr" },
                    { value: "1-2hrs",     label: "1 – 2 hrs" },
                    { value: "2+hrs",      label: "2 + hrs" },
                  ]}
                />

                <SelectCard
                  label="Daily water intake"
                  value={form.water_intake}
                  onChange={(v) => set("water_intake", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "<500ml", label: "< 500 ml" },
                    { value: "500ml-1L", label: "500 ml – 1 L" },
                    { value: "1-2L",   label: "1 – 2 L" },
                    { value: "2-3L",   label: "2 – 3 L" },
                    { value: "3L+",    label: "3 L +" },
                  ]}
                />

                <SelectCard
                  label="Primary screen usage type"
                  value={form.screen_usage_type}
                  onChange={(v) => set("screen_usage_type", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "gaming",  label: "Gaming" },
                    { value: "study",   label: "Study / Academic" },
                    { value: "work",    label: "Work / Professional" },
                    { value: "mixed",   label: "Mixed" },
                    { value: "other",   label: "Other" },
                  ]}
                />
              </div>
            )}

            {/* ── STEP 3: Your Eyes ──────────────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <YesNoCard
                  label="Do you wear glasses?"
                  value={form.wears_glasses}
                  onChange={(v) => set("wears_glasses", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Do you wear contact lenses?"
                  value={form.wears_contacts}
                  onChange={(v) => set("wears_contacts", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Do you experience blurry vision?"
                  value={form.blurry_vision}
                  onChange={(v) => set("blurry_vision", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Do you have difficulty seeing at night?"
                  value={form.night_vision_difficulty}
                  onChange={(v) => set("night_vision_difficulty", v)}
                  isDarkMode={isDarkMode}
                />
                <SelectCard
                  label="Where do you notice blur most? (helps order screening tests)"
                  value={form.vision_focus}
                  onChange={(v) => set("vision_focus", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: VISION_FOCUS.FAR, label: "Far / distance" },
                    { value: VISION_FOCUS.NEAR, label: "Near / reading" },
                    { value: VISION_FOCUS.BOTH, label: "Both" },
                    { value: VISION_FOCUS.UNSURE, label: "Not sure" },
                  ]}
                />
              </div>
            )}

            {/* ── STEP 4: Symptoms ───────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-5">
                <YesNoCard
                  label="Do you experience headaches after screen use?"
                  value={form.headaches_after_screen}
                  onChange={(v) => set("headaches_after_screen", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Do your eyes feel dry or irritated?"
                  value={form.dry_or_irritated_eyes}
                  onChange={(v) => set("dry_or_irritated_eyes", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Do you often feel eye fatigue or strain?"
                  value={form.eye_fatigue}
                  onChange={(v) => set("eye_fatigue", v)}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* ── STEP 5: Health History ─────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-5">
                <YesNoCard
                  label="Do you have diabetes?"
                  value={form.has_diabetes}
                  onChange={(v) => set("has_diabetes", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Do you have high blood pressure?"
                  value={form.has_high_blood_pressure}
                  onChange={(v) => set("has_high_blood_pressure", v)}
                  isDarkMode={isDarkMode}
                />
                <YesNoCard
                  label="Any family history of vision problems?"
                  value={form.family_vision_history}
                  onChange={(v) => set("family_vision_history", v)}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* ── STEP 6: Preferences ───────────────────────────────────────── */}
            {step === 6 && (
              <div className="space-y-5">
                <SelectCard
                  label="Preferred language"
                  value={form.preferred_language}
                  onChange={(v) => set("preferred_language", v)}
                  isDarkMode={isDarkMode}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ur", label: "اردو (Urdu)" },
                  ]}
                />

                {/* Additional notes */}
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    Anything else we should know?{" "}
                    <span className={`font-normal ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      (optional)
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any eye conditions, allergies, recent eye surgery, or other relevant notes…"
                    value={form.additional_notes}
                    onChange={(e) => set("additional_notes", e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-colors resize-none ${
                      isDarkMode
                        ? "bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                        : "bg-white/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* ── Navigation ────────────────────────────────────────────────── */}
            <div className="flex gap-3 pt-1">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold border-2 transition-all ${
                    isDarkMode
                      ? "border-slate-600 text-slate-300 hover:border-slate-400"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={step === TOTAL ? handleSubmit : handleNext}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-white bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : step === TOTAL ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Finish & Continue
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Skip link (last step only) */}
            {step === TOTAL && (
              <p className={`text-center text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                You can update this information later from your profile.
              </p>
            )}
          </div>
        </div>

        {/* Branding */}
        <p className={`text-center text-xs mt-5 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          VISUAR · Your vision data is private and secure
        </p>
      </div>
    </div>
  );
}
