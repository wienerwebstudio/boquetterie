"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock, Leaf, Lock, Mail, MapPin, Minus, PenLine, Plus, ShoppingBag } from "lucide-react";
import type { Extra, ISODate, Product, ProductSize, SiteSettings } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { GreetingCardPreview } from "@/components/cart/greeting-card-preview";
import { DeliveryCalendar } from "./calendar";
import { useDeliveryCheck } from "@/hooks/use-delivery-check";
import { useDeliveryContext } from "@/store/delivery";
import { useCart } from "@/store/cart";
import { useUi } from "@/store/ui";
import { addDays, isValidAustrianPostalCode, normalizePostalCode } from "@/lib/delivery";
import { lowestPrice } from "@/lib/catalog";
import { cartItemFromConfig, defaultSize, findSize, isSoldOut } from "@/lib/cart-helpers";
import { formatDateShort, formatPrice, cn } from "@/lib/format";
import { routes } from "@/lib/urls";

export function ProductConfigurator({ product, extras, greetingCard, onSizeChange }: {
  product: Product;
  extras: Extra[];
  greetingCard: SiteSettings["greetingCard"];
  onSizeChange?: (size: ProductSize) => void;
}) {
  const uid = useId();
  const addItem = useCart((s) => s.addItem);
  const openCart = useUi((s) => s.openCart);
  const toast = useUi((s) => s.toast);
  const ctx = useDeliveryContext();
  const { result, loading, error, check } = useDeliveryCheck(product.slug);

  /* ---------- size ---------- */
  const [sizeId, setSizeId] = useState(() => defaultSize(product).id);
  const size = findSize(product, sizeId);
  useEffect(() => { onSizeChange?.(size); }, [size, onSizeChange]);

  /* ---------- delivery ---------- */
  const [plz, setPlz] = useState("");
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current || !ctx.postalCode) return;
    prefilled.current = true;
    setPlz(ctx.postalCode);
    if (isValidAustrianPostalCode(ctx.postalCode)) void check(ctx.postalCode);
  }, [ctx.postalCode, check]);

  const days = useMemo(() => result?.days ?? [], [result]);
  const today = result?.now?.date ?? null;
  const tomorrow = today ? addDays(today, 1) : null;
  const canToday = Boolean(result?.available && result.sameDayToday && today);
  const canTomorrow = Boolean(tomorrow && days.some((d) => d.date === tomorrow));
  const zone = result?.available ? result.zone : null;

  useEffect(() => {
    if (!result?.available || !result.days.length) { setSelectedDate(null); setCalendarOpen(false); return; }
    const preferred = ctx.preferredDate && result.days.some((d) => d.date === ctx.preferredDate) ? ctx.preferredDate : null;
    setSelectedDate(preferred ?? result.days[0].date);
    // Only run when a new check result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const submitPlz = (e: React.FormEvent) => { e.preventDefault(); void check(plz); };
  const chooseDate = (date: ISODate, closeCalendar = true) => {
    setSelectedDate(date);
    ctx.setPreferredDate(date);
    if (closeCalendar) setCalendarOpen(false);
  };
  const dateMode: "today" | "tomorrow" | "other" | null =
    !selectedDate ? null : selectedDate === today ? "today" : selectedDate === tomorrow ? "tomorrow" : "other";

  /* ---------- greeting card ---------- */
  const [cardOpen, setCardOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [senderName, setSenderName] = useState("");
  const maxChars = greetingCard.maxChars;

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

  const addToCart = useCallback(() => {
    if (soldOut) return;
    const item = cartItemFromConfig({
      product, size,
      deliveryDate: selectedDate,
      postalCode: zone ? result?.postalCode : ctx.zone ? ctx.postalCode : undefined,
      message, anonymous, senderName,
      extras: chosenExtras,
    });
    addItem(item);
    setAnnounce(`${product.name} (${size.label}) wurde in den Warenkorb gelegt.`);
    toast({
      title: "Zum Warenkorb hinzugefügt",
      description: `${product.name} · ${size.label}`,
      image: item.snapshot.image,
      action: { label: "Ansehen", onClick: openCart },
    });
    openCart();
  }, [soldOut, product, size, selectedDate, zone, result, ctx.zone, ctx.postalCode, message, anonymous, senderName, chosenExtras, addItem, toast, openCart]);

  const hasRating = Boolean(product.rating && product.rating.count > 0);

  return (
    <div className="flex flex-col gap-9">
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      {/* ---------- Header ---------- */}
      <header>
        <p className="eyebrow mb-3">{product.tagline}</p>
        <h1 className="display-2 text-ink">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-[15px] tabular-nums text-ink">
            <span className="text-[12px] text-ink-muted">ab </span>
            <span className="font-semibold">{formatPrice(lowestPrice(product))}</span>
            <span className="ml-1.5 text-[12px] text-ink-soft">inkl. MwSt.</span>
          </p>
          {hasRating && product.rating && <StarRating value={product.rating.value} count={product.rating.count} showValue />}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{product.shortDescription}</p>
      </header>

      {/* ---------- Size ---------- */}
      <fieldset>
        <legend className="mb-3 flex w-full items-baseline justify-between">
          <span className="text-[14px] font-semibold text-ink">Größe wählen</span>
          <span className="text-[12.5px] text-ink-soft">{size.description ?? size.label}</span>
        </legend>
        <div className="grid grid-cols-3 gap-2.5">
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
                  onChange={() => setSizeId(s.id)}
                  disabled={out}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-[92px] flex-col justify-between rounded-md border bg-white/60 px-3 py-3 transition-all duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-forest peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ivory peer-disabled:opacity-40",
                    checked ? "border-forest bg-white shadow-soft" : "border-line hover:border-stone",
                  )}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className="text-[14px] font-semibold text-ink">{s.label}</span>
                    {s.popular && <Badge tone="rose" className="px-1.5 py-0.5 text-[9.5px]">Beliebt</Badge>}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold tabular-nums text-ink">{formatPrice(s.price)}</span>
                    {s.compareAtPrice && s.compareAtPrice > s.price && <s className="text-[12px] text-ink-soft">{formatPrice(s.compareAtPrice)}</s>}
                    {s.description && <span className="block text-[12px] text-ink-muted">{s.description}</span>}
                    {out && <span className="block text-[11px] text-danger">Ausverkauft</span>}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ---------- Delivery ---------- */}
      <section aria-labelledby={`${uid}-delivery`} className="rounded-md border border-line bg-white/50 p-4 sm:p-5">
        <h2 id={`${uid}-delivery`} className="font-serif text-[22px] text-ink">Wann sollen die Blumen ankommen?</h2>

        <form onSubmit={submitPlz} className="mt-3 flex gap-2" aria-label="Lieferprüfung">
          <label htmlFor={`${uid}-plz`} className="sr-only">Postleitzahl des Empfängers</label>
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
              placeholder="PLZ des Empfängers"
              aria-describedby={`${uid}-plz-status`}
              className="h-12 w-full rounded-md border border-line bg-white pl-10 pr-3 text-[15px] tracking-[0.08em] text-ink placeholder:tracking-normal placeholder:text-ink-soft focus:border-forest focus:outline-none"
            />
          </div>
          <Button type="submit" variant="outline" size="md" loading={loading} className="h-12 shrink-0">Prüfen</Button>
        </form>

        <div id={`${uid}-plz-status`} aria-live="polite" className="mt-3">
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {!result && !error && (
            <p className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <CalendarDays className="size-3.5 text-ink-soft" aria-hidden /> PLZ eingeben, um Lieferdatum zu wählen
            </p>
          )}
          {result && !result.available && (
            <div className="text-[13px] text-ink-muted">
              <p className="font-semibold text-ink">Leider liefern wir an {result.postalCode} noch nicht.</p>
              <p className="mt-1">Alle aktuellen Gebiete findest du unter <Link href={routes.delivery} className="text-forest underline underline-offset-2">Lieferung & Versand</Link>. Bestellen ist trotzdem möglich – das Lieferdatum wählst du im Checkout.</p>
            </div>
          )}
          {zone && (
            <div className="animate-fade-up">
              <p className="flex items-center gap-2 text-[14px] font-semibold text-success">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-3" strokeWidth={3} aria-hidden /></span>
                Wir liefern an diese Adresse.
              </p>
              <p className="mt-1 pl-7 text-[13px] text-ink-muted">
                {zone.name} · Lieferung {formatPrice(zone.fee)}{zone.freeFrom !== null && <> · gratis ab {formatPrice(zone.freeFrom)}</>}
                {zone.note && <span className="block">{zone.note}</span>}
              </p>
            </div>
          )}
        </div>

        {zone && days.length > 0 && (
          <div className="mt-4">
            <div role="radiogroup" aria-label="Lieferdatum" className="grid grid-cols-3 gap-2">
              {canToday && today && (
                <QuickOption checked={dateMode === "today"} onClick={() => chooseDate(today)} title="Heute" sub={`bis ${zone.sameDayCutoff} Uhr bestellen`} icon={<Clock className="size-3.5" aria-hidden />} />
              )}
              {canTomorrow && tomorrow && (
                <QuickOption checked={dateMode === "tomorrow"} onClick={() => chooseDate(tomorrow)} title="Morgen" sub={formatDateShort(tomorrow)} />
              )}
              <QuickOption
                checked={dateMode === "other" || calendarOpen}
                onClick={() => setCalendarOpen((o) => !o)}
                title="Datum wählen"
                sub={dateMode === "other" && selectedDate ? formatDateShort(selectedDate) : "Kalender öffnen"}
                icon={<CalendarDays className="size-3.5" aria-hidden />}
                ariaExpanded={calendarOpen}
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
                Lieferung am <span className="font-semibold text-ink">{formatDateShort(selectedDate)}</span>
                {dateMode === "today" && <span>· heute</span>}
              </p>
            )}
            {days.length === 0 && <p className="mt-3 text-[13px] text-ink-muted">Derzeit sind keine Liefertage verfügbar.</p>}
          </div>
        )}
      </section>

      {/* ---------- Greeting card ---------- */}
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
              <span id={`${uid}-card`} className="block text-[14px] font-semibold text-ink">Persönliche Nachricht hinzufügen</span>
              <span className="block text-[12.5px] text-ink-muted">{greetingCard.freeCardIncluded ? "Grußkarte inklusive" : "Handgeschriebene Grußkarte"}{message.trim() && " · Nachricht gespeichert"}</span>
            </span>
          </span>
          <Plus className={cn("size-4 shrink-0 text-forest transition-transform duration-300", cardOpen && "rotate-45")} aria-hidden />
        </button>

        {cardOpen && (
          <div id={`${uid}-card-panel`} className="mt-3 space-y-4 animate-fade-in">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor={`${uid}-message`} className="text-[13px] font-semibold text-ink">Deine Nachricht</label>
                <span className={cn("text-[12px] tabular-nums", message.length >= maxChars ? "text-danger" : "text-ink-soft")} aria-hidden>{message.length} / {maxChars}</span>
              </div>
              <textarea
                id={`${uid}-message`}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
                maxLength={maxChars}
                rows={3}
                placeholder="Alles Liebe zum Geburtstag …"
                aria-describedby={`${uid}-message-hint`}
                className="w-full resize-y rounded-md border border-line bg-white/70 px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft focus:border-forest focus:bg-white focus:outline-none"
              />
              <p id={`${uid}-message-hint`} className="sr-only">Maximal {maxChars} Zeichen.</p>
            </div>

            <div role="radiogroup" aria-label="Absender" className="grid grid-cols-2 gap-2">
              <Segment checked={!anonymous} onClick={() => setAnonymous(false)}>Absender anzeigen</Segment>
              <Segment checked={anonymous} onClick={() => setAnonymous(true)}>Ohne Namen senden</Segment>
            </div>

            {!anonymous && (
              <div>
                <label htmlFor={`${uid}-sender`} className="mb-1.5 block text-[13px] font-semibold text-ink">Dein Name <span className="font-normal text-ink-soft">(optional)</span></label>
                <input
                  id={`${uid}-sender`}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value.slice(0, 60))}
                  autoComplete="name"
                  placeholder="z. B. Anna"
                  className="h-12 w-full rounded-md border border-line bg-white/70 px-4 text-[15px] text-ink placeholder:text-ink-soft focus:border-forest focus:bg-white focus:outline-none"
                />
              </div>
            )}

            <GreetingCardPreview message={message} senderName={senderName} anonymous={anonymous} />
          </div>
        )}
      </section>

      {/* ---------- Extras ---------- */}
      {activeExtras.length > 0 && (
        <section aria-labelledby={`${uid}-extras`}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id={`${uid}-extras`} className="font-serif text-[22px] text-ink">Noch etwas dazu?</h2>
            <span className="text-[12.5px] text-ink-soft">Wird mit dem Strauß geliefert</span>
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
                    <p className="text-[12.5px] tabular-nums text-ink-muted">{formatPrice(e.price)}</p>
                    {q === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(e.id, 1)}
                        aria-pressed={false}
                        aria-label={`${e.name} für ${formatPrice(e.price)} hinzufügen`}
                        className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-forest/60 text-[13px] font-semibold text-forest transition-colors hover:bg-forest hover:text-ivory"
                      >
                        <Plus className="size-3.5" aria-hidden /> Hinzufügen
                      </button>
                    ) : (
                      <div className="mt-2.5 inline-flex h-10 w-full items-center justify-between rounded-md bg-forest text-ivory" role="group" aria-label={`${e.name} Anzahl`}>
                        <button type="button" onClick={() => setQty(e.id, q - 1)} aria-label={`${e.name}: eins weniger`} className="grid size-10 place-items-center"><Minus className="size-3.5" /></button>
                        <span className="text-[13px] font-semibold tabular-nums" aria-live="polite">{q}</span>
                        <button type="button" onClick={() => setQty(e.id, q + 1)} aria-label={`${e.name}: eins mehr`} className="grid size-10 place-items-center"><Plus className="size-3.5" /></button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ---------- CTA ---------- */}
      <div ref={ctaRef} className="border-t border-line pt-6">
        <dl className="mb-4 space-y-1 text-[13.5px] text-ink-muted">
          <div className="flex justify-between"><dt>{product.name} · {size.label}</dt><dd className="tabular-nums text-ink">{formatPrice(size.price)}</dd></div>
          {chosenExtras.map((e) => (
            <div key={e.extra.id} className="flex justify-between"><dt>{e.quantity > 1 && `${e.quantity} × `}{e.extra.name}</dt><dd className="tabular-nums text-ink">{formatPrice(e.extra.price * e.quantity)}</dd></div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 text-[15px] font-semibold text-ink"><dt>Gesamt</dt><dd className="tabular-nums">{formatPrice(total)}</dd></div>
        </dl>
        <Button type="button" size="xl" full onClick={addToCart} disabled={soldOut} icon={<ShoppingBag className="size-4" aria-hidden />}>
          {soldOut ? "Derzeit nicht verfügbar" : "In den Warenkorb"}
        </Button>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
          <li className="inline-flex items-center gap-1.5"><Leaf className="size-3.5 text-forest" strokeWidth={1.5} aria-hidden /> Frisch gebunden</li>
          <li className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-forest" strokeWidth={1.5} aria-hidden /> Grußkarte inklusive</li>
          <li className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-forest" strokeWidth={1.5} aria-hidden /> Sichere Zahlung</li>
        </ul>
      </div>

      {/* ---------- Sticky mobile bar ---------- */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-20px_rgba(35,35,31,0.3)] backdrop-blur-md transition-transform duration-300 ease-[var(--ease-soft)] lg:hidden",
          ctaVisible ? "translate-y-full" : "translate-y-0",
        )}
        aria-hidden={ctaVisible}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[18px] leading-tight text-ink">{product.name} · {size.label}</p>
            <p className="text-[13px] tabular-nums text-ink-muted">{formatPrice(total)}</p>
          </div>
          <Button type="button" size="lg" onClick={addToCart} disabled={soldOut} tabIndex={ctaVisible ? -1 : 0}>In den Warenkorb</Button>
        </div>
      </div>
    </div>
  );
}

function QuickOption({ checked, onClick, title, sub, icon, ariaExpanded }: {
  checked: boolean; onClick: () => void; title: string; sub: string; icon?: React.ReactNode; ariaExpanded?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-expanded={ariaExpanded}
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

function Segment({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
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
