import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Save, Edit2, Eye,
  Heart, Zap, Cloud, Utensils, Clock, Moon, AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "../context/AuthContext";
import { onboardingAPI } from "../lib/api";
import { useTheme } from "../context/ThemeContext";

// ── View-mode info card ────────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value, isDarkMode }) {
  if (value === null || value === undefined) return null;
  return (
    <div
      className={`rounded-xl p-4 ${
        isDarkMode
          ? "bg-slate-800/40 border border-slate-700/50"
          : "bg-white/40 border border-slate-200/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </p>
      </div>
      <p className={`text-sm ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [onboardingData, setOnboardingData] = useState(null);

  // Form state for editing
  const [formData, setFormData] = useState({
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
    vision_focus: "",
    night_vision_difficulty: null,
    headaches_after_screen: null,
    dry_or_irritated_eyes: null,
    eye_fatigue: null,
    has_diabetes: null,
    has_high_blood_pressure: null,
    family_vision_history: null,
    preferred_language: "",
    additional_notes: "",
  });

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    setLoading(true);
    try {
      const data = await onboardingAPI.getProfile();
      setOnboardingData(data);
      setFormData(data);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError("Failed to load your profile data");
      } else {
        // No onboarding data yet - redirect to onboarding
        navigate("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleYesNo = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await onboardingAPI.saveProfile({
        ...formData,
        is_completed: true,
      });
      setSuccess("Profile updated successfully!");
      setIsEditMode(false);
      setTimeout(() => setSuccess(""), 3000);
      loadOnboardingData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors ${
          isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
        }`}
      >
        <AnimatedBackground isDarkMode={isDarkMode} />
        <div className="relative z-10">
          <div
            className={`backdrop-blur-md rounded-3xl shadow-2xl p-16 w-80 transition-colors animate-pulse ${
              isDarkMode
                ? "bg-[#1a1f3a]/90 border border-slate-700/50 shadow-cyan-400/20"
                : "bg-white/90 border border-white/60 shadow-cyan-500/20"
            }`}
          >
            <div className="relative flex items-center justify-center mb-10 mt-4">
              <div
                className={`absolute animate-spin rounded-full h-24 w-24 border-4 border-transparent ${
                  isDarkMode ? "border-t-cyan-400 border-r-purple-400" : "border-t-cyan-500 border-r-purple-500"
                }`}
                style={{ animationDuration: "1.5s" }}
              ></div>
              <div className={`absolute animate-ping rounded-full h-16 w-16 opacity-30 ${isDarkMode ? "bg-cyan-400" : "bg-cyan-500"}`}></div>
              <div className={`relative rounded-full h-4 w-4 ${isDarkMode ? "bg-cyan-400" : "bg-cyan-500"}`}></div>
            </div>
            <div className="text-center space-y-2">
              <p className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {t("common.loading")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!onboardingData) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors ${
          isDarkMode ? "bg-[#0a0e27]" : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
        }`}
      >
        <AnimatedBackground isDarkMode={isDarkMode} />
        <div className="w-full max-w-2xl relative z-10">
          <Link to="/dashboard">
            <Button variant="ghost" className={`mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              {t("common.back")}
            </Button>
          </Link>
          <div
            className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-12 text-center transition-colors ${
              isDarkMode ? "bg-[#1a1f3a]/80 border border-slate-700/50" : "bg-white/80"
            }`}
          >
            <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? "text-yellow-400" : "text-yellow-600"}`} />
            <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              No Profile Found
            </h2>
            <p className={`mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Please complete your onboarding first to set up your profile.
            </p>
            <Link to="/onboarding">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-white rounded-full px-6">
                Start Onboarding
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? "bg-[#0a0e27]"
          : "bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
      }`}
    >
      <AnimatedBackground isDarkMode={isDarkMode} />

      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-4xl relative z-10">
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
          className={`backdrop-blur-md rounded-3xl shadow-xl p-8 md:p-12 transition-colors ${
            isDarkMode
              ? "bg-[#1a1f3a]/80 border border-slate-700/50"
              : "bg-white/80 border border-white/40"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                    isDarkMode ? "bg-cyan-400/20" : "bg-cyan-100"
                  }`}
                >
                  <User
                    className={`w-10 h-10 transition-colors ${
                      isDarkMode ? "text-cyan-400" : "text-cyan-600"
                    }`}
                  />
                </div>
                <div>
                  <h1
                    className={`text-3xl font-bold mb-1 transition-colors ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {t("profile.yourProfile")}
                  </h1>
                  <p
                    className={`transition-colors ${
                      isDarkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {user?.user_metadata?.full_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit button */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
                isEditMode
                  ? isDarkMode
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    : "bg-cyan-100 text-cyan-700 border border-cyan-300"
                  : isDarkMode
                    ? "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isEditMode ? (
                <>
                  <Eye className="w-4 h-4" />
                  View
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Edit
                </>
              )}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* ── VIEW MODE ──────────────────────────────────────────── */}
          {!isEditMode ? (
            <div className="space-y-8">
              {/* Email */}
              <div
                className={`rounded-xl p-4 ${
                  isDarkMode
                    ? "bg-slate-800/40 border border-slate-700/50"
                    : "bg-white/40 border border-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Mail className={`w-4 h-4 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`} />
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Email
                  </p>
                </div>
                <p className={`text-sm ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  {user?.email}
                </p>
              </div>

              {/* Personal Info */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Personal Information
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoCard icon={User} label="Age" value={onboardingData.age} isDarkMode={isDarkMode} />
                  <InfoCard icon={User} label="Gender" value={onboardingData.gender} isDarkMode={isDarkMode} />
                  <InfoCard icon={Utensils} label="Occupation" value={onboardingData.occupation} isDarkMode={isDarkMode} />
                </div>
              </div>

              {/* Daily Habits */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Daily Habits
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoCard icon={Zap} label="Screen Time" value={onboardingData.average_screen_time} isDarkMode={isDarkMode} />
                  <InfoCard icon={Moon} label="Sleep" value={onboardingData.sleep_hours} isDarkMode={isDarkMode} />
                  <InfoCard icon={Cloud} label="Outdoor Activity" value={onboardingData.outdoor_activity_hours} isDarkMode={isDarkMode} />
                  <InfoCard icon={Utensils} label="Water Intake" value={onboardingData.water_intake} isDarkMode={isDarkMode} />
                </div>
              </div>

              {/* Vision & Eyes */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Vision & Eyes
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoCard icon={Eye} label="Wears Glasses" value={onboardingData.wears_glasses} isDarkMode={isDarkMode} />
                  <InfoCard icon={Eye} label="Wears Contacts" value={onboardingData.wears_contacts} isDarkMode={isDarkMode} />
                  <InfoCard icon={Eye} label="Blurry Vision" value={onboardingData.blurry_vision} isDarkMode={isDarkMode} />
                  <InfoCard icon={Eye} label="Night Vision Difficulty" value={onboardingData.night_vision_difficulty} isDarkMode={isDarkMode} />
                  <InfoCard icon={Eye} label="Blur Focus" value={onboardingData.vision_focus} isDarkMode={isDarkMode} />
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Symptoms
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoCard icon={AlertCircle} label="Headaches After Screen" value={onboardingData.headaches_after_screen} isDarkMode={isDarkMode} />
                  <InfoCard icon={Eye} label="Dry / Irritated Eyes" value={onboardingData.dry_or_irritated_eyes} isDarkMode={isDarkMode} />
                  <InfoCard icon={Zap} label="Eye Fatigue" value={onboardingData.eye_fatigue} isDarkMode={isDarkMode} />
                </div>
              </div>

              {/* Medical History */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Medical History
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoCard icon={Heart} label="Diabetes" value={onboardingData.has_diabetes} isDarkMode={isDarkMode} />
                  <InfoCard icon={Heart} label="High Blood Pressure" value={onboardingData.has_high_blood_pressure} isDarkMode={isDarkMode} />
                  <InfoCard icon={Heart} label="Family Vision History" value={onboardingData.family_vision_history} isDarkMode={isDarkMode} />
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Preferences
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <InfoCard
                    icon={User}
                    label="Preferred Language"
                    value={onboardingData.preferred_language === "en" ? "English" : "اردو (Urdu)"}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>

              {/* Additional Notes */}
              {onboardingData.additional_notes && (
                <div
                  className={`rounded-xl p-4 ${
                    isDarkMode
                      ? "bg-slate-800/40 border border-slate-700/50"
                      : "bg-white/40 border border-slate-200/60"
                  }`}
                >
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Additional Notes
                  </p>
                  <p className={`text-sm ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                    {onboardingData.additional_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            // ── EDIT MODE ────────────────────────────────────────────
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Email */}
              <div className="space-y-2">
                <Label className={`font-medium transition-colors ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                  Email (Read-only)
                </Label>
                <Input value={user?.email || ""} disabled className={`h-12 rounded-xl ${isDarkMode ? "border-slate-700 bg-slate-800/50 text-slate-400" : "border-slate-300 bg-slate-50"}`} />
              </div>

              {/* Personal Info */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Personal Information
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Age</Label>
                    <Input type="number" name="age" value={formData.age} onChange={handleChange} className={`h-12 rounded-xl ${isDarkMode ? "border-slate-600 bg-slate-800/50 text-white" : "border-slate-300"}`} />
                  </div>
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Gender</Label>
                    <Select name="gender" value={formData.gender} onChange={handleChange} options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "non-binary", label: "Non-binary" },
                      { value: "prefer-not-say", label: "Prefer not to say" },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Occupation</Label>
                    <Input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className={`h-12 rounded-xl ${isDarkMode ? "border-slate-600 bg-slate-800/50 text-white" : "border-slate-300"}`} />
                  </div>
                </div>
              </div>

              {/* Daily Habits */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Daily Habits
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Screen Time</Label>
                    <Select name="average_screen_time" value={formData.average_screen_time} onChange={handleChange} options={[
                      { value: "<1hr", label: "< 1 hr" },
                      { value: "1-3hrs", label: "1 – 3 hrs" },
                      { value: "3-6hrs", label: "3 – 6 hrs" },
                      { value: "6-9hrs", label: "6 – 9 hrs" },
                      { value: "9+hrs", label: "9 + hrs" },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Sleep</Label>
                    <Select name="sleep_hours" value={formData.sleep_hours} onChange={handleChange} options={[
                      { value: "<5hrs", label: "< 5 hrs" },
                      { value: "5-6hrs", label: "5 – 6 hrs" },
                      { value: "6-7hrs", label: "6 – 7 hrs" },
                      { value: "7-8hrs", label: "7 – 8 hrs" },
                      { value: "8+hrs", label: "8 + hrs" },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Outdoor Activity</Label>
                    <Select name="outdoor_activity_hours" value={formData.outdoor_activity_hours} onChange={handleChange} options={[
                      { value: "none", label: "None" },
                      { value: "<30min", label: "< 30 min" },
                      { value: "30min-1hr", label: "30 min – 1 hr" },
                      { value: "1-2hrs", label: "1 – 2 hrs" },
                      { value: "2+hrs", label: "2 + hrs" },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Water Intake</Label>
                    <Select name="water_intake" value={formData.water_intake} onChange={handleChange} options={[
                      { value: "<500ml", label: "< 500 ml" },
                      { value: "500ml-1L", label: "500 ml – 1 L" },
                      { value: "1-2L", label: "1 – 2 L" },
                      { value: "2-3L", label: "2 – 3 L" },
                      { value: "3L+", label: "3 L +" },
                    ]} />
                  </div>
                </div>
              </div>

              {/* Vision & Eyes - Yes/No toggles */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Vision & Eyes
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "wears_glasses", label: "Wears Glasses" },
                    { name: "wears_contacts", label: "Wears Contacts" },
                    { name: "blurry_vision", label: "Blurry Vision" },
                    { name: "night_vision_difficulty", label: "Night Vision Difficulty" },
                  ].map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>{field.label}</Label>
                      <div className="flex gap-2">
                        {[true, false].map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => handleYesNo(field.name, val)}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                              formData[field.name] === val
                                ? "bg-cyan-500 text-white"
                                : isDarkMode
                                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                          >
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Symptoms
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "headaches_after_screen", label: "Headaches After Screen" },
                    { name: "dry_or_irritated_eyes", label: "Dry / Irritated Eyes" },
                    { name: "eye_fatigue", label: "Eye Fatigue" },
                  ].map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>{field.label}</Label>
                      <div className="flex gap-2">
                        {[true, false].map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => handleYesNo(field.name, val)}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                              formData[field.name] === val
                                ? "bg-cyan-500 text-white"
                                : isDarkMode
                                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                          >
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medical History */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Medical History
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "has_diabetes", label: "Diabetes" },
                    { name: "has_high_blood_pressure", label: "High Blood Pressure" },
                    { name: "family_vision_history", label: "Family Vision History" },
                  ].map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>{field.label}</Label>
                      <div className="flex gap-2">
                        {[true, false].map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => handleYesNo(field.name, val)}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                              formData[field.name] === val
                                ? "bg-cyan-500 text-white"
                                : isDarkMode
                                  ? "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                          >
                            {val ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Preferences
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Preferred Language</Label>
                    <Select name="preferred_language" value={formData.preferred_language} onChange={handleChange} options={[
                      { value: "en", label: "English" },
                      { value: "ur", label: "اردو (Urdu)" },
                    ]} />
                  </div>
                  <div className="space-y-2">
                    <Label className={isDarkMode ? "text-slate-200" : "text-slate-700"}>Additional Notes (Optional)</Label>
                    <textarea
                      name="additional_notes"
                      value={formData.additional_notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Any other information..."
                      className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                        isDarkMode
                          ? "border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-500"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 h-12 text-white rounded-full disabled:opacity-50 transition-colors ${
                    isDarkMode
                      ? "bg-cyan-500 hover:bg-cyan-400"
                      : "bg-cyan-500 hover:bg-cyan-600"
                  }`}
                >
                  <Save className="mr-2 w-5 h-5" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  variant="outline"
                  className={`flex-1 h-12 rounded-full transition-colors ${
                    isDarkMode
                      ? "border-slate-600 text-slate-300 bg-slate-800/50 hover:bg-slate-700/50"
                      : "border-slate-300 text-slate-700 bg-transparent"
                  }`}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
