"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "@/components/ui/link";
import type { CartItem } from "@/types";
import type { ExpressQuoteResponse } from "@/types/payments";
import { Input, Select } from "@/components/ui/input";
import { useDeliveryCheck } from "@/hooks/use-delivery-check";
import { useDeliveryContext } from "@/store/delivery";
import { isValidAustrianPostalCode, normalizePostalCode } from "@/lib/delivery";
import { computeTotals } from "@/lib/pricing";
import { routes } from "@/lib/urls";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import type { ExpressWalletData } from "@/lib/express";
import { rich } from "./rich-text";
import { usePaymentMethods } from "./use-payment-methods";
import type { ExpressAbandonInfo, ExpressSheetDetails } from "./express-element";
import { clearDraftId, draftId, peekDraftId, postDraft } from "./checkout-draft";

// Stripe.js is loaded only when the block scrolls into view and Stripe is configured.
const ExpressElement = dynamic(() => import("./express-element").then((m) => m.ExpressElement), { ssr: false });

/** Quote error code → key in `pay.express.errors`. */
const ERROR_KEYS = {
  zone: "zone", date: "date", window: "window", min_order: "minOrder", items: "items", coupon: "coupon", unavailable: "failed",
} as const satisfies Record<Extract<ExpressQuoteResponse, { ok: false }>["code"], string>;

/**
 * "Express-Kauf" with Apple Pay / Google Pay / Link (Stripe Express Checkout Element) on the
 * product page and in the cart. Renders nothing unless Stripe is configured and the device
 * offers at least one wallet. Before the wallet sheet opens, the customer picks PLZ, delivery
 * day and time window here (compact picker); the sheet then collects the recipient address
 * (restricted to our delivery zones via `/api/express/quote`), name, e-mail and phone, and
 * `/api/express/order` creates the order with exactly the checkout's rules.
 */
export function ExpressBuy({ items, couponCode, postalCode, date, source, blockedMessage, className }: {
  items: CartItem[];
  couponCode?: string | null;
  /** PLZ already known (product page check, PLZ context). */
  postalCode?: string | null;
  /** Delivery day already chosen (product page, cart item). */
  date?: string | null;
  /** "product": buy just this configuration and leave the cart alone; "cart": buy the cart. */
  source: "product" | "cart";
  /** Set when the configuration is incomplete (e.g. no colour chosen) – the sheet does not open. */
  blockedMessage?: string;
  className?: string;
}) {
  const { data } = usePaymentMethods();
  const stripeMethods = useMemo(() => new Set((data?.methods ?? []).filter((x) => x.provider === "stripe").map((x) => x.id)), [data]);
  const enabled = Boolean(data?.stripePublishableKey) && (stripeMethods.has("apple_pay") || stripeMethods.has("google_pay") || stripeMethods.has("card"));
  const ref = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver (old browsers) load right away.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const el = ref.current;
    if (!enabled || inView || !el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, inView]);

  if (!enabled || items.length === 0) return null;
  return (
    <div ref={ref} className={className}>
      {inView && data?.stripePublishableKey && (
        <ExpressPanel
          publishableKey={data.stripePublishableKey}
          wallets={{ applePay: stripeMethods.has("apple_pay"), googlePay: stripeMethods.has("google_pay"), link: stripeMethods.has("card") }}
          items={items} couponCode={couponCode} postalCode={postalCode} date={date} source={source} blockedMessage={blockedMessage}
        />
      )}
    </div>
  );
}

function ExpressPanel({ publishableKey, wallets, items, couponCode, postalCode, date, source, blockedMessage }: {
  publishableKey: string;
  wallets: { applePay: boolean; googlePay: boolean; link: boolean };
  items: CartItem[];
  couponCode?: string | null;
  postalCode?: string | null;
  date?: string | null;
  source: "product" | "cart";
  blockedMessage?: string;
}) {
  const uid = useId();
  const { m, fmt, dateShort, locale } = useI18n();
  const t = m.pay.express;
  const ctxZip = useDeliveryContext((s) => s.postalCode);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---- PLZ, day and window ---- */
  const restrictiveSlug = useMemo(() => items.find((i) => !i.snapshot.sameDayCapable)?.snapshot.slug ?? items[0]?.snapshot.slug, [items]);
  const { result, loading, error: checkError, check } = useDeliveryCheck(restrictiveSlug);
  const [plz, setPlz] = useState(() => postalCode || items.find((i) => i.postalCode)?.postalCode || ctxZip || "");
  const [dayChoice, setDay] = useState(() => date || items.find((i) => i.deliveryDate)?.deliveryDate || "");
  const [windowChoice, setWindowId] = useState(() => items.find((i) => i.windowId)?.windowId ?? "");
  const checked = useRef<string | null>(null);

  // Follow the product page when its PLZ or day changes (adjusting state while rendering).
  const [seen, setSeen] = useState({ postalCode, date });
  if (seen.postalCode !== postalCode || seen.date !== date) {
    setSeen({ postalCode, date });
    if (postalCode && postalCode !== seen.postalCode) setPlz(postalCode);
    if (date && date !== seen.date) setDay(date);
  }

  useEffect(() => {
    if (!isValidAustrianPostalCode(plz) || checked.current === plz) return;
    const timer = setTimeout(() => { checked.current = plz; void check(plz); }, 300);
    return () => clearTimeout(timer);
  }, [plz, check]);

  const zoneResult = result && result.postalCode === plz ? result : null;
  const days = useMemo(() => (zoneResult?.available ? zoneResult.days : []), [zoneResult]);
  // A day the zone does not offer falls back to the first one; a single window is preselected.
  const selectedDay = days.find((d) => d.date === dayChoice) ?? days[0];
  const day = selectedDay?.date ?? "";
  const windows = useMemo(() => selectedDay?.windows ?? [], [selectedDay]);
  const windowId = windows.length === 1 ? windows[0].id : windows.some((w) => w.id === windowChoice) ? windowChoice : "";

  /* ---- Server quote for the chosen slot (what the wallet sheet shows) ---- */
  // Keyed by content: the product page rebuilds `items` on every render.
  const itemsKey = JSON.stringify(items.map((i) => ({
    productId: i.productId, sizeId: i.sizeId, quantity: i.quantity,
    ...(i.colorId && { colorId: i.colorId }),
    ...(i.floristNote && { floristNote: i.floristNote }),
    extras: i.extras.map((e) => ({ extraId: e.extraId, quantity: e.quantity })),
    ...(i.message && { message: i.message, anonymous: Boolean(i.anonymous), ...(i.senderName && !i.anonymous ? { senderName: i.senderName } : {}) }),
  })));
  const payloadItems = useMemo(() => JSON.parse(itemsKey) as unknown[], [itemsKey]);
  const slotComplete = Boolean(zoneResult?.available && selectedDay && (windows.length === 0 || windows.some((w) => w.id === windowId)));
  const [quote, setQuote] = useState<{ key: string; value: ExpressQuoteResponse } | null>(null);
  const quoteKey = JSON.stringify({ payloadItems, couponCode, plz, day, windowId });

  const fetchQuote = useCallback(async (zip: string): Promise<ExpressQuoteResponse> => {
    try {
      const res = await fetch("/api/express/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems, couponCode: couponCode || undefined, postalCode: zip, date: day, windowId: windowId || undefined }),
      });
      return (await res.json()) as ExpressQuoteResponse;
    } catch {
      return { ok: false, code: "unavailable", message: "" };
    }
  }, [payloadItems, couponCode, day, windowId]);

  useEffect(() => {
    if (!slotComplete) return;
    let alive = true;
    const key = quoteKey;
    void fetchQuote(plz).then((value) => { if (alive) setQuote({ key, value }); });
    return () => { alive = false; };
  }, [slotComplete, quoteKey, fetchQuote, plz]);

  const current = quote?.key === quoteKey ? quote.value : null;
  const errorText = useCallback((q: Extract<ExpressQuoteResponse, { ok: false }>) => t.errors[ERROR_KEYS[q.code] ?? "failed"], [t]);
  const estimate = computeTotals({ items }).subtotal;
  const amount = current?.ok ? current.total : estimate;
  const windowLabel = windows.find((w) => w.id === windowId)?.label;

  const sheetFor = useCallback((q: Extract<ExpressQuoteResponse, { ok: true }>): ExpressSheetDetails => ({
    totalCents: Math.round(q.total * 100),
    goodsCents: Math.round(q.goods * 100),
    goodsLabel: t.goods,
    shippingLabel: q.windowLabel ? fmt(t.shippingWindow, { date: dateShort(day), window: q.windowLabel }) : fmt(t.shipping, { date: dateShort(day) }),
  }), [t, fmt, dateShort, day]);

  /** Called synchronously when a wallet button is clicked: everything chosen? */
  const clickDetails = useCallback((): ExpressSheetDetails | null => {
    if (blockedMessage) { setError(blockedMessage); return null; }
    if (!isValidAustrianPostalCode(plz)) { setError(t.needPostalCode); return null; }
    if (!slotComplete) { setError(t.needSlot); return null; }
    if (!current) { setError(t.needSlot); return null; }
    if (!current.ok) { setError(errorText(current)); return null; }
    setError(null);
    return sheetFor(current);
  }, [blockedMessage, plz, slotComplete, current, errorText, sheetFor, t]);

  /** The wallet's shipping address changed (only PLZ/city/country are known yet). */
  const addressQuote = useCallback(async (zip: string, country: string): Promise<ExpressSheetDetails | null> => {
    if (country.toUpperCase() !== "AT") { setError(t.errors.zone); return null; }
    const q = await fetchQuote(normalizePostalCode(zip));
    if (!q.ok) { setError(errorText(q)); return null; }
    setError(null);
    return sheetFor(q);
  }, [fetchQuote, errorText, sheetFor, t]);

  const draftScope = `express-${source}`;
  const orderBody = useCallback((wallet: ExpressWalletData) => ({
    items: payloadItems,
    couponCode: couponCode || undefined,
    delivery: { date: day, windowId: windowId || undefined },
    wallet,
    acceptedTerms: true,
    locale,
    // An earlier closed sheet of this session ("Abgebrochene Kasse") is removed once the order exists.
    draftId: peekDraftId(draftScope),
  }), [payloadItems, couponCode, day, windowId, locale, draftScope]);

  /** Sheet closed without an order: record what we know for the team (no contact data unless the wallet released it). */
  const onAbandon = useCallback((info: ExpressAbandonInfo) => {
    const [firstName = "", ...rest] = (info.contact?.name ?? "").trim().split(/\s+/);
    const contact = info.contact && (info.contact.email || info.contact.phone)
      ? { firstName, lastName: rest.join(" "), email: info.contact.email ?? "", phone: info.contact.phone ?? "" }
      : undefined;
    postDraft({
      id: draftId(draftScope), source: "express", locale,
      items: payloadItems, couponCode: couponCode || undefined,
      delivery: day ? { date: day, windowId: windowId || undefined } : undefined,
      express: { wallet: info.wallet, postalCode: info.address?.postalCode || plz, city: info.address?.city, country: info.address?.country },
      ...(contact ? { contact } : {}),
    });
  }, [draftScope, locale, payloadItems, couponCode, day, windowId, plz]);
  const onOrderCreated = useCallback(() => clearDraftId(draftScope), [draftScope]);

  if (available === false) return null;

  return (
    // Until Stripe reports a wallet on this device the block stays collapsed and out of the tab order.
    <section aria-labelledby={`${uid}-title`} aria-hidden={!available || undefined} inert={!available || undefined} className={cn("mt-5", available ? "animate-fade-in" : "h-0 overflow-hidden")} data-testid="express-buy">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" aria-hidden />
        <h2 id={`${uid}-title`} className="eyebrow">{t.title}</h2>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
      <p className="mt-2 text-center text-[12.5px] leading-relaxed text-ink-muted">{t.intro}</p>

      <div className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] items-end gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1fr)]">
        <Input
          label={t.postalCode} inputMode="numeric" autoComplete="postal-code" maxLength={4} value={plz}
          onChange={(e) => { setPlz(normalizePostalCode(e.target.value)); setError(null); }}
          error={checkError ?? (zoneResult && !zoneResult.available ? t.errors.zone : undefined)}
        />
        <Select label={t.date} value={selectedDay ? day : ""} disabled={!days.length || loading} onChange={(e) => { setDay(e.target.value); setError(null); }}>
          {!selectedDay && <option value="">{t.choose}</option>}
          {days.map((d) => <option key={d.date} value={d.date}>{dateShort(d.date)}</option>)}
        </Select>
        {windows.length > 0 && (
          <Select label={t.window} value={windowId} className="col-span-2 sm:col-span-1" onChange={(e) => { setWindowId(e.target.value); setError(null); }}>
            {!windowId && <option value="">{t.choose}</option>}
            {windows.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </Select>
        )}
      </div>
      {zoneResult?.available && days.length === 0 && <p className="mt-2 text-[13px] text-ink-muted">{t.noDays}</p>}
      {windowLabel && <span className="sr-only" aria-live="polite">{windowLabel}</span>}

      <div className="mt-3 min-h-12">
        <ExpressElement
          publishableKey={publishableKey}
          amount={amount}
          wallets={wallets}
          onAvailability={setAvailable}
          clickDetails={clickDetails}
          addressQuote={addressQuote}
          orderBody={orderBody}
          source={source}
          onError={setError}
          onAbandon={onAbandon}
          onOrderCreated={onOrderCreated}
        />
      </div>
      {error && <p role="alert" className="mt-3 rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[13.5px] text-ink">{error}</p>}
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
        {rich(t.legal, {
          terms: <Link href={routes.legal.terms} className="underline underline-offset-2">{t.terms}</Link>,
          withdrawal: <Link href={routes.legal.withdrawal} className="underline underline-offset-2">{t.withdrawal}</Link>,
        })}
      </p>
    </section>
  );
}
