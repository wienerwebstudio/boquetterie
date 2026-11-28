/**
 * How prices relate to VAT (Umsatzsteuer). Blumora is an Austrian small business
 * ("Kleinunternehmer", § 6 Abs. 1 Z 27 UStG 1994) and charges no VAT, so no
 * label may say "inkl. MwSt.". All displayed prices are final prices.
 *
 * When the business becomes VAT-liable (turnover above the small-business
 * threshold), switch `SMALL_BUSINESS` off, set up Stripe Tax with an Austrian
 * registration (see docs/PAYMENTS.md) and have the wording checked again.
 *
 * Legal wording: to be confirmed by the tax advisor (see BLOOMERY_IMPROVEMENT_LOG.md).
 */
export const SMALL_BUSINESS = true;

export const VAT_TEXT = SMALL_BUSINESS
  ? {
      /** Short label next to a price or total. */
      short: "Endpreis",
      /** Total label in cart, checkout, order page and mails. */
      total: "Gesamt",
      /** Sentence for summaries, the delivery page, the footer and mails. */
      note: "Gemäß § 6 Abs. 1 Z 27 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).",
    }
  : {
      short: "inkl. USt.",
      total: "Gesamt (inkl. USt.)",
      note: "Alle Preise inkl. USt.",
    };
