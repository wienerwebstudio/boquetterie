"use client";
import Image from "next/image";
import Link from "@/components/ui/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock, Leaf, Lock, Mail, MapPin, Minus, PenLine, Plus, ShoppingBag } from "lucide-react";
import type { Extra, ISODate, Product, ProductColorOption, ProductSize, SiteSettings, SizeId } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { GreetingCardPreview } from "@/components/cart/greeting-card-preview";
import { DeliveryCalendar } from "./calendar";
import { useDeliveryCheck, type DeliveryCheckResult } from "@/hooks/use-delivery-check";
import { useDeliveryContext } from "@/store/delivery";
import { useCart } from "@/store/cart";
import { useUi } from "@/store/ui";
import { addDays, isValidAustrianPostalCode, normalizePostalCode, sameDayCutoffOn } from "@/lib/delivery";
import { lowestPrice } from "@/lib/catalog";
import { ordersPaused } from "@/lib/orders-paused";
import { cartItemFromConfig, defaultSize, findSize, FLORIST_NOTE_MAX, isSoldOut } from "@/lib/cart-helpers";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { deliveryErrorText } from "@/components/shop/postal-code-check";
import { routes } from "@/lib/urls";
import { onRadioGroupKeyDown } from "@/lib/roving-radio";
import { SMALL_BUSINESS } from "@/lib/vat";

export function ProductConfigurator({ product, extras, greetingCard, onSizeChange, onColorChange }: {
  product: Product;
  extras: Extra[];
  greetingCard: SiteSettings["greetingCard"];
  onSizeChange?: (size: ProductSize) => void;
  onColorChange?: (color: ProductColorOption | null) => void;
}) {
  const uid = useId();
  const { m: messages, fmt, price, dateShort } = useI18n();
  const t = messages.product;
  const addItem = useCart((s) => s.addItem);
  const paused = ordersPaused();
  const openCart = useUi((s) => s.openCart);
  const ctx = useDeliveryContext();
  const preferredDate = ctx.preferredDate;
  const delivery = useDeliveryCheck(product.slug);
  const { result, loading, check } = delivery;
  const error = deliveryErrorText(delivery, messages.shop.postalCheck.errors);

  /* ---------- size ---------- */
  const [sizeId, setSizeId] = useState(() => defaultSize(product).id);
  const size = findSize(product, sizeId);
  const selectSize = (id: SizeId) => { setSizeId(id); onSizeChange?.(findSize(product, id)); };

  /* ---------- colour (required when offered) ---------- */
  const colors = product.colorOptions ?? [];
  const [colorId, setColorId] = useState<string | null>(null);
  const color = colors.find((c) => c.id === colorId) ?? null;
  const [colorError, setColorError] = useState(false);
  const colorRef = useRef<HTMLFieldSetElement>(null);
  const selectColor = (c: ProductColorOption) => { setColorId(c.id); setColorError(false); onColorChange?.(c); };

  /* ---------- wish to the florist ---------- */
  const [floristNote, setFloristNote] = useState("");

  /* ---------- delivery ---------- */
  const [plz, setPlz] = useState("");
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const prefilled = useRef(false);

  /** Applies a check result: pre-selects the first (or remembered) delivery day. */
  const applyResult = useCallback((code: string, r: DeliveryCheckResult | null) => {
    setPlz(code);
    if (!r?.available || !r.days.length) { setSelectedDate(null); setCalendarOpen(false); return; }
    const remembered = preferredDate && r.days.some((d) => d.date === preferredDate) ? preferredDate : null;
    setSelectedDate(remembered ?? r.days[0].date);
  }, [preferredDate]);
  const runCheck = (code: string) => check(code).then((r) => applyResult(code, r));

  // Prefill from the session PLZ context once (after mount, to avoid a hydration mismatch).
  useEffect(() => {
    if (prefilled.current || !ctx.postalCode) return;
    prefilled.current = true;
    const code = ctx.postalCode;
    if (!isValidAustrianPostalCode(code)) return;
    void check(code).then((r) => applyResult(code, r));
  }, [ctx.postalCode, check, applyResult]);

  const days = useMemo(() => result?.days ?? [], [result]);
  const today = result?.now?.date ?? null;
  const tomorrow = today ? addDays(today, 1) : null;
  const canToday = Boolean(result?.available && result.sameDayToday && today);
  const canTomorrow = Boolean(tomorrow && days.some((d) => d.date === tomorrow));
  const lineLabel = product.sizes.length > 1 ? `${product.name} · ${size.label}` : product.name;
  const dateOptionCount = 1 + (canToday ? 1 : 0) + (canTomorrow ? 1 : 0);
  const zone = result?.available ? result.zone : null;

  const submitPlz = (e: React.FormEvent) => { e.preventDefault(); void runCheck(plz); };
  const chooseDate = (date: ISODate, closeCalendar = true) => {
    setSelectedDate(date);
    ctx.setPreferredDate(date);
    if (closeCalendar) setCalendarOpen(false);
  };
  const dateMode: "today" | "tomorrow" | "other" | null =
    !selectedDate ? null : selectedDate === today ? "today" : selectedDate === tomorrow ? "tomorrow" : "other";
  // Roving tabindex: the checked date option is the tab stop, otherwise the first one shown.
  const dateTabStop: "today" | "tomorrow" | "other" =
    dateMode === "today" && canToday ? "today"
    : dateMode === "tomorrow" && canTomorrow ? "tomorrow"
    : dateMode === "other" || calendarOpen ? "other"
    : canToday ? "today" : canTomorrow ? "tomorrow" : "other";

  /* ---------- greeting card ---------- */
  const [cardOpen, setCardOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [senderName, setSenderName] = useState("");
  const maxChars = greetingCard.maxChars;
  const cardsEnabled = greetingCard.enabled === true;

  /* ---------- extras ---------- */
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const activeExtras = useMemo(() => extras.filter((e) => e.active), [extras]);
  const chosenExtras = activeExtras.map((e) => ({ extra: e, quantity: extraQty[e.id] ?? 0 })).filter((e) => e.quantity > 0);
  const extrasSum = chosenExtras.reduce((s, e) => s + e.extra.price * e.quantity, 0);
  const setQty = (id: string, q: number) => setExtraQty((m) => ({ ...m, [id]: Math.max(0, Math.min(9, q)) }));

  /* ---------- totals & CTA ---------- */
  const total = Math.round((size.price + extrasSum) * 100) / 100;
  const soldOut = isSoldOut(product, size);
  const [announce, setAnnounce] = useState("");
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const addToCart = () => {
    if (paused) return;
    if (soldOut) return;
    if (colors.length && !color) {
      setColorError(true);
      colorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      colorRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      return;
    }
    const item = cartItemFromConfig({
      product, size, color, floristNote,
      deliveryDate: selectedDate,
      postalCode: zone ? result?.postalCode : ctx.zone ? ctx.postalCode : undefined,
      ...(cardsEnabled ? { message, anonymous, senderName } : { message: "", anonymous: false, senderName: "" }),
      extras: chosenExtras,
    });
    addItem(item);
    setAnnounce(fmt(t.cta.added, { name: product.name, options: `${size.label}${color ? `, ${color.label}` : ""}` }));
    // The drawer that opens is the confirmation – a toast on top of it would only cover its buttons.
    openCart();
  };

  const hasRating = Boolean(product.rating && product.rating.count > 0);
  const [areasBefore, areasAfter] = t.delivery.notAvailableHint.split("{link}");
  const [deliveryOnBefore, deliveryOnAfter] = t.delivery.deliveryOn.split("{date}");

  return (
    <div className="flex flex-col gap-9">
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      {/* ---------- Header ---------- */}
      <header>
        <p className="eyebrow mb-3">{product.tagline}</p>
        <h1 className="display-2 text-ink">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[15px] tabular-nums text-ink">
            <span className="text-[12px] text-ink-muted">{`${t.priceFrom} `}</span>
            <span className="font-semibold">{price(lowestPrice(product))}</span>
            <span className="ml-1.5 text-[12px] text-ink-muted">{messages.cart.vat[SMALL_BUSINESS ? "smallBusiness" : "standard"].short}</span>
          </p>
          {hasRating && product.rating && <StarRating value={product.rating.value} count={product.rating.count} showValue />}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{product.shortDescription}</p>
      </header>

      {/* ---------- Size ---------- */}
      {product.sizes.length > 1 && (
      <fieldset>
        <legend className="mb-3 flex w-full items-baseline justify-between">
          <span className="text-[14px] font-semibold text-ink">{t.size.title}</span>
          <span className="text-[12.5px] text-ink-muted">{size.description ?? size.label}</span>
        </legend>
        <div className={cn("grid gap-2.5", product.sizes.length === 4 ? "grid-cols-2" : product.sizes.length > 4 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3")}>
          {product.sizes.map((s) => {
            const checked = s.id === sizeId;
            const out = isSoldOut(product, s);
            return (
              <label key={s.id} className="relative block cursor-pointer">
                <input
                  type="radio"
                  name={`${uid}-size`}
                  value={s.id}
                  checked={checked}
                  onChange={() => selectSize(s.id)}
                  disabled={out}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-[92px] flex-col justify-between rounded-md border bg-white/60 px-3 py-3 transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-forest peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ivory peer-disabled:opacity-40",
                    checked ? "border-forest bg-white shadow-soft" : "border-line hover:border-stone",
                  )}
                >
                  <span className="flex flex-wrap items-start justify-between gap-1">
                    <span className="text-[14px] font-semibold text-ink">{s.label}</span>
                    {s.popular && <Badge tone="rose" className="px-1.5 py-0.5 text-[9.5px]">{t.size.recommended}</Badge>}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold tabular-nums text-ink">{price(s.price)}</span>
                    {s.compareAtPrice && s.compareAtPrice > s.price && <s className="text-[12px] text-ink-muted">{price(s.compareAtPrice)}</s>}
                    {s.description && <span className="block text-[12px] text-ink-muted">{s.description}</span>}
                    {out && <span className="block text-[11px] text-danger">{t.size.soldOut}</span>}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      )}

      {/* ---------- Colour ---------- */}
      {colors.length > 0 && (
      <fieldset ref={colorRef} aria-describedby={colorError ? `${uid}-color-error` : undefined}>
        <legend className="mb-3 flex w-full items-baseline justify-between">
          <span className="text-[14px] font-semibold text-ink">{t.color.title} <span className="font-normal text-ink-muted">{t.color.required}</span></span>
          <span className="text-[12.5px] text-ink-muted">{color?.label ?? t.color.notChosen}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => {
            const checked = c.id === colorId;
            return (
              <label key={c.id} className="relative cursor-pointer">
                <input type="radio" name={`${uid}-color`} value={c.id} checked={checked} onChange={() => selectColor(c)} className="peer sr-only" />
                <span className={cn(
                  "inline-flex h-10 items-center rounded-full border px-4 text-[14px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-forest peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ivory",
                  checked ? "border-forest bg-forest text-ivory" : "border-line bg-white/60 text-ink hover:border-stone",
                )}>{c.label}</span>
              </label>
            );
          })}
        </div>
        {colorError && <p id={`${uid}-color-error`} role="alert" className="mt-2 text-[13px] text-danger">{t.color.error}</p>}
      </fieldset>
      )}

      {/* ---------- Delivery ---------- */}
      <section aria-labelledby={`${uid}-delivery`} className="rounded-md border border-line bg-white/50 p-4 sm:p-5">
        <h2 id={`${uid}-delivery`} className="font-serif text-[22px] text-ink">{t.delivery.title}</h2>

        <form onSubmit={submitPlz} className="mt-3 flex gap-2" aria-label={t.delivery.formLabel}>
          <label htmlFor={`${uid}-plz`} className="sr-only">{t.delivery.postalCodeLabel}</label>
          <div className="relative min-w-0 flex-1">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-forest" aria-hidden />
            <input
              id={`${uid}-plz`}
              inputMode="numeric"
              autoComplete="postal-code"
              pattern="[0-9]{4}"
              maxLength={4}
              value={plz}
              onChange={(e) => setPlz(normalizePostalCode(e.target.value))}
              placeholder={t.delivery.postalCodePlaceholder}
              aria-describedby={`${uid}-plz-status`}
              className="h-12 w-full rounded-md border border-line-strong bg-white pl-10 pr-3 text-[15px] tracking-[0.08em] text-ink placeholder:tracking-normal placeholder:text-ink-soft focus:border-forest focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest"
            />
          </div>
          <Button type="submit" variant="outline" size="md" loading={loading} className="h-12! shrink-0">{t.delivery.check}</Button>
        </form>

        <div id={`${uid}-plz-status`} aria-live="polite" className="mt-3">
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {!result && !error && (
            <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <CalendarDays className="size-3.5 text-ink-soft" aria-hidden /> {t.delivery.prompt}
            </p>
          )}
          {result && !result.available && (
            <div className="text-[13px] text-ink-muted">
              <p className="font-semibold text-ink">{fmt(t.delivery.notAvailable, { plz: result.postalCode })}</p>
              <p className="mt-1">{areasBefore}<Link href={routes.delivery} className="text-forest underline underline-offset-2">{t.delivery.deliveryLink}</Link>{areasAfter || null}</p>
            </div>
          )}
          {zone && (
            <div className="animate-fade-up">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-success">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-3" strokeWidth={3} aria-hidden /></span>
                {t.delivery.available}
              </p>
              <p className="mt-1 pl-7 text-[13px] text-ink-muted">
                {fmt(t.delivery.fee, { plz, region: zone.region, fee: zone.fee === 0 ? t.delivery.free : price(zone.fee) })}{zone.fee > 0 && zone.freeFrom !== null && ` · ${fmt(t.delivery.freeFrom, { price: price(zone.freeFrom) })}`}
                {zone.note && <span className="block">{zone.note}</span>}
              </p>
            </div>
          )}
        </div>

        {zone && days.length > 0 && (
          <div className="mt-4">
            {/* "Datum wählen" toggles the calendar, so the arrow keys only move the focus; Space/Enter choose. */}
            <div role="radiogroup" aria-label={t.delivery.dateGroup} onKeyDown={(e) => onRadioGroupKeyDown(e, { select: false })} className={cn("grid gap-2", dateOptionCount === 3 ? "grid-cols-3" : dateOptionCount === 2 ? "grid-cols-2" : "grid-cols-1 sm:max-w-[240px]")}>
              {canToday && today && (
                <QuickOption tabIndex={dateTabStop === "today" ? 0 : -1} checked={dateMode === "today"} onClick={() => chooseDate(today)} title={t.delivery.today} sub={fmt(t.delivery.orderUntil, { time: sameDayCutoffOn(zone, today) })} icon={<Clock className="size-3.5" aria-hidden />} />
              )}
              {canTomorrow && tomorrow && (
                <QuickOption tabIndex={dateTabStop === "tomorrow" ? 0 : -1} checked={dateMode === "tomorrow"} onClick={() => chooseDate(tomorrow)} title={t.delivery.tomorrow} sub={dateShort(tomorrow)} />
              )}
              <QuickOption
                tabIndex={dateTabStop === "other" ? 0 : -1}
                checked={dateMode === "other" || calendarOpen}
                onClick={() => setCalendarOpen((o) => !o)}
                title={t.delivery.chooseDate}
                sub={dateMode === "other" && selectedDate ? dateShort(selectedDate) : t.delivery.openCalendar}
                icon={<CalendarDays className="size-3.5" aria-hidden />}
              />
            </div>
            {calendarOpen && today && (
              <DeliveryCalendar
                className="mt-3 animate-fade-in"
                id={`${uid}-calendar`}
                days={days}
                today={today}
                value={selectedDate}
                onChange={(d) => chooseDate(d, false)}
              />
            )}
            {selectedDate && (
              <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-muted">
                <CalendarDays className="size-3.5 text-forest" aria-hidden />
                {deliveryOnBefore}<span className="font-semibold text-ink">{dateShort(selectedDate)}</span>{deliveryOnAfter || null}
                {dateMode === "today" && <span>{t.delivery.todaySuffix}</span>}
              </p>
            )}
            {days.length === 0 && <p className="mt-3 text-[13px] text-ink-muted">{t.delivery.noDays}</p>}
          </div>
        )}
      </section>

      {/* ---------- Greeting card ---------- */}
      {!cardsEnabled ? (
        <section aria-labelledby={`${uid}-card`} className="flex items-center justify-between gap-3 rounded-md border border-dashed border-line bg-white/30 px-4 py-3.5">
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-ivory-100 text-ink-soft"><PenLine className="size-4" strokeWidth={1.6} aria-hidden /></span>
            <span>
              <span id={`${uid}-card`} className="block text-[14px] font-semibold text-ink-muted">{t.card.unavailableTitle}</span>
              <span className="block text-[12.5px] text-ink-muted">{t.card.unavailableText}</span>
            </span>
          </span>
          <Badge tone="rose" className="shrink-0">{t.card.comingSoon}</Badge>
        </section>
      ) : (
      <section aria-labelledby={`${uid}-card`}>
        <button
          type="button"
          onClick={() => setCardOpen((o) => !o)}
          aria-expanded={cardOpen}
          aria-controls={`${uid}-card-panel`}
          className="flex w-full items-center justify-between gap-3 rounded-md border border-line bg-white/50 px-4 py-3.5 text-left transition-colors hover:border-stone"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-ivory-100 text-forest"><PenLine className="size-4" strokeWidth={1.6} aria-hidden /></span>
            <span>
              <span id={`${uid}-card`} className="block text-[14px] font-semibold text-ink">{t.card.addMessage}</span>
              <span className="block text-[12.5px] text-ink-muted">{greetingCard.freeCardIncluded ? t.card.included : t.card.handwritten}{message.trim() && ` · ${t.card.saved}`}</span>
            </span>
          </span>
          <Plus className={cn("size-4 shrink-0 text-forest transition-transform duration-300", cardOpen && "rotate-45")} aria-hidden />
        </button>

        {cardOpen && (
          <div id={`${uid}-card-panel`} className="mt-3 space-y-4 animate-fade-in">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor={`${uid}-message`} className="text-[13px] font-semibold text-ink">{t.card.messageLabel}</label>
                <span className={cn("text-[12px] tabular-nums", message.length >= maxChars ? "text-danger" : "text-ink-muted")} aria-hidden>{message.length} / {maxChars}</span>
              </div>
              <textarea
                id={`${uid}-message`}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
                maxLength={maxChars}
                rows={3}
                placeholder={t.card.messagePlaceholder}
                aria-describedby={`${uid}-message-hint`}
                className="w-full resize-y rounded-md border border-line-strong bg-white/70 px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft focus:border-forest focus:bg-white focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest"
              />
              <p id={`${uid}-message-hint`} className="sr-only">{fmt(t.card.maxChars, { max: maxChars })}</p>
            </div>

            <div role="radiogroup" aria-label={t.card.senderGroup} onKeyDown={onRadioGroupKeyDown} className="grid grid-cols-2 gap-2">
              <Segment tabIndex={anonymous ? -1 : 0} checked={!anonymous} onClick={() => setAnonymous(false)}>{t.card.showSender}</Segment>
              <Segment tabIndex={anonymous ? 0 : -1} checked={anonymous} onClick={() => setAnonymous(true)}>{t.card.anonymous}</Segment>
            </div>

            {!anonymous && (
              <div>
                <label htmlFor={`${uid}-sender`} className="mb-1.5 block text-[13px] font-semibold text-ink">{t.card.senderName} <span className="font-normal text-ink-muted">{t.card.optional}</span></label>
                <input
                  id={`${uid}-sender`}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value.slice(0, 60))}
                  autoComplete="name"
                  placeholder={t.card.senderPlaceholder}
                  className="h-12 w-full rounded-md border border-line-strong bg-white/70 px-4 text-[15px] text-ink placeholder:text-ink-soft focus:border-forest focus:bg-white focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest"
                />
              </div>
            )}

            <GreetingCardPreview message={message} senderName={senderName} anonymous={anonymous} />
          </div>
        )}
      </section>
      )}

      {/* ---------- Extras ---------- */}
      {activeExtras.length > 0 && (
        <section aria-labelledby={`${uid}-extras`}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id={`${uid}-extras`} className="font-serif text-[22px] text-ink">{t.extras.title}</h2>
            <span className="text-[12.5px] text-ink-muted">{t.extras.deliveredTogether}</span>
          </div>
          <ul className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 scrollbar-none sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
            {activeExtras.map((e) => {
              const q = extraQty[e.id] ?? 0;
              return (
                <li key={e.id} className="w-[150px] shrink-0 snap-start">
                  <div className={cn("flex h-full flex-col rounded-md border bg-white/60 p-2.5 transition-colors", q > 0 ? "border-forest" : "border-line")}>
                    <div className="relative aspect-square overflow-hidden rounded-sm bg-ivory-200">
                      <Image src={e.image} alt={e.imageAlt} fill sizes="160px" className="object-cover" />
                    </div>
                    <p className="mt-2.5 truncate text-[13.5px] font-semibold text-ink" title={e.description}>{e.name}</p>
                    <p className="text-[12.5px] tabular-nums text-ink-muted">{price(e.price)}</p>
                    {q === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(e.id, 1)}
                        aria-pressed={false}
                        aria-label={fmt(t.extras.addLabel, { name: e.name, price: price(e.price) })}
                        className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-forest/60 text-[13px] font-semibold text-forest transition-colors hover:bg-forest hover:text-ivory"
                      >
                        <Plus className="size-3.5" aria-hidden /> {t.extras.add}
                      </button>
                    ) : (
                      <div className="mt-2.5 inline-flex h-10 w-full items-center justify-between rounded-md bg-forest text-ivory" role="group" aria-label={fmt(t.extras.quantity, { name: e.name })}>
                        <button type="button" onClick={() => setQty(e.id, q - 1)} aria-label={fmt(t.extras.less, { name: e.name })} className="grid size-10 place-items-center"><Minus className="size-3.5" /></button>
                        <span className="text-[13px] font-semibold tabular-nums" aria-live="polite">{q}</span>
                        <button type="button" onClick={() => setQty(e.id, q + 1)} aria-label={fmt(t.extras.more, { name: e.name })} className="grid size-10 place-items-center"><Plus className="size-3.5" /></button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------- Wish to the florist ---------- */}
      <details className="group rounded-md border border-line bg-white/50 px-4 py-3 sm:px-5" open={floristNote.length > 0 || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-ink">
          <span className="flex items-start gap-2"><PenLine className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /><span>{t.floristNote.title} <span className="font-normal text-ink-muted">{t.floristNote.optional}</span></span></span>
          <Plus className="size-4 text-ink-muted transition-transform group-open:rotate-45" aria-hidden />
        </summary>
        <label htmlFor={`${uid}-florist-note`} className="mt-3 block text-[13px] leading-relaxed text-ink-muted">
          {t.floristNote.hint}
        </label>
        <textarea
          id={`${uid}-florist-note`}
          rows={3}
          maxLength={FLORIST_NOTE_MAX}
          value={floristNote}
          onChange={(e) => setFloristNote(e.target.value)}
          className="mt-2 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-[14px] text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          placeholder={t.floristNote.placeholder}
        />
        <p className="mt-1 text-right text-[12px] text-ink-soft">{floristNote.length}/{FLORIST_NOTE_MAX}</p>
      </details>

      {/* ---------- CTA ---------- */}
      <div ref={ctaRef} className="border-t border-line pt-6" data-fab-avoid>
        <dl className="mb-4 space-y-1 text-[13.5px] text-ink-muted">
          <div className="flex justify-between"><dt>{lineLabel}</dt><dd className="tabular-nums text-ink">{price(size.price)}</dd></div>
          {chosenExtras.map((e) => (
            <div key={e.extra.id} className="flex justify-between"><dt>{e.quantity > 1 && `${e.quantity} × `}{e.extra.name}</dt><dd className="tabular-nums text-ink">{price(e.extra.price * e.quantity)}</dd></div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold text-ink"><dt>{t.cta.total}</dt><dd className="tabular-nums">{price(total)}</dd></div>
        </dl>
        {paused && <p className="mb-3 rounded-md border border-line bg-ivory-100 px-4 py-3 text-[14px] leading-relaxed text-ink-muted" role="status">{messages.checkout.paused.message}</p>}
        <Button type="button" size="xl" full onClick={addToCart} disabled={soldOut || paused} icon={<ShoppingBag className="size-4" aria-hidden />}>
          {paused ? t.cta.comingSoon : soldOut ? t.cta.unavailable : t.cta.addToCart}
        </Button>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
          {product.category !== "pflanzen" && <li className="inline-flex items-center gap-1.5"><Leaf className="size-3.5 text-forest" strokeWidth={1.5} aria-hidden /> {t.cta.fresh}</li>}
          {cardsEnabled && greetingCard.freeCardIncluded && <li className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-forest" strokeWidth={1.5} aria-hidden /> {t.cta.cardIncluded}</li>}
          <li className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-forest" strokeWidth={1.5} aria-hidden /> {t.cta.securePayment}</li>
        </ul>
      </div>

      {/* ---------- Sticky mobile bar ---------- */}
      <div
        data-fab-lift
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-20px_rgba(35,35,31,0.3)] backdrop-blur-md transition-transform duration-300 ease-[var(--ease-soft)] lg:hidden",
          ctaVisible ? "translate-y-full" : "translate-y-0",
        )}
        aria-hidden={ctaVisible}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[18px] leading-tight text-ink">{lineLabel}</p>
            <p className="text-[13px] tabular-nums text-ink-muted">{price(total)}</p>
          </div>
          <Button type="button" size="lg" onClick={addToCart} disabled={soldOut || paused} tabIndex={ctaVisible ? -1 : 0}>{paused ? t.cta.comingSoon : t.cta.addToCart}</Button>
        </div>
      </div>
    </div>
  );
}

function QuickOption({ checked, onClick, title, sub, icon, tabIndex }: {
  checked: boolean; onClick: () => void; title: string; sub: string; icon?: React.ReactNode; tabIndex?: number;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={tabIndex}
      onClick={onClick}
      className={cn(
        "flex min-h-[64px] min-w-0 flex-col justify-center rounded-md border px-3 py-2 text-left transition-all duration-300",
        checked ? "border-forest bg-white shadow-soft" : "border-line bg-white/60 hover:border-stone",
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink">{icon}{title}</span>
      <span className="truncate text-[12px] text-ink-muted">{sub}</span>
    </button>
  );
}

function Segment({ checked, onClick, children, tabIndex }: { checked: boolean; onClick: () => void; children: React.ReactNode; tabIndex?: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={tabIndex}
      onClick={onClick}
      className={cn(
        "h-11 rounded-md border text-[13.5px] font-semibold transition-all duration-300",
        checked ? "border-forest bg-forest text-ivory" : "border-line bg-white/60 text-ink hover:border-stone",
      )}
    >
      {children}
    </button>
  );
}
