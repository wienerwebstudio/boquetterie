import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const ORDER = { id: "BQ-7K2M9Q", token: "0123456789abcdef01234567", customer: { email: "Anna@Example.com" }, internalNote: "intern" };

const cms = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  readData: vi.fn(),
  writeData: vi.fn(),
  getSettings: vi.fn(),
  getSubscription: vi.fn(),
  addNewsletterSubscriber: vi.fn(),
  canPersistData: vi.fn(),
}));
const mail = vi.hoisted(() => ({ sendMail: vi.fn(), adminMailAddress: vi.fn() }));

vi.mock("@/lib/cms", () => cms);
vi.mock("@/lib/mail", () => ({ ...mail, escapeHtml: (s: string) => s }));
vi.mock("@/lib/orders", () => ({
  publicOrderView: (order: Record<string, unknown>) => {
    const rest = { ...order };
    delete rest.token;
    delete rest.internalNote;
    return rest;
  },
}));

import * as logoutRoute from "@/app/api/admin/logout/route";
import { POST as login } from "@/app/api/admin/login/route";
import { POST as contact } from "@/app/api/contact/route";
import { GET as getOrder } from "@/app/api/orders/[id]/route";
import { POST as lookup } from "@/app/api/orders/lookup/route";
import { POST as subscriptionRequest } from "@/app/api/subscription-request/route";
import { POST as newsletter } from "@/app/api/newsletter/route";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { rateLimitInternals } from "@/lib/rate-limit";

const ORIGIN = "http://localhost:3000";
const json = (path: string, body: unknown, ip = "203.0.113.7") =>
  new Request(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });

beforeEach(() => {
  rateLimitInternals.clear();
  vi.clearAllMocks();
  cms.getOrderById.mockImplementation(async (id: string) => (id === ORDER.id ? ORDER : undefined));
  cms.readData.mockImplementation(async (_name: string, fallback: unknown) => fallback);
  cms.writeData.mockResolvedValue(undefined);
  cms.getSettings.mockResolvedValue({ subscriptionEnabled: true });
  cms.getSubscription.mockResolvedValue({ enabled: true, plans: [{ id: "m", name: "Medium" }], frequencies: [{ id: "weekly", label: "Wöchentlich" }] });
  cms.canPersistData.mockResolvedValue(true);
  cms.addNewsletterSubscriber.mockResolvedValue(undefined);
  mail.adminMailAddress.mockReturnValue("team@example.com");
  mail.sendMail.mockResolvedValue({ sent: true, provider: "console" });
  vi.stubEnv("ADMIN_PASSWORD", "ci-admin-password");
  vi.stubEnv("ADMIN_SECRET", "ci-admin-secret-ci-admin-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/admin/login", () => {
  const attempt = (password: string, ip = "203.0.113.7") => {
    const form = new FormData();
    form.set("password", password);
    form.set("next", "/admin/bestellungen");
    return login(new NextRequest(`${ORIGIN}/api/admin/login`, { method: "POST", body: form, headers: { "x-forwarded-for": ip } }));
  };

  it("sets a valid session cookie for the right password", async () => {
    const res = await attempt("ci-admin-password");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/admin/bestellungen`);
    const cookie = res.cookies.get(ADMIN_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(await verifySessionToken(cookie?.value, "ci-admin-secret-ci-admin-secret")).toBe(true);
  });

  it("answers every wrong input the same way and sets no cookie", async () => {
    const locations = new Set<string | null>();
    for (const pw of ["", "x", "ci-admin-passwore", "ci-admin-password-and-more"]) {
      const res = await attempt(pw);
      expect(res.status).toBe(303);
      expect(res.cookies.get(ADMIN_COOKIE)).toBeUndefined();
      locations.add(res.headers.get("location"));
    }
    expect([...locations]).toEqual([`${ORIGIN}/admin/login?error=invalid&next=%2Fadmin%2Fbestellungen`]);
  });

  it("locks an IP after five attempts – even for the right password – but not other IPs", async () => {
    for (let i = 0; i < 5; i++) expect((await attempt("wrong")).status).toBe(303);
    const blocked = await attempt("ci-admin-password");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(blocked.cookies.get(ADMIN_COOKIE)).toBeUndefined();
    expect(await blocked.text()).toMatch(/Zu viele Anmeldeversuche/);
    expect((await attempt("ci-admin-password", "198.51.100.1")).status).toBe(303);
  });

  it("a successful login clears the counter", async () => {
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 4; i++) await attempt("wrong");
      expect((await attempt("ci-admin-password")).cookies.get(ADMIN_COOKIE)).toBeDefined();
    }
  });

  it("stays locked in production with the .env.example password", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "change-me");
    const res = await attempt("change-me");
    expect(res.headers.get("location")).toContain("error=config");
    expect(res.cookies.get(ADMIN_COOKIE)).toBeUndefined();
  });
});

describe("/api/admin/logout", () => {
  it("is POST only and clears the cookie", async () => {
    expect(Object.keys(logoutRoute).filter((k) => /^(GET|HEAD|PUT|PATCH|DELETE)$/.test(k))).toEqual([]);
    const res = await logoutRoute.POST(new NextRequest(`${ORIGIN}/api/admin/logout`, { method: "POST" }));
    expect(res.status).toBe(303);
    expect(res.cookies.get(ADMIN_COOKIE)?.value).toBe("");
  });
});

describe("GET /api/orders/[id]", () => {
  const get = (id: string, token?: string) =>
    getOrder(
      new Request(`${ORIGIN}/api/orders/${id}${token === undefined ? "" : `?token=${token}`}`, { headers: { "x-forwarded-for": "203.0.113.7" } }),
      { params: Promise.resolve({ id }) },
    );

  it("returns the public view for the right token", async () => {
    const res = await get("bq-7k2m9q", ORDER.token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, order: { id: ORDER.id, customer: ORDER.customer } });
  });

  it("answers identically for an unknown order, a wrong token and no token", async () => {
    const answers = await Promise.all([
      get("BQ-AAAAAA", ORDER.token), get(ORDER.id, "0123456789abcdef0123456X"), get(ORDER.id, "short"), get(ORDER.id), get("%E0%A4%A", "x"),
    ]);
    const seen = new Set<string>();
    for (const res of answers) seen.add(`${res.status} ${await res.text()}`);
    expect([...seen]).toEqual([`404 ${JSON.stringify({ ok: false, message: "Bestellung nicht gefunden." })}`]);
  });

  it("is rate limited", async () => {
    let last = 200;
    for (let i = 0; i < 31; i++) last = (await get(ORDER.id, "nope")).status;
    expect(last).toBe(429);
  });
});

describe("POST /api/orders/lookup", () => {
  it("returns id and token, comparing the e-mail case-insensitively", async () => {
    const res = await lookup(json("/api/orders/lookup", { orderId: " bq-7k2m9q ", email: "ANNA@example.COM " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: ORDER.id, token: ORDER.token });
  });

  it("answers identically for an unknown order and a wrong e-mail", async () => {
    const unknown = await lookup(json("/api/orders/lookup", { orderId: "BQ-AAAAAA", email: "anna@example.com" }));
    const wrongMail = await lookup(json("/api/orders/lookup", { orderId: ORDER.id, email: "eve@example.com" }));
    expect(unknown.status).toBe(404);
    expect(wrongMail.status).toBe(404);
    expect(await unknown.text()).toBe(await wrongMail.text());
  });

  it("allows five tries per IP in ten minutes", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await lookup(json("/api/orders/lookup", { orderId: "BQ-AAAAAA", email: "eve@example.com" }))).status);
    expect(statuses).toEqual([404, 404, 404, 404, 404, 429]);
    expect((await lookup(json("/api/orders/lookup", { orderId: ORDER.id, email: "anna@example.com" }, "198.51.100.1"))).status).toBe(200);
  });
});

describe("POST /api/contact", () => {
  const valid = { name: "Anna Muster", email: "anna@example.com", subject: "Lieferung", message: "Wann kommt mein Strauß an?" };

  it("stores through the datastore and notifies the admin", async () => {
    cms.readData.mockResolvedValueOnce([{ id: "CM-OLD" }]);
    const res = await contact(json("/api/contact", valid));
    expect(await res.json()).toEqual({ ok: true });
    expect(cms.readData).toHaveBeenCalledWith("contact-messages", []);
    const [name, list] = cms.writeData.mock.calls[0];
    expect(name).toBe("contact-messages");
    expect(list).toHaveLength(2);
    expect(list[1]).toMatchObject({ ...valid, read: false });
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "team@example.com", replyTo: valid.email }));
  });

  it("succeeds when only one of store and mail works", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    // Mail down, store fine.
    mail.sendMail.mockRejectedValueOnce(new Error("smtp down"));
    expect((await contact(json("/api/contact", valid))).status).toBe(200);
    // Read-only filesystem (serverless without DATABASE_URL), mail delivered.
    cms.writeData.mockRejectedValueOnce(new Error("read-only file system"));
    expect((await contact(json("/api/contact", valid))).status).toBe(200);
  });

  it("answers 503 with the public address when the message could neither be stored nor mailed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    cms.getSettings.mockResolvedValue({ brand: { email: "kontakt@example.com" } });
    cms.writeData.mockRejectedValue(new Error("read-only file system"));
    mail.sendMail.mockResolvedValue({ sent: false, provider: "console" });
    const res = await contact(json("/api/contact", valid));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, code: "unavailable", email: "kontakt@example.com" });

    // A placeholder address is never offered as a fallback.
    cms.getSettings.mockResolvedValue({ brand: { email: "[E-Mail – bitte ergänzen]" } });
    const body = await (await contact(json("/api/contact", valid))).json();
    expect(body.code).toBe("unavailable");
    expect(body.email).toBeUndefined();
  });

  it("drops honeypot submissions and rejects invalid ones without storing", async () => {
    expect(await (await contact(json("/api/contact", { ...valid, website: "https://spam.test" }))).json()).toEqual({ ok: true });
    expect((await contact(json("/api/contact", { ...valid, email: "nope" }))).status).toBe(422);
    expect((await contact(json("/api/contact", null))).status).toBe(400);
    expect(cms.writeData).not.toHaveBeenCalled();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });
});

describe("POST /api/subscription-request", () => {
  const valid = { name: "Anna Muster", email: "anna@example.com", plan: "m", frequency: "weekly", message: "" };

  it("stores through the datastore (newest first) and notifies the admin", async () => {
    cms.readData.mockResolvedValueOnce([{ id: "SUB-OLD" }]);
    const res = await subscriptionRequest(json("/api/subscription-request", valid));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, id: expect.stringMatching(/^SUB-/) });
    const [name, list] = cms.writeData.mock.calls[0];
    expect(name).toBe("subscription-requests");
    expect(list.map((r: { id: string }) => r.id)).toEqual([body.id, "SUB-OLD"]);
    expect(mail.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "team@example.com", replyTo: valid.email }));
  });

  it("drops honeypot submissions without storing", async () => {
    const res = await subscriptionRequest(json("/api/subscription-request", { ...valid, website: "https://spam.test" }));
    expect(await res.json()).toEqual({ ok: true });
    expect(cms.writeData).not.toHaveBeenCalled();
    expect(mail.sendMail).not.toHaveBeenCalled();
  });

  it("rejects an unknown plan", async () => {
    expect((await subscriptionRequest(json("/api/subscription-request", { ...valid, plan: "xxl" }))).status).toBe(400);
    expect(cms.writeData).not.toHaveBeenCalled();
  });
});

describe("POST /api/newsletter", () => {
  beforeEach(() => cms.getSettings.mockResolvedValue({ newsletterEnabled: true }));

  it("stores a valid, normalised address", async () => {
    const res = await newsletter(json("/api/newsletter", { email: "  Anna@Example.com ", website: "" }));
    expect(await res.json()).toEqual({ ok: true });
    expect(cms.addNewsletterSubscriber).toHaveBeenCalledWith("anna@example.com");
  });

  it("answers 503 instead of losing the address when nothing can be stored", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    cms.canPersistData.mockResolvedValueOnce(false);
    const res = await newsletter(json("/api/newsletter", { email: "anna@example.com" }));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("unavailable");
    expect(cms.addNewsletterSubscriber).not.toHaveBeenCalled();

    cms.addNewsletterSubscriber.mockRejectedValueOnce(new Error("read-only file system"));
    expect((await newsletter(json("/api/newsletter", { email: "anna@example.com" }))).status).toBe(503);
  });

  it("is off when disabled in the settings and ignores honeypot submissions", async () => {
    cms.getSettings.mockResolvedValueOnce({ newsletterEnabled: false });
    expect((await newsletter(json("/api/newsletter", { email: "anna@example.com" }))).status).toBe(404);
    expect(await (await newsletter(json("/api/newsletter", { email: "anna@example.com", website: "x" }))).json()).toEqual({ ok: true });
    expect(cms.addNewsletterSubscriber).not.toHaveBeenCalled();
  });
});
