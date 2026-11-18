import type { Order, OrderStatusDefinition } from "@/types";
import { formatDateLong, formatPrice } from "@/lib/format";
import { VAT_TEXT } from "@/lib/vat";

/**
 * Transactional e-mail templates.
 *
 * Every template is a pure function returning `{ subject, html, text }`. The HTML
 * is a minimal, table based layout (ivory background, forest green accents,
 * system fonts) that renders well in Gmail, Outlook and Apple Mail. No external
 * assets except an optional logo URL. The plain-text variant is generated from
 * the same content blocks, so both versions always say the same thing.
 */

export interface MailBrand {
  name: string;
  siteUrl: string; // without trailing slash
  claim?: string;
  email?: string; // only when it is a real address (no "[…]" placeholder)
  logoUrl?: string; // optional absolute URL, e.g. `${siteUrl}/images/brand/logo-horizontal.png`
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
  | { type: "hr" };

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

function renderBlockHtml(b: Block): string {
  switch (b.type) {
    case "p":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${b.muted ? C.muted : C.ink};">${escapeHtml(b.text)}</p>`;
    case "h":
      return `<h2 style="margin:28px 0 12px;font-family:${SERIF};font-weight:500;font-size:22px;line-height:1.25;color:${C.ink};">${escapeHtml(b.text)}</h2>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:${C.forest};"><a href="${escapeHtml(b.url)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:0.02em;color:#faf7f2;text-decoration:none;border-radius:6px;">${escapeHtml(b.label)}</a></td></tr></table>`;
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
              const label = `+ ${e.quantity > 1 ? `${e.quantity} × ` : ""}${escapeHtml(e.name)} (${escapeHtml(formatPrice(e.unitPrice * e.quantity))})`;
              return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr>${thumb ? `<td width="40" style="width:40px;padding-right:8px;vertical-align:middle;">${thumb}</td>` : ""}<td style="font-family:${FONT};font-size:13px;color:${C.muted};vertical-align:middle;">${label}</td></tr></table>`;
            })
            .join("");
          const img = imgCell(mailImageUrl(b.siteUrl, l.image), l.productName, 64, 80);
          return `<tr>${img ? `<td width="76" style="width:76px;padding:12px 12px 12px 0;border-bottom:1px solid ${C.line};vertical-align:top;">${img}</td>` : ""}<td style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};vertical-align:top;"><strong style="font-weight:600;">${l.quantity > 1 ? `${l.quantity} × ` : ""}${escapeHtml(l.productName)}</strong><br><span style="color:${C.muted};font-size:13px;">Größe ${escapeHtml(l.sizeLabel)}${l.color ? ` · Farbe ${escapeHtml(l.color)}` : ""}</span>${l.floristNote ? `<br><span style="font-size:13px;color:${C.muted};">Dein Wunsch an die Floristik: ${escapeHtml(l.floristNote)}</span>` : ""}${extras}</td><td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.ink};vertical-align:top;white-space:nowrap;">${escapeHtml(formatPrice(l.unitPrice * l.quantity))}</td></tr>`;
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
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:8px;"><tr>${img ? `<td width="176" style="width:176px;padding:16px 0 16px 16px;vertical-align:top;">${img}</td>` : ""}<td style="padding:16px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:${SERIF};font-size:20px;line-height:1.3;color:${C.ink};">${l.quantity > 1 ? `${l.quantity} × ` : ""}${escapeHtml(l.productName)}</td></tr><tr><td style="padding:2px 0 10px;font-family:${FONT};font-size:15px;color:${C.ink};">Größe <strong style="font-weight:600;">${escapeHtml(sizeShort(l.sizeId, l.sizeLabel, l.stems))}</strong>${l.color ? `<br>Farbe <strong style="font-weight:600;">${escapeHtml(l.color)}</strong>` : ""}</td></tr>${l.floristNote ? `<tr><td style="padding:0 0 10px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};"><span style="display:block;padding:10px 12px;border-left:3px solid ${C.forest};background:${C.bg};"><span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Wunsch der Kund:in</span><br>${escapeHtml(l.floristNote)}</span></td></tr>` : ""}<tr><td style="padding:10px 12px;background:${C.bg};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};"><span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">Max. Budget</span><br><strong style="font-size:19px;font-weight:600;">${escapeHtml(budgetText(l.floristBudget, l.quantity))}</strong></td></tr></table></td></tr>${extrasRow}</table>`;
        })
        .join("");
    case "totals": {
      const t = b.order.totals;
      const rows: [string, string, boolean][] = [["Blumen", formatPrice(t.subtotal), false]];
      if (t.extras > 0) rows.push(["Extras", formatPrice(t.extras), false]);
      rows.push(["Lieferung", t.delivery > 0 ? formatPrice(t.delivery) : "kostenlos", false]);
      if (t.discount > 0) rows.push([`Gutschein${b.order.coupon ? ` ${b.order.coupon.code}` : ""}`, `– ${formatPrice(t.discount)}`, false]);
      rows.push([VAT_TEXT.total, formatPrice(t.total), true]);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows
        .map(([k, v, strong]) => `<tr><td style="padding:6px 0;font-family:${FONT};font-size:${strong ? 15 : 14}px;color:${strong ? C.ink : C.muted};${strong ? "font-weight:600;border-top:1px solid " + C.line + ";padding-top:12px;" : ""}">${escapeHtml(k)}</td><td align="right" style="padding:6px 0;font-family:${FONT};font-size:${strong ? 15 : 14}px;color:${C.ink};${strong ? "font-weight:600;border-top:1px solid " + C.line + ";padding-top:12px;" : ""}white-space:nowrap;">${escapeHtml(v)}</td></tr>`)
        .join("")}<tr><td colspan="2" style="padding:8px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">${escapeHtml(VAT_TEXT.note)}</td></tr></table>`;
    }
    case "quote":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="padding:18px 20px;background:${C.bg};border:1px solid ${C.line};border-radius:6px;font-family:${SERIF};font-size:17px;line-height:1.55;color:${C.ink};font-style:italic;">${escapeHtml(b.text).replace(/\n/g, "<br>")}${b.by ? `<br><span style="font-family:${FONT};font-style:normal;font-size:13px;color:${C.muted};">– ${escapeHtml(b.by)}</span>` : ""}</td></tr></table>`;
    case "alert":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="padding:14px 18px;background:${C.rose};border-radius:6px;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.burgundy};">${escapeHtml(b.text)}</td></tr></table>`;
    case "hr":
      return `<hr style="border:0;border-top:1px solid ${C.line};margin:24px 0;">`;
  }
}

function renderBlockText(b: Block): string {
  switch (b.type) {
    case "p":
      return b.text;
    case "h":
      return `\n${b.text.toUpperCase()}`;
    case "button":
    case "link":
      return `${b.label}: ${b.url}`;
    case "kv":
      return b.rows.map(([k, v]) => `${k}: ${v.replace(/\n/g, ", ")}`).join("\n");
    case "items":
      return b.order.lines
        .map((l) => {
          const extras = l.extras.map((e) => `   + ${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name} (${formatPrice(e.unitPrice * e.quantity)})`).join("\n");
          return `- ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}, Größe ${l.sizeLabel}${l.color ? `, Farbe ${l.color}` : ""} – ${formatPrice(l.unitPrice * l.quantity)}${l.floristNote ? `\n  Dein Wunsch an die Floristik: ${l.floristNote}` : ""}${extras ? `\n${extras}` : ""}`;
        })
        .join("\n");
    case "floristItems":
      return b.order.lines
        .map((l) => {
          const extras = l.extras.map((e) => `   + ${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name} – Max. Budget ${budgetText(e.floristBudget, e.quantity)}${e.image ? `\n     Foto: ${mailImageUrl(b.siteUrl, e.image, 160)}` : ""}`).join("\n");
          return `- ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}, Größe ${sizeShort(l.sizeId, l.sizeLabel, l.stems)}${l.color ? `, Farbe ${l.color}` : ""}${l.floristNote ? `\n  Wunsch der Kund:in: ${l.floristNote}` : ""}\n  Max. Budget: ${budgetText(l.floristBudget, l.quantity)}\n  Foto: ${mailImageUrl(b.siteUrl, l.image, 480)}${extras ? `\n${extras}` : ""}`;
        })
        .join("\n");
    case "totals": {
      const t = b.order.totals;
      const lines = [`Blumen: ${formatPrice(t.subtotal)}`];
      if (t.extras > 0) lines.push(`Extras: ${formatPrice(t.extras)}`);
      lines.push(`Lieferung: ${t.delivery > 0 ? formatPrice(t.delivery) : "kostenlos"}`);
      if (t.discount > 0) lines.push(`Gutschein${b.order.coupon ? ` ${b.order.coupon.code}` : ""}: – ${formatPrice(t.discount)}`);
      lines.push(`${VAT_TEXT.total}: ${formatPrice(t.total)}`);
      lines.push(VAT_TEXT.note);
      return lines.join("\n");
    }
    case "quote":
      return `„${b.text}“${b.by ? ` – ${b.by}` : ""}`;
    case "alert":
      return `! ${b.text}`;
    case "hr":
      return "—";
  }
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

function layout(input: LayoutInput): RenderedMail {
  const { brand } = input;
  const footer = [brand.claim, brand.email ? `Fragen? Schreib uns an ${brand.email}.` : undefined, ...(input.footerNotes ?? [])].filter((s): s is string => Boolean(s));

  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.name)}" height="28" style="display:block;height:28px;width:auto;border:0;">`
    : `<span style="font-family:${SERIF};font-size:24px;letter-spacing:-0.01em;color:${C.forest};">${escapeHtml(brand.name)}</span>`;

  const html = `<!doctype html>
<html lang="de">
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
${input.blocks.map(renderBlockHtml).join("\n")}
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
    ...input.blocks.map(renderBlockText),
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

function deliveryLine(order: Order) {
  return `${formatDateLong(order.delivery.date)}${order.delivery.windowLabel ? `, ${order.delivery.windowLabel}` : ""}`;
}

function greetingBlocks(order: Order): Block[] {
  const line = order.lines.find((l) => l.message || l.senderName || l.anonymous);
  if (!line) return [];
  const by = line.anonymous ? "ohne Absender" : line.senderName || undefined;
  if (line.message) return [{ type: "h", text: "Deine Grußkarte" }, { type: "quote", text: line.message, by }];
  return [{ type: "p", text: `Grußkarte: ${line.anonymous ? "ohne Absender" : `Absender ${line.senderName}`}`, muted: true }];
}

/* ---------------- Templates ---------------- */

export function orderConfirmation(input: { order: Order; brand: MailBrand; trackingUrl: string }): RenderedMail {
  const { order, brand, trackingUrl } = input;
  return layout({
    brand,
    subject: `Deine Bestellung ${order.id} bei ${brand.name}`,
    preheader: `Lieferung am ${deliveryLine(order)}.`,
    headline: "Danke für deine Bestellung.",
    blocks: [
      { type: "p", text: `Hallo ${order.customer.firstName},` },
      { type: "p", text: `wir haben deine Bestellung ${order.id} erhalten. Der Strauß wird für deine Bestellung von Hand gebunden und am gewählten Liefertag per Kurier zugestellt.` },
      { type: "button", label: "Bestellung ansehen", url: trackingUrl },
      { type: "h", text: "Lieferung" },
      { type: "kv", rows: [["Termin", deliveryLine(order)], ["Empfänger:in", recipientLines(order)], ...(order.delivery.note ? [["Hinweis", order.delivery.note] as [string, string]] : [])] },
      { type: "h", text: "Deine Blumen" },
      { type: "items", order, siteUrl: brand.siteUrl },
      { type: "totals", order },
      ...greetingBlocks(order),
      { type: "hr" },
      { type: "p", text: "Den aktuellen Stand deiner Bestellung siehst du jederzeit über den Link oben. Wenn sich etwas ändert, melden wir uns per E-Mail.", muted: true },
    ],
    footerNotes: ["Du erhältst diese E-Mail, weil du bei uns bestellt hast."],
  });
}

const STATUS_COPY: Partial<Record<Order["status"], { headline: string; text: string }>> = {
  received: { headline: "Deine Bestellung ist eingegangen.", text: "Wir haben alles erhalten und kümmern uns darum." },
  paid: { headline: "Zahlung bestätigt.", text: "Deine Zahlung ist bei uns eingegangen. Danke." },
  preparing: { headline: "Wir bereiten deinen Strauß vor.", text: "Die Blumen für deine Bestellung werden gerade ausgewählt." },
  arranging: { headline: "Dein Strauß wird gebunden.", text: "Dein Strauß wird gerade von Hand gebunden." },
  ready: { headline: "Bereit zur Lieferung.", text: "Der Strauß ist fertig. Ein Kurier holt ihn ab und bringt ihn zur Empfängeradresse." },
  in_transit: { headline: "Dein Strauß ist unterwegs.", text: "Ein Kurier ist mit den Blumen auf dem Weg zur Empfängeradresse." },
  delivered: { headline: "Zugestellt.", text: "Die Blumen sind angekommen. Wir hoffen, sie machen Freude." },
  undeliverable: { headline: "Wir konnten leider nicht zustellen.", text: "Bei der Zustellung hat es nicht geklappt. Wir melden uns so bald wie möglich bei dir, um einen neuen Versuch abzustimmen." },
  cancelled: { headline: "Deine Bestellung wurde storniert.", text: "Die Bestellung ist storniert. Falls du dazu Fragen hast oder das nicht deine Absicht war, antworte einfach auf diese E-Mail." },
};

export function orderStatusUpdate(input: { order: Order; status: OrderStatusDefinition; brand: MailBrand; trackingUrl: string }): RenderedMail {
  const { order, status, brand, trackingUrl } = input;
  const copy = STATUS_COPY[status.key] ?? { headline: status.label, text: status.description };
  const negative = status.key === "undeliverable" || status.key === "cancelled";
  const latest = [...order.history].reverse().find((h) => h.status === status.key);
  const blocks: Block[] = [
    { type: "p", text: `Hallo ${order.customer.firstName},` },
    negative ? { type: "alert", text: copy.text } : { type: "p", text: copy.text },
  ];
  if (status.key === "undeliverable" && latest?.note) blocks.push({ type: "p", text: latest.note, muted: true });
  blocks.push(
    { type: "kv", rows: [["Bestellung", order.id], ["Status", status.label], ["Lieferung", deliveryLine(order)], ["Empfänger:in", recipientLines(order)]] },
    { type: "button", label: "Bestellung ansehen", url: trackingUrl },
  );
  if (negative && brand.email) blocks.push({ type: "p", text: `Erreichbar sind wir unter ${brand.email}.`, muted: true });
  return layout({
    brand,
    subject: `${status.label} – Bestellung ${order.id}`,
    preheader: copy.text,
    headline: copy.headline,
    blocks,
    footerNotes: ["Du erhältst diese E-Mail, weil sich der Status deiner Bestellung geändert hat."],
  });
}

export function adminNewOrder(input: { order: Order; brand: MailBrand; adminUrl: string; selfDelivery?: boolean }): RenderedMail {
  const { order, brand, adminUrl } = input;
  const items = order.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName} (${l.sizeLabel}${l.color ? `, ${l.color}` : ""})${l.floristNote ? ` – Wunsch: ${l.floristNote}` : ""}${l.extras.length ? ` + ${l.extras.map((e) => e.name).join(", ")}` : ""}`).join("\n");
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
          ["Partner", order.partner ? `${order.partner.name}${order.partner.sentAt ? " (Auftrag gesendet)" : ""}` : "NOCH KEINEM PARTNER ZUGEORDNET – im Admin den Partner wählen und den Auftrag senden."],
          ["Positionen", items],
          ...(greeting?.message ? [["Grußkarte", greeting.message] as [string, string]] : []),
          ...(order.delivery.note ? [["Lieferhinweis", order.delivery.note] as [string, string]] : []),
          ["Zahlung", `${order.payment.method} · ${order.payment.status}${order.payment.reference ? ` · ${order.payment.reference}` : ""}`],
          ["Gesamt", formatPrice(order.totals.total)],
        ],
      },
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
export function floristOrder(input: { order: Order; brand: MailBrand; selfDelivery?: boolean; readyBy?: string | null }): RenderedMail {
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
  return layout({
    brand,
    subject: `Auftrag ${order.id} · fertig bis ${formatDateLong(order.delivery.date)}${readyBy ? ` ${readyBy} Uhr` : ""}`,
    preheader: first ? `${first.quantity > 1 ? `${first.quantity} × ` : ""}${first.productName} – Größe ${sizeShort(first.sizeId, first.sizeLabel, first.stems)}` : undefined,
    headline: `Neuer Auftrag ${order.id}`,
    blocks: [
      { type: "p", text: "Bitte so binden wie auf dem Foto. Das Max. Budget ist der Betrag, für den ihr den Strauß bindet." },
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
    ],
    footerNotes: ["Auftrag von Blumora – bitte auf diese Mail antworten, wenn etwas nicht passt."],
  });
}

/**
 * Cancellation for a partner florist that already received the order slip: the order
 * was cancelled, or it was moved to another partner. Unmistakable subject, no prices,
 * no customer data – the same data minimisation as the order slip.
 */
export function floristCancellation(input: { order: Order; brand: MailBrand; reason: "cancelled" | "reassigned" }): RenderedMail {
  const { order, brand, reason } = input;
  const items = order.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName} – Größe ${sizeShort(l.sizeId, l.sizeLabel, l.stems)}${l.color ? `, ${l.color}` : ""}`).join("\n");
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
export function withdrawalReceipt(input: { brand: MailBrand; id: string; receivedAt: string; name: string; orderId: string; items?: string }): RenderedMail {
  const { brand } = input;
  return layout({
    brand,
    subject: `Eingangsbestätigung deines Widerrufs – Bestellung ${input.orderId}`,
    preheader: `Wir haben deinen Widerruf am ${input.receivedAt} erhalten.`,
    headline: "Dein Widerruf ist eingegangen.",
    blocks: [
      { type: "p", text: `Hallo ${input.name},` },
      { type: "p", text: "wir bestätigen den Eingang deiner Widerrufserklärung, die du über die Funktion „Vertrag widerrufen“ auf unserer Website abgegeben hast:" },
      {
        type: "kv",
        rows: [
          ["Eingegangen am", input.receivedAt],
          ["Bestellnummer", input.orderId],
          ["Widerrufen", input.items?.trim() || "alle widerrufbaren Waren dieser Bestellung"],
          ["Vorgangsnummer", input.id],
        ],
      },
      { type: "p", text: "Für frische Schnittblumen und andere schnell verderbliche Waren besteht nach § 18 Abs. 1 Z 4 FAGG kein Widerrufsrecht. Wir prüfen deine Erklärung und melden uns zur Rückabwicklung per E-Mail." },
      { type: "link", label: "Widerrufsbelehrung ansehen", url: `${brand.siteUrl}/widerruf` },
    ],
    footerNotes: ["Diese E-Mail bestätigt nur den Eingang deiner Erklärung."],
  });
}

/** Double opt-in: the link leads to a page where a button confirms the newsletter sign-up. */
export function newsletterConfirmation(input: { brand: MailBrand; confirm: string; unsubscribe: string }): RenderedMail {
  const { brand } = input;
  return layout({
    brand,
    subject: `Bitte bestätige deine Anmeldung zum ${brand.name}-Newsletter`,
    preheader: "Ein Klick, dann bist du dabei.",
    headline: "Fast geschafft.",
    blocks: [
      { type: "p", text: `Du – oder jemand mit deiner E-Mail-Adresse – möchtest den Newsletter von ${brand.name} bekommen. Bitte bestätige das mit einem Klick:` },
      { type: "button", label: "Anmeldung bestätigen", url: input.confirm },
      { type: "p", text: "Ohne Bestätigung schicken wir dir keinen Newsletter. Warst du das nicht, kannst du diese E-Mail einfach ignorieren.", muted: true },
      { type: "link", label: "Adresse wieder löschen", url: input.unsubscribe },
    ],
    footerNotes: ["Du erhältst diese E-Mail, weil deine Adresse für unseren Newsletter angemeldet wurde."],
  });
}

export function reviewRequest(input: { order: Order; brand: MailBrand; reviewUrl: string }): RenderedMail {
  const { order, brand, reviewUrl } = input;
  const first = order.lines[0];
  return layout({
    brand,
    subject: `Wie war der Strauß? – Bestellung ${order.id}`,
    preheader: "Zwei Minuten, die uns sehr helfen.",
    headline: "Wie hat es gefallen?",
    blocks: [
      { type: "p", text: `Hallo ${order.customer.firstName},` },
      { type: "p", text: `vor Kurzem wurde ${first ? `„${first.productName}“` : "dein Strauß"} zugestellt. Wir würden gern wissen, wie die Blumen angekommen sind – und was wir besser machen können.` },
      { type: "p", text: "Ein Foto vom Strauß freut uns besonders – du kannst bis zu drei Bilder mitschicken." },
      { type: "button", label: "Bewertung schreiben", url: reviewUrl },
      { type: "p", text: "Das dauert nur einen Moment. Deine Bewertung wird von uns gelesen und erst danach im Shop veröffentlicht.", muted: true },
    ],
    footerNotes: ["Du erhältst diese E-Mail einmalig, weil du bei uns bestellt hast."],
  });
}

export function reminderConfirmation(input: { brand: MailBrand; confirmUrl: string; occasionLabel: string; personName?: string; dateLabel: string; leadDays: number }): RenderedMail {
  const { brand, confirmUrl, occasionLabel, personName, dateLabel, leadDays } = input;
  const what = personName ? `${occasionLabel} von ${personName}` : occasionLabel;
  return layout({
    brand,
    subject: `Bitte bestätige deine Erinnerung: ${what}`,
    preheader: "Ein Klick, und die Erinnerung ist aktiv.",
    headline: "Fast fertig.",
    blocks: [
      { type: "p", text: `Du möchtest an ${what} erinnert werden – am ${dateLabel}, ${leadDays} Tage vorher. Bitte bestätige das mit einem Klick:` },
      { type: "button", label: "Erinnerung bestätigen", url: confirmUrl },
      { type: "p", text: "Falls du das nicht warst, kannst du diese E-Mail einfach ignorieren. Ohne Bestätigung senden wir nichts.", muted: true },
    ],
    footerNotes: ["Die Erinnerung wurde auf unserer Website angelegt."],
  });
}

export function occasionReminder(input: { brand: MailBrand; occasionLabel: string; personName?: string; dateLabel: string; leadDays: number; occasionUrl?: string; shopUrl: string; unsubscribeUrl: string }): RenderedMail {
  const { brand, occasionLabel, personName, dateLabel, leadDays, occasionUrl, shopUrl, unsubscribeUrl } = input;
  const what = personName ? `${occasionLabel} von ${personName}` : occasionLabel;
  const inDays = leadDays === 1 ? "morgen" : `in ${leadDays} Tagen`;
  return layout({
    brand,
    subject: `${what} ist ${inDays}`,
    preheader: `Am ${dateLabel}. Eine kleine Erinnerung.`,
    headline: `${what} ist ${inDays}.`,
    blocks: [
      { type: "p", text: `Kleine Erinnerung: Am ${dateLabel} ist ${what}. Wenn du Blumen schicken möchtest, ist jetzt ein guter Moment. Du wählst das Wunschdatum, der Strauß wird für deine Bestellung von Hand gebunden.` },
      ...(occasionUrl ? [{ type: "button", label: `Blumen zu ${occasionLabel}`, url: occasionUrl } as Block, { type: "link", label: "Alle Sträuße ansehen", url: shopUrl } as Block] : [{ type: "button", label: "Sträuße ansehen", url: shopUrl } as Block]),
    ],
    footerNotes: ["Du erhältst diese E-Mail, weil du auf unserer Website eine Erinnerung angelegt hast.", `Erinnerung löschen: ${unsubscribeUrl}`],
  });
}

export function magicLink(input: { url: string; brandName: string; siteUrl?: string; validMinutes?: number }): RenderedMail {
  const brand: MailBrand = { name: input.brandName, siteUrl: (input.siteUrl ?? "").replace(/\/$/, "") };
  const minutes = input.validMinutes ?? 15;
  return layout({
    brand,
    subject: `Dein Anmeldelink für ${input.brandName}`,
    preheader: `Der Link ist ${minutes} Minuten gültig.`,
    headline: "Hier ist dein Anmeldelink.",
    blocks: [
      { type: "p", text: "Mit einem Klick bist du angemeldet – kein Passwort nötig." },
      { type: "button", label: "Jetzt anmelden", url: input.url },
      { type: "p", text: `Der Link ist ${minutes} Minuten gültig und funktioniert nur einmal. Wenn du keine Anmeldung angefordert hast, ignoriere diese E-Mail einfach.`, muted: true },
    ],
  });
}
