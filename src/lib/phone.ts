/**
 * Phone numbers with a country code (phone fields in checkout, inquiry, account).
 * The field shows a country-code select (default Austria, +43) and the national number;
 * the stored value stays one string, e.g. "+43 660 1234567". Pure – unit tested in
 * tests/unit/phone.test.ts.
 */

/** ISO region → dial code. Austria first (default), then neighbours and frequent origins. */
export const PHONE_COUNTRIES: ReadonlyArray<{ region: string; dial: string }> = [
  { region: "AT", dial: "+43" }, { region: "DE", dial: "+49" }, { region: "CH", dial: "+41" }, { region: "LI", dial: "+423" },
  { region: "IT", dial: "+39" }, { region: "SI", dial: "+386" }, { region: "HU", dial: "+36" }, { region: "SK", dial: "+421" },
  { region: "CZ", dial: "+420" }, { region: "PL", dial: "+48" }, { region: "HR", dial: "+385" }, { region: "BA", dial: "+387" },
  { region: "RS", dial: "+381" }, { region: "ME", dial: "+382" }, { region: "MK", dial: "+389" }, { region: "AL", dial: "+355" },
  { region: "XK", dial: "+383" }, { region: "RO", dial: "+40" }, { region: "BG", dial: "+359" }, { region: "GR", dial: "+30" },
  { region: "TR", dial: "+90" }, { region: "UA", dial: "+380" }, { region: "RU", dial: "+7" }, { region: "FR", dial: "+33" },
  { region: "ES", dial: "+34" }, { region: "PT", dial: "+351" }, { region: "NL", dial: "+31" }, { region: "BE", dial: "+32" },
  { region: "LU", dial: "+352" }, { region: "GB", dial: "+44" }, { region: "IE", dial: "+353" }, { region: "DK", dial: "+45" },
  { region: "SE", dial: "+46" }, { region: "NO", dial: "+47" }, { region: "FI", dial: "+358" }, { region: "US", dial: "+1" },
  { region: "AE", dial: "+971" }, { region: "SA", dial: "+966" }, { region: "IR", dial: "+98" }, { region: "AF", dial: "+93" },
  { region: "SY", dial: "+963" }, { region: "IQ", dial: "+964" }, { region: "EG", dial: "+20" }, { region: "IL", dial: "+972" },
  { region: "IN", dial: "+91" }, { region: "CN", dial: "+86" }, { region: "AU", dial: "+61" },
];

export const DEFAULT_DIAL = "+43";
const DIALS = [...new Set(PHONE_COUNTRIES.map((c) => c.dial))].sort((a, b) => b.length - a.length);

/**
 * Splits a stored value into dial code and national part. "+49 30 123" → ["+49", "30 123"];
 * "0043 660 1" → ["+43", "660 1"]; a value without a code ("0660 123") stays national (+43).
 */
export function splitPhone(value: string): { dial: string; national: string } {
  const v = (value ?? "").trim();
  const intl = v.startsWith("00") ? `+${v.slice(2)}` : v;
  if (intl.startsWith("+")) {
    const compact = intl.replace(/[\s()/.-]/g, "");
    const dial = DIALS.find((d) => compact.startsWith(d));
    if (dial) {
      // Drop the dial code's digits from the typed value, keeping the user's spacing after it.
      let i = 1, matched = 1;
      while (i < intl.length && matched < dial.length) { if (/\d/.test(intl[i])) matched++; i++; }
      return { dial, national: intl.slice(i).replace(/^[\s()/.-]+/, "") };
    }
    return { dial: DEFAULT_DIAL, national: v };
  }
  return { dial: DEFAULT_DIAL, national: v };
}

/**
 * Joins dial code and national number: "+43" + "0660 1234567" → "+43 660 1234567"
 * (the trunk zero is dropped). A national part that already carries a code wins.
 * Empty number → "" (optional fields stay empty).
 */
export function joinPhone(dial: string, national: string): string {
  const n = (national ?? "").trim();
  if (!n) return "";
  if (n.startsWith("+") || n.startsWith("00")) {
    const s = splitPhone(n);
    // Unknown or still incomplete code ("+4"): keep as typed.
    if (s.national.startsWith("+") || s.national.startsWith("00")) return s.national;
    return s.national ? `${s.dial} ${s.national}` : "";
  }
  const withoutTrunk = n.replace(/^\(?0\)?\s*/, "");
  return withoutTrunk ? `${dial} ${withoutTrunk}` : "";
}

/** Canonical form of a stored value: "0660 123" → "+43 660 123", "0049 30 1" → "+49 30 1", "" → "". */
export function normalizePhone(value: string): string {
  const { dial, national } = splitPhone(value ?? "");
  return joinPhone(dial, national);
}
