import { describe, expect, it } from "vitest";
import {
  clickTarget, dailyLimit, dueSends, followUpOf, isValidTrackingToken, localDate, localToUtc, recentlyMailed, remainingToday, sendDecision, sentToday, staleSending,
} from "@/lib/outreach/queue";
import { outreachSecret, trackingToken, unsubscribeToken, verifyUnsubscribeToken } from "@/lib/outreach/tokens";
import { isOpenPath } from "@/lib/site-lock";
import * as outreachFn from "../../netlify/functions/cron-outreach.mjs";
import type { OutreachContact, OutreachSend } from "@/types/outreach";

const send = (over: Partial<OutreachSend> = {}): OutreachSend => ({
  id: "s1", token: "tok_tok_tok_tok_1", batchId: "b", kind: "initial", contactId: "c1", email: "a@b.at", templateId: "t", templateName: "T",
  status: "queued", createdAt: "2026-11-19T08:00:00.000Z", scheduledFor: "2026-11-19T08:00:00.000Z", links: [], opens: 0, clicks: [],
  ...over,
});
const contact = (over: Partial<OutreachContact> = {}): OutreachContact => ({
  id: "c1", company: "", salutation: "", firstName: "", lastName: "", email: "a@b.at", phone: "", district: "", category: "hotel", website: "",
  notes: "", status: "angeschrieben", tags: [], noteEntries: [], history: [], createdAt: "", updatedAt: "",
  ...over,
});

describe("daily limit", () => {
  it("reads OUTREACH_DAILY_LIMIT with default 50", () => {
    expect(dailyLimit({})).toBe(50);
    expect(dailyLimit({ OUTREACH_DAILY_LIMIT: "20" })).toBe(20);
    expect(dailyLimit({ OUTREACH_DAILY_LIMIT: "0" })).toBe(0);
    expect(dailyLimit({ OUTREACH_DAILY_LIMIT: "viel" })).toBe(50);
  });

  it("counts today's sends by the Vienna date", () => {
    const now = new Date("2026-11-19T22:30:00.000Z"); // 23:30 in Vienna
    const sends = [
      send({ id: "a", status: "sent", sentAt: "2026-11-18T23:30:00.000Z" }), // 00:30 on the 19th in Vienna → today
      send({ id: "b", status: "sent", sentAt: "2026-11-18T22:30:00.000Z" }), // 23:30 on the 18th → yesterday
      send({ id: "c", status: "failed", sentAt: "2026-11-19T10:00:00.000Z" }),
      send({ id: "d", status: "sending", claimedAt: "2026-11-19T22:00:00.000Z" }),
    ];
    expect(sentToday(sends, now)).toBe(2);
    expect(remainingToday(sends, now, 2)).toBe(0);
    expect(remainingToday(sends, now, 5)).toBe(3);
  });

  it("keeps the rest queued: only as many due sends as the limit allows, oldest first", () => {
    const now = new Date("2026-11-19T12:00:00.000Z");
    const sends = [
      send({ id: "later", scheduledFor: "2026-11-20T08:00:00.000Z" }),
      send({ id: "b", scheduledFor: "2026-11-19T09:00:00.000Z" }),
      send({ id: "a", scheduledFor: "2026-11-19T08:00:00.000Z" }),
      send({ id: "done", status: "sent", scheduledFor: "2026-11-19T07:00:00.000Z" }),
    ];
    expect(dueSends(sends, now, 10).map((s) => s.id)).toEqual(["a", "b"]);
    expect(dueSends(sends, now, 1).map((s) => s.id)).toEqual(["a"]);
    expect(dueSends(sends, now, 0)).toEqual([]);
  });
});

describe("Vienna time", () => {
  it("converts local date/time to UTC across DST", () => {
    expect(localToUtc("2026-12-01", "09:30")?.toISOString()).toBe("2026-12-01T08:30:00.000Z");
    expect(localToUtc("2026-07-01", "09:30")?.toISOString()).toBe("2026-07-01T07:30:00.000Z");
    expect(localToUtc("2026-13-01", "09:30")).toBeNull();
    expect(localToUtc("2026-12-01", "25:00")).toBeNull();
    expect(localDate(new Date("2026-11-19T23:30:00.000Z"))).toBe("2026-11-20");
  });
});

describe("send decisions & follow-ups", () => {
  const blocked = new Set(["weg@x.at"]);
  it("never sends to unsubscribed addresses or deleted contacts", () => {
    expect(sendDecision(send(), contact({ email: "WEG@x.at" }), blocked)).toMatchObject({ send: false });
    expect(sendDecision(send({ email: "weg@x.at" }), contact(), blocked)).toMatchObject({ send: false });
    expect(sendDecision(send(), undefined, blocked)).toMatchObject({ send: false, cancel: true });
    expect(sendDecision(send(), contact({ status: "geantwortet" }), blocked)).toEqual({ send: true });
  });
  it("sends a follow-up only while the contact is still 'Angeschrieben'", () => {
    const f = send({ kind: "followup" });
    expect(sendDecision(f, contact({ status: "angeschrieben" }), blocked)).toEqual({ send: true });
    for (const status of ["neu", "geantwortet", "termin", "partner", "kein-interesse"] as const) {
      expect(sendDecision(f, contact({ status }), blocked)).toMatchObject({ send: false });
    }
  });
  it("queues exactly one follow-up N days after an initial mail", () => {
    const sentAt = new Date("2026-11-19T10:00:00.000Z");
    const f = followUpOf(send({ followUp: { days: 7, templateId: "tf" } }), sentAt, { id: "f1", token: "tf_tf_tf_tf_tf_1", templateName: "Nachfassen" });
    expect(f).toMatchObject({ id: "f1", kind: "followup", templateId: "tf", status: "queued", parentId: "s1", scheduledFor: "2026-11-26T10:00:00.000Z" });
    expect(f?.followUp).toBeUndefined();
    expect(followUpOf(send(), sentAt, { id: "x", token: "x", templateName: "x" })).toBeNull();
    expect(followUpOf(send({ kind: "followup", followUp: { days: 7, templateId: "tf" } }), sentAt, { id: "x", token: "x", templateName: "x" })).toBeNull();
  });
  it("finds contacts mailed in the last 30 days", () => {
    const now = new Date("2026-11-19T00:00:00.000Z");
    const r = recentlyMailed([{ id: "a", lastMailedAt: "2026-11-01T00:00:00.000Z" }, { id: "b", lastMailedAt: "2026-10-01T00:00:00.000Z" }, { id: "c" }], now);
    expect([...r]).toEqual(["a"]);
  });
  it("marks long-running claims as stale", () => {
    const now = new Date("2026-11-19T10:00:00.000Z");
    const s = [send({ id: "old", status: "sending", claimedAt: "2026-11-19T09:30:00.000Z" }), send({ id: "new", status: "sending", claimedAt: "2026-11-19T09:55:00.000Z" })];
    expect(staleSending(s, now).map((x) => x.id)).toEqual(["old"]);
  });
});

describe("click redirect whitelist", () => {
  const s = { links: ["https://blumora.at/firmenkunden", "javascript:alert(1)", "https://youtube.com/watch?v=1"] };
  it("only resolves URLs stored with the send, by index", () => {
    expect(clickTarget(s, "0")).toBe("https://blumora.at/firmenkunden");
    expect(clickTarget(s, "2")).toBe("https://youtube.com/watch?v=1");
    expect(clickTarget(s, "1")).toBeNull();
    expect(clickTarget(s, "3")).toBeNull();
    expect(clickTarget(s, "https://evil.example")).toBeNull();
    expect(clickTarget(s, "-1")).toBeNull();
    expect(clickTarget(s, null)).toBeNull();
    expect(clickTarget(undefined, "0")).toBeNull();
  });
  it("accepts only well-formed tracking tokens", () => {
    expect(isValidTrackingToken(trackingToken())).toBe(true);
    expect(isValidTrackingToken("../../etc")).toBe(false);
    expect(isValidTrackingToken("short")).toBe(false);
  });
});

describe("unsubscribe tokens", () => {
  const secret = "x".repeat(32);
  it("round-trips the (normalised) address", () => {
    const t = unsubscribeToken("Anna@Huber.AT", secret);
    expect(verifyUnsubscribeToken(t, secret)).toBe("anna@huber.at");
    expect(t).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{32}$/);
  });
  it("rejects tampered tokens, other secrets and garbage", () => {
    const t = unsubscribeToken("anna@huber.at", secret);
    const forged = `${Buffer.from("other@x.at").toString("base64url")}.${t.split(".")[1]}`;
    expect(verifyUnsubscribeToken(forged, secret)).toBeNull();
    expect(verifyUnsubscribeToken(t, "y".repeat(32))).toBeNull();
    expect(verifyUnsubscribeToken(t, null)).toBeNull();
    expect(verifyUnsubscribeToken("abc", secret)).toBeNull();
    expect(verifyUnsubscribeToken("", secret)).toBeNull();
  });
  it("takes the secret from ADMIN_SECRET, else AUTH_SECRET (min. 16 chars)", () => {
    expect(outreachSecret({ ADMIN_SECRET: "a".repeat(20), AUTH_SECRET: "b".repeat(20) })).toBe("a".repeat(20));
    expect(outreachSecret({ AUTH_SECRET: "b".repeat(20) })).toBe("b".repeat(20));
    expect(outreachSecret({ ADMIN_SECRET: "kurz" })).toBeNull();
    expect(outreachSecret({})).toBeNull();
  });
});

describe("wiring", () => {
  it("processes the queue every 10 minutes on Netlify", () => {
    expect(outreachFn.config.schedule).toBe("*/10 * * * *");
  });
  it("keeps tracking and the opt-out reachable behind the site lock", () => {
    expect(isOpenPath("/api/o/o/abc")).toBe(true);
    expect(isOpenPath("/api/outreach/unsubscribe")).toBe(true);
    expect(isOpenPath("/e-mail-abmelden")).toBe(true);
    expect(isOpenPath("/e-mail-abmelden-x")).toBe(false);
    expect(isOpenPath("/blumen")).toBe(false);
  });
});
