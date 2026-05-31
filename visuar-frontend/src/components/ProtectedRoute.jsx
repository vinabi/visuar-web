import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Spinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
      <p className="text-slate-600">Loading...</p>
    </div>
  </div>
);

/**
 * requireOnboarding (default true) — when true, users who have not completed
 * onboarding are redirected to /onboarding.  Set to false for the /onboarding
 * route itself so it never causes an infinite redirect loop.
 */
export function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user, loading, onboardingCompleted, onboardingLoading } = useAuth();

  if (loading) return <Spinner />;

  if (!user) return <Navigate to="/login" replace />;

  if (requireOnboarding) {
    if (onboardingLoading) return <Spinner />;
    if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  }

  return children;
}
