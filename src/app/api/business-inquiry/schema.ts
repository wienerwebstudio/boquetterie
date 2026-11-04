/**
 * Business inquiry – options, types and validation shared by the form
 * (client) and the API route (server). Pure, no server-only imports.
 */

export const BUSINESS_NEEDS = [
  { value: "abo", label: "Regelmäßige Lieferung (Abo)" },
  { value: "einmalig", label: "Einmalige Lieferung" },
  { value: "event", label: "Event" },
  { value: "geschenke", label: "Geschenke für Mitarbeiter:innen oder Kund:innen" },
] as const;
export type BusinessNeed = (typeof BUSINESS_NEEDS)[number]["value"];

export interface BusinessInquiryInput {
  company: string;
  contact: string;
  email: string;
  phone?: string;
  location: string;
  need: BusinessNeed;
  message: string;
}

/** Stored in data/business-inquiries.json via readData/writeData. */
export interface BusinessInquiry extends BusinessInquiryInput {
  id: string; // BI-XXXXXX
  createdAt: string; // ISO datetime
  /** When the privacy consent checkbox was ticked (same as createdAt). */
  consentAt: string;
  status: "new";
}

export type BusinessInquiryField = keyof BusinessInquiryInput | "consent";
export type BusinessInquiryErrors = Partial<Record<BusinessInquiryField, string>>;

export const LIMITS = { company: 120, contact: 120, email: 200, phone: 40, location: 120, message: 2000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s/().-]{6,}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateBusinessInquiry(body: Record<string, unknown>): { data: BusinessInquiryInput | null; errors: BusinessInquiryErrors } {
  const company = str(body.company, LIMITS.company);
  const contact = str(body.contact, LIMITS.contact);
  const email = str(body.email, LIMITS.email);
  const phone = str(body.phone, LIMITS.phone);
  const location = str(body.location, LIMITS.location);
  const need = str(body.need, 20);
  const message = str(body.message, LIMITS.message);
  const consent = body.consent === true || body.consent === "true" || body.consent === "on";

  const errors: BusinessInquiryErrors = {};
  if (company.length < 2) errors.company = "Bitte gib den Namen deines Unternehmens an.";
  if (contact.length < 2) errors.contact = "Bitte gib eine Ansprechperson an.";
  if (!EMAIL_RE.test(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  if (phone && !PHONE_RE.test(phone)) errors.phone = "Bitte prüfe die Telefonnummer.";
  if (location.length < 2) errors.location = "Bitte gib Standort oder Postleitzahl an.";
  if (!BUSINESS_NEEDS.some((n) => n.value === need)) errors.need = "Bitte wähle, was du brauchst.";
  if (message.length < 10) errors.message = "Bitte beschreib kurz deinen Bedarf (mindestens 10 Zeichen).";
  if (!consent) errors.consent = "Bitte bestätige, dass wir deine Angaben zur Bearbeitung verwenden dürfen.";

  if (Object.keys(errors).length > 0) return { data: null, errors };
  return {
    data: { company, contact, email, ...(phone && { phone }), location, need: need as BusinessNeed, message },
    errors,
  };
}
