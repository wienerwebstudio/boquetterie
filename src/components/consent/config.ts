/**
 * True when at least one consent-requiring tool (statistics / marketing) is
 * configured through env vars. Without any such tool the shop only sets
 * technically necessary storage, so there is nothing to ask the visitor and the
 * sheet stays closed on the first visit. It can still be opened via the footer
 * link ("Cookie-Einstellungen").
 */
export const consentToolsConfigured = Boolean(
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ||
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
);
