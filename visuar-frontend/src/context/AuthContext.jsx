import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { onboardingAPI, notifyAPI } from "../lib/api";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// localStorage key scoped to a Supabase user ID so different accounts on the
// same device don't share the flag.
const obKey = (uid) => `visuar_ob_${uid}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  // Keep a ref so callbacks always have the current userId without stale closure.
  const userIdRef = useRef(null);

  const checkOnboardingStatus = useCallback(async (uid) => {
    // If localStorage already records this user as completed, trust it immediately.
    // The API call still runs to stay in sync, but the user never gets blocked.
    const cachedDone = uid && localStorage.getItem(obKey(uid)) === "1";
    if (cachedDone) {
      setOnboardingCompleted(true);
      setOnboardingLoading(false);
      // Silently verify in the background — no spinner, no redirect.
      onboardingAPI.getStatus().then((data) => {
        if (data.completed) {
          localStorage.setItem(obKey(uid), "1");
        } else {
          // Server says not done (edge case: DB was reset). Clear cache and re-gate.
          localStorage.removeItem(obKey(uid));
          setOnboardingCompleted(false);
        }
      }).catch(() => {
        // Backend unreachable — keep the cached "completed" so the user isn't
        // blocked from using the app just because the server is temporarily down.
      });
      return;
    }

    // No cache — block with spinner and wait for the API.
    setOnboardingLoading(true);
    try {
      const data = await onboardingAPI.getStatus();
      setOnboardingCompleted(data.completed);
      if (data.completed && uid) {
        localStorage.setItem(obKey(uid), "1");
      }
    } catch {
      // API failed and no cache — safest default is to show onboarding again.
      setOnboardingCompleted(false);
    } finally {
      setOnboardingLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id ?? null;
      setLoading(false);
      if (!session?.user) {
        setOnboardingCompleted(false);
        setOnboardingLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id ?? null;
      setLoading(false);
      if (!session?.user) {
        setOnboardingCompleted(false);
        setOnboardingLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check onboarding only when the user ID changes (login / account switch),
  // not on every token refresh which keeps the same user ID.
  const userId = user?.id;
  useEffect(() => {
    if (userId) {
      checkOnboardingStatus(userId);
    }
  }, [userId, checkOnboardingStatus]);

  const markOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
    const uid = userIdRef.current;
    if (uid) localStorage.setItem(obKey(uid), "1");
  }, []);

  const value = {
    user,
    session,
    loading,
    onboardingCompleted,
    onboardingLoading,
    markOnboardingComplete,
    checkOnboardingStatus,
    signUp: async (email, password, fullName) => {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (!result.error && result.data.session) {
        await notifyAPI.signupNotify();
      }
      return result;
    },
    signIn: async (email, password) => {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (!result.error) {
        await notifyAPI.loginNotify();
      }
      return result;
    },
    signOut: async () => {
      const uid = userIdRef.current;
      // Do NOT clear the localStorage flag on sign-out — the user completed
      // onboarding and should never have to redo it on the same device.
      return supabase.auth.signOut();
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
