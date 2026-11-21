/** State of the admin offer form (strings as typed) – shared by the form and its server pages. */

export interface OfferFormItem {
  id: string;
  kind: "custom" | "product";
  title: string;
  description: string;
  image: string;
  productId: string;
  sizeId: string;
  quantity: string;
  unitPrice: string;
  floristBudget: string;
}
export interface OfferFormState {
  locale: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  items: OfferFormItem[];
  extras: { extraId: string; quantity: string; unitPrice: string }[];
  delivery: { enabled: boolean; date: string; from: string; to: string; text: string; fee: string; note: string };
  /** The fee was typed by hand – no longer follows the zone. */
  feeTouched: boolean;
  recipient: { kind: "address" | "meeting"; firstName: string; lastName: string; company: string; phone: string; street: string; houseNumber: string; addition: string; zip: string; city: string };
  greeting: { message: string; senderName: string };
  floristNote: string;
  billing: { company: string; name: string; street: string; zip: string; city: string; country: string; vatId: string };
  internalNote: string;
  validUntil: string;
}

export interface OfferFormCatalog {
  products: { id: string; name: string; image: string; sizes: { id: string; label: string; price: number; image?: string }[] }[];
  extras: { id: string; name: string; price: number; image?: string }[];
}

let seq = 0;
const newId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyItem(kind: "custom" | "product" = "custom"): OfferFormItem {
  return { id: newId(), kind, title: "", description: "", image: "", productId: "", sizeId: "", quantity: "1", unitPrice: "", floristBudget: "" };
}

