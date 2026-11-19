import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));
const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: "<test@smtp>" })));
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
const PARTNERS = [
  { id: "blumen-dody", name: "Blumen Dody", emails: [], useEnvMail: true, active: true, sortOrder: 1 },
  { id: "rosenhaus", name: "Rosenhaus", emails: ["auftrag@rosenhaus.at"], active: true, sortOrder: 2 },
];
vi.mock("@/lib/cms", () => ({ getSettings: vi.fn(), getOccasions: vi.fn(), getAllProducts: vi.fn(async () => []), getExtras: vi.fn(async () => []), getPartners: vi.fn(async () => PARTNERS), readData: vi.fn(async () => null), writeData: vi.fn() }));

import { adminNewOrder, floristCancellation, floristOrder, orderConfirmation, partnerConfirmed } from "@/lib/mail/templates";
import { formatPrice } from "@/lib/format";

const order: Order = {
  id: "BQ-ABC123", token: "tok", createdAt: "2026-11-04T10:00:00.000Z", status: "paid", history: [],
  recipient: { firstName: "Anna", lastName: "Huber", company: "", street: "Mariahilfer Straße", houseNumber: "12", addition: "", zip: "1060", city: "Wien", country: "AT", phone: "0664 1234567" },
  delivery: { date: "2026-11-05", windowId: "am", windowLabel: "9–12 Uhr", windowFrom: "09:00", windowTo: "12:00", zoneId: "z1", zoneName: "Wien Zone 1", fee: 0 },
  customer: { firstName: "Paul", lastName: "Maier", email: "paul@example.at", phone: "+43 660 1112223" },
  lines: [{
    productId: "p-rosalie", productName: "Rosalie", sizeId: "m", sizeLabel: "Mittel", quantity: 1, unitPrice: 65.9, image: "",
    extras: [{ extraId: "x-teddy", name: "Teddy", quantity: 1, unitPrice: 19.9 }], message: "Alles Liebe zum Geburtstag!", senderName: "Paul",
  }],
  totals: { subtotal: 65.9, extras: 19.9, delivery: 0, discount: 0, total: 85.8 },
  payment: { method: "card", status: "paid" },
};
const brand = { name: "Blumora", siteUrl: "https://blumora.at", email: "office@blumora.at" };

describe("florist order slip", () => {
  const budgeted: Order = {
    ...order,
    lines: [{ ...order.lines[0], image: "/images/products/sortiment/rosalie-1.jpg", floristBudget: 41.5, extras: [{ ...order.lines[0].extras[0], floristBudget: 12.5 }] }],
  };

  it("lists what to bind, the photo, the card and the pickup time", () => {
    const mail = floristOrder({ order: budgeted, brand });
    expect(mail.subject).toContain("BQ-ABC123");
    expect(mail.subject).toContain("09:00");
    for (const text of ["Rosalie, Größe M", "Teddy", "Alles Liebe zum Geburtstag!", "Absender: Paul", "bis 09:00 Uhr", "9–12 Uhr"]) {
      expect(mail.text).toContain(text);
    }
    expect(mail.html).toContain('src="https://blumora.at/_next/image?url=%2Fimages%2Fproducts%2Fsortiment%2Frosalie-1.jpg&amp;w=480&amp;q=75"');
  });

  it("names the max. budget per item and in total, without the word netto or any discount", () => {
    const mail = floristOrder({ order: budgeted, brand });
    expect(mail.text).toContain(`Max. Budget: ${formatPrice(41.5)}`);
    expect(mail.text).toContain(`Teddy – Max. Budget ${formatPrice(12.5)}`);
    expect(mail.text).toContain(`Max. Budget gesamt: ${formatPrice(54)}`);
    const two = floristOrder({ order: { ...budgeted, lines: [{ ...budgeted.lines[0], quantity: 2, extras: [] }] }, brand });
    expect(two.text).toContain(`${formatPrice(83)} (2 × ${formatPrice(41.5)})`);
    expect(mail.text).not.toMatch(/netto|Nachlass/);
    expect(mail.text).toContain("Bitte so binden wie auf dem Foto.");
  });

  it("shows the extras' photos and counts extras per line, like the price", () => {
    const withTeddy: Order = { ...budgeted, lines: [{ ...budgeted.lines[0], quantity: 2, extras: [{ ...budgeted.lines[0].extras[0], image: "/images/products/sortiment/teddybaer-klein-3.jpg" }] }] };
    const mail = floristOrder({ order: withTeddy, brand });
    expect(mail.html).toContain("url=%2Fimages%2Fproducts%2Fsortiment%2Fteddybaer-klein-3.jpg");
    expect(mail.text).toContain(`Teddy – Max. Budget ${formatPrice(12.5)}`);
    expect(mail.text).toContain(`Max. Budget gesamt: ${formatPrice(2 * 41.5 + 12.5)}`);
    const confirmation = orderConfirmation({ order: withTeddy, brand, trackingUrl: "https://blumora.at/x" });
    expect(confirmation.html).toContain("url=%2Fimages%2Fproducts%2Fsortiment%2Fteddybaer-klein-3.jpg&amp;w=160");
  });

  it("says when no budget is stored instead of inventing one", () => {
    const mail = floristOrder({ order, brand });
    expect(mail.text).toContain("Max. Budget: nicht hinterlegt");
    expect(mail.text).not.toContain("Max. Budget gesamt");
  });

  it("contains no customer prices and no contact data of customer or recipient", () => {
    const mail = floristOrder({ order: budgeted, brand });
    for (const secret of ["paul@example.at", "+43 660 1112223", "0664 1234567", "Mariahilfer", "Huber", "Maier", "65,90", "85,80", "19,90"]) {
      expect(mail.html).not.toContain(secret);
      expect(mail.text).not.toContain(secret);
    }
  });

  it("marks anonymous cards and leaves the card row out when there is none", () => {
    const anon = { ...order, lines: [{ ...order.lines[0], senderName: undefined, anonymous: true }] };
    expect(floristOrder({ order: anon, brand }).text).toContain("anonym");
    const none = { ...order, lines: [{ ...order.lines[0], message: undefined, senderName: undefined }] };
    expect(floristOrder({ order: none, brand }).text).not.toContain("Grußkarte");
  });
});

describe("self delivery", () => {
  it("tells the florist who collects and flags it in the internal mail", async () => {
    expect(floristOrder({ order, brand }).text).toContain("Abholung durch den Kurier");
    expect(floristOrder({ order, brand, selfDelivery: true }).text).toContain("Abholung durch Blumora");
    const { adminNewOrder } = await import("@/lib/mail/templates");
    expect(adminNewOrder({ order, brand, adminUrl: "https://blumora.at/admin", selfDelivery: true }).text).toContain("Selbst ausliefern");
    expect(adminNewOrder({ order, brand, adminUrl: "https://blumora.at/admin" }).text).not.toContain("Selbst ausliefern");
  });
});

describe("customer confirmation", () => {
  it("shows the product photo and no greeting card when the order has none", () => {
    const none = { ...order, lines: [{ ...order.lines[0], image: "/images/products/sortiment/rosalie-1.jpg", message: undefined, senderName: undefined }] };
    const mail = orderConfirmation({ order: none, brand, trackingUrl: "https://blumora.at/bestellung/BQ-ABC123?token=t" });
    expect(mail.html).toContain("_next/image?url=%2Fimages%2Fproducts%2Fsortiment%2Frosalie-1.jpg&amp;w=160");
    expect(mail.text).not.toContain("Grußkarte");
    expect(mail.html).not.toContain("Grußkarte");
  });
});

describe("mail provider", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; sendMail.mockClear(); createTransport.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());

  it("prefers Resend, then SMTP, else the console", async () => {
    const { mailProvider } = await import("@/lib/mail");
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "");
    expect(mailProvider()).toBe("console");
    vi.stubEnv("SMTP_HOST", "mail.example.at");
    expect(mailProvider()).toBe("smtp");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    expect(mailProvider()).toBe("resend");
  });

  it("sends over SMTP with STARTTLS on 587 and implicit TLS on 465", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "office@blumora.at"); vi.stubEnv("SMTP_PASS", "pw"); vi.stubEnv("MAIL_FROM", "Blumora <office@blumora.at>");
    const mail = await import("@/lib/mail");
    const res = await mail.sendMail({ to: "a@b.at", subject: "Hi", html: "<p>Hallo</p>" });
    expect(res).toEqual({ sent: true, provider: "smtp", id: "<test@smtp>" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "mail.example.at", port: 587, secure: false, auth: { user: "office@blumora.at", pass: "pw" } }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "Blumora <office@blumora.at>", to: ["a@b.at"], text: "Hallo" }));

    delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp;
    vi.stubEnv("SMTP_PORT", "465");
    await mail.sendMail({ to: "a@b.at", subject: "Hi", html: "<p>Hallo</p>" });
    expect(createTransport).toHaveBeenLastCalledWith(expect.objectContaining({ port: 465, secure: true }));
  });

  it("reports an SMTP failure instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendMail.mockRejectedValueOnce(new Error("535 auth failed"));
    const { sendMail: send } = await import("@/lib/mail");
    const res = await send({ to: "a@b.at", subject: "Hi", html: "<p>x</p>" });
    expect(res.sent).toBe(false);
    expect(res.error).toContain("535");
  });

  it("parses MAIL_FLORIST into a list of valid addresses", async () => {
    vi.stubEnv("MAIL_FLORIST", "Karim@example.com, office@florist.at;  kaputt ");
    const { floristMailAddresses } = await import("@/lib/mail");
    expect(floristMailAddresses()).toEqual(["Karim@example.com", "office@florist.at"]);
  });
});

describe("MAIL_REDIRECT_TO (test mode)", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; sendMail.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());

  it("sends every mail only to the test address and names the real recipients", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at");
    vi.stubEnv("MAIL_REDIRECT_TO", "test@example.com");
    const mail = await import("@/lib/mail");
    await mail.sendMail({ to: ["Karim@example.com", "office@florist.at"], subject: "Auftrag BQ-1", html: "<p>x</p>" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ["test@example.com"], subject: "[TEST an Karim@example.com, office@florist.at] Auftrag BQ-1" }));
  });

  it("changes nothing when unset", async () => {
    vi.stubEnv("MAIL_REDIRECT_TO", "");
    const { applyRedirect } = await import("@/lib/mail");
    expect(applyRedirect(["kunde@example.at"], "Hallo")).toEqual({ to: ["kunde@example.at"], subject: "Hallo" });
  });
});

describe("admin test mails", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; sendMail.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());

  it("sends the three order mails of a sample order only to the test address", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at");
    vi.stubEnv("MAIL_REDIRECT_TO", "test@example.com"); vi.stubEnv("MAIL_FLORIST", "florist@example.at"); vi.stubEnv("MAIL_ADMIN", "office@example.at");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({ brand: { name: "Blumora", claim: "Blumen, die mehr sagen.", email: "office@blumora.at" }, seo: { siteUrl: "https://blumora.at" } } as never);
    const { sendTestOrderMails } = await import("@/lib/mail");
    const res = await sendTestOrderMails();
    expect(res.to).toBe("test@example.com");
    expect(res.results.map((r) => r.result.sent)).toEqual([true, true, true]);
    const recipients = sendMail.mock.calls.map((c) => (c as unknown as [{ to: string[]; subject: string }])[0]);
    expect(recipients.every((m) => m.to.length === 1 && m.to[0] === "test@example.com")).toBe(true);
    expect(recipients.every((m) => m.subject.includes("[Beispiel]"))).toBe(true);
  });

  it("sends to the address the admin typed in – past the test redirect, only for these sample mails", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at");
    vi.stubEnv("MAIL_REDIRECT_TO", "test@example.com"); vi.stubEnv("MAIL_ADMIN", "office@example.at");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({ brand: { name: "Blumora" }, seo: { siteUrl: "https://blumora.at" } } as never);
    const mail = await import("@/lib/mail");
    const res = await mail.sendTestOrderMails("karim@example.at");
    expect(res.to).toBe("karim@example.at");
    const sentTo = sendMail.mock.calls.map((c) => (c as unknown as [{ to: string[]; subject: string }])[0]);
    expect(sentTo.every((m) => m.to.length === 1 && m.to[0] === "karim@example.at" && m.subject.startsWith("[Beispiel]"))).toBe(true);

    sendMail.mockClear();
    const partnerOnly = await mail.sendTestOrderMails("karim@example.at", "partner");
    expect(partnerOnly.results.map((r) => r.mail)).toEqual(["Partner-Auftrag"]);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((sendMail.mock.calls[0] as unknown as [{ subject: string }])[0].subject).toMatch(/^\[Beispiel\] Auftrag /);
    expect((await mail.sendTestOrderMails(undefined, "customer")).results.map((r) => r.mail)).toEqual(["Kundenbestellung"]);
    expect((await mail.sendTestOrderMails(undefined, "internal")).results.map((r) => r.mail)).toEqual(["Bestelleingang"]);
    const review = await mail.sendTestOrderMails(undefined, "review");
    expect(review.results.map((r) => r.mail)).toEqual(["Bewertungsanfrage"]);

    sendMail.mockClear();
    await mail.sendMail({ to: "kunde@example.at", subject: "Echte Mail", html: "<p>x</p>" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ["test@example.com"] }));
  });
});

describe("resending the mails of a real order", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; sendMail.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());

  it("sends the partner slip only to the partner the order is assigned to", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("MAIL_REDIRECT_TO", "");
    vi.stubEnv("MAIL_FLORIST", "florist@example.at, office@florist.at"); vi.stubEnv("MAIL_ADMIN", "office@example.at");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({ brand: { name: "Blumora" }, seo: { siteUrl: "https://blumora.at" } } as never);
    const mail = await import("@/lib/mail");

    // Not assigned yet: nobody gets the slip.
    expect((await mail.sendOrderMails(order, ["partner"]))[0].result).toBeNull();
    expect(sendMail).not.toHaveBeenCalled();

    // Assigned to Blumen Dody (no own address, useEnvMail) → MAIL_FLORIST.
    const dody = { ...order, partner: { id: "blumen-dody", name: "Blumen Dody", assignedAt: "2026-11-18T09:00:00Z" } };
    const partner = await mail.sendOrderMails(dody, ["partner"]);
    expect(partner.map((r) => [r.kind, r.result?.sent])).toEqual([["partner", true]]);
    const slip = (sendMail.mock.calls[0] as unknown as [{ to: string[]; subject: string }])[0];
    expect(slip.to).toEqual(["florist@example.at", "office@florist.at"]);
    expect(slip.subject).toContain("BQ-ABC123");

    // Another partner with its own address → only that address, never MAIL_FLORIST.
    sendMail.mockClear();
    await mail.sendOrderMails({ ...order, partner: { id: "rosenhaus", name: "Rosenhaus", assignedAt: "2026-11-18T09:00:00Z" } }, ["partner"]);
    expect((sendMail.mock.calls[0] as unknown as [{ to: string[] }])[0].to).toEqual(["auftrag@rosenhaus.at"]);

    // Default (and payment): customer + internal only.
    sendMail.mockClear();
    const all = await mail.sendOrderMails(dody);
    expect(all.map((r) => r.kind)).toEqual(["customer", "internal"]);
    await mail.sendOrderConfirmation(dody);
    const to = sendMail.mock.calls.map((c) => (c as unknown as [{ to: string[] }])[0].to.join(","));
    expect(to).toEqual(["paul@example.at", "office@example.at", "paul@example.at", "office@example.at"]);
  });

  it("sends the cancellation to the partner", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("MAIL_REDIRECT_TO", "");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({ brand: { name: "Blumora" }, seo: { siteUrl: "https://blumora.at" } } as never);
    const mail = await import("@/lib/mail");
    const r = await mail.sendPartnerCancellation(order, PARTNERS[1], "cancelled");
    expect(r.result?.sent).toBe(true);
    const m = (sendMail.mock.calls[0] as unknown as [{ to: string[]; subject: string }])[0];
    expect(m.to).toEqual(["auftrag@rosenhaus.at"]);
    expect(m.subject).toBe("STORNO Auftrag BQ-ABC123 – bitte nicht binden");
  });

  it("partner addresses: own ones first, MAIL_FLORIST only as fallback", async () => {
    vi.stubEnv("MAIL_FLORIST", "florist@example.at");
    const { partnerMailAddresses } = await import("@/lib/mail");
    expect(partnerMailAddresses({ emails: [" a@b.at ", "kaputt"], useEnvMail: true })).toEqual(["a@b.at"]);
    expect(partnerMailAddresses({ emails: [], useEnvMail: true })).toEqual(["florist@example.at"]);
    expect(partnerMailAddresses({ emails: [], useEnvMail: false })).toEqual([]);
  });

  it("skips a mail without a configured address", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("MAIL_REDIRECT_TO", "");
    vi.stubEnv("MAIL_FLORIST", ""); vi.stubEnv("MAIL_ADMIN", "");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({ brand: { name: "Blumora" }, seo: { siteUrl: "https://blumora.at" } } as never);
    const mail = await import("@/lib/mail");
    const res = await mail.sendOrderMails(order, ["partner", "internal"]);
    expect(res.map((r) => r.result)).toEqual([null, null]);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("size names for the florist", () => {
  it("uses S/M/L/XL for standard sizes and the label otherwise", async () => {
    const { sizeShort } = await import("@/lib/mail/templates");
    expect(sizeShort("s", "Klein")).toBe("S");
    expect(sizeShort("xl", "XL")).toBe("XL");
    expect(sizeShort("m", "Standard")).toBe("Standard");
    expect(sizeShort("s", "60 cm")).toBe("60 cm");
    expect(sizeShort("xxl", "XXL", 61)).toBe("XXL · 61 Stiele");
    expect(sizeShort("xxxl", "XXXL", 99)).toBe("XXXL · 99 Stiele");
  });
});

describe("partner mails", () => {
  it("cancellation says clearly not to bind, without prices or customer data", () => {
    const m = floristCancellation({ order, brand, reason: "cancelled" });
    expect(m.text).toContain("NICHT binden");
    expect(m.text).toContain("Rosalie");
    expect(m.text).not.toContain("paul@example.at");
    expect(m.text).not.toContain("Huber");
    expect(m.text).not.toContain(formatPrice(85.8));
    expect(floristCancellation({ order, brand, reason: "reassigned" }).text).toContain("anderen Floristik");
  });

  it("internal mail flags an order without partner", () => {
    expect(adminNewOrder({ order, brand, adminUrl: "https://blumora.at/admin" }).text).toContain("NOCH KEINEM PARTNER ZUGEORDNET");
    expect(adminNewOrder({ order: { ...order, partner: { id: "x", name: "Rosenhaus", assignedAt: "", sentAt: "2026-11-18T09:00:00Z" } }, brand, adminUrl: "x" }).text).toContain("Rosenhaus (Auftrag gesendet)");
  });
});

describe("partner confirmation and internal partner info", () => {
  const budgeted: Order = { ...order, lines: [{ ...order.lines[0], floristBudget: 41.5, extras: [{ ...order.lines[0].extras[0], floristBudget: 12.5 }] }] };

  it("order slip carries the confirm button only when a link is given", () => {
    const withLink = floristOrder({ order: budgeted, brand, confirmUrl: "https://blumora.at/partner-auftrag?order=BQ-ABC123&token=abc" });
    expect(withLink.html).toContain("Auftrag bestätigen");
    expect(withLink.html).toContain("partner-auftrag?order=BQ-ABC123&amp;token=abc");
    expect(floristOrder({ order: budgeted, brand }).html).not.toContain("Auftrag bestätigen");
  });

  it("internal order mail shows the partner part: ready time, max. budget per item and total", () => {
    const m = adminNewOrder({ order: budgeted, brand, adminUrl: "https://blumora.at/admin", readyBy: "09:00" });
    expect(m.text).toContain("FÜR DEN PARTNER");
    expect(m.text).toContain("bis 09:00 Uhr");
    expect(m.text).toContain(`Max. Budget gesamt: ${formatPrice(54)}`);
    expect(m.text).toContain(formatPrice(41.5));
    expect(m.text).toContain(formatPrice(12.5));
  });

  it("confirmation notice names partner and order", () => {
    const m = partnerConfirmed({ order, brand, partnerName: "Rosenhaus", adminUrl: "https://blumora.at/admin/bestellungen/BQ-ABC123" });
    expect(m.subject).toBe("Bestätigt: Rosenhaus übernimmt BQ-ABC123");
  });
});

describe("team note to the florist", () => {
  const brand = { name: "Blumora", siteUrl: "https://blumora.at", email: "office@blumora.at" } as Parameters<typeof floristOrder>[0]["brand"];
  it("is shown big, bold and escaped at the top, and flagged in the subject", () => {
    const noted = { ...order, partner: { id: "dody", name: "Blumen Dody", assignedAt: "2026-11-04T10:00:00.000Z", note: "Bitte 11 Rosen <ungerade>\nSchleife: In Liebe" } };
    const mail = floristOrder({ order: noted, brand });
    expect(mail.subject.startsWith("WICHTIGER HINWEIS – Auftrag BQ-ABC123")).toBe(true);
    expect(mail.html).toContain("Bitte 11 Rosen &lt;ungerade&gt;<br>Schleife: In Liebe");
    expect(mail.html.indexOf("Wichtiger Hinweis von Blumora")).toBeLessThan(mail.html.indexOf("Bitte so binden"));
    expect(mail.text).toContain("!!! WICHTIGER HINWEIS VON BLUMORA – BITTE BEACHTEN !!!");
  });
  it("leaves the slip unchanged without a note", () => {
    expect(floristOrder({ order, brand }).subject.startsWith("Auftrag")).toBe(true);
  });
});
