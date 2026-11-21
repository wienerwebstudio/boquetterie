import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const smtpSend = vi.hoisted(() => vi.fn(async () => ({ messageId: "<x@smtp>" })));
vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn(() => ({ sendMail: smtpSend })) } }));
vi.mock("@/lib/cms", () => ({ getSettings: vi.fn(), getOccasions: vi.fn(), getAllProducts: vi.fn(async () => []), getExtras: vi.fn(async () => []), getPartners: vi.fn(async () => []), readData: vi.fn(async () => null), writeData: vi.fn() }));

const attachment = { filename: "Info.pdf", content: Buffer.from("%PDF-1.4"), contentType: "application/pdf" };
const headers = { "List-Unsubscribe": "<https://blumora.at/api/outreach/unsubscribe?t=x>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };

describe("sendMail with attachments and headers", () => {
  beforeEach(() => { vi.resetModules(); delete (globalThis as { __blumoraSmtp?: unknown }).__blumoraSmtp; smtpSend.mockClear(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("passes them to Resend as base64 attachments and headers", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test"); vi.stubEnv("MAIL_REDIRECT_TO", "");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "r1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendMail } = await import("@/lib/mail");
    const res = await sendMail({ to: "a@b.at", subject: "Hi", html: "<p>Hallo</p>", attachments: [attachment], headers });
    expect(res).toEqual({ sent: true, provider: "resend", id: "r1" });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.attachments).toEqual([{ filename: "Info.pdf", content: Buffer.from("%PDF-1.4").toString("base64"), content_type: "application/pdf" }]);
    expect(body.headers).toEqual(headers);
    expect(body.to).toEqual(["a@b.at"]);
  });

  it("passes them to nodemailer and keeps MAIL_REDIRECT_TO", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SMTP_HOST", "mail.example.at"); vi.stubEnv("MAIL_REDIRECT_TO", "test@blumora.at");
    const { sendMail } = await import("@/lib/mail");
    await sendMail({ to: "kunde@firma.at", subject: "Hi", html: "<p>Hallo</p>", attachments: [attachment], headers });
    expect(smtpSend).toHaveBeenCalledWith(expect.objectContaining({
      to: ["test@blumora.at"],
      subject: "[TEST an kunde@firma.at] Hi",
      attachments: [{ filename: "Info.pdf", content: attachment.content, contentType: "application/pdf" }],
      headers,
    }));
  });
});
