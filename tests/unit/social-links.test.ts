import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { Order, SiteSettings } from "@/types";
import { CONTENT_MIGRATIONS, migrateDocument, SOCIAL_LINKS, withSocialLinks } from "@/lib/content-migrations";
import { footerSocialLinks, hidesFloatingWhatsapp, instagramHandle, profileLinks, sameAsUrls, usableUrl, whatsappSupport } from "@/lib/social";
import { organizationLd } from "@/lib/seo";
import { orderConfirmation } from "@/lib/mail/templates";
import germanMail from "@/i18n/messages/de/mail";
import englishMail from "@/i18n/messages/en/mail";
import { mergeMessages } from "@/i18n/messages";

const repoSettings = (): SiteSettings => JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "settings.json"), "utf8"));
const MIGRATION = CONTENT_MIGRATIONS.find((m) => m.id === "2026-11-23-whatsapp-social-links")!;

/** content/settings.json as it was before the links existed (commit 45216d9). */
function settingsBeforeLinks(): unknown {
  try {
    return JSON.parse(execFileSync("git", ["show", "45216d9:content/settings.json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    // Shallow clone without that commit: rebuild the old file from today's one.
    const s = repoSettings() as unknown as Record<string, unknown> & { brand: { social: Record<string, string> } };
    const { whatsappSupport247: _drop, ...rest } = s;
    void _drop;
    const { whatsapp: _w, x: _x, linkedin: _l, ...social } = s.brand.social;
    void _w; void _x; void _l;
    return { ...rest, brand: { ...s.brand, social: { ...social, instagram: "" } } };
  }
}

describe("WhatsApp/social links migration", () => {
  it("turns the stored settings from before the change into today's content/settings.json", () => {
    // This migration and every later one (e.g. the new phone number) lead to today's file.
    const later = CONTENT_MIGRATIONS.slice(CONTENT_MIGRATIONS.indexOf(MIGRATION));
    expect(later.reduce((d, m) => migrateDocument(m, "settings", d), settingsBeforeLinks())).toEqual(repoSettings());
  });

  it("is a no-op on today's settings (same object)", () => {
    const now = repoSettings();
    expect(migrateDocument(MIGRATION, "settings", now)).toBe(now);
  });

  it("never overwrites links or the 24/7 switch set in the admin", () => {
    const stored = { brand: { name: "Blumora", social: { instagram: "https://www.instagram.com/anders/", whatsapp: "https://wa.me/431234" } }, whatsappSupport247: false };
    const next = withSocialLinks(stored) as typeof stored & { brand: { social: Record<string, string> } };
    expect(next.brand.social).toEqual({ whatsapp: "https://wa.me/431234", instagram: "https://www.instagram.com/anders/", x: SOCIAL_LINKS.x, linkedin: SOCIAL_LINKS.linkedin });
    expect(next.whatsappSupport247).toBe(false);
  });

  it("fills empty values and leaves documents without brand.social alone", () => {
    const next = withSocialLinks<unknown>({ brand: { social: { instagram: " ", tiktok: "" } } }) as { brand: { social: Record<string, string> }; whatsappSupport247: boolean };
    expect(next.brand.social).toEqual({ ...SOCIAL_LINKS, tiktok: "" });
    expect(next.whatsappSupport247).toBe(true);
    const bare = { sameDayEnabled: true, brand: { name: "Blumora" } };
    expect(withSocialLinks(bare)).toBe(bare);
  });
});

describe("social link helpers", () => {
  const settings = (social: SiteSettings["brand"]["social"], whatsappSupport247?: boolean) => ({ brand: { social }, whatsappSupport247 });

  it("accepts only real http(s) links", () => {
    expect(usableUrl("https://x.com/blumora_at")).toBe("https://x.com/blumora_at");
    expect(usableUrl("")).toBeNull();
    expect(usableUrl("   ")).toBeNull();
    expect(usableUrl("[Instagram-Link]")).toBeNull();
    expect(usableUrl("javascript:alert(1)")).toBeNull();
    expect(usableUrl("instagram.com/blumora.at")).toBeNull();
    expect(usableUrl(undefined)).toBeNull();
  });

  it("hides every link that is empty", () => {
    const none = settings({ instagram: "", facebook: "" }, true);
    expect(whatsappSupport(none)).toBeNull();
    expect(profileLinks(none)).toEqual([]);
    expect(footerSocialLinks(none)).toEqual([]);
    expect(sameAsUrls(none)).toEqual([]);
  });

  it("says 24/7 only when the switch is on", () => {
    expect(whatsappSupport(settings({ whatsapp: SOCIAL_LINKS.whatsapp }, true))).toEqual({ href: SOCIAL_LINKS.whatsapp, is247: true });
    expect(whatsappSupport(settings({ whatsapp: SOCIAL_LINKS.whatsapp }))).toEqual({ href: SOCIAL_LINKS.whatsapp, is247: false });
  });

  it("orders the footer Instagram, X, LinkedIn, WhatsApp and keeps WhatsApp out of sameAs", () => {
    const s = repoSettings();
    expect(footerSocialLinks(s).map((l) => [l.key, l.href])).toEqual([
      ["instagram", "https://www.instagram.com/blumora.at/"],
      ["x", "https://x.com/blumora_at"],
      ["linkedin", "https://at.linkedin.com/in/blumora-at-b98149451"],
      ["whatsapp", "https://wa.me/message/VAQJPN3JVT53A1"],
    ]);
    expect(organizationLd(s).sameAs).toEqual(["https://www.instagram.com/blumora.at/", "https://x.com/blumora_at", "https://at.linkedin.com/in/blumora-at-b98149451"]);
    expect(organizationLd({ ...s, brand: { ...s.brand, social: {} } })).not.toHaveProperty("sameAs");
  });

  it("never links Trustpilot", () => {
    expect(JSON.stringify(repoSettings()).toLowerCase()).not.toContain("trustpilot");
  });

  it("reads the Instagram handle", () => {
    expect(instagramHandle("https://www.instagram.com/blumora.at/")).toBe("@blumora.at");
    expect(instagramHandle("https://x.com/blumora_at")).toBeNull();
    expect(instagramHandle("")).toBeNull();
  });

  it("keeps the floating button out of the checkout and its payment return only", () => {
    expect(hidesFloatingWhatsapp("/checkout")).toBe(true);
    expect(hidesFloatingWhatsapp("/checkout/rueckkehr")).toBe(true);
    for (const p of ["/", "/produkt/amour", "/kontakt", "/warenkorb", "/checkout-hilfe", "/bestellung/BQ-1"]) expect(hidesFloatingWhatsapp(p)).toBe(false);
  });
});

describe("order confirmation mail", () => {
  const order = {
    id: "BQ-WA1", token: "tok", createdAt: "2026-11-04T10:00:00.000Z", status: "paid", history: [],
    recipient: { firstName: "Anna", lastName: "Huber", company: "", street: "Gasse", houseNumber: "1", addition: "", zip: "1060", city: "Wien", country: "AT", phone: "" },
    delivery: { date: "2026-11-05", windowId: "am", windowLabel: "9–12 Uhr", windowFrom: "09:00", windowTo: "12:00", zoneId: "z1", zoneName: "Wien", fee: 0 },
    customer: { firstName: "Paul", lastName: "Maier", email: "paul@example.at", phone: "" },
    lines: [{ productId: "p", productName: "Rosalie", sizeId: "m", sizeLabel: "Mittel", quantity: 1, unitPrice: 65.9, image: "", extras: [] }],
    totals: { subtotal: 65.9, extras: 0, delivery: 0, discount: 0, total: 65.9 },
    payment: { method: "card", status: "paid" },
  } as unknown as Order;
  const brand = { name: "Blumora", siteUrl: "https://blumora.at" };

  it("adds the WhatsApp line (24/7 only when set) and leaves it out without a link", () => {
    const wa = { href: SOCIAL_LINKS.whatsapp, is247: true };
    expect(orderConfirmation({ order, brand: { ...brand, whatsapp: wa }, trackingUrl: "https://t" }).text).toContain(`Fragen zu deiner Bestellung? Schreib uns auf WhatsApp (24/7): ${SOCIAL_LINKS.whatsapp}`);
    const html = orderConfirmation({ order, brand: { ...brand, whatsapp: { ...wa, is247: false } }, trackingUrl: "https://t" }).html;
    expect(html).toContain(`href="${SOCIAL_LINKS.whatsapp}"`);
    expect(html).not.toContain("(24/7)");
    expect(orderConfirmation({ order, brand, trackingUrl: "https://t" }).text).not.toContain("WhatsApp");
    const en = orderConfirmation({ order, brand: { ...brand, whatsapp: wa }, trackingUrl: "https://t", locale: "en", m: mergeMessages(germanMail, englishMail) });
    expect(en.text).toContain(`Questions about your order? Message us on WhatsApp (24/7): ${SOCIAL_LINKS.whatsapp}`);
  });
});
