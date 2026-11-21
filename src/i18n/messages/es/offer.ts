import type { PartialMessages } from "@/i18n/messages";

/** es – offer (translated from src/i18n/messages/de/offer.ts). */
const offer: NonNullable<PartialMessages["offer"]> = {
  metaTitle: "Tu oferta",
  eyebrow: "Oferta personal {id}",
  title: "Tu oferta personal",
  intro: "Hola, {name}: aquí tienes tu oferta. Revísalo todo con calma y paga de forma segura en línea.",
  items: "Tus flores",
  delivery: "Entrega",
  date: "Fecha y hora",
  place: "Lugar de entrega",
  recipient: "Destinatario",
  card: "Tarjeta de felicitación",
  flowers: "Flores",
  extras: "Extras",
  deliveryFee: "Entrega",
  free: "gratis",
  validUntil: "Válida hasta el {date}",
  payTitle: "Pago",
  pay: "Pagar ahora · {total}",
  acceptTerms: "He leído las {terms} y la {withdrawal}.",
  acceptTermsError: "Confirma las condiciones generales.",
  paidTitle: "Gracias – ya está pagada",
  paidText: "Esta oferta ya está pagada. Has recibido la confirmación del pedido por correo electrónico.",
  viewOrder: "Ver pedido",
  expiredTitle: "Oferta caducada",
  expiredText: "Esta oferta ya no es válida. Escríbenos y te preparamos una nueva con gusto.",
  cancelledTitle: "Oferta no disponible",
  cancelledText: "Esta oferta se ha retirado. Si tienes preguntas, escríbenos.",
  cancelledPayment: "El pago no se completó. Puedes intentarlo de nuevo.",
  failed: "No se pudo iniciar el pago. Inténtalo de nuevo.",
  byArrangement: "Según lo acordado",
  previewTitle: "Vista previa – aún no enviada",
  previewText: "Esta oferta todavía es un borrador. Así la verá el cliente. El pago solo es posible una vez enviada o copiado su enlace.",
};

export default offer;
