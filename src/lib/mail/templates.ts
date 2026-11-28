import type { CustomRequest, Order, OrderStatusDefinition } from "@/types";
import { formatDateLong, formatPrice } from "@/lib/format";
import { SMALL_BUSINESS } from "@/lib/vat";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { fmt, formatDateLongIn, formatPriceIn, plural } from "@/i18n/format";
import type { Messages } from "@/i18n/messages/de";
import germanMail from "@/i18n/messages/de/mail";

/**
 * Transactional e-mail templates.
 *
 * Every template is a pure function returning `{ subject, html, text }`. The HTML
 * is a minimal, table based layout (ivory background, forest green accents,
 * system fonts) that renders well in Gmail, Outlook and Apple Mail. No external
 * assets except an optional logo URL. The plain-text variant is generated from
 * the same content blocks, so both versions always say the same thing.
 *
 * Customer mails take an optional `locale` and `m` (the `mail` namespace of that
 * language, see `loadMessages`) – German when omitted. Internal mails (team,
 * partner florists) are always German.
 */

export type MailMessages = Messages["mail"];

/** Language of a customer mail: the texts and the locale for prices and dates. */
export interface MailLang {
  locale?: Locale;
  m?: MailMessages;
}

interface Lang {
  locale: Locale;
  m: MailMessages;
}

const GERMAN: Lang = { locale: "de", m: germanMail };
const langOf = (input: MailLang): Lang => ({ locale: input.locale ?? "de", m: input.m ?? germanMail });
const priceIn = (L: Lang, value: number) => formatPriceIn(L.locale, value);

export interface MailBrand {
  name: string;
  siteUrl: string; // without trailing slash
  claim?: string;
  email?: string; // only when it is a real address (no "[…]" placeholder)
  logoUrl?: string; // optional absolute URL, e.g. `${siteUrl}/images/brand/logo-horizontal.png`
  /** WhatsApp chat link (settings `brand.social.whatsapp`) and whether it is staffed 24/7. */
  whatsapp?: { href: string; is247: boolean };
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

/* ---------------- Palette & primitives ---------------- */

const C = {
  bg: "#faf7f2",
  card: "#ffffff",
  line: "#e5ded3",
  forest: "#1f3a2d",
  ink: "#23231f",
  muted: "#6b6862",
  soft: "#8b877f",
  ivory200: "#eee7dc",
  rose: "#f3e6e5",
  burgundy: "#6d2f3b",
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

type Block =
  | { type: "p"; text: string; muted?: boolean }
  | { type: "h"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "link"; label: string; url: string }
  | { type: "kv"; rows: [string, string][] }
  | { type: "items"; order: Order; siteUrl: string }
  | { type: "floristItems"; order: Order; siteUrl: string }
  | { type: "totals"; order: Order }
  | { type: "quote"; text: string; by?: string }
  | { type: "alert"; text: string }
  /** Big, bold, framed note that must not be overlooked (team note to the florist). */
  | { type: "important"; title: string; text: string }
  | { type: "hr" }
  /** Large photo (e.g. the bouquet of an offer). `src` is already an absolute URL. */
  | { type: "image"; src: string; alt: string }
  | { type: "choices"; items: { label: string; url: string }[] };

/**
 * Absolute URL of a product photo for e-mails, scaled down by the site's image
 * service (JPEG for clients without WebP support, ~25 KB instead of ~270 KB).
 * `width` must be one of next.config's image sizes.
 */
export function mailImageUrl(siteUrl: string, src: string, width: 160 | 480 = 160) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  return `${siteUrl}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

const imgCell = (src: string, alt: string, w: number, h: number) =>
  src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${w}" height="${h}" style="display:block;width:${w}px;height:${h}px;border:0;border-radius:4px;background:${C.ivory200};object-fit:cover;">`
    : "";

/** Max. budget the florist binds for (their list price); the discount is settled separately and never shown. */
const budgetText = (amount: number | undefined, quantity = 1) =>
  amount === undefined ? "nicht hinterlegt – bitte bei Blumora nachfragen" : `${formatPrice(amount * quantity)}${quantity > 1 ? ` (${quantity} × ${formatPrice(amount)})` : ""}`;

/** "S", "M", "L", "XL" for the standard sizes (as the florist knows them), else the label ("60 cm", "Standard"). */
export function sizeShort(sizeId: string, sizeLabel: string, stems?: number) {
  const size = ["Klein", "Mittel", "Groß", "XL", "XXL", "XXXL"].includes(sizeLabel) ? sizeId.toUpperCase() : sizeLabel;
  // Our sizes differ from the florist's own (their XL is 51 roses, ours 41) – the count settles it.
  return stems ? `${size} · ${stems} Stiele` : size;
}

/** Size as the florist reads it; custom lines (individual offers) have none – their description says what to bind. */
export function floristSize(l: Pick<Order["lines"][number], "custom" | "sizeId" | "sizeLabel" | "stems">) {
  return l.custom ? "individuell – siehe Beschreibung" : sizeShort(l.sizeId, l.sizeLabel, l.stems);
}

/** Size/colour line under an item in customer mails; custom lines show their description instead. */
function customerLineMeta(l: Order["lines"][number], L: Lang): string {
  const parts = l.custom || !l.sizeLabel ? [] : [fmt(L.m.order.size, { size: l.sizeLabel })];
  if (l.color) parts.push(fmt(L.m.order.color, { color: l.color }));
  return parts.join(" · ");
}

function renderBlockHtml(b: Block, L: Lang): string {
  switch (b.type) {
    case "p":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${b.muted ? C.muted : C.ink};">${escapeHtml(b.text)}</p>`;
    case "h":
      return `<h2 style="margin:28px 0 12px;font-family:${SERIF};font-weight:500;font-size:22px;line-height:1.25;color:${C.ink};">${escapeHtml(b.text)}</h2>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:${C.forest};"><a href="${escapeHtml(b.url)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:0.02em;color:#faf7f2;text-decoration:none;border-radius:6px;">${escapeHtml(b.label)}</a></td></tr></table>`;
    case "choices":
      return `<p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:2.6;">${b.items
        .map((i) => `<a href="${escapeHtml(i.url)}" style="display:inline-block;margin:0 6px 0 0;padding:6px 14px;border:1px solid ${C.line};border-radius:999px;color:${C.forest};text-decoration:none;white-space:nowrap;line-height:1.4;">${escapeHtml(i.label)}</a>`)
        .join(" ")}</p>`;
    case "link":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:1.6;"><a href="${escapeHtml(b.url)}" style="color:${C.forest};text-decoration:underline;">${escapeHtml(b.label)}</a></p>`;
    case "kv":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-top:1px solid ${C.line};">${b.rows
        .map(([k, v]) => `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:13px;color:${C.muted};vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};vertical-align:top;">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
        .join("")}</table>`;
    case "items":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-top:1px solid ${C.line};">${b.order.lines
        .map((l) => {
          const extras = l.extras
            .map((e) => {
              const thumb = imgCell(mailImageUrl(b.siteUrl, e.image ?? ""), e.name, 32, 40);
              const label = `+ ${e.quantity > 1 ? `${e.quantity} × ` : ""}${escapeHtml(e.name)} (${escapeHtml(priceIn(L, e.unitPrice * e.quantity))})`;
              return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr>${thumb ? `<td width="40" style="width:40px;padding-right:8px;vertical-align:middle;">${thumb}</td>` : ""}<td style="font-family:${FONT};font-size:13px;color:${C.muted};vertical-align:middle;">${label}</td></tr></table>`;
            })
            .join("");
          const img = imgCell(mailImageUrl(b.siteUrl, l.image), l.productName, 64, 80);
          return `<tr>${img ? `<td width="76" style="width:76px;padding:12px 12px 12px 0;border-bottom:1px solid ${C.line};vertical-align:top;">${img}</td>` : ""}<td style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};vertical-align:top;"><strong style="font-weight:600;">${l.quantity > 1 ? `${l.quantity} × ` : ""}${escapeHtml(l.productName)}</strong><br>${customerLineMeta(l, L) ? `<span style="color:${C.muted};font-size:13px;">${escapeHtml(customerLineMeta(l, L))}</span>` : ""}${l.description ? `<br><span style="font-size:13px;color:${C.muted};">${escapeHtml(l.description).replace(/\n/g, "<br>")}</span>` : ""}${l.floristNote ? `<br><span style="font-size:13px;color:${C.muted};">${escapeHtml(fmt(L.m.order.floristNote, { note: l.floristNote }))}</span>` : ""}${extras}</td><td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.ink};vertical-align:top;white-space:nowrap;">${escapeHtml(priceIn(L, l.unitPrice * l.quantity))}</td></tr>`;
        })
        .join("")}</table>`;
    case "floristItems":
      return b.order.lines
        .map((l) => {
          const img = imgCell(mailImageUrl(b.siteUrl, l.image, 480), l.productName, 160, 200);
          const extras = l.extras
            .map((e) => {
              const thumb = imgCell(mailImageUrl(b.siteUrl, e.image ?? "", 160), e.name, 64, 80);
              return `<tr>${thumb ? `<td width="76" style="width:76px;padding:12px 12px 0 0;vertical-align:middle;">${thumb}</td>` : ""}<td style="padding:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.ink};vertical-align:middle;"><strong style="font-weight:600;">+ ${e.quantity > 1 ? `${e.quantity} × ` : ""}${escapeHtml(e.name)}</strong><br><span style="font-size:14px;color:${C.muted};">Max. Budget: ${escapeHtml(budgetText(e.floristBudget, e.quantity))}</span></td></tr>`;
            })
            .join("");
          const extrasRow = extras
            ? `<tr><td colspan="2" style="padding:0 16px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};"><tr><td colspan="2" style="padding:12px 0 0;font-family:${FONT};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Dazu</td></tr>${extras}</table></td></tr>`
            : "";
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:8px;"><tr>${img ? `<td width="176" style="width:176px;padding:16px 0 16px 16px;vertical-align:top;">${img}</td>` : ""}<td style="padding:16px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:${SERIF};font-size:20px;line-height:1.3;color:${C.ink};">${l.quantity > 1 ? `${l.quantity} × ` : ""}${escapeHtml(l.productName)}</td></tr><tr><td style="padding:2px 0 10px;font-family:${FONT};font-size:15px;color:${C.ink};">Größe <strong style="font-weight:600;">${escapeHtml(floristSize(l))}</strong>${l.color ? `<br>Farbe <strong style="font-weight:600;">${escapeHtml(l.color)}</strong>` : ""}</td></tr>${l.description ? `<tr><td style="padding:0 0 10px;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.ink};"><span style="display:block;padding:10px 12px;border-left:3px solid ${C.burgundy};background:${C.bg};"><span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Beschreibung</span><br><strong style="font-weight:600;">${escapeHtml(l.description).replace(/\n/g, "<br>")}</strong></span></td></tr>` : ""}${l.floristNote ? `<tr><td style="padding:0 0 10px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};"><span style="display:block;padding:10px 12px;border-left:3px solid ${C.forest};background:${C.bg};"><span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Wunsch der Kund:in</span><br>${escapeHtml(l.floristNote)}</span></td></tr>` : ""}<tr><td style="padding:10px 12px;background:${C.bg};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};"><span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Max. Budget</span><br><strong style="font-size:19px;font-weight:600;">${escapeHtml(budgetText(l.floristBudget, l.quantity))}</strong></td></tr></table></td></tr>${extrasRow}</table>`;
        })
        .join("");
    case "totals": {
      const rows: [string, string, boolean][] = totalsRows(b.order, L).map(([k, v], i, all) => [k, v, i === all.length - 1]);
      const vat = vatText(L);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows
        .map(([k, v, strong]) => `<tr><td style="padding:6px 0;font-family:${FONT};font-size:${strong ? 15 : 14}px;color:${strong ? C.ink : C.muted};${strong ? "font-weight:600;border-top:1px solid " + C.line + ";padding-top:12px;" : ""}">${escapeHtml(k)}</td><td align="right" style="padding:6px 0;font-family:${FONT};font-size:${strong ? 15 : 14}px;color:${C.ink};${strong ? "font-weight:600;border-top:1px solid " + C.line + ";padding-top:12px;" : ""}white-space:nowrap;">${escapeHtml(v)}</td></tr>`)
        .join("")}<tr><td colspan="2" style="padding:8px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">${escapeHtml(vat.note)}</td></tr></table>`;
    }
    case "quote":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="padding:18px 20px;background:${C.bg};border:1px solid ${C.line};border-radius:6px;font-family:${SERIF};font-size:17px;line-height:1.55;color:${C.ink};font-style:italic;">${escapeHtml(b.text).replace(/\n/g, "<br>")}${b.by ? `<br><span style="font-family:${FONT};font-style:normal;font-size:13px;color:${C.muted};">– ${escapeHtml(b.by)}</span>` : ""}</td></tr></table>`;
    case "alert":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="padding:14px 18px;background:${C.rose};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.burgundy};">${escapeHtml(b.text)}</td></tr></table>`;
    case "important":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-collapse:separate;"><tr><td style="padding:18px 20px;background:#fff4e5;border:3px solid #c2410c;border-radius:8px;font-family:${FONT};color:#111111;"><div style="font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#c2410c;margin:0 0 8px;">&#9888;&#xFE0E; ${escapeHtml(b.title)}</div><div style="font-size:18px;line-height:1.5;font-weight:700;">${escapeHtml(b.text).replace(/\n/g, "<br>")}</div></td></tr></table>`;
    case "hr":
      return `<hr style="border:0;border-top:1px solid ${C.line};margin:24px 0;">`;
    case "image":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td align="center" style="background:${C.ivory200};border-radius:8px;"><img src="${escapeHtml(b.src)}" alt="${escapeHtml(b.alt)}" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:8px;"></td></tr></table>`;
  }
}

function renderBlockText(b: Block, L: Lang): string {
  switch (b.type) {
    case "p":
      return b.text;
    case "h":
      return `\n${b.text.toUpperCase()}`;
    case "button":
    case "link":
      return `${b.label}: ${b.url}`;
    case "choices":
      return b.items.map((i) => `- ${i.label}: ${i.url}`).join("\n");
    case "kv":
      return b.rows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ", ")}`).join("\n");
    case "items":
      return b.order.lines
        .map((l) => {
          const extras = l.extras.map((e) => `   + ${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name} (${priceIn(L, e.unitPrice * e.quantity)})`).join("\n");
          return `- ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}${customerLineMeta(l, L) ? `, ${customerLineMeta(l, L).replace(" · ", ", ")}` : ""} – ${priceIn(L, l.unitPrice * l.quantity)}${l.description ? `\n  ${l.description.replace(/\n/g, " ")}` : ""}${l.floristNote ? `\n  ${fmt(L.m.order.floristNote, { note: l.floristNote })}` : ""}${extras ? `\n${extras}` : ""}`;
        })
        .join("\n");
    case "floristItems":
      return b.order.lines
        .map((l) => {
          const extras = l.extras.map((e) => `   + ${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name} – Max. Budget ${budgetText(e.floristBudget, e.quantity)}${e.image ? `\n     Foto: ${mailImageUrl(b.siteUrl, e.image, 160)}` : ""}`).join("\n");
          return `- ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}, Größe ${floristSize(l)}${l.color ? `, Farbe ${l.color}` : ""}${l.description ? `\n  Beschreibung: ${l.description.replace(/\n/g, " ")}` : ""}${l.floristNote ? `\n  Wunsch der Kund:in: ${l.floristNote}` : ""}\n  Max. Budget: ${budgetText(l.floristBudget, l.quantity)}\n  Foto: ${mailImageUrl(b.siteUrl, l.image, 480)}${extras ? `\n${extras}` : ""}`;
        })
        .join("\n");
    case "totals":
      return [...totalsRows(b.order, L).map(([k, v]) => `${k}: ${v}`), vatText(L).note].join("\n");
    case "quote":
      return `${fmt(L.m.order.greeting.quote, { text: b.text })}${b.by ? ` – ${b.by}` : ""}`;
    case "alert":
      return `! ${b.text}`;
    case "important":
      return `\n!!! ${b.title.toUpperCase()} !!!\n${b.text}\n`;
    case "hr":
      return "—";
    case "image":
      return "";
  }
}

/** VAT wording of the totals (see src/lib/vat.ts). */
const vatText = (L: Lang) => L.m.order.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"];

/** Label/amount rows of the totals block; the last one is the total. */
function totalsRows(order: Order, L: Lang): [string, string][] {
  const t = order.totals;
  const o = L.m.order.totals;
  const rows: [string, string][] = [[o.flowers, priceIn(L, t.subtotal)]];
  if (t.extras > 0) rows.push([o.extras, priceIn(L, t.extras)]);
  rows.push([o.delivery, t.delivery > 0 ? priceIn(L, t.delivery) : o.free]);
  if (t.discount > 0) rows.push([order.coupon ? fmt(o.couponCode, { code: order.coupon.code }) : o.coupon, `– ${priceIn(L, t.discount)}`]);
  rows.push([vatText(L).total, priceIn(L, t.total)]);
  return rows;
}

interface LayoutInput {
  brand: MailBrand;
  subject: string;
  /** Short hidden preview line shown by mail clients next to the subject. */
  preheader?: string;
  /** Large serif headline at the top of the card. */
  headline: string;
  blocks: Block[];
  /** Small muted lines under the card (unsubscribe hint, why-you-get-this …). */
  footerNotes?: string[];
}

function layout(input: LayoutInput, L: Lang = GERMAN): RenderedMail {
  const { brand } = input;
  const footer = [brand.claim, brand.email ? fmt(L.m.layout.questions, { email: brand.email }) : undefined, ...(input.footerNotes ?? [])].filter((s): s is string => Boolean(s));
  const info = LOCALE_INFO[L.locale];

  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" height="28" style="display:block;height:28px;width:auto;border:0;">`
    : `<span style="font-family:${SERIF};font-size:24px;letter-spacing:-0.01em;color:${C.forest};">${escapeHtml(brand.name)}</span>`;

  const html = `<!doctype html>
<html lang="${L.locale === "de" ? "de" : info.htmlLang}"${info.dir === "rtl" ? ' dir="rtl"' : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;">
${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${escapeHtml(input.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;"><a href="${escapeHtml(brand.siteUrl)}" style="text-decoration:none;">${logo}</a></td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:10px;padding:32px 28px;">
<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:500;font-size:28px;line-height:1.2;letter-spacing:-0.01em;color:${C.ink};">${escapeHtml(input.headline)}</h1>
${input.blocks.map((b) => renderBlockHtml(b, L)).join("\n")}
</td></tr>
<tr><td style="padding:20px 4px 0;">
${footer.map((line) => `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.soft};">${escapeHtml(line)}</p>`).join("\n")}
<p style="margin:10px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.soft};"><a href="${escapeHtml(brand.siteUrl)}" style="color:${C.soft};">${escapeHtml(brand.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    brand.name,
    "",
    input.headline,
    "",
    ...input.blocks.map((b) => renderBlockText(b, L)),
    "",
    ...footer,
    brand.siteUrl,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { subject: input.subject, html, text };
}

/* ---------------- Helpers ---------------- */

function recipientLines(order: Order) {
  const r = order.recipient;
  return [
    [r.firstName, r.lastName].filter(Boolean).join(" "),
    r.company,
    `${r.street} ${r.houseNumber}${r.addition ? `, ${r.addition}` : ""}`,
    `${r.zip} ${r.city}`,
  ]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join("\n");
}

/** Delivery date (long, in the mail's language) and window. Internal mails: German. */
function deliveryLine(order: Order, L: Lang = GERMAN) {
  // Individual offer without delivery: pickup or whatever was agreed.
  if (order.delivery.none) return [L.m.offer.byArrangement, order.delivery.windowLabel].filter(Boolean).join(", ");
  const date = L.locale === "de" ? formatDateLong(order.delivery.date) : formatDateLongIn(L.locale, order.delivery.date);
  return `${date}${order.delivery.windowLabel ? `, ${order.delivery.windowLabel}` : ""}`;
}

function greetingBlocks(order: Order, L: Lang): Block[] {
  const line = order.lines.find((l) => l.message || l.senderName || l.anonymous);
  if (!line) return [];
  const g = L.m.order.greeting;
  const by = line.anonymous ? g.noSender : line.senderName || undefined;
  if (line.message) return [{ type: "h", text: g.title }, { type: "quote", text: line.message, by }];
  return [{ type: "p", text: fmt(g.line, { sender: line.anonymous ? g.noSender : fmt(g.sender, { name: line.senderName ?? "" }) }), muted: true }];
}

/* ---------------- Templates ---------------- */

export function orderConfirmation(input: { order: Order; brand: MailBrand; trackingUrl: string } & MailLang): RenderedMail {
  const { order, brand, trackingUrl } = input;
  const L = langOf(input);
  const t = L.m.orderConfirmation;
  const rows = L.m.order.rows;
  return layout({
    brand,
    subject: fmt(t.subject, { id: order.id, brand: brand.name }),
    preheader: fmt(t.preheader, { delivery: deliveryLine(order, L) }),
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(L.m.layout.hello, { name: order.customer.firstName }) },
      // Offer orders: no word about binding or couriers – the team arranges everything individually.
      { type: "p", text: order.offerId ? fmt(L.m.offer.confirmed, { id: order.id }) : fmt(t.intro, { id: order.id }) },
      { type: "button", label: L.m.order.viewOrder, url: trackingUrl },
      { type: "h", text: t.deliveryTitle },
      { type: "kv", rows: [[rows.date, deliveryLine(order, L)], ...(order.delivery.none ? [] : [[rows.recipient, recipientLines(order)] as [string, string]]), ...(order.delivery.note ? [[rows.note, order.delivery.note] as [string, string]] : [])] },
      { type: "h", text: t.itemsTitle },
      { type: "items", order, siteUrl: brand.siteUrl },
      { type: "totals", order },
      ...greetingBlocks(order, L),
      { type: "hr" },
      { type: "p", text: t.outro, muted: true },
      ...(brand.whatsapp ? [{ type: "link", label: brand.whatsapp.is247 ? L.m.whatsapp.orderQuestions247 : L.m.whatsapp.orderQuestions, url: brand.whatsapp.href } as Block] : []),
    ],
    footerNotes: [t.footer],
  }, L);
}

/**
 * Individual offer (admin → Angebote): summary, photo, total incl. delivery, the big
 * "Jetzt bezahlen" button and the validity – in the offer's language. `order` is the
 * offer rendered as an unpaid order (`offerPreviewOrder`).
 */
export function offerMail(input: { order: Order; brand: MailBrand; payUrl: string; validUntil: string } & MailLang): RenderedMail {
  const { order, brand, payUrl } = input;
  const L = langOf(input);
  const t = L.m.offer;
  const rows = L.m.order.rows;
  const valid = L.locale === "de" ? formatDateLong(input.validUntil) : formatDateLongIn(L.locale, input.validUntil);
  const total = priceIn(L, order.totals.total);
  const r = order.recipient;
  const place = [r.company, `${r.street} ${r.houseNumber}`, r.addition, `${r.zip} ${r.city}`].filter((x): x is string => Boolean(x && x.trim())).join("\n");
  const photo = order.lines.find((l) => l.image)?.image;
  return layout({
    brand,
    subject: fmt(t.subject, { brand: brand.name }),
    preheader: fmt(t.preheader, { total, date: valid }),
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(L.m.layout.hello, { name: order.customer.firstName }) },
      { type: "p", text: t.intro },
      ...(photo ? [{ type: "image", src: mailImageUrl(brand.siteUrl, photo, 480), alt: order.lines[0]?.productName ?? "" } as Block] : []),
      { type: "items", order, siteUrl: brand.siteUrl },
      { type: "totals", order },
      { type: "button", label: `${t.pay} · ${total}`, url: payUrl },
      { type: "p", text: fmt(t.valid, { date: valid }), muted: true },
      { type: "kv", rows: [[rows.date, deliveryLine(order, L)], ...(order.delivery.none ? [] : [[t.place, place], [rows.recipient, [r.firstName, r.lastName].filter(Boolean).join(" ")]] as [string, string][]), ...(order.delivery.note ? [[rows.note, order.delivery.note] as [string, string]] : [])] },
      ...greetingBlocks(order, L),
      { type: "p", text: fmt(t.fallback, { url: payUrl }), muted: true },
    ],
    footerNotes: [t.footer],
  }, L);
}

export function orderStatusUpdate(input: { order: Order; status: OrderStatusDefinition; brand: MailBrand; trackingUrl: string } & MailLang): RenderedMail {
  const { order, status, brand, trackingUrl } = input;
  const L = langOf(input);
  const t = L.m.orderStatus;
  const rows = L.m.order.rows;
  const copy = (t.statuses as Partial<Record<string, { headline: string; text: string }>>)[status.key] ?? { headline: status.label, text: status.description };
  const negative = status.key === "undeliverable" || status.key === "cancelled";
  const latest = [...order.history].reverse().find((h) => h.status === status.key);
  const blocks: Block[] = [
    { type: "p", text: fmt(L.m.layout.hello, { name: order.customer.firstName }) },
    negative ? { type: "alert", text: copy.text } : { type: "p", text: copy.text },
  ];
  if (status.key === "undeliverable" && latest?.note) blocks.push({ type: "p", text: latest.note, muted: true });
  blocks.push(
    { type: "kv", rows: [[rows.order, order.id], [rows.status, status.label], [rows.delivery, deliveryLine(order, L)], [rows.recipient, recipientLines(order)]] },
    { type: "button", label: L.m.order.viewOrder, url: trackingUrl },
  );
  if (negative && brand.email) blocks.push({ type: "p", text: fmt(t.reachUs, { email: brand.email }), muted: true });
  return layout({
    brand,
    subject: fmt(t.subject, { status: status.label, id: order.id }),
    preheader: copy.text,
    headline: copy.headline,
    blocks,
    footerNotes: [t.footer],
  }, L);
}

export function adminNewOrder(input: { order: Order; brand: MailBrand; adminUrl: string; selfDelivery?: boolean; readyBy?: string | null }): RenderedMail {
  const { order, brand, adminUrl } = input;
  const items = order.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}${l.custom ? ` – ${l.description ?? "individuell"}` : ` (${l.sizeLabel}${l.color ? `, ${l.color}` : ""})`}${l.floristNote ? ` – Wunsch: ${l.floristNote}` : ""}${l.extras.length ? ` + ${l.extras.map((e) => e.name).join(", ")}` : ""}`).join("\n");
  const greeting = order.lines.find((l) => l.message);
  return layout({
    brand,
    subject: `Neue Bestellung ${order.id} · ${formatPrice(order.totals.total)} · Lieferung ${formatDateLong(order.delivery.date)}`,
    preheader: `${recipientLines(order).split("\n")[0]} · ${order.delivery.zoneName}`,
    headline: `Neue Bestellung ${order.id}`,
    blocks: [
      { type: "button", label: "Bestellung im Admin öffnen", url: adminUrl },
      {
        type: "kv",
        rows: [
          ["Lieferung", `${deliveryLine(order)}\n${order.delivery.zoneName}`],
          ...(input.selfDelivery ? [["Zustellung", "Selbst ausliefern – es wird kein Fahrer gebucht. Strauß bei der Floristik abholen."] as [string, string]] : []),
          ["Empfänger:in", `${recipientLines(order)}\n${order.recipient.phone}`],
          ["Kund:in", `${order.customer.firstName} ${order.customer.lastName}\n${order.customer.email}\n${order.customer.phone}`],
          ["Partner", order.partner ? `${order.partner.name}${order.partner.sentAt ? " (Auftrag gesendet)" : ""}` : order.offerId ? "Individuelles Angebot – kein Partner und kein Kurier automatisch. Ware und Zustellung von Hand organisieren (bei Bedarf im Admin einen Partner wählen)." : "NOCH KEINEM PARTNER ZUGEORDNET – im Admin den Partner wählen und den Auftrag senden."],
          ["Positionen", items],
          ...(greeting?.message ? [["Grußkarte", greeting.message] as [string, string]] : []),
          ...(order.delivery.note ? [["Lieferhinweis", order.delivery.note] as [string, string]] : []),
          ...(order.offerId ? [["Angebot", `${order.offerId} (individuelles Angebot)`] as [string, string]] : []),
          ...(order.floristNote ? [["Hinweis an Floristik", `${order.floristNote}\n(wird beim Zuordnen des Partners mitgesendet)`] as [string, string]] : []),
          ...(order.billing ? [["Rechnung an", [order.billing.company, order.billing.name, order.billing.street, `${order.billing.zip} ${order.billing.city}`, order.billing.country, order.billing.vatId ? `UID ${order.billing.vatId}` : ""].filter(Boolean).join("\n")] as [string, string]] : []),
          ["Zahlung", `${order.payment.method} · ${order.payment.status}${order.payment.reference ? ` · ${order.payment.reference}` : ""}`],
          ["Gesamt", formatPrice(order.totals.total)],
        ],
      },
      { type: "h", text: "Für den Partner" },
      {
        type: "kv",
        rows: [
          ["Fertig zur Abholung", (input.readyBy ?? order.delivery.windowFrom) ? `${formatDateLong(order.delivery.date)}, bis ${input.readyBy ?? order.delivery.windowFrom} Uhr` : formatDateLong(order.delivery.date)],
          ...(partnerBudgetTotal(order) !== null ? [["Max. Budget gesamt", formatPrice(partnerBudgetTotal(order) as number)] as [string, string]] : []),
        ],
      },
      { type: "floristItems", order, siteUrl: brand.siteUrl },
    ],
    footerNotes: ["Interne Benachrichtigung (MAIL_ADMIN)."],
  });
}

/**
 * Order slip for the partner florist: what to bind, the photo of the bouquet, the
 * max. budget per item – their list price, from the admin's "Floristen-Budget"; the
 * discount is settled separately – and when it is collected. Without the customer's prices and without the customer's or recipient's
 * contact data – the courier delivers, the florist only prepares (data minimisation).
 */
export function floristOrder(input: { order: Order; brand: MailBrand; selfDelivery?: boolean; readyBy?: string | null; confirmUrl?: string; reminder?: number; portalUrl?: string }): RenderedMail {
  const { order, brand } = input;
  const first = order.lines[0];
  const card = order.lines.find((l) => l.message || l.senderName || l.anonymous);
  const cardText = card
    ? [card.message || "(ohne Text)", card.anonymous ? "Absender: anonym – keinen Namen auf die Karte" : card.senderName ? `Absender: ${card.senderName}` : ""].filter(Boolean).join("\n")
    : null;
  const budgets = order.lines.flatMap((l) => [
    l.floristBudget === undefined ? null : l.floristBudget * l.quantity,
    ...l.extras.map((e) => (e.floristBudget === undefined ? null : e.floristBudget * e.quantity)),
  ]);
  const total = budgets.every((b): b is number => b !== null) ? budgets.reduce((a, b) => a + b, 0) : null;
  const readyBy = input.readyBy ?? order.delivery.windowFrom;
  const ready = readyBy
    ? `${formatDateLong(order.delivery.date)}, bis ${readyBy} Uhr (Abholung durch ${input.selfDelivery ? brand.name : "den Kurier"})`
    : `${formatDateLong(order.delivery.date)} (Uhrzeit folgt)`;
  // The team note of the slip; before a partner was assigned, the note from the offer.
  const note = (order.partner ? order.partner.note : order.floristNote)?.trim();
  return layout({
    brand,
    subject: `${input.reminder ? `Erinnerung ${input.reminder}: bitte bestätigen – ` : ""}${note ? "WICHTIGER HINWEIS – " : ""}Auftrag ${order.id} · fertig bis ${formatDateLong(order.delivery.date)}${readyBy ? ` ${readyBy} Uhr` : ""}`,
    preheader: note ? `Wichtiger Hinweis: ${note.slice(0, 90)}` : first ? `${first.quantity > 1 ? `${first.quantity} × ` : ""}${first.productName} – Größe ${floristSize(first)}` : undefined,
    headline: `Neuer Auftrag ${order.id}`,
    blocks: [
      ...(note ? [{ type: "important", title: "Wichtiger Hinweis von Blumora – bitte beachten", text: note } as Block] : []),
      ...(input.reminder ? [{ type: "alert", text: `Erinnerung ${input.reminder}: Wir haben für diesen Auftrag noch keine Bestätigung von euch. Bitte kurz auf „Auftrag bestätigen“ klicken – oder antwortet auf diese Mail, falls ihr ihn nicht übernehmen könnt.` } as Block] : []),
      { type: "p", text: "Bitte so binden wie auf dem Foto. Das Max. Budget ist der Betrag, für den ihr den Strauß bindet." },
      ...(input.confirmUrl
        ? [
            { type: "p", text: "Bitte bestätigt kurz, dass ihr den Auftrag gesehen habt und übernehmt:" } as Block,
            { type: "button", label: "Auftrag bestätigen", url: input.confirmUrl } as Block,
          ]
        : []),
      {
        type: "kv",
        rows: [
          ["Fertig zur Abholung", ready],
          ["Lieferfenster", deliveryLine(order)],
          ...(total !== null && budgets.length > 1 ? [["Max. Budget gesamt", formatPrice(total)] as [string, string]] : []),
          ...(cardText ? [["Grußkarte", cardText] as [string, string]] : []),
        ],
      },
      { type: "floristItems", order, siteUrl: brand.siteUrl },
      ...(input.portalUrl ? [{ type: "link", label: "Alle Aufträge im Partner-Portal ansehen", url: input.portalUrl } as Block] : []),
    ],
    footerNotes: ["Auftrag von Blumora – bitte auf diese Mail antworten, wenn etwas nicht passt."],
  });
}

/** Sum of all max. budgets of an order, or null when one is missing. */
function partnerBudgetTotal(order: Order): number | null {
  const budgets = order.lines.flatMap((l) => [
    l.floristBudget === undefined ? null : l.floristBudget * l.quantity,
    ...l.extras.map((e) => (e.floristBudget === undefined ? null : e.floristBudget * e.quantity)),
  ]);
  return budgets.length && budgets.every((b): b is number => b !== null) ? budgets.reduce((a, b) => a + b, 0) : null;
}

/** Internal notice: a partner has not confirmed – reminder `n` went out (or failed). */
export function partnerReminderNotice(input: { order: Order; brand: MailBrand; partnerName: string; phone?: string; n: number; last: boolean; partnerMailSent: boolean; adminUrl: string }): RenderedMail {
  const { order, brand, partnerName, n } = input;
  const call = input.phone ? `Telefon ${partnerName}: ${input.phone}` : `Für ${partnerName} ist keine Telefonnummer hinterlegt (Admin → Partner).`;
  return layout({
    brand,
    subject: `Erinnerung ${n}: ${partnerName} hat ${order.id} noch nicht bestätigt`,
    preheader: `${order.id} für ${formatDateLong(order.delivery.date)} – noch keine Bestätigung von ${partnerName}.`,
    headline: `${order.id}: noch nicht bestätigt`,
    blocks: [
      {
        type: "alert",
        text: input.last
          ? `${partnerName} hat auch nach der ${n}. Erinnerung nicht bestätigt. Es gehen keine weiteren automatischen Erinnerungen raus – bitte jetzt anrufen.`
          : `${partnerName} hat den Auftrag noch nicht bestätigt. ${input.partnerMailSent ? `Erinnerung ${n} ging gerade an ${partnerName}.` : `Die Erinnerung an ${partnerName} konnte NICHT gesendet werden.`}`,
      },
      { type: "kv", rows: [["Partner", partnerName], ["Anrufen", call], ["Liefertermin", deliveryLine(order)]] },
      { type: "button", label: "Bestellung im Admin öffnen", url: input.adminUrl },
    ],
    footerNotes: ["Interne Benachrichtigung (MAIL_ADMIN)."],
  });
}

/** Internal notice: a customer got stuck in the payment form (reported by the browser). */
export function paymentProblemNotice(input: { order: Order; brand: MailBrand; note: string; adminUrl: string }): RenderedMail {
  const { order, brand } = input;
  return layout({
    brand,
    subject: `Zahlung hängt: ${order.id} · ${formatPrice(order.totals.total)}`,
    preheader: `${order.customer.firstName} ${order.customer.lastName} kommt beim Bezahlen nicht weiter.`,
    headline: `Zahlung hängt bei ${order.id}`,
    blocks: [
      { type: "alert", text: input.note },
      { type: "kv", rows: [["Kund:in", `${order.customer.firstName} ${order.customer.lastName}\n${order.customer.email}\n${order.customer.phone}`], ["Betrag", formatPrice(order.totals.total)], ["Lieferung", deliveryLine(order)]] },
      { type: "p", text: "Die Bestellung ist noch nicht bezahlt. Am besten kurz anrufen und eine andere Zahlungsart anbieten." },
      { type: "button", label: "Bestellung im Admin öffnen", url: input.adminUrl },
    ],
    footerNotes: ["Interne Benachrichtigung (MAIL_ADMIN)."],
  });
}

/** Internal notice: the partner confirmed the order slip. */
export function partnerConfirmed(input: { order: Order; brand: MailBrand; partnerName: string; adminUrl: string }): RenderedMail {
  const { order, brand, partnerName, adminUrl } = input;
  return layout({
    brand,
    subject: `Bestätigt: ${partnerName} übernimmt ${order.id}`,
    preheader: `${partnerName} hat den Auftrag ${order.id} für ${formatDateLong(order.delivery.date)} bestätigt.`,
    headline: `${partnerName} hat ${order.id} bestätigt`,
    blocks: [
      { type: "kv", rows: [["Partner", partnerName], ["Liefertermin", deliveryLine(order)]] },
      { type: "button", label: "Bestellung im Admin öffnen", url: adminUrl },
    ],
    footerNotes: ["Interne Benachrichtigung (MAIL_ADMIN)."],
  });
}

/**
 * Cancellation for a partner florist that already received the order slip: the order
 * was cancelled, or it was moved to another partner. Unmistakable subject, no prices,
 * no customer data – the same data minimisation as the order slip.
 */
export function floristCancellation(input: { order: Order; brand: MailBrand; reason: "cancelled" | "reassigned" }): RenderedMail {
  const { order, brand, reason } = input;
  const items = order.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName} – Größe ${floristSize(l)}${l.color ? `, ${l.color}` : ""}`).join("\n");
  const why = reason === "cancelled"
    ? "Die Bestellung wurde storniert."
    : "Der Auftrag wird von einer anderen Floristik übernommen.";
  return layout({
    brand,
    subject: `STORNO Auftrag ${order.id} – bitte nicht binden`,
    preheader: `${why} Auftrag ${order.id} für ${formatDateLong(order.delivery.date)} entfällt.`,
    headline: `Storno: Auftrag ${order.id}`,
    blocks: [
      { type: "p", text: `${why} Bitte diesen Auftrag NICHT binden. Falls ihr schon angefangen habt, meldet euch bitte kurz per Antwort auf diese Mail.` },
      {
        type: "kv",
        rows: [
          ["Auftrag", order.id],
          ["Geplant für", deliveryLine(order)],
          ["Positionen", items],
        ],
      },
    ],
    footerNotes: ["Storno von Blumora – bitte auf diese Mail antworten, wenn etwas unklar ist."],
  });
}

/**
 * Acknowledgement of a withdrawal sent through the website's withdrawal function
 * ("Vertrag widerrufen"): repeats what was received and when, on a durable medium.
 */
export function withdrawalReceipt(input: { brand: MailBrand; id: string; receivedAt: string; name: string; orderId: string; items?: string; policyUrl?: string } & MailLang): RenderedMail {
  const { brand } = input;
  const L = langOf(input);
  const t = L.m.withdrawal;
  return layout({
    brand,
    subject: fmt(t.subject, { orderId: input.orderId }),
    preheader: fmt(t.preheader, { receivedAt: input.receivedAt }),
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(L.m.layout.hello, { name: input.name }) },
      { type: "p", text: t.intro },
      {
        type: "kv",
        rows: [
          [t.rows.receivedAt, input.receivedAt],
          [t.rows.orderId, input.orderId],
          [t.rows.items, input.items?.trim() || t.allItems],
          [t.rows.id, input.id],
        ],
      },
      { type: "p", text: t.legal },
      { type: "link", label: t.policyLink, url: input.policyUrl ?? `${brand.siteUrl}/widerruf` },
    ],
    footerNotes: [t.footer],
  }, L);
}

/** Double opt-in: the link leads to a page where a button confirms the newsletter sign-up. */
export function newsletterConfirmation(input: { brand: MailBrand; confirm: string; unsubscribe: string } & MailLang): RenderedMail {
  const { brand } = input;
  const L = langOf(input);
  const t = L.m.newsletter;
  return layout({
    brand,
    subject: fmt(t.subject, { brand: brand.name }),
    preheader: t.preheader,
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(t.intro, { brand: brand.name }) },
      { type: "button", label: t.confirm, url: input.confirm },
      { type: "p", text: t.ignore, muted: true },
      { type: "link", label: t.unsubscribe, url: input.unsubscribe },
    ],
    footerNotes: [t.footer],
  }, L);
}

export function reviewRequest(input: { order: Order; brand: MailBrand; reviewUrl: string } & MailLang): RenderedMail {
  const { order, brand, reviewUrl } = input;
  const L = langOf(input);
  const t = L.m.reviewRequest;
  const first = order.lines[0];
  return layout({
    brand,
    subject: fmt(t.subject, { id: order.id }),
    preheader: t.preheader,
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(L.m.layout.hello, { name: order.customer.firstName }) },
      { type: "p", text: fmt(t.intro, { product: first ? fmt(t.product, { name: first.productName }) : t.productFallback }) },
      { type: "p", text: t.photos },
      { type: "button", label: t.cta, url: reviewUrl },
      { type: "p", text: t.note, muted: true },
    ],
    footerNotes: [t.footer],
  }, L);
}

/** "Muttertag" or "Muttertag von Mama". */
function occasionWhat(L: Lang, occasionLabel: string, personName?: string) {
  return personName ? fmt(L.m.reminders.occasionWithPerson, { occasion: occasionLabel, person: personName }) : occasionLabel;
}

export function reminderConfirmation(input: { brand: MailBrand; confirmUrl: string; occasionLabel: string; personName?: string; dateLabel: string; leadDays: number } & MailLang): RenderedMail {
  const { brand, confirmUrl, occasionLabel, personName, dateLabel, leadDays } = input;
  const L = langOf(input);
  const t = L.m.reminders.confirmation;
  const what = occasionWhat(L, occasionLabel, personName);
  return layout({
    brand,
    subject: fmt(t.subject, { what }),
    preheader: t.preheader,
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(t.intro, { what, date: dateLabel, daysBefore: plural(L.locale, leadDays, t.daysBefore) }) },
      { type: "button", label: t.cta, url: confirmUrl },
      { type: "p", text: t.ignore, muted: true },
    ],
    footerNotes: [t.footer],
  }, L);
}

export function occasionReminder(input: { brand: MailBrand; occasionLabel: string; personName?: string; dateLabel: string; leadDays: number; occasionUrl?: string; shopUrl: string; unsubscribeUrl: string } & MailLang): RenderedMail {
  const { brand, occasionLabel, personName, dateLabel, leadDays, occasionUrl, shopUrl, unsubscribeUrl } = input;
  const L = langOf(input);
  const t = L.m.reminders.reminder;
  const what = occasionWhat(L, occasionLabel, personName);
  const when = leadDays === 1 ? t.tomorrow : plural(L.locale, leadDays, t.inDays);
  return layout({
    brand,
    subject: fmt(t.subject, { what, when }),
    preheader: fmt(t.preheader, { date: dateLabel }),
    headline: fmt(t.headline, { what, when }),
    blocks: [
      { type: "p", text: fmt(t.text, { date: dateLabel, what }) },
      ...(occasionUrl ? [{ type: "button", label: fmt(t.occasionCta, { occasion: occasionLabel }), url: occasionUrl } as Block, { type: "link", label: t.allBouquets, url: shopUrl } as Block] : [{ type: "button", label: t.bouquets, url: shopUrl } as Block]),
    ],
    footerNotes: [t.footer, fmt(t.unsubscribe, { url: unsubscribeUrl })],
  }, L);
}

/** Login link of the Partner-Portal (German only – partners are local florists). */
export function partnerPortalLogin(input: { url: string; brand: MailBrand; partnerName: string; validMinutes: number }): RenderedMail {
  return layout({
    brand: input.brand,
    subject: `Dein Login-Link zum Partner-Portal von ${input.brand.name}`,
    preheader: `Der Link ist ${input.validMinutes} Minuten gültig.`,
    headline: "Partner-Portal",
    blocks: [
      { type: "p", text: `Hallo ${input.partnerName}, mit diesem Link meldest du dich im Partner-Portal an – dort siehst du alle Aufträge, kannst sie bestätigen und siehst, was offen und was bezahlt ist.` },
      { type: "button", label: "Im Partner-Portal anmelden", url: input.url },
      { type: "p", text: `Der Link ist ${input.validMinutes} Minuten gültig und funktioniert nur einmal. Falls du ihn nicht angefordert hast, kannst du diese Mail ignorieren.`, muted: true },
    ],
  });
}

export function magicLink(input: { url: string; brandName: string; siteUrl?: string; validMinutes?: number } & MailLang): RenderedMail {
  const brand: MailBrand = { name: input.brandName, siteUrl: (input.siteUrl ?? "").replace(/\/$/, "") };
  const L = langOf(input);
  const t = L.m.magicLink;
  const minutes = input.validMinutes ?? 15;
  return layout({
    brand,
    subject: fmt(t.subject, { brand: input.brandName }),
    preheader: fmt(t.preheader, { minutes }),
    headline: t.headline,
    blocks: [
      { type: "p", text: t.intro },
      { type: "button", label: t.cta, url: input.url },
      { type: "p", text: fmt(t.note, { minutes }), muted: true },
    ],
  }, L);
}

/* ---------------- Customer requests (/anfrage, see docs/INQUIRIES.md) ---------------- */

/**
 * Confirmation to the customer in the request's language. Promises an answer, never a
 * response time or an offer. `labels` are the translated topic/budget names (namespace `inquiry`).
 */
export function customRequestConfirmation(input: {
  brand: MailBrand;
  request: Pick<CustomRequest, "id" | "name" | "date" | "time" | "flexible" | "place" | "message" | "photo">;
  labels: { topics: string[]; product?: string; budget?: string };
} & MailLang): RenderedMail {
  const { brand, request: r, labels } = input;
  const L = langOf(input);
  const t = L.m.customRequest;
  const date = r.date ? (L.locale === "de" ? formatDateLong(r.date) : formatDateLongIn(L.locale, r.date)) : "";
  const when = [date, r.time, r.flexible ? t.flexible : ""].filter(Boolean).join(", ");
  const rows: [string, string][] = [[t.rows.id, r.id]];
  if (labels.topics.length) rows.push([t.rows.topics, labels.topics.join(", ")]);
  if (labels.product) rows.push([t.rows.product, labels.product]);
  if (when) rows.push([t.rows.date, when]);
  if (r.place) rows.push([t.rows.place, r.place]);
  if (labels.budget) rows.push([t.rows.budget, labels.budget]);
  rows.push([t.rows.message, r.message]);
  if (r.photo) rows.push([t.rows.photo, t.photoReceived]);
  return layout({
    brand,
    subject: fmt(t.subject, { brand: brand.name, id: r.id }),
    preheader: t.preheader,
    headline: t.headline,
    blocks: [
      { type: "p", text: fmt(L.m.layout.hello, { name: r.name.trim().split(/\s+/)[0] || r.name }) },
      { type: "p", text: t.intro },
      { type: "h", text: t.summary },
      { type: "kv", rows },
    ],
    footerNotes: [fmt(t.footer, { brand: brand.name })],
  }, L);
}

/** Team notification (German) with every field, the photo (attached and linked) and the admin link. */
export function adminCustomRequest(input: {
  brand: MailBrand;
  request: CustomRequest;
  labels: { topics: string[]; product?: string; budget?: string; language: string };
  adminUrl: string;
  photoUrl?: string;
}): RenderedMail {
  const { brand, request: r, labels } = input;
  const when = [r.date ? formatDateLong(r.date) : "", r.time, r.flexible ? "flexibel" : ""].filter(Boolean).join(", ");
  const rows: [string, string][] = [
    ["Nummer", r.id],
    ["Worum geht es?", labels.topics.join(", ") || "–"],
    ["Strauß aus dem Shop", labels.product ?? "–"],
    ["Wunschtermin", when || "–"],
    ["Lieferort", r.place ?? "–"],
    ["Budget", labels.budget ?? "–"],
    ["Name", r.name],
    ["E-Mail", r.email],
    ["Telefon/WhatsApp", r.phone ?? "–"],
    ["Sprache", labels.language],
  ];
  const blocks: Block[] = [];
  if (labels.topics.length) blocks.push({ type: "important", title: "Worum geht es?", text: labels.topics.join(" · ") });
  blocks.push({ type: "kv", rows }, { type: "h", text: "Nachricht" }, { type: "quote", text: r.message });
  if (input.photoUrl) {
    blocks.push(
      { type: "p", text: "Inspirationsfoto: im Anhang und im Admin (nur mit Admin-Anmeldung sichtbar)." },
      { type: "link", label: "Foto im Admin öffnen", url: input.photoUrl },
    );
  }
  blocks.push({ type: "button", label: "Anfrage im Admin öffnen", url: input.adminUrl });
  return layout({
    brand,
    subject: `Neue Anfrage ${r.id} von ${r.name.replace(/\s+/g, " ")}${labels.topics.length ? ` – ${labels.topics.join(", ")}` : ""}`,
    preheader: r.message.slice(0, 120),
    headline: `Neue Anfrage ${r.id}`,
    blocks,
    footerNotes: ["Interne Benachrichtigung (MAIL_ADMIN). Eine Antwort auf diese Mail geht direkt an die Kund:in (Reply-To)."],
  });
}
