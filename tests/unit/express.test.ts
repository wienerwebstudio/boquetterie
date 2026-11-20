import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildExpressOrderBody, expressMethod, splitName, splitStreet } from "@/lib/express";
import { parseOrderPayload } from "@/lib/orders";

describe("wallet name and address mapping", () => {
  it("splits names: last word is the last name", () => {
    expect(splitName("Anna Maria Huber")).toEqual({ firstName: "Anna Maria", lastName: "Huber" });
    expect(splitName("  Paul   Maier ")).toEqual({ firstName: "Paul", lastName: "Maier" });
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "Cher" });
    expect(splitName(undefined)).toEqual({ firstName: "", lastName: "" });
  });

  it("splits Viennese street lines into street and house number", () => {
    expect(splitStreet("Wiedner Hauptstraße 12")).toEqual({ street: "Wiedner Hauptstraße", houseNumber: "12" });
    expect(splitStreet("Mariahilfer Str. 12/3/4")).toEqual({ street: "Mariahilfer Str.", houseNumber: "12/3/4" });
    expect(splitStreet("Burgring 1, Top 5", "Stiege 2")).toEqual({ street: "Burgring", houseNumber: "1", addition: "Top 5, Stiege 2" });
    expect(splitStreet("Praterstraße 70a")).toEqual({ street: "Praterstraße", houseNumber: "70a" });
  });

  it("moves an over-long house number tail into the addition", () => {
    const r = splitStreet("Landstraßer Hauptstraße 146 Stiege 3 Tür 12");
    expect(r.street).toBe("Landstraßer Hauptstraße");
    expect(r.houseNumber).toBe("146");
    expect(r.addition).toBe("Stiege 3 Tür 12");
  });

  it("leaves the house number empty when the line has none (the order validation rejects it)", () => {
    expect(splitStreet("Stephansplatz")).toEqual({ street: "Stephansplatz", houseNumber: "" });
  });

  it("maps wallets to payment methods – Link counts as card", () => {
    expect(expressMethod("apple_pay")).toBe("apple_pay");
    expect(expressMethod("google_pay")).toBe("google_pay");
    expect(expressMethod("link")).toBe("card");
    expect(expressMethod("klarna")).toBe("card");
  });
});

describe("express order body", () => {
  const wallet = {
    expressPaymentType: "apple_pay",
    billingDetails: { name: "Paul Maier", email: "paul.maier@example.com", phone: "+43 664 7654321" },
    shippingAddress: { name: "Anna Huber", address: { line1: "Wiedner Hauptstraße 12", line2: null, city: "Wien", postal_code: "1040", country: "AT" } },
  };

  it("buyer = billing contact, recipient = shipping contact, and it passes the checkout validation", () => {
    const body = buildExpressOrderBody({
      items: [{ productId: "p-amour", sizeId: "m", quantity: 1, extras: [] }],
      delivery: { date: "2026-11-24", windowId: "morning" },
      wallet,
      locale: "en",
    });
    expect(body.customer).toMatchObject({ firstName: "Paul", lastName: "Maier", email: "paul.maier@example.com", phone: "+43 664 7654321", acceptedTerms: true });
    expect(body.recipient).toMatchObject({ firstName: "Anna", lastName: "Huber", street: "Wiedner Hauptstraße", houseNumber: "12", zip: "1040", city: "Wien", phone: "+43 664 7654321" });
    expect(body.payment).toEqual({ method: "apple_pay" });
    const parsed = parseOrderPayload(body, { greetingMaxChars: 200 });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.payload.delivery).toMatchObject({ date: "2026-11-24", windowId: "morning" });
  });

  it("fails the checkout validation without phone or house number", () => {
    const noPhone = buildExpressOrderBody({
      items: [{ productId: "p-amour", sizeId: "m", quantity: 1, extras: [] }],
      delivery: { date: "2026-11-24" },
      wallet: { ...wallet, billingDetails: { ...wallet.billingDetails, phone: "" } },
    });
    const r1 = parseOrderPayload(noPhone, { greetingMaxChars: 200 });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(Object.keys(r1.errors ?? {})).toContain("recipient.phone");
    const noNumber = buildExpressOrderBody({
      items: [{ productId: "p-amour", sizeId: "m", quantity: 1, extras: [] }],
      delivery: { date: "2026-11-24" },
      wallet: { ...wallet, shippingAddress: { ...wallet.shippingAddress, address: { ...wallet.shippingAddress.address, line1: "Stephansplatz" } } },
    });
    const r2 = parseOrderPayload(noNumber, { greetingMaxChars: 200 });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(Object.keys(r2.errors ?? {})).toContain("recipient.houseNumber");
  });
});
