import { describe, expect, it } from "vitest";
import { addressErrorCode, daysBetween, expressWindowId, safeErrorCode, slotInfo } from "@/components/checkout/checkout-analytics";

const w = (id: string, surcharge = 0) => ({ id, label: id, from: "10:00", to: "11:00", surcharge, active: true });
const days = [
  { date: "2026-11-24", sameDay: true, windows: [w("h17"), w("h18")] },
  { date: "2026-11-25", sameDay: false, windows: [w("h09"), w("h10")] },
  { date: "2026-11-28", sameDay: false, windows: [w("h09")] },
];

describe("checkout analytics helpers", () => {
  it("knows the express window and the slot kind", () => {
    expect(expressWindowId(days[0])).toBe("h17");
    expect(expressWindowId(days[1])).toBeUndefined();
    expect(slotInfo(days, "2026-11-24", "h17", "2026-11-24")).toEqual({ slot_type: "express", days_ahead: 0, express: true });
    expect(slotInfo(days, "2026-11-24", "h18", "2026-11-24")).toEqual({ slot_type: "same_day", days_ahead: 0, express: false });
    expect(slotInfo(days, "2026-11-28", "h09", "2026-11-24")).toEqual({ slot_type: "scheduled", days_ahead: 4, express: false });
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("turns errors into safe codes", () => {
    expect(addressErrorCode({ zip: "x" }, false)).toBe("zip_not_served");
    expect(addressErrorCode({ street: "Bitte Straße" }, true)).toBe("street_invalid");
    expect(safeErrorCode({ type: "card_error", code: "card_declined", decline_code: "insufficient_funds" })).toBe("insufficient_funds");
    expect(safeErrorCode({ type: "invalid_request_error", code: "payment_intent_authentication_failure" })).toBe("payment_intent_authentication_failure");
    expect(safeErrorCode(null)).toBe("unknown");
  });
});
