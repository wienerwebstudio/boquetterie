import { describe, expect, it } from "vitest";
import type { Offer } from "@/types";
import { floristOrder, offerMail, orderConfirmation } from "@/lib/mail/templates";
import { offerPreviewOrder } from "@/lib/offers-core";
import { loadMessages } from "@/i18n/messages";

const brand = { name: "Blumora", siteUrl: "https://blumora.at", logoUrl: "https://blumora.at/images/brand/logo-horizontal.png" };
const offer: Offer = {
  id: "AN-MAIL01", token: "M".repeat(32), createdAt: "2026-11-20T09:00:00.000Z", updatedAt: "2026-11-20T09:00:00.000Z", status: "sent", locale: "en",
  customer: { firstName: "Mei", lastName: "Lin", email: "mei@example.com" },
  items: [{ id: "i1", kind: "custom", title: "Bouquet of pink tulips", description: "Only pink tulips", image: "/media/tulips.jpg", quantity: 1, unitPrice: 79 }],
  extras: [],
  delivery: { enabled: true, date: "2026-11-29", from: "14:00", to: "16:00", fee: 9.9 },
  recipient: { kind: "meeting", firstName: "Mei", lastName: "Lin", phone: "+886 912 345 678", street: "Universitätsring", houseNumber: "2", addition: "Haupteingang Burgtheater", zip: "1010", city: "Wien" },
  validUntil: "2026-11-23", history: [],
};

describe("offer mails", () => {
  it("renders the offer in the customer's language with total, pay button and validity", async () => {
    const m = (await loadMessages("en")).mail;
    const mail = offerMail({ order: offerPreviewOrder(offer, { cardsEnabled: false }), brand, payUrl: "https://blumora.at/en/angebot/x", validUntil: offer.validUntil, locale: "en", m });
    expect(mail.subject).toBe("Your personal offer from Blumora");
    expect(mail.html).toContain("Pay now · €88.90");
    expect(mail.html).toContain("https://blumora.at/en/angebot/x");
    expect(mail.html).toContain("Only pink tulips");
    expect(mail.html).toContain("Treffpunkt: Haupteingang Burgtheater");
    expect(mail.text).toContain("Valid until Monday, 23 November 2026");
    expect(mail.html).not.toMatch(/Größe|Size /);
  });

  it("confirms an offer order without promising florist or courier, and the slip shows the description", async () => {
    const m = (await loadMessages("en")).mail;
    const order = { ...offerPreviewOrder(offer, { cardsEnabled: false }), id: "BQ-OFFER1", offerId: offer.id };
    const confirmation = orderConfirmation({ order, brand, trackingUrl: "https://blumora.at/x", locale: "en", m });
    expect(confirmation.text).toContain("your order BQ-OFFER1 for your personal offer is confirmed");
    expect(confirmation.text).not.toMatch(/courier|florist/i);
    const slip = floristOrder({ order: { ...order, floristNote: "Nur rosa!" }, brand });
    expect(slip.text).toContain("Beschreibung: Only pink tulips");
    expect(slip.text).toContain("individuell – siehe Beschreibung");
    expect(slip.subject).toContain("WICHTIGER HINWEIS");
  });
});
