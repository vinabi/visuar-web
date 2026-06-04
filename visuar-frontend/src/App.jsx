import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AIConsultPage from "./pages/AIConsultPage";
import TestSelectionPage from "./pages/TestSelectionPage";
import TestPage from "./pages/TestPage";
import BlurScreenerPage from "./pages/BlurScreenerPage";
import ResultsPage from "./pages/ResultsPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import FAQPage from "./pages/FAQPage";
import ContactSupportPage from "./pages/ContactSupportPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import OnboardingPage from "./pages/OnboardingPage";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PlanProvider } from "./context/PlanContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { VoiceControlButton } from "./components/VoiceControlButton";
import PricingPage from "./pages/PricingPage";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlanProvider>
        <Router>
          <VoiceControlButton />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute requireOnboarding={false}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact-support" element={<ContactSupportPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-consult"
              element={
                <ProtectedRoute>
                  <AIConsultPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute>
                  <PricingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-selection"
              element={
                <ProtectedRoute>
                  <TestSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/blur-screener"
              element={
                <ProtectedRoute>
                  <BlurScreenerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:testId"
              element={
                <ProtectedRoute>
                  <TestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:testId"
              element={
                <ProtectedRoute>
                  <ResultsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
