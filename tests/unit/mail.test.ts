import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

vi.mock("server-only", () => ({}));
const sendMail = vi.hoisted(() => vi.fn(async () => ({ messageId: "<test@smtp>" })));
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("@/lib/cms", () => ({ getSettings: vi.fn(), getOccasions: vi.fn() }));

import { floristOrder } from "@/lib/mail/templates";

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
  it("lists what to bind, the card and the pickup time", () => {
    const mail = floristOrder({ order, brand });
    expect(mail.subject).toContain("BQ-ABC123");
    expect(mail.subject).toContain("09:00");
    for (const text of ["Rosalie – Mittel", "Teddy", "Alles Liebe zum Geburtstag!", "Absender: Paul", "bis 09:00 Uhr", "9–12 Uhr"]) {
      expect(mail.text).toContain(text);
    }
  });

  it("contains no prices and no contact data of customer or recipient", () => {
    const mail = floristOrder({ order, brand });
    for (const secret of ["paul@example.at", "+43 660 1112223", "0664 1234567", "Mariahilfer", "Huber", "Maier", "65,90", "85,80", "€"]) {
      expect(mail.html).not.toContain(secret);
      expect(mail.text).not.toContain(secret);
    }
  });

  it("marks anonymous cards", () => {
    const anon = { ...order, lines: [{ ...order.lines[0], senderName: undefined, anonymous: true }] };
    expect(floristOrder({ order: anon, brand }).text).toContain("anonym");
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
