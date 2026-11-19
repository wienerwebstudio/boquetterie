import "server-only";
import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/client";
import { liveLocales, type Locale } from "@/i18n/config";
import { loadMessages, type Messages, type PartialMessages } from "@/i18n/messages";
import { currentLocale } from "@/i18n/server";

/**
 * Namespaces every page's Client Components may use (header, cart drawer, product
 * cards, PLZ check, …). Everything else is sent only by the pages that need it via
 * <ClientMessages ns={[…]}> – the whole dictionary on every page would cost ~20 KB.
 */
const BASE = ["common", "ui", "layout", "cart", "shop", "product", "forms"] as const satisfies readonly (keyof Messages)[];

export function baseClientMessages(m: Messages): PartialMessages {
  const out: Record<string, unknown> = Object.fromEntries(BASE.map((k) => [k, m[k]]));
  // Used on every page: delivery check (hero, product page) and the greeting-card preview.
  out.checkout = { deliveryCheck: m.checkout.deliveryCheck, cardPreview: m.checkout.cardPreview };
  return out as PartialMessages;
}

/** Root provider for a language (set in app/[locale]/layout.tsx). */
export async function RootI18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const m = await loadMessages(locale);
  return <I18nProvider locale={locale} messages={baseClientMessages(m)} live={liveLocales()}>{children}</I18nProvider>;
}

/** Adds namespaces for the Client Components of one page or layout. */
export async function ClientMessages({ ns, children }: { ns: readonly (keyof Messages)[]; children: ReactNode }) {
  const locale = await currentLocale();
  const m = await loadMessages(locale);
  const extra = Object.fromEntries(ns.map((k) => [k, m[k]])) as PartialMessages;
  return <I18nProvider locale={locale} messages={extra}>{children}</I18nProvider>;
}
