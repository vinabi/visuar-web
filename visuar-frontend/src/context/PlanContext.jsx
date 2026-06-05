import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { planAPI } from "../lib/api";

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "Free",
    maxMessages: 5,
    messagesLabel: "5 messages / conversation",
    capabilities: {
      canPersistResults: false,
      canViewAIFindings: false,
      hasAdvancedAnalytics: false,
      testHistoryKey: "sessionOnly",
      messagesKey: "fiveMessages",
    },
    cardFeatures: [
      { key: "ai5", ok: true },
      { key: "allTests", ok: true },
      { key: "sessionOnly", ok: true },
      { key: "pdf", ok: true },
      { key: "noAiFindings", ok: false },
      { key: "noAnalytics", ok: false },
    ],
  },
  basic: {
    id: "basic",
    name: "Basic",
    price: 5,
    priceLabel: "$5 / month",
    maxMessages: 50,
    messagesLabel: "50 messages / conversation",
    capabilities: {
      canPersistResults: true,
      canViewAIFindings: false,
      hasAdvancedAnalytics: false,
      testHistoryKey: "allResults",
      messagesKey: "fiftyMessages",
    },
    cardFeatures: [
      { key: "ai50", ok: true },
      { key: "allTests", ok: true },
      { key: "fullHistory", ok: true },
      { key: "pdf", ok: true },
      { key: "noAiFindings", ok: false },
      { key: "noAnalytics", ok: false },
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 10,
    priceLabel: "$10 / month",
    maxMessages: 9999,
    messagesLabel: "Unlimited messages",
    capabilities: {
      canPersistResults: true,
      canViewAIFindings: true,
      hasAdvancedAnalytics: true,
      testHistoryKey: "allResults",
      messagesKey: "unlimited",
    },
    cardFeatures: [
      { key: "aiUnlimited", ok: true },
      { key: "allTests", ok: true },
      { key: "fullHistory", ok: true },
      { key: "pdf", ok: true },
      { key: "aiFindings", ok: true },
      { key: "analytics", ok: true },
    ],
  },
};

const LS_KEY = "visuar_plan_cache";

function readCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return PLANS[saved.planId] ? saved.planId : "free";
  } catch {
    return "free";
  }
}

function writeCache(planId) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ planId }));
  } catch {}
}

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const { session } = useAuth();

  // Initialise instantly from cache so UI never flickers
  const [activePlanId, setActivePlanId] = useState(readCache);
  const [syncing, setSyncing] = useState(false);

  // Whenever the session changes (login / logout), fetch the real plan from DB
  useEffect(() => {
    if (!session?.access_token) {
      // Logged out — reset to free
      setActivePlanId("free");
      writeCache("free");
      return;
    }

    let cancelled = false;
    setSyncing(true);
    planAPI
      .getPlan()
      .then((data) => {
        if (cancelled) return;
        const planId = PLANS[data?.plan] ? data.plan : "free";
        setActivePlanId(planId);
        writeCache(planId);
      })
      .catch(() => {
        // Backend unreachable — keep the cached value
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const activatePlan = async (planId) => {
    if (!PLANS[planId]) return;
    const previousId = activePlanId;
    // Optimistic update
    setActivePlanId(planId);
    writeCache(planId);
    // Persist to DB — revert and re-throw on failure so callers can handle it
    try {
      await planAPI.setPlan(planId);
    } catch (err) {
      setActivePlanId(previousId);
      writeCache(previousId);
      throw err;
    }
  };

  const plan = PLANS[activePlanId];

  return (
    <PlanContext.Provider value={{ activePlanId, plan, activatePlan, PLANS, syncing }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
