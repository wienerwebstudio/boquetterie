import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));
const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: "<test@smtp>" })));
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("@/lib/cms", () => ({ getSettings: vi.fn(), getOccasions: vi.fn(), getAllProducts: vi.fn(async () => []), getExtras: vi.fn(async () => []), readData: vi.fn(async () => null), writeData: vi.fn() }));

import { floristOrder, orderConfirmation } from "@/lib/mail/templates";
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

    sendMail.mockClear();
    await mail.sendMail({ to: "kunde@example.at", subject: "Echte Mail", html: "<p>x</p>" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ["test@example.com"] }));
  });
});

describe("resending the mails of a real order", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; sendMail.mockClear(); });
  afterEach(() => vi.unstubAllEnvs());

  it("sends only the chosen mails, to the real recipients", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("MAIL_REDIRECT_TO", "");
    vi.stubEnv("MAIL_FLORIST", "florist@example.at, office@florist.at"); vi.stubEnv("MAIL_ADMIN", "office@example.at");
    const cms = await import("@/lib/cms");
    vi.mocked(cms.getSettings).mockResolvedValue({ brand: { name: "Blumora" }, seo: { siteUrl: "https://blumora.at" } } as never);
    const mail = await import("@/lib/mail");

    const partner = await mail.sendOrderMails(order, ["partner"]);
    expect(partner.map((r) => [r.kind, r.result?.sent])).toEqual([["partner", true]]);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const slip = (sendMail.mock.calls[0] as unknown as [{ to: string[]; subject: string }])[0];
    expect(slip.to).toEqual(["florist@example.at", "office@florist.at"]);
    expect(slip.subject).toContain("BQ-ABC123");
    expect(slip.subject).not.toContain("[Beispiel]");

    sendMail.mockClear();
    const all = await mail.sendOrderMails(order);
    expect(all.map((r) => r.kind)).toEqual(["customer", "internal", "partner"]);
    const to = sendMail.mock.calls.map((c) => (c as unknown as [{ to: string[] }])[0].to.join(","));
    expect(to).toEqual(["paul@example.at", "office@example.at", "florist@example.at,office@florist.at"]);
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
  });
});
