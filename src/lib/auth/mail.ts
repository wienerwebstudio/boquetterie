import "server-only";
import { escapeHtml, mailProvider, sendMail, type MailResult } from "@/lib/mail";
import { TOKEN_TTL_MINUTES } from "@/lib/auth/tokens";

/**
 * The login e-mail. Deliberately self-contained (no dependency on the shared
 * template module): a short branded card, a single button, a plain-text fallback.
 */
export const MAGIC_LINK_SUBJECT = "Dein Login-Link für Boquetterie";

const FONT = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const C = { ivory: "#faf7f2", forest: "#1f3a2d", ink: "#23231f", muted: "#6b6862", soft: "#8b877f", line: "#e5ded3" };

export function renderMagicLinkMail(input: { url: string; brandName: string; siteUrl: string }) {
  const { url, brandName } = input;
  const site = input.siteUrl.replace(/\/$/, "");
  const minutes = TOKEN_TTL_MINUTES;
  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(MAGIC_LINK_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:${C.ivory};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.ivory};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
<tr><td style="padding:0 4px 20px;font-family:${SERIF};font-size:26px;letter-spacing:0.04em;color:${C.forest};"><a href="${escapeHtml(site)}" style="color:${C.forest};text-decoration:none;">${escapeHtml(brandName)}</a></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:12px;padding:36px 32px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.soft};">Anmelden ohne Passwort</p>
<h1 style="margin:0 0 16px;font-family:${SERIF};font-weight:500;font-size:30px;line-height:1.15;color:${C.ink};">Dein Login-Link</h1>
<p style="margin:0 0 24px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted};">Mit einem Klick bist du in deinem Konto bei ${escapeHtml(brandName)} angemeldet. Der Link ist ${minutes} Minuten gültig und funktioniert nur einmal.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:${C.forest};border-radius:8px;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:0.04em;color:${C.ivory};text-decoration:none;">Jetzt anmelden</a>
</td></tr></table>
<p style="margin:28px 0 0;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${C.soft};">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br><a href="${escapeHtml(url)}" style="color:${C.forest};word-break:break-all;">${escapeHtml(url)}</a></p>
<p style="margin:20px 0 0;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${C.soft};">Du hast keinen Login angefordert? Dann kannst du diese E-Mail einfach ignorieren – ohne den Link passiert nichts.</p>
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.soft};"><a href="${escapeHtml(site)}" style="color:${C.soft};">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = [
    `Dein Login-Link für ${brandName}`,
    "",
    `Mit diesem Link bist du in deinem Konto angemeldet. Er ist ${minutes} Minuten gültig und funktioniert nur einmal:`,
    url,
    "",
    "Du hast keinen Login angefordert? Dann kannst du diese E-Mail einfach ignorieren.",
    "",
    site,
  ].join("\n");
  return { subject: MAGIC_LINK_SUBJECT, html, text };
}

export async function sendMagicLinkMail(input: { to: string; url: string; brandName: string; siteUrl: string }): Promise<MailResult> {
  const mail = renderMagicLinkMail(input);
  if (mailProvider() === "console" && process.env.NODE_ENV !== "test") {
    // Local development: make the link impossible to miss in the server log.
    console.info(`\n[auth] ───────── Magic link for ${input.to} ─────────\n[auth] ${input.url}\n[auth] ─────────────────────────────────────────────\n`);
  }
  return sendMail({ to: input.to, subject: mail.subject, html: mail.html, text: mail.text, tags: { type: "magic_link" } });
}
