/** Build translated pricing comparison rows for PricingPage. */
export function buildPricingFeatures(t) {
  const cat = (key) => t(`pricing.categories.${key}`);
  const text = (key) => t(`pricing.values.${key}`);

  return [
    {
      label: t("pricing.features.aiMessages"),
      free: text("fiveMessages"),
      basic: text("fiftyMessages"),
      pro: text("unlimited"),
      category: cat("aiConsultant"),
    },
    {
      label: t("pricing.features.aiProfile"),
      free: true,
      basic: true,
      pro: true,
      category: cat("aiConsultant"),
    },
    {
      label: t("pricing.features.voiceInput"),
      free: true,
      basic: true,
      pro: true,
      category: cat("aiConsultant"),
    },
    {
      label: t("pricing.features.aiTts"),
      free: true,
      basic: true,
      pro: true,
      category: cat("aiConsultant"),
    },
    {
      label: t("pricing.features.priorityAi"),
      free: false,
      basic: true,
      pro: true,
      category: cat("aiConsultant"),
    },
    {
      label: t("pricing.features.allTests"),
      free: true,
      basic: true,
      pro: true,
      category: cat("visionTesting"),
    },
    {
      label: t("pricing.features.distanceContrast"),
      free: true,
      basic: true,
      pro: true,
      category: cat("visionTesting"),
    },
    {
      label: t("pricing.features.refractionTests"),
      free: true,
      basic: true,
      pro: true,
      category: cat("visionTesting"),
    },
    {
      label: t("pricing.features.fullBattery"),
      free: true,
      basic: true,
      pro: true,
      category: cat("visionTesting"),
    },
    {
      label: t("pricing.features.testHistory"),
      free: text("lastThree"),
      basic: text("allResults"),
      pro: text("allResults"),
      category: cat("resultsReports"),
    },
    {
      label: t("pricing.features.pdfReport"),
      free: true,
      basic: true,
      pro: true,
      category: cat("resultsReports"),
    },
    {
      label: t("pricing.features.aiFindings"),
      free: true,
      basic: true,
      pro: true,
      category: cat("resultsReports"),
    },
    {
      label: t("pricing.features.advancedAnalytics"),
      free: false,
      basic: false,
      pro: true,
      category: cat("resultsReports"),
    },
    {
      label: t("pricing.features.multiLanguage"),
      free: true,
      basic: true,
      pro: true,
      category: cat("general"),
    },
    {
      label: t("pricing.features.healthProfile"),
      free: true,
      basic: true,
      pro: true,
      category: cat("general"),
    },
    {
      label: t("pricing.features.cancelAnytime"),
      free: false,
      basic: true,
      pro: true,
      category: cat("general"),
    },
  ];
}

export function buildPlanCardFeatures(planId, t) {
  const defs = {
    free: [
      { key: "ai5", ok: true },
      { key: "allTests", ok: true },
      { key: "last3", ok: true },
      { key: "pdf", ok: true },
      { key: "noPriority", ok: false },
      { key: "noAnalytics", ok: false },
    ],
    basic: [
      { key: "ai50", ok: true },
      { key: "allTests", ok: true },
      { key: "fullHistory", ok: true },
      { key: "pdf", ok: true },
      { key: "priority", ok: true },
      { key: "noAnalytics", ok: false },
    ],
    pro: [
      { key: "aiUnlimited", ok: true },
      { key: "allTests", ok: true },
      { key: "fullHistory", ok: true },
      { key: "pdf", ok: true },
      { key: "priority", ok: true },
      { key: "analytics", ok: true },
    ],
  };
  return (defs[planId] || []).map(({ key, ok }) => ({
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
