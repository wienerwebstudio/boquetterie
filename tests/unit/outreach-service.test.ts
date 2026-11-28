import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutreachContact, OutreachSend, OutreachTemplate, OutreachUnsubscribe } from "@/types/outreach";

vi.mock("server-only", () => ({}));

/* In-memory data documents instead of src/lib/cms.ts. */
const db = vi.hoisted(() => ({
  contacts: [] as OutreachContact[],
  templates: [] as OutreachTemplate[],
  sends: [] as OutreachSend[],
  unsub: [] as OutreachUnsubscribe[],
}));
vi.mock("@/lib/cms", () => ({
  getSettings: async () => ({
    brand: { name: "Blumora", claim: "", legalName: "", email: "office@blumora.at", phone: "+43 1 234", address: { street: "Gasse 1", zip: "1010", city: "Wien", country: "AT" }, openingHours: [], social: {} },
    seo: { siteUrl: "https://blumora.at", defaultTitle: "", defaultDescription: "" },
  }),
  getOutreachContacts: async () => structuredClone(db.contacts),
  saveOutreachContacts: async (l: OutreachContact[]) => { db.contacts = structuredClone(l); },
  updateOutreachContact: async (id: string, fn: (c: OutreachContact) => OutreachContact) => {
    const i = db.contacts.findIndex((c) => c.id === id);
    if (i < 0) return null;
    db.contacts[i] = fn(structuredClone(db.contacts[i]));
    return db.contacts[i];
  },
  getOutreachTemplates: async () => structuredClone(db.templates),
  getOutreachSends: async () => structuredClone(db.sends),
  updateOutreachSends: async (fn: (l: OutreachSend[]) => OutreachSend[]) => { db.sends = fn(structuredClone(db.sends)); return db.sends; },
  getOutreachUnsubscribed: async () => structuredClone(db.unsub),
  saveOutreachUnsubscribed: async (l: OutreachUnsubscribe[]) => { db.unsub = structuredClone(l); },
}));
const sendMail = vi.hoisted(() => vi.fn(async (msg: Record<string, unknown>) => ({ sent: Boolean(msg), provider: "smtp" as const, id: "1" })));
vi.mock("@/lib/mail", () => ({ sendMail, mailProvider: () => "smtp" }));
vi.mock("@/lib/uploads", () => ({ readOutreachFile: async () => Buffer.from("%PDF-1.4 test") }));

import { processOutreachQueue, queueOutreach, recordClick, recordOpen, unsubscribeOutreach } from "@/lib/outreach/service";

const contact = (id: string, email: string, over: Partial<OutreachContact> = {}): OutreachContact => ({
  id, company: `Firma ${id}`, salutation: "herr", firstName: "Max", lastName: `Muster${id}`, email, phone: "", district: "1010", category: "hotel",
  website: "", notes: "", status: "neu", tags: [], noteEntries: [], history: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", ...over,
});
const tpl = (id: string, over: Partial<OutreachTemplate> = {}): OutreachTemplate => ({
  id, name: `Vorlage ${id}`, category: "hotel", language: "de", subject: "Blumen für {Firma}", body: "{Anrede}\n\n[Shop](https://blumora.at/firmenkunden)",
  attachments: [{ key: "outreach/2026/11/info-1a2b3c4d.pdf", url: "/media/outreach/2026/11/info-1a2b3c4d.pdf", name: "Info.pdf", bytes: 13, contentType: "application/pdf" }],
  createdAt: "", updatedAt: "", ...over,
});

beforeEach(() => {
  vi.stubEnv("ADMIN_SECRET", "s".repeat(32));
  vi.stubEnv("OUTREACH_DAILY_LIMIT", "2");
  db.contacts = [contact("a", "a@x.at"), contact("b", "b@x.at"), contact("c", "c@x.at"), contact("d", "weg@x.at")];
  db.templates = [tpl("t1"), tpl("f1", { name: "Nachfassen", attachments: [] })];
  db.sends = [];
  db.unsub = [{ email: "weg@x.at", at: "2026-11-01T00:00:00Z", source: "link" }];
  sendMail.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("outreach service", () => {
  it("sends one personalised mail per contact, respects the daily limit and skips unsubscribed addresses", async () => {
    const r = await queueOutreach({ templateId: "t1", contactIds: ["a", "b", "c", "d"], followUp: { days: 7, templateId: "f1" }, allowRecent: false });
    expect(r.queued).toBe(3);
    expect(r.skipped).toEqual([{ id: "d", label: "Firma d", reason: "hat sich abgemeldet" }]);
    expect(r.processed).toMatchObject({ sent: 2, waiting: 1, limitReached: true });

    expect(sendMail).toHaveBeenCalledTimes(2);
    const msg = sendMail.mock.calls[0][0] as { to: string; subject: string; html: string; attachments: { filename: string }[]; headers: Record<string, string>; replyTo: string };
    expect(typeof msg.to).toBe("string");
    expect(msg.subject).toBe("Blumen für Firma a");
    expect(msg.html).toContain("Sehr geehrter Herr Mustera,");
    expect(msg.replyTo).toBe("office@blumora.at");
    expect(msg.attachments.map((a) => a.filename)).toEqual(["Info.pdf"]);
    expect(msg.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/blumora\.at\/api\/outreach\/unsubscribe\?t=.+>, <mailto:office@blumora\.at/);
    expect(msg.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(msg.html).toMatch(/https:\/\/blumora\.at\/api\/o\/c\/[A-Za-z0-9_-]+\?i=0/);

    const a = db.contacts.find((c) => c.id === "a")!;
    expect(a.status).toBe("angeschrieben");
    expect(a.lastMailedAt).toBeTruthy();
    expect(a.history.map((h) => h.type)).toEqual(["queued", "sent", "queued", "status"]);

    const followUps = db.sends.filter((s) => s.kind === "followup");
    expect(followUps).toHaveLength(2);
    expect(db.sends.filter((s) => s.status === "queued" && s.kind === "initial")).toHaveLength(1);
  });

  it("does not queue recently mailed contacts without override, nor twice", async () => {
    db.contacts[0].lastMailedAt = new Date().toISOString();
    const r = await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: false, scheduledFor: new Date(Date.now() + 86_400_000).toISOString() });
    expect(r.queued).toBe(0);
    expect(r.skipped[0].reason).toContain("30 Tagen");
    const ok = await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: true, scheduledFor: new Date(Date.now() + 86_400_000).toISOString() });
    expect(ok.queued).toBe(1);
    expect(ok.processed).toBeUndefined();
    const again = await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: true });
    expect(again.queued).toBe(0);
  });

  it("sends a follow-up only while the contact is still 'Angeschrieben'", async () => {
    await queueOutreach({ templateId: "t1", contactIds: ["a", "b"], followUp: { days: 7, templateId: "f1" }, allowRecent: false });
    db.contacts.find((c) => c.id === "b")!.status = "geantwortet";
    // eight days later, a new day for the limit
    const later = new Date(Date.now() + 8 * 86_400_000);
    sendMail.mockClear();
    const r = await processOutreachQueue(later);
    expect(r).toMatchObject({ sent: 1, skipped: 1 });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect((sendMail.mock.calls[0][0] as { to: string }).to).toBe("a@x.at");
    expect(db.sends.filter((s) => s.kind === "followup").map((s) => s.status).sort()).toEqual(["sent", "skipped"]);
    // the follow-up itself queues no further follow-up
    expect(db.sends.filter((s) => s.kind === "followup")).toHaveLength(2);
  });

  it("tracks opens and clicks of a send and redirects only to stored links", async () => {
    await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: false });
    const s = db.sends[0];
    await recordOpen(s.token);
    await recordOpen(s.token); // within 10 minutes: counted once
    expect(db.sends[0].opens).toBe(1);
    expect(await recordClick(s.token, "0")).toBe("https://blumora.at/firmenkunden");
    expect(await recordClick(s.token, "7")).toBeNull();
    expect(await recordClick("unknown_token_123456", "0")).toBeNull();
    expect(db.sends[0].clicks).toHaveLength(1);
    expect(db.contacts[0].history.map((h) => h.type)).toEqual(expect.arrayContaining(["open", "click"]));
  });

  it("unsubscribing cancels queued mails and blocks future ones", async () => {
    await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: false, scheduledFor: new Date(Date.now() + 3_600_000).toISOString() });
    expect(await unsubscribeOutreach("A@x.at", "one-click")).toBe("removed");
    expect(await unsubscribeOutreach("a@x.at", "link")).toBe("already");
    expect(db.sends[0]).toMatchObject({ status: "cancelled" });
    expect(db.contacts[0].history.at(-1)?.type).toBe("unsubscribed");
    const r = await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: true });
    expect(r.queued).toBe(0);
  });

  it("sends nothing without a signing secret", async () => {
    vi.stubEnv("ADMIN_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    const r = await queueOutreach({ templateId: "t1", contactIds: ["a"], allowRecent: false });
    expect(r.ok).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
