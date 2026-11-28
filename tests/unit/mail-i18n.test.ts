import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));
const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: "<test@smtp>" })));
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("@/lib/cms", () => ({ getSettings: vi.fn(), getOccasions: vi.fn(async () => []), getAllProducts: vi.fn(async () => []), getExtras: vi.fn(async () => []), getPartners: vi.fn(async () => []), readData: vi.fn(async () => null), writeData: vi.fn() }));
// Content translations: an English status name, no product translations.
vi.mock("@/lib/cms-localized", async () => {
  const cms = await import("@/lib/cms");
  return {
    getSettingsIn: async () => {
      const s = (await cms.getSettings()) as unknown as { orderStatuses: { key: string; label: string }[] };
      return { ...s, orderStatuses: s.orderStatuses.map((o) => (o.key === "in_transit" ? { ...o, label: "On its way" } : o)) };
    },
    getProductsIn: async () => [], getExtrasIn: async () => [], getDeliveryZonesIn: async () => [], getOccasionsIn: async () => [],
  };
});

import { orderConfirmation, orderStatusUpdate } from "@/lib/mail/templates";
import germanMail from "@/i18n/messages/de/mail";

const order: Order = {
  id: "BQ-ABC123", token: "tok", createdAt: "2026-11-04T10:00:00.000Z", status: "paid", history: [],
  recipient: { firstName: "Anna", lastName: "Huber", company: "", street: "Mariahilfer Straße", houseNumber: "12", addition: "", zip: "1060", city: "Wien", country: "AT", phone: "0664 1234567" },
  delivery: { date: "2026-11-05", windowId: "am", windowLabel: "9–12 Uhr", windowFrom: "09:00", windowTo: "12:00", zoneId: "z1", zoneName: "Wien Zone 1", fee: 0 },
  customer: { firstName: "Paul", lastName: "Maier", email: "paul@example.at", phone: "+43 660 1112223" },
  lines: [{ productId: "p-rosalie", productName: "Rosalie", sizeId: "m", sizeLabel: "Mittel", quantity: 1, unitPrice: 65.9, image: "", extras: [], message: "Happy birthday!", senderName: "Paul" }],
  totals: { subtotal: 65.9, extras: 0, delivery: 0, discount: 0, total: 65.9 },
  payment: { method: "card", status: "paid" },
  locale: "en",
};
const brand = { name: "Blumora", siteUrl: "https://blumora.at", email: "office@blumora.at" };

/** A made-up English dictionary – only what the test looks at. */
const english = {
  ...germanMail,
  layout: { questions: "Questions? Write to us at {email}.", hello: "Hi {name}," },
  order: { ...germanMail.order, viewOrder: "View order", size: "Size {size}", totals: { ...germanMail.order.totals, flowers: "Flowers", delivery: "Delivery", free: "free" }, greeting: { ...germanMail.order.greeting, title: "Your greeting card", quote: "“{text}”" } },
  orderConfirmation: { ...germanMail.orderConfirmation, subject: "Your order {id} at {brand}", headline: "Thank you for your order.", preheader: "Delivery on {delivery}." },
};

describe("customer mails in the order's language", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; sendMail.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());

  it("renders the order confirmation with an English dictionary, English dates and prices", () => {
    const mail = orderConfirmation({ order, brand, trackingUrl: "https://blumora.at/en/bestellung/BQ-ABC123?token=tok", locale: "en", m: english });
    expect(mail.subject).toBe("Your order BQ-ABC123 at Blumora");
    expect(mail.html).toContain('<html lang="en">');
    expect(mail.text).toContain("Thank you for your order.");
    expect(mail.text).toContain("Hi Paul,");
    expect(mail.text).toContain("View order: https://blumora.at/en/bestellung/BQ-ABC123?token=tok");
    expect(mail.text).toContain("Thursday, 5 November 2026, 9–12 Uhr");
    expect(mail.text).toContain("Rosalie, Size Mittel – €65.90");
    expect(mail.text).toContain("Delivery: free");
    expect(mail.text).toContain("“Happy birthday!” – Paul");
    expect(mail.text).toContain("Questions? Write to us at office@blumora.at.");
    expect(mail.text).not.toContain("Danke für deine Bestellung");
  });

  it("stays German without a locale – and a missing English text falls back to German", () => {
    const german = orderConfirmation({ order, brand, trackingUrl: "https://t" });
    expect(german.subject).toBe("Deine Bestellung BQ-ABC123 bei Blumora");
    expect(german.html).toContain('<html lang="de">');
    expect(german.text).toContain("Donnerstag, 5. November 2026");
    const status = orderStatusUpdate({ order, status: { key: "paid", label: "Paid", description: "", customerVisible: true } as never, brand, trackingUrl: "https://t", locale: "en", m: english });
    expect(status.text).toContain("Hi Paul,");
    expect(status.text).toContain("Zahlung bestätigt."); // not in the made-up dictionary → German
  });

  it("links to the localized status page and leaves German orders unprefixed", async () => {
    const { orderTrackingUrl, reviewUrl } = await import("@/lib/mail");
    expect(orderTrackingUrl(order, "https://blumora.at/", "en")).toBe("https://blumora.at/en/bestellung/BQ-ABC123?token=tok");
    expect(orderTrackingUrl(order, "https://blumora.at")).toBe("https://blumora.at/bestellung/BQ-ABC123?token=tok");
    expect(reviewUrl(order, "https://blumora.at", "tr")).toBe("https://blumora.at/tr/bewertung?order=BQ-ABC123&token=tok");
  });

  it("sends the status mail of an English order with the localized link and status name", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("MAIL_REDIRECT_TO", "");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({
      brand: { name: "Blumora", claim: "", email: "office@blumora.at" }, seo: { siteUrl: "https://blumora.at" },
      orderStatuses: [{ key: "in_transit", label: "Unterwegs", description: "", customerVisible: true }],
    } as never);
    const mail = await import("@/lib/mail");
    const res = await mail.sendOrderStatusUpdate({ ...order, status: "in_transit" });
    expect(res.sent).toBe(true);
    const sent = (sendMail.mock.calls[0] as unknown as [{ subject: string; html: string; text: string }])[0];
    expect(sent.subject).toBe("On its way – order BQ-ABC123"); // English status name and English mail text
    expect(sent.text).toContain("https://blumora.at/en/bestellung/BQ-ABC123?token=tok");
    expect(sent.html).toContain('<html lang="en">');

    sendMail.mockClear();
    await mail.sendOrderStatusUpdate({ ...order, status: "in_transit", locale: undefined });
    const de = (sendMail.mock.calls[0] as unknown as [{ subject: string; text: string }])[0];
    expect(de.subject).toBe("Unterwegs – Bestellung BQ-ABC123");
    expect(de.text).toContain("https://blumora.at/bestellung/BQ-ABC123?token=tok");
  });
});
