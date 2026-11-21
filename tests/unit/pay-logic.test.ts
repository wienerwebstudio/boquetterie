import { describe, expect, it } from "vitest";
import { amountChanged, clearAttempt, displayCents, inlineElementsFor, loadAttempt, saveAttempt, statusPath } from "@/components/checkout/pay-logic";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("inline Payment Element per list entry", () => {
  it("puts the card fields first for Kreditkarte – no wallet, no Link", () => {
    expect(inlineElementsFor("card")).toEqual({ types: ["card"], wallets: { applePay: "never", googlePay: "never", link: "never" }, order: ["card"] });
  });

  it("maps Apple Pay and Google Pay to the card type with only their own wallet visible and first", () => {
    const apple = inlineElementsFor("apple_pay");
    expect(apple?.types).toEqual(["card"]);
    expect(apple?.wallets).toEqual({ applePay: "auto", googlePay: "never", link: "never" });
    expect(apple?.order?.[0]).toBe("apple_pay");
    const google = inlineElementsFor("google_pay");
    expect(google?.types).toEqual(["card"]);
    expect(google?.wallets).toEqual({ applePay: "never", googlePay: "auto", link: "never" });
    expect(google?.order?.[0]).toBe("google_pay");
  });

  it("uses the redirect methods' own Stripe types and nothing for PayPal", () => {
    expect(inlineElementsFor("klarna")?.types).toEqual(["klarna"]);
    expect(inlineElementsFor("eps")?.types).toEqual(["eps"]);
    expect(inlineElementsFor("klarna")?.order).toEqual(["klarna"]);
    expect(inlineElementsFor("eps")?.order).toEqual(["eps"]);
    expect(inlineElementsFor("paypal")).toBeNull();
  });
});

describe("amounts", () => {
  it("converts euros to cents without float noise and never below 1", () => {
    expect(displayCents(64.9)).toBe(6490);
    expect(displayCents(0.1 + 0.2)).toBe(30);
    expect(displayCents(0)).toBe(1);
  });

  it("detects when the server charges something else than Elements showed", () => {
    expect(amountChanged(74.8, displayCents(74.8))).toBe(false);
    expect(amountChanged(74.8, displayCents(64.9))).toBe(true);
    expect(amountChanged(19.99, 1999)).toBe(false);
  });
});

describe("retry attempt (no duplicate order)", () => {
  it("stores the attempt per scope without the client secret and reads it back", () => {
    const s = memoryStorage();
    saveAttempt("checkout", { key: "k1", id: "BQ-ABC234", token: "t".repeat(24), total: 74.8 }, s);
    expect(loadAttempt("checkout", s)).toEqual({ key: "k1", id: "BQ-ABC234", token: "t".repeat(24), total: 74.8 });
    expect([...s.m.values()].join("")).not.toContain("secret");
    expect(loadAttempt("other", s)).toBeNull();
    clearAttempt("checkout", s);
    expect(loadAttempt("checkout", s)).toBeNull();
  });

  it("ignores broken or foreign storage content", () => {
    const s = memoryStorage();
    s.setItem("blumora-stripe-attempt:checkout", "{not json");
    expect(loadAttempt("checkout", s)).toBeNull();
    s.setItem("blumora-stripe-attempt:checkout", JSON.stringify({ id: "BQ-1" }));
    expect(loadAttempt("checkout", s)).toBeNull();
    expect(loadAttempt("checkout", undefined)).toBeNull();
  });
});

describe("status page path", () => {
  it("encodes id and token and can keep the cart (express purchase from the product page)", () => {
    expect(statusPath("BQ-ABC234", "a b")).toBe("/bestellung/BQ-ABC234?token=a%20b&neu=1");
    expect(statusPath("BQ-ABC234", "t", "&warenkorb=behalten")).toBe("/bestellung/BQ-ABC234?token=t&neu=1&warenkorb=behalten");
  });
});
