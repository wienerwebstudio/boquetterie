import type { SiteSettings } from "@/types";
import type { OutreachContact, OutreachFile, OutreachLanguage, OutreachTemplate } from "@/types/outreach";
import {
  bodyToHtml, bodyToText, escapeHtml, fillPlaceholders, formatBytes, placeholderValues, type ContactLike, type Placeholder,
} from "./format";

/**
 * Branded outreach e-mail (pure – used for sending, test mails and the admin preview).
 *
 * Table layout with inline styles (Gmail, Outlook, Apple Mail), palette from
 * src/app/globals.css: ivory page, white card with the logo, optional header image,
 * Georgia headline, Arial/Helvetica body, forest-green links, a small ornament as
 * divider, the team signature, attachments as chips and the unsubscribe footer.
 * Light colours are set explicitly on every element so clients that darken mails
 * keep the contrast.
 */

const C = {
  bg: "#faf7f2",
  ivory100: "#f5f0e8",
  card: "#ffffff",
  line: "#e5ded3",
  sand: "#d9cdbb",
  forest: "#1f3a2d",
  ink: "#23231f",
  muted: "#6b6862",
  soft: "#8b877f",
  burgundy: "#6d2f3b",
  rose: "#b8767f",
};
const SANS = "Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', Times, serif";

export interface OutreachBrand {
  name: string;
  /** Absolute, without trailing slash – links and logo. */
  siteUrl: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl: string;
  logoMarkUrl: string;
}

const real = (v: string | undefined) => (v && v.trim() && !v.includes("[") ? v.trim() : undefined);

/** Brand facts for outreach mails. Placeholder values ("[…]") from settings are skipped. */
export function outreachBrand(settings: Pick<SiteSettings, "brand" | "seo">, siteUrlOverride?: string): OutreachBrand {
  const siteUrl = (siteUrlOverride ?? settings.seo.siteUrl).replace(/\/$/, "");
  const a = settings.brand.address;
  const street = real(a.street);
  const city = [real(a.zip), real(a.city)].filter(Boolean).join(" ");
  return {
    name: settings.brand.name,
    siteUrl,
    email: real(settings.brand.email),
    phone: real(settings.brand.phone),
    address: street && city ? `${street}, ${city}` : undefined,
    logoUrl: `${siteUrl}/images/brand/logo-horizontal.png`,
    logoMarkUrl: `${siteUrl}/images/brand/logo-mark.png`,
  };
}

const TEXTS = {
  de: {
    regards: "Herzliche Grüße",
    team: (name: string) => `Ihr ${name}-Team`,
    attachments: "Im Anhang",
    video: "Video ansehen",
    why: "Sie erhalten diese E-Mail als persönliche Nachricht an Ihr Unternehmen.",
    unsubscribe: "Keine weiteren E-Mails erhalten",
  },
  en: {
    regards: "Kind regards",
    team: (name: string) => `The ${name} team`,
    attachments: "Attached",
    video: "Watch the video",
    why: "You are receiving this e-mail as a personal message to your business.",
    unsubscribe: "Unsubscribe from further e-mails",
  },
} as const;

export interface RenderInput {
  template: Pick<OutreachTemplate, "subject" | "headline" | "body" | "headerImage" | "attachments" | "video" | "language">;
  contact: ContactLike;
  brand: OutreachBrand;
  /** Makes relative file URLs (`/media/…`) absolute. Defaults to brand.siteUrl. */
  assetBase?: string;
  /** Click tracking: maps a target URL to the URL written into the mail. */
  link?: (url: string) => string;
  /** 1×1 tracking pixel. */
  pixelUrl?: string;
  unsubscribeUrl: string;
  subjectPrefix?: string;
}

export interface RenderedOutreachMail {
  subject: string;
  html: string;
  text: string;
  /** Contact fields the text uses but the contact does not have. */
  values: Record<Placeholder, string>;
}

export function absoluteUrl(url: string, base: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

function fileKind(f: Pick<OutreachFile, "contentType" | "name">) {
  if (f.contentType === "application/pdf" || /\.pdf$/i.test(f.name)) return "PDF";
  if (f.contentType.startsWith("image/")) return "BILD";
  return "DATEI";
}

const fileKindEn = (k: string) => (k === "BILD" ? "IMAGE" : k === "DATEI" ? "FILE" : k);

export function renderOutreachMail(input: RenderInput): RenderedOutreachMail {
  const { template, brand } = input;
  const lang: OutreachLanguage = template.language === "en" ? "en" : "de";
  const t = TEXTS[lang];
  const values = placeholderValues(input.contact, lang);
  const base = input.assetBase ?? brand.siteUrl;
  const link = input.link ?? ((u: string) => u);

  const subject = `${input.subjectPrefix ?? ""}${fillPlaceholders(template.subject, values)}`.trim();
  const headline = template.headline?.trim() ? fillPlaceholders(template.headline.trim(), values) : "";

  const bodyHtml = bodyToHtml(template.body, {
    values,
    link,
    styles: {
      p: `margin:0 0 18px;font-family:${SANS};font-size:16px;line-height:1.65;color:${C.ink};`,
      ul: `margin:0 0 20px;padding:0 0 0 22px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};`,
      li: `margin:0 0 8px;padding-left:4px;color:${C.ink};`,
      link: `color:${C.forest};text-decoration:underline;text-underline-offset:2px;font-weight:bold;`,
      bold: `font-weight:bold;color:${C.ink};`,
    },
  });

  const preheader = (headline || fillPlaceholders(template.body, values).replace(/\{[^}]+\}|\*\*|\[|\]\([^)]*\)/g, ""))
    .replace(/\s+/g, " ")
    .slice(0, 110);

  const header = template.headerImage
    ? `<tr><td style="padding:0;line-height:0;font-size:0;"><img src="${escapeHtml(absoluteUrl(template.headerImage.url, base))}" alt="" width="600" class="full-img" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;"></td></tr>`
    : `<tr><td style="padding:0;height:4px;line-height:4px;font-size:0;background:${C.forest};">&nbsp;</td></tr>`;

  const video = template.video?.url
    ? (() => {
        const v = template.video;
        const href = escapeHtml(link(absoluteUrl(v.url, base)));
        const label = escapeHtml(v.label?.trim() || t.video);
        const poster = v.posterPlayUrl || v.posterUrl;
        const img = poster
          ? `<a href="${href}" style="text-decoration:none;"><img src="${escapeHtml(absoluteUrl(poster, base))}" alt="${label}" width="512" class="full-img" style="display:block;width:100%;max-width:512px;height:auto;border:0;border-radius:10px;"></a>`
          : `<a href="${href}" style="display:block;text-decoration:none;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.forest};border-radius:10px;"><tr><td align="center" style="padding:56px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="64" height="64" style="width:64px;height:64px;border-radius:32px;background:${C.bg};font-family:${SANS};font-size:22px;line-height:64px;color:${C.forest};">&#9658;</td></tr></table></td></tr></table></a>`;
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 26px;"><tr><td>${img}</td></tr><tr><td style="padding:12px 0 0;font-family:${SANS};font-size:14px;line-height:1.4;"><a href="${href}" style="color:${C.forest};font-weight:bold;text-decoration:none;">&#9658;&nbsp; ${label}</a></td></tr></table>`;
      })()
    : "";

  const divider = `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:10px auto 28px;"><tr><td width="56" style="width:56px;border-top:1px solid ${C.sand};font-size:0;line-height:0;">&nbsp;</td><td style="padding:0 12px;font-family:${SERIF};font-size:13px;line-height:13px;color:${C.rose};">&#10022;</td><td width="56" style="width:56px;border-top:1px solid ${C.sand};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

  const contactBits = [
    brand.email ? `<a href="mailto:${escapeHtml(brand.email)}" style="color:${C.forest};text-decoration:none;">${escapeHtml(brand.email)}</a>` : "",
    brand.phone ? `<a href="tel:${escapeHtml(brand.phone.replace(/[^\d+]/g, ""))}" style="color:${C.muted};text-decoration:none;">${escapeHtml(brand.phone)}</a>` : "",
  ].filter(Boolean);
  const host = brand.siteUrl.replace(/^https?:\/\//, "");
  const signature = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${SANS};font-size:16px;line-height:1.5;color:${C.ink};padding:0 0 4px;">${t.regards}</td></tr>
<tr><td style="font-family:${SERIF};font-size:22px;line-height:1.3;color:${C.burgundy};padding:0 0 20px;">${escapeHtml(t.team(brand.name))}</td></tr>
<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" style="padding:2px 14px 0 0;"><img src="${escapeHtml(brand.logoMarkUrl)}" alt="" width="34" height="33" style="display:block;width:34px;height:33px;border:0;"></td>
<td valign="top" style="font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};border-left:1px solid ${C.line};padding-left:14px;">
<span style="font-weight:bold;color:${C.ink};">${escapeHtml(brand.name)}</span> &middot; Blumenversand Wien<br>
${contactBits.length ? `${contactBits.join(" &nbsp;&middot;&nbsp; ")}<br>` : ""}${brand.address ? `${escapeHtml(brand.address)}<br>` : ""}<a href="${escapeHtml(brand.siteUrl)}" style="color:${C.forest};text-decoration:none;">${escapeHtml(host)}</a>
</td></tr></table></td></tr></table>`;

  const files = template.attachments ?? [];
  const chips = files.length
    ? `<tr><td class="pad" style="padding:22px 44px 30px;border-top:1px solid ${C.line};background:${C.card};">
<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${C.soft};">${t.attachments}</p>
${files
  .map((f) => {
    const kind = lang === "en" ? fileKindEn(fileKind(f)) : fileKind(f);
    return `<a href="${escapeHtml(link(absoluteUrl(f.url, base)))}" style="display:inline-block;margin:0 6px 8px 0;padding:7px 12px;border:1px solid ${C.line};border-radius:999px;background:${C.ivory100};font-family:${SANS};font-size:13px;line-height:1.3;color:${C.ink};text-decoration:none;white-space:nowrap;"><span style="font-size:10px;font-weight:bold;letter-spacing:0.08em;color:${C.burgundy};">${kind}</span>&nbsp; ${escapeHtml(f.name)} <span style="color:${C.soft};">&middot; ${escapeHtml(formatBytes(f.bytes))}</span></a>`;
  })
  .join("")}
</td></tr>`
    : "";

  const footerLine = [brand.name, brand.address].filter(Boolean).join(" · ");

  const html = `<!doctype html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<style>
:root { color-scheme: light only; supported-color-schemes: light; }
body { margin:0; padding:0; }
a { color:${C.forest}; }
@media only screen and (max-width:620px) {
  .outer { padding:20px 10px !important; }
  .pad { padding-left:24px !important; padding-right:24px !important; }
  .headline { font-size:26px !important; }
  .full-img { width:100% !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;color:${C.bg};">${escapeHtml(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" class="outer" style="padding:36px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};">
<tr><td align="center" class="pad" style="padding:30px 44px 26px;background:${C.card};"><a href="${escapeHtml(brand.siteUrl)}" style="text-decoration:none;"><img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" width="146" height="30" style="display:block;width:146px;height:30px;border:0;"></a></td></tr>
${header}
<tr><td class="pad" style="padding:40px 44px 12px;background:${C.card};">
${headline ? `<p style="margin:0 0 12px;font-family:${SANS};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.rose};">${escapeHtml(brand.name)} &middot; Wien</p>
<h1 class="headline" style="margin:0 0 26px;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.22;letter-spacing:-0.01em;color:${C.ink};">${escapeHtml(headline)}</h1>` : ""}
${bodyHtml}
${video}
</td></tr>
<tr><td class="pad" style="padding:6px 44px 36px;background:${C.card};">
${divider}
${signature}
</td></tr>
${chips}
</table>
</td></tr>
<tr><td align="center" style="padding:24px 24px 0;">
<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.soft};">${escapeHtml(footerLine)}</p>
<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.soft};">${t.why}</p>
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;"><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${C.soft};text-decoration:underline;">${t.unsubscribe}</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
${input.pixelUrl ? `<img src="${escapeHtml(input.pixelUrl)}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0;opacity:0;">` : ""}
</body>
</html>`;

  const text = [
    headline,
    bodyToText(template.body, values),
    template.video?.url ? `${template.video.label?.trim() || t.video}: ${absoluteUrl(template.video.url, base)}` : "",
    files.length ? `${t.attachments}: ${files.map((f) => f.name).join(", ")}` : "",
    "",
    t.regards,
    t.team(brand.name),
    [brand.email, brand.phone].filter(Boolean).join(" · "),
    brand.address ?? "",
    host,
    "",
    "—",
    `${t.unsubscribe}: ${input.unsubscribeUrl}`,
  ]
    .filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { subject, html, text, values };
}

/** Sample contact for previews and test mails. */
export const SAMPLE_CONTACT: Pick<OutreachContact, "salutation" | "firstName" | "lastName" | "company" | "district" | "email"> = {
  salutation: "frau",
  firstName: "Anna",
  lastName: "Huber",
  company: "Beispiel GmbH",
  district: "1070 Neubau",
  email: "anna.huber@beispiel.at",
};
