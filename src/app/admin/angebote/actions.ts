"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { getAllProducts, getDeliveryZones, getExtras, getOfferById, getOrderById, getSettings } from "@/lib/cms";
import { findZone } from "@/lib/delivery";
import { markOrderPaymentFailed } from "@/lib/orders";
import { cancelOpenPayment } from "@/lib/payments";
import { cancelOffer, createOffer, editOffer, markOfferSent, noteOffer, offerUrl, publicSiteUrl } from "@/lib/offers";
import { parseOfferInput, type OfferInput } from "@/lib/offers-core";
import { isEmail } from "@/lib/order-payload";
import { sendOfferMail, type MailResult } from "@/lib/mail";
import { LIVE_LOCALES } from "@/i18n/config";

export type OfferSaveResult = { ok: true; id: string; message?: string } | { ok: false; message: string; errors?: Record<string, string> };
export type OfferActionResult = { ok: boolean; message: string; url?: string };

function revalidateOffers(id?: string) {
  revalidatePath("/admin/angebote");
  if (id) revalidatePath(`/admin/angebote/${id}`);
}

function mailOutcome(result: MailResult, to: string) {
  if (result.sent) return { ok: true, message: `Mail an ${to} gesendet.` };
  if (result.provider === "console") return { ok: true, message: `Kein Mailversand eingerichtet – die Mail an ${to} wurde nur ins Server-Log geschrieben.` };
  return { ok: false, message: `Mail an ${to} konnte nicht gesendet werden: ${result.error ?? "unbekannter Fehler"}.` };
}

/** Creates (id = null) or updates an offer from the admin form. Prices and names are re-validated here. */
export async function saveOfferAction(id: string | null, input: OfferInput): Promise<OfferSaveResult> {
  try {
    await requireAdmin();
    const [products, extras, settings, zones] = await Promise.all([getAllProducts(true), getExtras(false), getSettings(), getDeliveryZones()]);
    const parsed = parseOfferInput(input, { products, extras, locales: LIVE_LOCALES });
    if (!parsed.ok) return { ok: false, message: "Bitte die markierten Felder prüfen.", errors: parsed.errors };
    // Greeting cards not on offer: no card text (the shop shows them as "coming soon").
    const zone = findZone(parsed.offer.recipient.zip, zones);
    const withZone = { ...parsed.offer, delivery: { ...parsed.offer.delivery, ...(zone ? { zoneId: zone.id, zoneName: zone.name } : {}) } };
    const draft = settings.greetingCard?.enabled === true ? withZone : { ...withZone, greeting: undefined };
    if (!id) {
      const offer = await createOffer(draft);
      revalidateOffers(offer.id);
      return { ok: true, id: offer.id };
    }
    const res = await editOffer(id, draft);
    if (!res.ok) return { ok: false, message: res.message };
    revalidateOffers(id);
    return { ok: true, id, message: res.offer.sentAt ? "Gespeichert. Das Angebot wurde schon gesendet – bitte erneut senden, damit die Kund:in die Änderung sieht." : "Gespeichert." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}

/** Sends the offer mail to the customer (also used to re-send after an edit). Drafts become "Gesendet". */
export async function sendOfferAction(id: string): Promise<OfferActionResult> {
  try {
    await requireAdmin();
    const offer = await getOfferById(id);
    if (!offer) return { ok: false, message: "Angebot nicht gefunden." };
    if (offer.status === "paid" || offer.status === "cancelled") return { ok: false, message: "Bezahlte oder stornierte Angebote werden nicht mehr gesendet." };
    const url = offerUrl(offer, await publicSiteUrl());
    const { to, result } = await sendOfferMail(offer, { payUrl: url });
    const outcome = mailOutcome(result, to);
    if (outcome.ok) await markOfferSent(id, `${offer.sentAt ? "Erneut gesendet" : "Gesendet"} an ${to}${result.sent ? "" : " (nur Log – kein Mailversand eingerichtet)"}`);
    revalidateOffers(id);
    return { ...outcome, url };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}

/** A test copy ("[Test]") to an address the admin typed in. Changes nothing on the offer. */
export async function testSendOfferAction(id: string, to: string): Promise<OfferActionResult> {
  try {
    await requireAdmin();
    const address = to.trim().toLowerCase();
    if (!isEmail(address)) return { ok: false, message: "Bitte eine gültige E-Mail-Adresse eingeben." };
    const offer = await getOfferById(id);
    if (!offer) return { ok: false, message: "Angebot nicht gefunden." };
    const { result } = await sendOfferMail(offer, { payUrl: offerUrl(offer, await publicSiteUrl()), to: address, test: true });
    await noteOffer(id, `Test-Mail an ${address}${result.sent ? "" : " (nur Log)"}`);
    revalidateOffers(id);
    return mailOutcome(result, address);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Senden fehlgeschlagen." };
  }
}

/** "Link kopieren" (e.g. for WhatsApp): returns the link and marks a draft as sent, so the page works. */
export async function shareOfferLinkAction(id: string): Promise<OfferActionResult> {
  try {
    await requireAdmin();
    const offer = await getOfferById(id);
    if (!offer) return { ok: false, message: "Angebot nicht gefunden." };
    if (offer.status === "cancelled") return { ok: false, message: "Das Angebot ist storniert." };
    const url = offerUrl(offer, await publicSiteUrl());
    if (offer.status === "draft") await markOfferSent(id, "Link kopiert (z. B. für WhatsApp)", false);
    revalidateOffers(id);
    return { ok: true, message: "Link kopiert.", url };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fehlgeschlagen." };
  }
}

export async function cancelOfferAction(id: string): Promise<OfferActionResult> {
  try {
    await requireAdmin();
    const offer = await getOfferById(id);
    if (!offer) return { ok: false, message: "Angebot nicht gefunden." };
    if (offer.status === "paid") return { ok: false, message: "Bezahlte Angebote werden über die Bestellung storniert." };
    // An open payment of the offer must not complete any more.
    const open = offer.orderId ? await getOrderById(offer.orderId) : null;
    if (open && open.payment.status === "pending") {
      try {
        await cancelOpenPayment(open);
      } catch (err) {
        console.error("[offers] cancelling the open payment failed", err);
        return { ok: false, message: `Die offene Zahlung (${open.id}) konnte nicht abgebrochen werden – bitte gleich noch einmal versuchen.` };
      }
      await markOrderPaymentFailed(open.id, { note: "Angebot storniert" });
    }
    await cancelOffer(id);
    revalidateOffers(id);
    return { ok: true, message: "Angebot storniert – der Link zeigt nur noch „nicht mehr verfügbar“." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fehlgeschlagen." };
  }
}
