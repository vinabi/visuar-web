import { PLANS } from "../context/PlanContext";

function cap(planId) {
  return PLANS[planId].capabilities;
}

/** Build translated pricing comparison rows for PricingPage. */
export function buildPricingFeatures(t) {
  const cat = (key) => t(`pricing.categories.${key}`);
  const text = (key) => t(`pricing.values.${key}`);

  const row = (labelKey, categoryKey, values) => ({
    label: t(`pricing.features.${labelKey}`),
    category: cat(categoryKey),
    free: values.free,
    basic: values.basic,
    pro: values.pro,
  });

  return [
    row("aiMessages", "aiConsultant", {
      free: text(cap("free").messagesKey),
      basic: text(cap("basic").messagesKey),
      pro: text(cap("pro").messagesKey),
    }),
    row("aiProfile", "aiConsultant", { free: true, basic: true, pro: true }),
    row("voiceInput", "aiConsultant", { free: true, basic: true, pro: true }),
    row("aiTts", "aiConsultant", { free: true, basic: true, pro: true }),
    row("allTests", "visionTesting", { free: true, basic: true, pro: true }),
    row("distanceContrast", "visionTesting", { free: true, basic: true, pro: true }),
    row("refractionTests", "visionTesting", { free: true, basic: true, pro: true }),
    row("fullBattery", "visionTesting", { free: true, basic: true, pro: true }),
    row("testHistory", "resultsReports", {
      free: text(cap("free").testHistoryKey),
      basic: text(cap("basic").testHistoryKey),
      pro: text(cap("pro").testHistoryKey),
    }),
    row("pdfReport", "resultsReports", { free: true, basic: true, pro: true }),
    row("aiFindings", "resultsReports", {
      free: cap("free").canViewAIFindings,
      basic: cap("basic").canViewAIFindings,
      pro: cap("pro").canViewAIFindings,
    }),
    row("advancedAnalytics", "resultsReports", {
      free: cap("free").hasAdvancedAnalytics,
      basic: cap("basic").hasAdvancedAnalytics,
      pro: cap("pro").hasAdvancedAnalytics,
    }),
    row("multiLanguage", "general", { free: true, basic: true, pro: true }),
    row("healthProfile", "general", { free: true, basic: true, pro: true }),
    row("cancelAnytime", "general", { free: false, basic: true, pro: true }),
  ];
}

export function buildPlanCardFeatures(planId, t) {
  return (PLANS[planId]?.cardFeatures || []).map(({ key, ok }) => ({
    text: t(`pricing.cardFeatures.${planId}.${key}`),
    ok,
  }));
}

export function planDisplayName(planId, t) {
  return t(`pricing.plans.${planId}.name`);
}

export function planMessagesLabel(planId, t) {
  return t(`pricing.plans.${planId}.messages`);
}

export function restrictedHistoryLabel(t) {
  return t("pricing.values.sessionOnly");
}
