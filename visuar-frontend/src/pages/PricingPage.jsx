import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  Check,
  X,
  Zap,
  Crown,
  Shield,
  Loader2,
  CreditCard,
  Lock,
  Minus,
} from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useTheme } from "../context/ThemeContext";
import { usePlan, PLANS } from "../context/PlanContext";
import {
  buildPricingFeatures,
  buildPlanCardFeatures,
  planDisplayName,
  planMessagesLabel,
} from "../utils/pricingFeatures";
import { LanguageSelector } from "@/components/LanguageSelector";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function FeatureValue({ value, isDarkMode, planId, lastThreeLabel }) {
  if (value === true) {
    return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
  }
  if (value === false) {
    return <X className={`w-4 h-4 mx-auto ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />;
  }
  const highlight =
    planId === "pro" ||
    (planId === "basic" && value !== lastThreeLabel);
  return (
    <span className={`text-xs font-semibold ${
      highlight
        ? isDarkMode ? "text-cyan-400" : "text-cyan-600"
        : isDarkMode ? "text-slate-400" : "text-slate-500"
    }`}>
      {value}
    </span>
  );
}

// ── Card payment form ─────────────────────────────────────────────────────────

function CheckoutForm({ plan, onSuccess, onCancel, isDarkMode, t }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const cardStyle = {
    style: {
      base: {
        fontSize: "16px",
        color: isDarkMode ? "#e2e8f0" : "#1e293b",
        fontFamily: "system-ui, sans-serif",
        "::placeholder": { color: isDarkMode ? "#64748b" : "#94a3b8" },
        iconColor: isDarkMode ? "#38bdf8" : "#0ea5e9",
      },
      invalid: { color: "#ef4444", iconColor: "#ef4444" },
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !cardComplete) return;
    setProcessing(true);
    setCardError(null);

    const cardEl = elements.getElement(CardElement);
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: "card",
      card: cardEl,
    });

    if (error) {
      setCardError(error.message);
      setProcessing(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 900));
    try {
      await onSuccess(paymentMethod.id);
    } catch {
      setCardError(t("pricing.activateError"));
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-cyan-500" />
        <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
          {t("pricing.cardDetails")}
        </span>
        <span className={`ml-auto text-xs flex items-center gap-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          <Lock className="w-3 h-3" /> {t("pricing.securedStripe")}
        </span>
      </div>

      <div className={`rounded-xl border px-4 py-3.5 transition-colors ${
        isDarkMode ? "bg-slate-700/50 border-slate-600" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <CardElement
          options={cardStyle}
          onChange={(e) => {
            setCardComplete(e.complete);
            setCardError(e.error?.message || null);
          }}
        />
      </div>

      {cardError && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" /> {cardError}
        </p>
      )}

      <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
        {t("pricing.testCardHint")}
      </p>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
            isDarkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          } disabled:opacity-50`}
        >
          {t("pricing.cancel")}
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || processing}
          className="flex-1 rounded-xl py-3 text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t("pricing.processing")}</>
          ) : (
            <><Lock className="w-3.5 h-3.5" /> {t("pricing.pay", { price: plan.priceLabel })}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Plan card (top section) ───────────────────────────────────────────────────

function PlanCard({ plan, isActive, isCurrent, onSelect, isDarkMode, t }) {
  const isPro = plan.id === "pro";
  const isBasic = plan.id === "basic";
  const cardFeatures = buildPlanCardFeatures(plan.id, t);
  const displayName = planDisplayName(plan.id, t);
  const messagesLabel = planMessagesLabel(plan.id, t);

  return (
    <div className={`dashboard-hover-zoom-subtle relative rounded-2xl border-2 p-6 flex flex-col gap-4 ${
      isActive
        ? "border-cyan-500 shadow-xl shadow-cyan-500/20"
        : isDarkMode
        ? "border-slate-700 hover:border-slate-500"
        : "border-slate-200 hover:border-slate-300 shadow-sm"
    } ${isDarkMode ? "bg-slate-800/60" : "bg-white"}`}>

      {isPro && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow">
            {t("pricing.mostPopular")}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${
          isPro ? "bg-cyan-500/20 text-cyan-400" :
          isBasic ? "bg-blue-500/20 text-blue-400" :
          isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
        }`}>
          {isPro ? <Crown className="w-5 h-5" /> : isBasic ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
        </div>
        <div>
          <h3 className={`font-bold text-lg leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {displayName}
          </h3>
          <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {messagesLabel}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className={`text-2xl font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {plan.price === 0 ? t("pricing.freePrice") : `$${plan.price}`}
          </div>
          {plan.price > 0 && (
            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{t("pricing.perMonth")}</p>
          )}
        </div>
      </div>

      {/* Feature list with ✓ and ✗ */}
      <ul className="space-y-2">
        {cardFeatures.map((f) => (
          <li key={f.text} className={`flex items-center gap-2 text-sm ${
            f.ok
              ? isDarkMode ? "text-slate-300" : "text-slate-700"
              : isDarkMode ? "text-slate-600" : "text-slate-400"
          }`}>
            {f.ok
              ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <X className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-slate-600" : "text-slate-300"}`} />
            }
            <span className={f.ok ? "" : "line-through"}>{f.text}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div className={`mt-auto rounded-xl py-2.5 text-center text-sm font-semibold ${
          isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
        }`}>
          {t("pricing.currentPlanBadge")}
        </div>
      ) : plan.price === 0 ? (
        <button
          onClick={() => onSelect(plan)}
          className={`mt-auto rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            isDarkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {t("pricing.downgradeFree")}
        </button>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          className={`mt-auto rounded-xl py-2.5 text-sm font-bold transition-colors ${
            isPro
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25"
              : "bg-cyan-600 hover:bg-cyan-500 text-white"
          }`}
        >
          {t("pricing.upgradeTo", { plan: displayName })}
        </button>
      )}
    </div>
  );
}

// ── Full comparison table ─────────────────────────────────────────────────────

function ComparisonTable({ isDarkMode, activePlanId, features, t }) {
  const categories = [...new Set(features.map((f) => f.category))];

  const colHeader = (planId) => {
    const p = PLANS[planId];
    const isCurrent = activePlanId === planId;
    const isPro = planId === "pro";
    const name = planDisplayName(planId, t);
    return (
      <th key={planId} className="text-center pb-4 w-28">
        <div className={`text-sm font-bold mb-0.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          {name}
        </div>
        <div className={`text-xs font-medium ${
          isPro ? "text-cyan-500" : isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}>
          {p.price === 0 ? t("pricing.freePrice") : `$${p.price}/mo`}
        </div>
        {isCurrent && (
          <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            isDarkMode ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700"
          }`}>
            {t("pricing.currentPlanBadge")}
          </span>
        )}
      </th>
    );
  };

  return (
    <div className={`dashboard-hover-zoom-subtle rounded-2xl border overflow-visible ${
      isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-white"
    }`}>
      <div className={`px-6 py-4 border-b ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}>
        <h2 className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          {t("pricing.comparisonTitle")}
        </h2>
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-b-2xl">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? "border-slate-700" : "border-slate-100"}`}>
              <th className="text-left px-6 py-4 w-full" />
              {colHeader("free")}
              {colHeader("basic")}
              {colHeader("pro")}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const rows = features.filter((f) => f.category === cat);
              return [
                // Category header row
                <tr key={`cat-${cat}`} className={`${isDarkMode ? "bg-slate-700/30" : "bg-slate-50"}`}>
                  <td
                    colSpan={4}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-widest ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {cat}
                  </td>
                </tr>,
                // Feature rows
                ...rows.map((f) => (
                  <tr
                    key={f.label}
                    className={`border-b last:border-0 ${
                      isDarkMode ? "border-slate-700/50 hover:bg-slate-700/20" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <td className={`px-6 py-3.5 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {f.label}
                    </td>
                    <td className="text-center py-3.5">
                      <FeatureValue value={f.free} isDarkMode={isDarkMode} planId="free" lastThreeLabel={t("pricing.values.lastThree")} />
                    </td>
                    <td className="text-center py-3.5">
                      <FeatureValue value={f.basic} isDarkMode={isDarkMode} planId="basic" lastThreeLabel={t("pricing.values.lastThree")} />
                    </td>
                    <td className="text-center py-3.5">
                      <FeatureValue value={f.pro} isDarkMode={isDarkMode} planId="pro" lastThreeLabel={t("pricing.values.lastThree")} />
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { activePlanId, activatePlan } = usePlan();
  const navigate = useNavigate();
  const features = useMemo(() => buildPricingFeatures(t), [t]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [succeeded, setSucceeded] = useState(false);
  const [succeededPlan, setSucceededPlan] = useState(null);

  const handleSelectPlan = (plan) => {
    if (plan.price === 0) {
      activatePlan("free");
      setSucceededPlan(PLANS.free);
      setSucceeded(true);
      return;
    }
    setSelectedPlan(plan);
    // Scroll to payment form smoothly
    setTimeout(() => {
      document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const handlePaymentSuccess = async () => {
    await activatePlan(selectedPlan.id);
    setSucceededPlan(selectedPlan);
    setSelectedPlan(null);
    setSucceeded(true);
  };

  if (succeeded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <AnimatedBackground />
        <div className={`dashboard-hover-zoom-subtle relative z-10 rounded-2xl border p-10 max-w-sm w-full mx-4 text-center shadow-2xl ${
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        }`}>
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {succeededPlan?.price === 0 ? t("pricing.downgraded") : t("pricing.paymentSuccess")}
          </h2>
          <p className={`text-sm mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {succeededPlan?.price === 0
              ? t("pricing.nowOnFree")
              : t("pricing.nowOnPlan", { plan: planDisplayName(succeededPlan?.id, t) })}
          </p>
          <p className={`text-sm mb-8 font-medium ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
            {planMessagesLabel(succeededPlan?.id, t)}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full rounded-xl py-3 font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              {t("pricing.goDashboard")}
            </button>
            <button
              onClick={() => navigate("/ai-consult")}
              className={`w-full rounded-xl py-3 font-semibold transition-colors ${
                isDarkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("pricing.openAiConsult")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-slate-900" : "bg-slate-50"}`}>
      <AnimatedBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 overflow-visible">
        <div className="absolute top-6 right-6 z-20">
          <LanguageSelector isDarkMode={isDarkMode} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Link
            to="/dashboard"
            className={`p-2 rounded-xl transition-colors ${
              isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-3xl font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {t("pricing.title")}
            </h1>
            <p className={`text-sm mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {t("pricing.subtitle")}
            </p>
          </div>
        </div>

        {/* Current plan note */}
        <p className={`text-sm mb-8 ml-14 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
          {t("pricing.currentPlan", { plan: planDisplayName(activePlanId, t) })}
        </p>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 overflow-visible pt-4">
          {Object.values(PLANS).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isActive={selectedPlan?.id === plan.id}
              isCurrent={activePlanId === plan.id}
              onSelect={handleSelectPlan}
              isDarkMode={isDarkMode}
              t={t}
            />
          ))}
        </div>

        {/* Stripe checkout */}
        {selectedPlan && (
          <div
            id="checkout-form"
            className={`dashboard-hover-zoom-subtle max-w-md mx-auto rounded-2xl border p-7 shadow-2xl mb-10 ${
              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <h2 className={`text-lg font-bold mb-1 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {t("pricing.subscribeTo", { plan: planDisplayName(selectedPlan.id, t) })}
            </h2>
            <p className={`text-sm mb-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {selectedPlan.priceLabel} {t("pricing.billedMonthly")}
            </p>
            <Elements stripe={stripePromise}>
              <CheckoutForm
                plan={selectedPlan}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setSelectedPlan(null)}
                isDarkMode={isDarkMode}
                t={t}
              />
            </Elements>
          </div>
        )}

        {/* Full comparison table */}
        <ComparisonTable
          isDarkMode={isDarkMode}
          activePlanId={activePlanId}
          features={features}
          t={t}
        />

        {/* Footer */}
        <p className={`text-center text-xs mt-8 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
          {t("pricing.demoFooter")}
        </p>
      </div>
    </div>
  );
}
