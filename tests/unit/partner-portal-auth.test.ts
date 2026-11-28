import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

const db = vi.hoisted(() => ({ data: new Map<string, unknown>(), partners: [] as unknown[], portal: {} as Record<string, unknown>, orders: [] as unknown[] }));
const cms = vi.hoisted(() => ({
  readData: vi.fn(async (name: string, fallback: unknown) => (db.data.has(name) ? structuredClone(db.data.get(name)) : fallback)),
  writeData: vi.fn(async (name: string, value: unknown) => { db.data.set(name, structuredClone(value)); }),
  getPartners: vi.fn(async (onlyActive?: boolean) => (db.partners as { active: boolean }[]).filter((p) => !onlyActive || p.active)),
  getPartnerPortalSettings: vi.fn(async () => db.portal),
  updateOrder: vi.fn(async (id: string, patch: (o: unknown) => unknown) => {
    const idx = (db.orders as { id: string }[]).findIndex((o) => o.id === id);
    if (idx === -1) return null;
    db.orders[idx] = patch(db.orders[idx]);
    return db.orders[idx];
  }),
  getOrders: vi.fn(async () => db.orders),
  getPartnerLedgerEntries: vi.fn(async () => []),
}));
const mail = vi.hoisted(() => ({
  partnerMailAddresses: vi.fn((p: { emails?: string[]; useEnvMail?: boolean }) => (p.emails?.length ? p.emails : p.useEnvMail ? ["env@florist.example"] : [])),
  sendPartnerConfirmedNotice: vi.fn(async () => null),
}));
vi.mock("@/lib/cms", () => cms);
vi.mock("@/lib/mail", () => mail);
vi.mock("@/lib/florist-budget", () => ({ EMPTY_BUDGETS: { products: {}, extras: {} }, getFloristBudgets: vi.fn(async () => ({ products: {}, extras: {} })) }));

import {
  consumePartnerLoginToken, createPartnerLoginToken, createPartnerSessionValue, findPartnerByPortalEmail, getPartnerSecret, peekPartnerLoginToken,
  portalEmailsFor, PARTNER_SESSION_SECONDS, PARTNER_TOKEN_TTL_MS, resolvePartnerSession, verifyPartnerSessionValue,
} from "@/lib/partner-auth";
import { confirmOrderForPartner } from "@/lib/partner-portal";
import type { Order } from "@/types";

const SECRET = "unit-test-secret-unit-test-secret";
const dody = { id: "dody", name: "Blumen Dody", emails: ["auftrag@dody.example"], active: true, sortOrder: 1 };
const rosen = { id: "rosen", name: "Rosenhaus", emails: ["info@rosen.example"], active: true, sortOrder: 2 };

beforeEach(() => {
  db.data.clear();
  db.partners = [dody, rosen];
  db.portal = {};
  process.env.ADMIN_SECRET = SECRET;
  delete process.env.PARTNER_SECRET;
  mail.sendPartnerConfirmedNotice.mockClear();
});

describe("partner session cookie", () => {
  it("signs and verifies; rejects tampering, other secrets and expiry", () => {
    const now = Date.UTC(2026, 10, 22);
    const value = createPartnerSessionValue(SECRET, "dody", "Auftrag@Dody.example", now);
    expect(verifyPartnerSessionValue(value, SECRET, now)).toEqual({ partnerId: "dody", email: "auftrag@dody.example", exp: Math.floor(now / 1000) + PARTNER_SESSION_SECONDS });
    expect(verifyPartnerSessionValue(value, "another-secret-another-secret", now)).toBeNull();
    const [b64, mac] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ partnerId: "rosen", email: "auftrag@dody.example", exp: 9e9 })).toString("base64url");
    expect(verifyPartnerSessionValue(`${forged}.${mac}`, SECRET, now)).toBeNull();
    expect(verifyPartnerSessionValue(`${b64}.${mac.replace(/.$/, mac.endsWith("0") ? "1" : "0")}`, SECRET, now)).toBeNull();
    expect(verifyPartnerSessionValue(value, SECRET, now + (PARTNER_SESSION_SECONDS + 1) * 1000)).toBeNull();
    expect(verifyPartnerSessionValue("", SECRET, now)).toBeNull();
    expect(verifyPartnerSessionValue(value, null, now)).toBeNull();
  });
  it("PARTNER_SECRET wins over ADMIN_SECRET; short secrets are refused", () => {
    expect(getPartnerSecret()).toBe(SECRET);
    process.env.PARTNER_SECRET = "partner-secret-partner-secret";
    expect(getPartnerSecret()).toBe("partner-secret-partner-secret");
    process.env.PARTNER_SECRET = "short";
    delete process.env.ADMIN_SECRET;
    expect(getPartnerSecret()).toBeNull();
  });
});

describe("allow-list", () => {
  it("defaults to the order-slip addresses; a saved list replaces them", () => {
    expect(portalEmailsFor(dody, undefined)).toEqual(["auftrag@dody.example"]);
    expect(portalEmailsFor({ emails: [], useEnvMail: true }, undefined)).toEqual(["env@florist.example"]);
    expect(portalEmailsFor(dody, { emails: ["Chef@Dody.example", "kaputt"] })).toEqual(["chef@dody.example"]);
    expect(portalEmailsFor(dody, { emails: [] })).toEqual([]);
  });
  it("finds only active partners, case-insensitively", async () => {
    expect((await findPartnerByPortalEmail(" INFO@rosen.example "))?.id).toBe("rosen");
    expect(await findPartnerByPortalEmail("fremd@example.com")).toBeNull();
    db.partners = [dody, { ...rosen, active: false }];
    expect(await findPartnerByPortalEmail("info@rosen.example")).toBeNull();
  });
  it("a session ends as soon as the address leaves the allow-list", async () => {
    const value = createPartnerSessionValue(SECRET, "dody", "auftrag@dody.example");
    expect((await resolvePartnerSession(value))?.partner.id).toBe("dody");
    db.portal = { dody: { emails: ["neu@dody.example"] } };
    expect(await resolvePartnerSession(value)).toBeNull();
    // A valid cookie of partner A cannot be turned into partner B.
    expect(await resolvePartnerSession(createPartnerSessionValue(SECRET, "rosen", "auftrag@dody.example"))).toBeNull();
  });
});

describe("magic-link tokens", () => {
  it("stores only the hash, is single use and expires after 30 minutes", async () => {
    const now = Date.UTC(2026, 10, 22, 10);
    const raw = await createPartnerLoginToken("dody", "Auftrag@Dody.example", now);
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(db.data.get("partner-auth-tokens"))).not.toContain(raw);
    expect(await peekPartnerLoginToken(raw, now)).toEqual({ status: "valid", partnerId: "dody", email: "auftrag@dody.example" });
    expect(await consumePartnerLoginToken(raw, now + PARTNER_TOKEN_TTL_MS + 1)).toEqual({ status: "invalid" });
    expect(await consumePartnerLoginToken(raw, now + 1000)).toMatchObject({ status: "valid", partnerId: "dody" });
    expect(await consumePartnerLoginToken(raw, now + 2000)).toEqual({ status: "invalid" });
    expect(await consumePartnerLoginToken("nope", now)).toEqual({ status: "invalid" });
  });
});

describe("confirm from the portal (access control)", () => {
  const base = (id: string, partnerId: string, over: Partial<Order> = {}) => ({
    id, status: "paid", history: [], payment: { method: "card", status: "paid" },
    partner: { id: partnerId, name: partnerId, assignedAt: "2026-12-01T10:00:00.000Z", sentAt: "2026-12-01T10:00:00.000Z", confirmToken: "abc" },
    ...over,
  }) as unknown as Order;

  it("partner A cannot confirm B's order; B can, once", async () => {
    db.orders = [base("BQ-B1", "rosen")];
    expect(await confirmOrderForPartner(db.orders[0] as Order, { partnerId: "dody" })).toEqual({ ok: false, reason: "invalid" });
    expect((db.orders[0] as Order).partner?.confirmedAt).toBeUndefined();
    const r = await confirmOrderForPartner(db.orders[0] as Order, { partnerId: "rosen" }, "Partner-Portal");
    expect(r.ok && !r.already).toBe(true);
    const saved = db.orders[0] as Order;
    expect(saved.partner?.confirmedAt).toBeTruthy();
    expect(saved.history.at(-1)?.note).toBe("Auftrag von rosen bestätigt (Partner-Portal)");
    expect(mail.sendPartnerConfirmedNotice).toHaveBeenCalledTimes(1);
    expect(await confirmOrderForPartner(saved, { partnerId: "rosen" })).toMatchObject({ ok: true, already: true });
    // Even an already confirmed order does not answer "ok" to another partner.
    expect(await confirmOrderForPartner(saved, { partnerId: "dody" })).toEqual({ ok: false, reason: "invalid" });
  });

  it("unpaid or cancelled orders cannot be confirmed; the slip link needs the current token", async () => {
    db.orders = [base("BQ-U1", "dody", { payment: { method: "card", status: "pending" } } as Partial<Order>), base("BQ-C1", "dody", { status: "cancelled" })];
    expect(await confirmOrderForPartner(db.orders[0] as Order, { partnerId: "dody" })).toEqual({ ok: false, reason: "invalid" });
    expect(await confirmOrderForPartner(db.orders[1] as Order, { partnerId: "dody" })).toEqual({ ok: false, reason: "cancelled" });
    db.orders = [base("BQ-T1", "dody")];
    expect(await confirmOrderForPartner(db.orders[0] as Order, { confirmToken: "wrong" })).toEqual({ ok: false, reason: "invalid" });
    expect(await confirmOrderForPartner(db.orders[0] as Order, { confirmToken: "abc" })).toMatchObject({ ok: true, already: false });
  });
});
