import "server-only";
import { escapeHtml, mailProvider, sendMail, type MailResult } from "@/lib/mail";
import { TOKEN_TTL_MINUTES } from "@/lib/auth/tokens";
import { LOCALE_INFO } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import type { MailLang } from "@/lib/mail/templates";
import germanMail from "@/i18n/messages/de/mail";

/**
 * The login e-mail. Deliberately self-contained (no dependency on the shared
 * template module): a short branded card, a single button, a plain-text fallback.
 * Texts: `mail.loginLink` – in the customer's language when `locale`/`m` are given.
 */

const FONT = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const C = { ivory: "#faf7f2", forest: "#1f3a2d", ink: "#23231f", muted: "#6b6862", soft: "#8b877f", line: "#e5ded3" };

export function renderMagicLinkMail(input: { url: string; brandName: string; siteUrl: string } & MailLang) {
  const { url, brandName } = input;
  const locale = input.locale ?? "de";
  const t = (input.m ?? germanMail).loginLink;
  const info = LOCALE_INFO[locale];
  const site = input.siteUrl.replace(/\/$/, "");
  const minutes = TOKEN_TTL_MINUTES;
  const subject = fmt(t.subject, { brand: brandName });
  const html = `<!doctype html>
<html lang="${locale === "de" ? "de" : info.htmlLang}"${info.dir === "rtl" ? ' dir="rtl"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.ivory};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.ivory};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;font-family:${SERIF};font-size:26px;letter-spacing:0.04em;color:${C.forest};"><a href="${escapeHtml(site)}" style="color:${C.forest};text-decoration:none;">${escapeHtml(brandName)}</a></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:12px;padding:36px 32px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.soft};">${escapeHtml(t.eyebrow)}</p>
<h1 style="margin:0 0 16px;font-family:${SERIF};font-weight:500;font-size:30px;line-height:1.15;color:${C.ink};">${escapeHtml(t.title)}</h1>
<p style="margin:0 0 24px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted};">${escapeHtml(fmt(t.intro, { brand: brandName, minutes }))}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:${C.forest};border-radius:8px;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:0.04em;color:${C.ivory};text-decoration:none;">${escapeHtml(t.cta)}</a>
</td></tr></table>
<p style="margin:28px 0 0;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${C.soft};">${escapeHtml(t.fallback)}<br><a href="${escapeHtml(url)}" style="color:${C.forest};word-break:break-all;">${escapeHtml(url)}</a></p>
<p style="margin:20px 0 0;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${C.soft};">${escapeHtml(t.ignore)}</p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.soft};"><a href="${escapeHtml(site)}" style="color:${C.soft};">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = [
    subject,
    "",
    fmt(t.textIntro, { minutes }),
    url,
    "",
    t.textIgnore,
    "",
    site,
  ].join("\n");
  return { subject, html, text };
}

export async function sendMagicLinkMail(input: { to: string; url: string; brandName: string; siteUrl: string } & MailLang): Promise<MailResult> {
  const mail = renderMagicLinkMail(input);
  if (mailProvider() === "console" && process.env.NODE_ENV !== "test") {
    // Local development: make the link impossible to miss in the server log.
    console.info(`\n[auth] ───────── Magic link for ${input.to} ─────────\n[auth] ${input.url}\n[auth] ─────────────────────────────────────────────\n`);
  }
  return sendMail({ to: input.to, subject: mail.subject, html: mail.html, text: mail.text, tags: { type: "magic_link" } });
}
