import { describe, expect, it } from "vitest";
import { buildSlots, slotLabel } from "@/components/checkout/stripe-methods";

describe("Stripe swipe row", () => {
  const types = ["card", "link", "klarna", "eps", "amazon_pay"];

  it("one entry per method, Link stays inside the card form", () => {
    const slots = buildSlots(types, "card");
    expect(slots.map((s) => s.id)).toEqual(["card", "klarna", "eps", "amazon_pay"]);
    expect(slots[0].types).toEqual(["card", "link"]);
    expect(slots[1].types).toEqual(["klarna"]);
  });

  it("puts the method chosen in the checkout first (wallets live in the card entry)", () => {
    expect(buildSlots(types, "eps")[0].id).toBe("eps");
    expect(buildSlots(types, "klarna").map((s) => s.id)).toEqual(["klarna", "card", "eps", "amazon_pay"]);
    expect(buildSlots(types, "apple_pay")[0].id).toBe("card");
    expect(buildSlots(types, "google_pay")[0].id).toBe("card");
  });

  it("an unavailable chosen method keeps Stripe's order", () => {
    expect(buildSlots(["card", "eps"], "paypal").map((s) => s.id)).toEqual(["card", "eps"]);
    expect(buildSlots([], "card")).toEqual([]);
  });

  it("labels: brand names as they are, only the card is translated", () => {
    expect(slotLabel("card", "Karte")).toBe("Karte");
    expect(slotLabel("amazon_pay", "Karte")).toBe("Amazon Pay");
    expect(slotLabel("eps", "Card")).toBe("EPS");
    expect(slotLabel("some_new_method", "Card")).toBe("Some New Method");
  });
});
