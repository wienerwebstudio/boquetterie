import type { Order, OrderStatusDefinition } from "@/types";
import { formatDateLong, formatPrice } from "@/lib/format";

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
  logoUrl?: string; // optional absolute URL, e.g. `${siteUrl}/images/logo.png`
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
  | { type: "items"; order: Order }
  | { type: "totals"; order: Order }
  | { type: "quote"; text: string; by?: string }
  | { type: "alert"; text: string }
  | { type: "hr" };

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
          const extras = l.extras.map((e) => `+ ${e.quantity > 1 ? `${e.quantity} × ` : ""}${escapeHtml(e.name)} (${escapeHtml(formatPrice(e.unitPrice * e.quantity))})`).join("<br>");
          return `<tr><td style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink};vertical-align:top;"><strong style="font-weight:600;">${l.quantity > 1 ? `${l.quantity} × ` : ""}${escapeHtml(l.productName)}</strong><br><span style="color:${C.muted};font-size:13px;">Größe ${escapeHtml(l.sizeLabel)}</span>${extras ? `<br><span style="color:${C.muted};font-size:13px;">${extras}</span>` : ""}</td><td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.ink};vertical-align:top;white-space:nowrap;">${escapeHtml(formatPrice(l.unitPrice * l.quantity))}</td></tr>`;
        })
        .join("")}</table>`;
    case "totals": {
      const t = b.order.totals;
      const rows: [string, string, boolean][] = [["Blumen", formatPrice(t.subtotal), false]];
      if (t.extras > 0) rows.push(["Extras", formatPrice(t.extras), false]);
      rows.push(["Lieferung", t.delivery > 0 ? formatPrice(t.delivery) : "kostenlos", false]);
      if (t.discount > 0) rows.push([`Gutschein${b.order.coupon ? ` ${b.order.coupon.code}` : ""}`, `– ${formatPrice(t.discount)}`, false]);
      rows.push(["Gesamt (inkl. USt.)", formatPrice(t.total), true]);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">${rows
        .map(([k, v, strong]) => `<tr><td style="padding:6px 0;font-family:${FONT};font-size:${strong ? 15 : 14}px;color:${strong ? C.ink : C.muted};${strong ? "font-weight:600;border-top:1px solid " + C.line + ";padding-top:12px;" : ""}">${escapeHtml(k)}</td><td align="right" style="padding:6px 0;font-family:${FONT};font-size:${strong ? 15 : 14}px;color:${C.ink};${strong ? "font-weight:600;border-top:1px solid " + C.line + ";padding-top:12px;" : ""}white-space:nowrap;">${escapeHtml(v)}</td></tr>`)
        .join("")}</table>`;
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
          return `- ${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName}, Größe ${l.sizeLabel} – ${formatPrice(l.unitPrice * l.quantity)}${extras ? `\n${extras}` : ""}`;
        })
        .join("\n");
    case "totals": {
      const t = b.order.totals;
      const lines = [`Blumen: ${formatPrice(t.subtotal)}`];
      if (t.extras > 0) lines.push(`Extras: ${formatPrice(t.extras)}`);
      lines.push(`Lieferung: ${t.delivery > 0 ? formatPrice(t.delivery) : "kostenlos"}`);
      if (t.discount > 0) lines.push(`Gutschein${b.order.coupon ? ` ${b.order.coupon.code}` : ""}: – ${formatPrice(t.discount)}`);
      lines.push(`Gesamt (inkl. USt.): ${formatPrice(t.total)}`);
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
      { type: "p", text: `wir haben deine Bestellung ${order.id} erhalten. Der Strauß wird am Liefertag frisch gebunden und an deinem Wunschtag zugestellt.` },
      { type: "button", label: "Bestellung ansehen", url: trackingUrl },
      { type: "h", text: "Lieferung" },
      { type: "kv", rows: [["Termin", deliveryLine(order)], ["Empfänger:in", recipientLines(order)], ...(order.delivery.note ? [["Hinweis", order.delivery.note] as [string, string]] : [])] },
      { type: "h", text: "Deine Blumen" },
      { type: "items", order },
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
  arranging: { headline: "Dein Strauß wird gebunden.", text: "Unsere Florist:innen binden gerade deinen Strauß." },
  ready: { headline: "Bereit zur Lieferung.", text: "Der Strauß ist verpackt und wartet auf die Zustellung." },
  in_transit: { headline: "Dein Strauß ist unterwegs.", text: "Die Blumen sind auf dem Weg zur Empfängeradresse." },
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

export function adminNewOrder(input: { order: Order; brand: MailBrand; adminUrl: string }): RenderedMail {
  const { order, brand, adminUrl } = input;
  const items = order.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.productName} (${l.sizeLabel})${l.extras.length ? ` + ${l.extras.map((e) => e.name).join(", ")}` : ""}`).join("\n");
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
          ["Empfänger:in", `${recipientLines(order)}\n${order.recipient.phone}`],
          ["Kund:in", `${order.customer.firstName} ${order.customer.lastName}\n${order.customer.email}\n${order.customer.phone}`],
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
      { type: "p", text: `vor ein paar Tagen haben wir ${first ? `„${first.productName}“` : "deinen Strauß"} zugestellt. Wir würden gern wissen, wie er angekommen ist – und was wir besser machen können.` },
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
    preheader: `Am ${dateLabel}. Noch genug Zeit für Blumen.`,
    headline: `${what} ist ${inDays}.`,
    blocks: [
      { type: "p", text: `Kleine Erinnerung: Am ${dateLabel} ist ${what}. Wenn du Blumen schicken möchtest, ist jetzt ein guter Moment – du wählst das Wunschdatum, wir binden frisch am Liefertag.` },
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
