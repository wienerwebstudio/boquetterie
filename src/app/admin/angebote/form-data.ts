import "server-only";
import type { Offer } from "@/types";
import { getAllProducts, getDeliveryZones, getExtras, getSettings } from "@/lib/cms";
import { getLocalNow } from "@/lib/delivery";
import { defaultValidUntil } from "@/lib/offers-core";
import { LIVE_LOCALES, LOCALE_INFO } from "@/i18n/config";
import { emptyItem, type OfferFormCatalog, type OfferFormState } from "@/components/admin/offer-form-state";

/** Everything the offer form needs from the catalogue and settings. */
export async function offerFormContext() {
  const [products, extras, zones, settings] = await Promise.all([getAllProducts(true), getExtras(true), getDeliveryZones(), getSettings()]);
  const catalog: OfferFormCatalog = {
    products: products.map((p) => ({
      id: p.id, name: `${p.name}${p.active ? "" : " (inaktiv)"}`,
      image: (p.images.find((i) => i.kind === "front") ?? p.images[0])?.src ?? "",
      sizes: p.sizes.map((s) => ({ id: s.id, label: s.label, price: s.price, ...(s.image ? { image: s.image } : {}) })),
    })),
    extras: extras.map((e) => ({ id: e.id, name: e.name, price: e.price, ...(e.image ? { image: e.image } : {}) })),
  };
  return {
    catalog, zones,
    blackoutDates: settings.blackoutDates,
    cardsEnabled: settings.greetingCard?.enabled === true,
    locales: LIVE_LOCALES.map((l) => ({ id: l, name: l === "de" ? "Deutsch" : `${LOCALE_INFO[l].name} (${l})` })),
    today: getLocalNow(settings.timezone).date,
  };
}

export function emptyOfferForm(today: string): OfferFormState {
  return {
    locale: "de",
    customer: { firstName: "", lastName: "", email: "", phone: "" },
    items: [emptyItem("custom")],
    extras: [],
    delivery: { enabled: true, date: "", from: "", to: "", text: "", fee: "", note: "" },
    feeTouched: false,
    recipient: { kind: "address", firstName: "", lastName: "", company: "", phone: "", street: "", houseNumber: "", addition: "", zip: "", city: "Wien" },
    greeting: { message: "", senderName: "" },
    floristNote: "",
    billing: { company: "", name: "", street: "", zip: "", city: "", country: "Österreich", vatId: "" },
    internalNote: "",
    validUntil: defaultValidUntil(today),
  };
}

const str = (n: number | undefined) => (n === undefined ? "" : Number.isInteger(n) ? String(n) : n.toFixed(2));

export function offerToForm(o: Offer): OfferFormState {
  return {
    locale: o.locale,
    customer: { firstName: o.customer.firstName, lastName: o.customer.lastName, email: o.customer.email, phone: o.customer.phone ?? "" },
    items: o.items.map((it) => ({
      id: it.id, kind: it.kind, title: it.title, description: it.description ?? "", image: it.image ?? "",
      productId: it.productId ?? "", sizeId: it.sizeId ?? "", quantity: String(it.quantity), unitPrice: str(it.unitPrice), floristBudget: str(it.floristBudget),
    })),
    extras: o.extras.map((e) => ({ extraId: e.extraId, quantity: String(e.quantity), unitPrice: str(e.unitPrice) })),
    delivery: { enabled: o.delivery.enabled !== false, date: o.delivery.date, from: o.delivery.from, to: o.delivery.to, text: o.delivery.text ?? "", fee: str(o.delivery.fee), note: o.delivery.note ?? "" },
    // A stored fee is what was agreed – keep it, even if the zone fee changed since.
    feeTouched: true,
    recipient: { kind: o.recipient.kind, firstName: o.recipient.firstName, lastName: o.recipient.lastName, company: o.recipient.company ?? "", phone: o.recipient.phone, street: o.recipient.street, houseNumber: o.recipient.houseNumber, addition: o.recipient.addition ?? "", zip: o.recipient.zip, city: o.recipient.city },
    greeting: { message: o.greeting?.message ?? "", senderName: o.greeting?.senderName ?? "" },
    floristNote: o.floristNote ?? "",
    billing: { company: o.billing?.company ?? "", name: o.billing?.name ?? "", street: o.billing?.street ?? "", zip: o.billing?.zip ?? "", city: o.billing?.city ?? "", country: o.billing?.country ?? "Österreich", vatId: o.billing?.vatId ?? "" },
    internalNote: o.internalNote ?? "",
    validUntil: o.validUntil,
  };
}
