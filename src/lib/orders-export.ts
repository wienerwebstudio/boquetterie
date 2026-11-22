import type { Order, SiteSettings } from "@/types";
import { foundViaLabel } from "@/lib/found-via";
import {
  customerName, isOpenOrder, isUnpaidOrder, LANGUAGE_NAMES_DE, PAYMENT_LABELS, PAYMENT_STATUS_LABELS, recipientName, statusLabel,
} from "@/components/admin/order-utils";

/**
 * Admin export of orders (admin → Bestellungen → Export): one CSV row per order, one CSV
 * row per order line, or the complete JSON. Excel (de-AT) format like the other admin
 * exports: semicolon, UTF-8 BOM, CRLF, decimal comma. Secrets (tracking token, partner
 * confirm token) are never exported. Pure – unit tested in tests/unit/orders-export.test.ts.
 */

export interface OrderFilter { status?: string; q?: string }

/** Same filter as the orders list (status quick filters + search). */
export function filterOrders(orders: Order[], { status = "", q = "" }: OrderFilter, settings: Pick<SiteSettings, "orderStatuses">): Order[] {
  const needle = q.trim().toLowerCase();
  return orders
    .filter((o) => {
      if (status === "open") return isOpenOrder(o, settings);
      if (status === "unpaid") return isUnpaidOrder(o);
      if (status === "abandoned") return false;
      if (status && o.status !== status) return false;
      return true;
    })
    .filter((o) => {
      if (!needle) return true;
      const hay = [o.id, customerName(o), recipientName(o), o.customer.email, o.recipient.zip].join(" ").toLowerCase();
      return hay.includes(needle);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Quotes when needed; a leading "=", "+", "-", "@" is defused so Excel does not run it as a formula. */
function cell(value: unknown): string {
  const raw = value === undefined || value === null ? "" : String(value);
  // Phone numbers ("+43 660 …") and negative amounts stay as they are.
  const v = /^[=+\-@]/.test(raw) && !/^[+-][\d\s()/,.]+$/.test(raw) ? `'${raw}` : raw;
  return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** 45.9 → "45,90" (Excel de-AT). */
export function euro(n: number | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "";
}

/** ISO → "2026-11-21 19:55" in Vienna time. */
export function viennaDateTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// Same arithmetic as the order totals: extras count per line, not per bouquet.
const lineSum = (l: Order["lines"][number]) => l.unitPrice * l.quantity + l.extras.reduce((s, e) => s + e.unitPrice * e.quantity, 0);
const lineBudget = (l: Order["lines"][number]) =>
  (l.floristBudget ?? 0) * l.quantity + l.extras.reduce((s, e) => s + (e.floristBudget ?? 0) * e.quantity, 0);

function lineSummary(l: Order["lines"][number]): string {
  const name = l.custom ? l.productName : `${l.productName} (${l.sizeLabel}${l.color ? `, ${l.color}` : ""})`;
  const extras = l.extras.length ? ` + ${l.extras.map((e) => `${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name}`).join(", ")}` : "";
  return `${l.quantity} × ${name}${extras}`;
}

export function ordersCsv(orders: Order[], settings: Pick<SiteSettings, "orderStatuses">): string {
  const header = [
    "Bestellnummer", "Erstellt", "Status", "Zahlungsstatus", "Zahlart", "Zahlungsanbieter", "Bezahlt am", "Zahlungs-ID", "Zahlungsreferenz", "Sprache",
    "Besteller Vorname", "Besteller Nachname", "Besteller E-Mail", "Besteller Telefon", "Kundenkonto",
    "Empfänger Vorname", "Empfänger Nachname", "Empfänger Firma", "Straße", "Hausnummer", "Zusatz", "PLZ", "Ort", "Empfänger Telefon",
    "Liefertag", "Zeitfenster", "Liefergebiet", "Ohne Lieferung", "Lieferhinweis",
    "Positionen", "Anzahl Sträuße", "Kartentexte",
    "Blumen", "Extras", "Lieferung", "Rabatt", "Gutschein", "Gesamt", "Einkauf Floristik (netto)",
    "Partner", "Partner zugeordnet", "Auftrag gesendet", "Auftrag bestätigt", "Hinweis an Floristik",
    "Kurier Status", "Kurier ID", "Kurier Abholung",
    "Gefunden über", "Angebot", "Rechnung Firma", "Rechnung Name", "Rechnung Straße", "Rechnung PLZ", "Rechnung Ort", "Rechnung Land", "UID",
    "Interne Notiz", "Letzte Änderung", "Verlauf",
  ];
  const rows = orders.map((o) => {
    const r = o.recipient;
    const last = o.history[o.history.length - 1];
    return [
      o.id, viennaDateTime(o.createdAt), statusLabel(settings, o.status), PAYMENT_STATUS_LABELS[o.payment.status] ?? o.payment.status,
      PAYMENT_LABELS[o.payment.method] ?? o.payment.method, o.payment.provider ?? "", viennaDateTime(o.payment.paidAt), o.payment.intentId ?? "", o.payment.reference ?? "",
      LANGUAGE_NAMES_DE[o.locale ?? "de"] ?? o.locale ?? "",
      o.customer.firstName, o.customer.lastName, o.customer.email, o.customer.phone, o.customerId ?? "",
      r.firstName, r.lastName, r.company ?? "", r.street, r.houseNumber, r.addition ?? "", r.zip, r.city, r.phone,
      o.delivery.date, o.delivery.windowLabel ?? "", o.delivery.zoneName, o.delivery.none ? "ja" : "", o.delivery.note ?? "",
      o.lines.map(lineSummary).join(" | "), o.lines.reduce((s, l) => s + l.quantity, 0),
      o.lines.filter((l) => l.message).map((l) => `${l.message}${l.anonymous ? " (anonym)" : l.senderName ? ` – ${l.senderName}` : ""}`).join(" | "),
      euro(o.totals.subtotal), euro(o.totals.extras), euro(o.totals.delivery), euro(o.totals.discount), o.coupon?.code ?? "", euro(o.totals.total),
      euro(o.lines.reduce((s, l) => s + lineBudget(l), 0) || undefined),
      o.partner?.name ?? "", viennaDateTime(o.partner?.assignedAt), viennaDateTime(o.partner?.sentAt), viennaDateTime(o.partner?.confirmedAt), o.partner?.note ?? o.floristNote ?? "",
      o.courier?.status ?? "", o.courier?.deliveryId ?? "", viennaDateTime(o.courier?.pickupAt),
      o.foundVia ? foundViaLabel(o.foundVia) : "", o.offerId ?? "",
      o.billing?.company ?? "", o.billing?.name ?? "", o.billing?.street ?? "", o.billing?.zip ?? "", o.billing?.city ?? "", o.billing?.country ?? "", o.billing?.vatId ?? "",
      o.internalNote ?? "", viennaDateTime(last?.at),
      o.history.map((h) => `${viennaDateTime(h.at)} ${statusLabel(settings, h.status)}${h.note ? `: ${h.note}` : ""}`).join(" | "),
    ];
  });
  return toCsv([header, ...rows]);
}

export function orderLinesCsv(orders: Order[], settings: Pick<SiteSettings, "orderStatuses">): string {
  const header = [
    "Bestellnummer", "Erstellt", "Status", "Zahlungsstatus", "Liefertag", "Zeitfenster", "PLZ",
    "Produkt", "Produkt-ID", "Größe", "Stiele", "Farbe", "Menge", "Einzelpreis", "Extras", "Summe Position",
    "Kartentext", "Anonym", "Absender", "Wunsch an Floristik", "Individuell", "Beschreibung", "Einkauf Floristik (netto)",
  ];
  const rows = orders.flatMap((o) => o.lines.map((l) => [
    o.id, viennaDateTime(o.createdAt), statusLabel(settings, o.status), PAYMENT_STATUS_LABELS[o.payment.status] ?? o.payment.status,
    o.delivery.date, o.delivery.windowLabel ?? "", o.recipient.zip,
    l.productName, l.productId, l.custom ? "" : l.sizeLabel, l.stems ?? "", l.color ?? "", l.quantity, euro(l.unitPrice),
    l.extras.map((e) => `${e.quantity} × ${e.name} (${euro(e.unitPrice)})`).join(", "), euro(lineSum(l)),
    l.message ?? "", l.anonymous ? "ja" : "", l.senderName ?? "", l.floristNote ?? "", l.custom ? "ja" : "", l.description ?? "",
    euro(lineBudget(l) || undefined),
  ]));
  return toCsv([header, ...rows]);
}

/** Complete orders as JSON – without the tracking token and the partner confirm token (secret links). */
export function ordersJson(orders: Order[]): string {
  const safe = orders.map((o) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { token, ...rest } = o;
    if (!rest.partner) return rest;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmToken, ...partner } = rest.partner;
    return { ...rest, partner };
  });
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: safe.length, orders: safe }, null, 2);
}
