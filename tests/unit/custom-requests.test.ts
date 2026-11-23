import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import type { CustomRequest } from "@/types";

vi.mock("server-only", () => ({}));

const cms = vi.hoisted(() => ({
  getSettings: vi.fn(),
  getAllProducts: vi.fn(),
  getCustomRequests: vi.fn(),
  saveCustomRequests: vi.fn(),
  getContactMessages: vi.fn(),
  readData: vi.fn(),
  writeData: vi.fn(),
}));
const mail = vi.hoisted(() => ({ sendCustomRequestMails: vi.fn() }));
const store = vi.hoisted(() => ({ storeRequestPhoto: vi.fn() }));
vi.mock("@/lib/cms", () => cms);
vi.mock("@/lib/mail", () => mail);
vi.mock("@/lib/offers", () => ({ publicSiteUrl: async () => "https://blumora.at" }));
vi.mock("@/lib/uploads", async () => ({ ...(await vi.importActual<typeof import("@/lib/uploads")>("@/lib/uploads")), storeRequestPhoto: store.storeRequestPhoto }));

import { POST } from "@/app/api/custom-request/route";
import {
  customRequestToOfferForm, parsePlace, parseTimeWindow, readCustomRequestFields, splitName, validateCustomRequest, whatsappLink,
} from "@/lib/custom-requests-core";
import { getInbox } from "@/lib/custom-requests";
import { rateLimitInternals } from "@/lib/rate-limit";
import { adminCustomRequest, customRequestConfirmation } from "@/lib/mail/templates";
import englishMail from "@/i18n/messages/en/mail";
import germanMail from "@/i18n/messages/de/mail";
import type { OfferFormState } from "@/components/admin/offer-form-state";

const VALID = { name: "Anna Maria Huber", email: "anna@example.com", message: "Könnt ihr um 7:00 Uhr früh liefern?", consent: true };

function form(fields: Record<string, string | string[]>, photo?: Blob) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) (Array.isArray(v) ? v : [v]).forEach((x) => fd.append(k, x));
  if (photo) fd.set("photo", photo, "foto.png");
  return new Request("http://localhost/api/custom-request", { method: "POST", body: fd, headers: { "x-forwarded-for": "203.0.113.9" } });
}

describe("validation", () => {
  const base = () => readCustomRequestFields({ ...VALID });

  it("accepts a minimal request and keeps only known topics", () => {
    const f = readCustomRequestFields({ ...VALID, topics: ["time", "hack", "place"], budget: "b100" });
    expect(f.topics).toEqual(["time", "place"]);
    // Budget only with "larger order" or "own bouquet".
    expect(f.budget).toBe("");
    expect(readCustomRequestFields({ ...VALID, topics: ["large"], budget: "b100" }).budget).toBe("b100");
    expect(validateCustomRequest(base(), "2026-11-23")).toEqual({});
  });

  it("reports the missing and invalid fields with translation keys", () => {
    const f = readCustomRequestFields({ name: "A", email: "nope", phone: "abc", message: "kurz", date: "2026-11-01" });
    expect(validateCustomRequest(f, "2026-11-23")).toEqual({ name: "name", email: "email", phone: "phone", message: "message", consent: "consent", date: "date" });
    expect(validateCustomRequest(readCustomRequestFields({ ...VALID, message: "x".repeat(2001) })).message).toBe("messageTooLong");
  });

  it("reads multipart topics and checkboxes", () => {
    const fd = new FormData();
    fd.append("topics", "time");
    fd.append("topics", "product");
    fd.set("flexible", "true");
    fd.set("consent", "true");
    const f = readCustomRequestFields(fd);
    expect(f.topics).toEqual(["time", "product"]);
    expect(f.flexible).toBe(true);
    expect(f.consent).toBe(true);
  });
});

describe("prefill helpers", () => {
  it("splits names, parses time windows and places", () => {
    expect(splitName("Anna Maria Huber")).toEqual({ firstName: "Anna Maria", lastName: "Huber" });
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
    expect(parseTimeWindow("14–16 Uhr")).toEqual({ from: "14:00", to: "16:00" });
    expect(parseTimeWindow("9:30 - 11")).toEqual({ from: "09:30", to: "11:00" });
    expect(parseTimeWindow("7:00")).toBeNull();
    expect(parseTimeWindow("16-14")).toBeNull();
    expect(parsePlace("Mariahilfer Straße 12, 1060 Wien")).toMatchObject({ kind: "address", street: "Mariahilfer Straße", houseNumber: "12", zip: "1060", city: "Wien" });
    expect(parsePlace("Christkindlmarkt Rathausplatz, Stand 12")).toMatchObject({ kind: "meeting", addition: "Christkindlmarkt Rathausplatz, Stand 12", zip: "" });
    expect(parsePlace("Burgtheater 1010")).toMatchObject({ kind: "meeting", zip: "1010" });
    expect(whatsappLink("0664 123 45 67")).toBe("https://wa.me/436641234567");
    expect(whatsappLink("+43 660 1112223")).toBe("https://wa.me/436601112223");
    expect(whatsappLink("")).toBeNull();
  });

  const base: OfferFormState = {
    locale: "de", customer: { firstName: "", lastName: "", email: "", phone: "" }, items: [], extras: [],
    delivery: { enabled: true, date: "", from: "", to: "", text: "", fee: "", note: "" }, feeTouched: false,
    recipient: { kind: "address", firstName: "", lastName: "", company: "", phone: "", street: "", houseNumber: "", addition: "", zip: "", city: "Wien" },
    greeting: { message: "", senderName: "" }, floristNote: "", billing: { company: "", name: "", street: "", zip: "", city: "", country: "Österreich", vatId: "" },
    internalNote: "", validUntil: "2026-11-26",
  };
  const request: CustomRequest = {
    id: "AF-ABC234", createdAt: "2026-11-23T10:00:00.000Z", locale: "en", status: "new", name: "Anna Maria Huber", email: "anna@example.com", phone: "0664 1234567",
    topics: ["place", "custom"], date: "2026-11-28", time: "14–16 Uhr", flexible: false, place: "Christkindlmarkt Rathausplatz, Stand 12", budget: "b100",
    message: "Ein Strauß in Rot und Weiß für unseren Stand.", consentAt: "2026-11-23T10:00:00.000Z", history: [],
  };
  const products = [{ id: "p-rosalie", slug: "rosalie", name: "Rosalie", sizes: [{ id: "m", price: 59 }, { id: "l", price: 79 }] }];

  it("maps a request onto a custom item, window, meeting point and internal note", () => {
    const s = customRequestToOfferForm(request, base, { products, locales: ["de", "en"] });
    expect(s.locale).toBe("en");
    expect(s.customer).toEqual({ firstName: "Anna Maria", lastName: "Huber", email: "anna@example.com", phone: "0664 1234567" });
    expect(s.items).toHaveLength(1);
    expect(s.items[0]).toMatchObject({ kind: "custom", description: request.message });
    expect(s.delivery).toMatchObject({ date: "2026-11-28", from: "14:00", to: "16:00", text: "" });
    expect(s.recipient).toMatchObject({ kind: "meeting", addition: "Christkindlmarkt Rathausplatz, Stand 12", firstName: "Anna Maria", lastName: "Huber", phone: "0664 1234567" });
    expect(s.internalNote).toContain("Aus Anfrage AF-ABC234");
    expect(s.internalNote).toContain("Budget: 50–100 €");
    expect(s.internalNote).toContain("Besonderer Lieferort");
  });

  it("uses the chosen shop product (first size) and keeps free time text", () => {
    const s = customRequestToOfferForm({ ...request, locale: "xx", topics: ["product"], product: { slug: "rosalie", name: "Rosalie" }, time: "7:00", budget: undefined }, base, { products, locales: ["de"] });
    expect(s.locale).toBe("de");
    expect(s.items[0]).toMatchObject({ kind: "product", productId: "p-rosalie", sizeId: "m", unitPrice: "59", title: "Rosalie" });
    expect(s.delivery).toMatchObject({ from: "", to: "", text: "7:00" });
    expect(s.internalNote).toContain(`Nachricht: ${request.message}`);
  });
});

describe("mails", () => {
  const brand = { name: "Blumora", siteUrl: "https://blumora.at" };
  const r: CustomRequest = {
    id: "AF-ABC234", createdAt: "2026-11-23T10:00:00.000Z", locale: "en", status: "new", name: "Anna Huber", email: "anna@example.com",
    topics: ["time"], date: "2026-11-28", time: "7:00", flexible: true, message: "Early delivery please", consentAt: "", history: [],
    photo: { url: "/media/anfragen/2026/11/x-1a2b3c4d.jpg", key: "anfragen/2026/11/x-1a2b3c4d.jpg", width: 10, height: 10 },
  };

  it("confirms in the customer's language without promising an offer", () => {
    const mail = customRequestConfirmation({ brand, request: r, labels: { topics: ["A particular time"] }, locale: "en", m: englishMail as typeof germanMail });
    expect(mail.subject).toBe("Your enquiry at Blumora (AF-ABC234)");
    expect(mail.text).toContain((englishMail.layout?.hello ?? "").replace("{name}", "Anna"));
    expect(mail.html).toContain('<html lang="en">');
    expect(mail.text).toContain("A particular time");
    expect(mail.text).toContain("flexible");
    expect(mail.text.toLowerCase()).not.toMatch(/offer|angebot/);
    const de = customRequestConfirmation({ brand, request: r, labels: { topics: ["Bestimmte Uhrzeit"] } });
    expect(de.text).toContain("melden uns in Kürze");
    expect(de.text).not.toMatch(/Angebot/);
  });

  it("gives the team every field and the admin link", () => {
    const mail = adminCustomRequest({ brand, request: { ...r, phone: "0664 1" }, labels: { topics: ["Bestimmte Uhrzeit"], language: "English (en)" }, adminUrl: "https://blumora.at/admin/anfragen/AF-ABC234", photoUrl: "https://blumora.at/media/anfragen/2026/11/x-1a2b3c4d.jpg" });
    expect(mail.subject).toContain("AF-ABC234");
    expect(mail.subject).toContain("Bestimmte Uhrzeit");
    for (const s of ["anna@example.com", "0664 1", "Early delivery please", "https://blumora.at/admin/anfragen/AF-ABC234", "Foto im Admin öffnen", "English (en)"]) expect(mail.text).toContain(s);
  });
});

describe("POST /api/custom-request", () => {
  let saved: CustomRequest[] = [];
  beforeEach(() => {
    rateLimitInternals.clear();
    vi.clearAllMocks();
    saved = [];
    cms.getSettings.mockResolvedValue({ timezone: "Europe/Vienna", brand: { email: "office@example.com" } });
    cms.getAllProducts.mockResolvedValue([{ id: "p-rosalie", slug: "rosalie", name: "Rosalie", active: true }]);
    cms.getCustomRequests.mockImplementation(async () => [...saved]);
    cms.saveCustomRequests.mockImplementation(async (list: CustomRequest[]) => { saved = list; });
    mail.sendCustomRequestMails.mockResolvedValue({ customer: { sent: false, provider: "console" }, admin: { sent: false, provider: "console" } });
    store.storeRequestPhoto.mockResolvedValue({ url: "/media/anfragen/2026/11/af-x-1a2b3c4d.jpg", key: "anfragen/2026/11/af-x-1a2b3c4d.jpg", width: 40, height: 30, bytes: 100 });
  });

  it("stores the request with photo, product and topics and sends the mails", async () => {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#c33" } }).png().toBuffer();
    const res = await POST(form({ ...VALID, consent: "true", topics: ["product", "time"], product: "rosalie", time: "7:00", place: "Burgtheater", locale: "ar" }, new Blob([new Uint8Array(png)], { type: "image/png" })));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.id).toMatch(/^AF-[A-Z0-9]{6}$/);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: body.id, status: "new", locale: "ar", topics: ["time", "product"], product: { slug: "rosalie", name: "Rosalie" }, time: "7:00", place: "Burgtheater", photo: { key: "anfragen/2026/11/af-x-1a2b3c4d.jpg" } });
    expect(saved[0].consentAt).toBe(saved[0].createdAt);
    // The processed photo is a JPEG and goes to the team as an attachment.
    const [, opts] = mail.sendCustomRequestMails.mock.calls[0];
    expect((opts.photo as Buffer).subarray(0, 2).toString("hex")).toBe("ffd8");
    expect(store.storeRequestPhoto).toHaveBeenCalledWith(expect.objectContaining({ width: 40, height: 30 }), body.id);
  });

  it("rejects invalid input, unreadable photos and honeypot submissions without storing", async () => {
    const bad = await POST(form({ name: "A", email: "x", message: "hi" }));
    expect(bad.status).toBe(422);
    expect((await bad.json()).errors).toMatchObject({ name: "name", email: "email", message: "message", consent: "consent" });
    const notImage = await POST(form({ ...VALID, consent: "true" }, new Blob([new TextEncoder().encode("hello world, no image")], { type: "image/png" })));
    expect(notImage.status).toBe(415);
    expect((await notImage.json()).errors).toEqual({ photo: "photoType" });
    expect(await (await POST(form({ ...VALID, consent: "true", website: "spam" }))).json()).toEqual({ ok: true });
    expect(saved).toHaveLength(0);
    expect(mail.sendCustomRequestMails).not.toHaveBeenCalled();
  });

  it("drops unknown products and answers 503 when neither store nor mail works", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ok = await POST(form({ ...VALID, consent: "true", product: "gibts-nicht" }));
    expect(ok.status).toBe(200);
    expect(saved[0].product).toBeUndefined();
    cms.saveCustomRequests.mockRejectedValue(new Error("read-only"));
    const res = await POST(form({ ...VALID, consent: "true" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "unavailable" });
  });

  it("is rate-limited", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await POST(form({ name: "A" }))).status);
    expect(statuses.slice(0, 6).every((s) => s === 422)).toBe(true);
    expect(statuses[6]).toBe(429);
  });
});

describe("admin inbox", () => {
  it("merges requests and contact messages, newest first, with contact status from `read`", async () => {
    cms.getCustomRequests.mockResolvedValue([{ id: "AF-AAAAAA", createdAt: "2026-11-20T10:00:00Z", name: "A", email: "a@x.at", status: "offer", topics: ["time"], message: "m", flexible: false, history: [], offerId: "AN-1" }]);
    cms.getContactMessages.mockResolvedValue([
      { id: "CM-1", createdAt: "2026-11-22T10:00:00Z", name: "B", email: "b@x.at", subject: "Lieferung", message: "x", read: false },
      { id: "CM-2", createdAt: "2026-11-19T10:00:00Z", name: "C", email: "c@x.at", subject: "Sonstiges", message: "y", read: true, status: "done" },
    ]);
    const rows = await getInbox();
    expect(rows.map((r) => [r.id, r.type, r.status])).toEqual([["CM-1", "contact", "new"], ["AF-AAAAAA", "request", "offer"], ["CM-2", "contact", "done"]]);
    expect(rows[1]).toMatchObject({ tags: ["time"], offerId: "AN-1" });
  });
});
