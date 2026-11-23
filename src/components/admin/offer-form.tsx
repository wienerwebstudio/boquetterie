"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Flower2, Gift, MapPin, Plus, Receipt, Send, StickyNote, Trash2, UserRound } from "lucide-react";
import type { DeliveryZone } from "@/types";
import { Button } from "@/components/ui/button";
import { Banner, Card, Field, inputCls } from "@/components/admin/controls";
import { ImageField } from "@/components/admin/image-field";
import { findZone, quoteDelivery } from "@/lib/delivery";
import { deliveryDayWarning, offerTimeLabel, round2 } from "@/lib/offers-core";
import { cn, formatDateLong, formatPrice } from "@/lib/format";
import { saveOfferAction, sendOfferAction } from "@/app/admin/angebote/actions";
import { emptyItem, type OfferFormCatalog, type OfferFormItem, type OfferFormState } from "./offer-form-state";

const num = (v: string) => {
  const n = Number(v.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};
const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function OfferForm({ id, initial, catalog, zones, blackoutDates, cardsEnabled, locales, requestId }: {
  id: string | null;
  /** Customer request this new offer is created from (linked after saving). */
  requestId?: string;
  initial: OfferFormState;
  catalog: OfferFormCatalog;
  zones: DeliveryZone[];
  blackoutDates: string[];
  cardsEnabled: boolean;
  locales: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [s, setS] = useState<OfferFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "error" | "success" | "warn"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [showBilling, setShowBilling] = useState(Boolean(initial.billing.street || initial.billing.company));

  const err = (k: string) => errors[k];
  const set = <K extends keyof OfferFormState>(key: K, patch: Partial<OfferFormState[K]> | OfferFormState[K]) =>
    setS((x) => ({ ...x, [key]: typeof patch === "object" && patch !== null && !Array.isArray(patch) ? { ...(x[key] as object), ...patch } : patch }));
  const setItem = (i: number, patch: Partial<OfferFormItem>) => setS((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  /* ---- Totals and delivery zone (live) ---- */
  const itemsTotal = round2(s.items.reduce((sum, it) => sum + num(it.unitPrice) * Math.max(1, Math.trunc(num(it.quantity))), 0));
  const extrasTotal = round2(s.extras.reduce((sum, e) => sum + num(e.unitPrice) * Math.max(1, Math.trunc(num(e.quantity))), 0));
  const zone = useMemo(() => (s.delivery.enabled ? findZone(s.recipient.zip, zones) : null), [s.delivery.enabled, s.recipient.zip, zones]);
  const zoneFee = zone ? quoteDelivery(zone, itemsTotal + extrasTotal).fee : null;
  // Manual amount; prefilled from the zone only while the ZIP matches one and nothing was typed.
  const fee = s.feeTouched ? num(s.delivery.fee) : zoneFee ?? 0;
  const total = round2(itemsTotal + extrasTotal + fee);
  const dayWarning = s.delivery.enabled ? deliveryDayWarning(s.delivery.date, zone, { blackoutDates }) : null;

  const payload = () => ({
    locale: s.locale,
    customer: s.customer,
    items: s.items.map((it) => ({ ...it, quantity: num(it.quantity), unitPrice: num(it.unitPrice), floristBudget: it.floristBudget.trim() ? num(it.floristBudget) : undefined })),
    extras: s.extras.map((e) => ({ extraId: e.extraId, quantity: num(e.quantity), unitPrice: num(e.unitPrice) })),
    delivery: { ...s.delivery, fee },
    recipient: s.recipient,
    greeting: cardsEnabled ? s.greeting : undefined,
    floristNote: s.floristNote,
    billing: showBilling ? s.billing : undefined,
    internalNote: s.internalNote,
    validUntil: s.validUntil,
  });

  const submit = (send: boolean) => {
    setBanner(null);
    start(async () => {
      const res = await saveOfferAction(id, payload(), requestId);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setBanner({ tone: "error", text: res.message });
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
        return;
      }
      setErrors({});
      if (send) {
        const sent = await sendOfferAction(res.id);
        if (!sent.ok) {
          setBanner({ tone: "error", text: `Gespeichert, aber nicht gesendet: ${sent.message}` });
          router.push(`/admin/angebote/${res.id}`);
          return;
        }
      }
      router.push(`/admin/angebote/${res.id}${send ? "?gesendet=1" : "?gespeichert=1"}`);
      router.refresh();
    });
  };

  const inv = (k: string) => (errors[k] ? { "aria-invalid": true as const } : {});

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="min-w-0 space-y-5">
        {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}

        <Card title="Kund:in" accent="sky" icon={UserRound} description="Bekommt das Angebot per Mail – in der gewählten Sprache.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vorname" htmlFor="c-first" required error={err("customer.firstName")}><input id="c-first" className={inputCls} value={s.customer.firstName} onChange={(e) => set("customer", { firstName: e.target.value })} {...inv("customer.firstName")} /></Field>
            <Field label="Nachname" htmlFor="c-last"><input id="c-last" className={inputCls} value={s.customer.lastName} onChange={(e) => set("customer", { lastName: e.target.value })} /></Field>
            <Field label="E-Mail" htmlFor="c-email" required error={err("customer.email")}><input id="c-email" type="email" className={inputCls} value={s.customer.email} onChange={(e) => set("customer", { email: e.target.value })} {...inv("customer.email")} /></Field>
            <Field label="Telefon" htmlFor="c-phone" error={err("customer.phone")}><input id="c-phone" type="tel" className={inputCls} value={s.customer.phone} onChange={(e) => set("customer", { phone: e.target.value })} {...inv("customer.phone")} /></Field>
            <Field label="Sprache" htmlFor="c-locale" hint="Sprache der Mail und der Angebotsseite.">
              <select id="c-locale" className={cn(inputCls, "appearance-none")} value={s.locale} onChange={(e) => set("locale", e.target.value)}>
                {locales.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Positionen" accent="rose" icon={Flower2} description="Freie Position (z. B. Strauß nur aus rosa Tulpen) oder ein Shop-Produkt mit eigenem Preis. Preise sind Endpreise.">
          {err("items") && <Banner tone="error" className="mb-4">{err("items")}</Banner>}
          <div className="space-y-4">
            {s.items.map((it, i) => {
              const product = catalog.products.find((p) => p.id === it.productId);
              const k = `items.${i}`;
              return (
                <fieldset key={it.id} className="rounded-xl border border-[#e7e2d9] bg-[#fbfaf7] p-4">
                  <legend className="sr-only">Position {i + 1}</legend>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-lg border border-[#e7e2d9] bg-white p-0.5 text-[13px] font-semibold" role="radiogroup" aria-label={`Art der Position ${i + 1}`}>
                      {(["custom", "product"] as const).map((kind) => (
                        <button key={kind} type="button" role="radio" aria-checked={it.kind === kind} onClick={() => setItem(i, { kind })}
                          className={cn("rounded-md px-3 py-1.5", it.kind === kind ? "bg-[#a92a52] text-white" : "text-[#4f4c47] hover:bg-[#f3efe8]")}>
                          {kind === "custom" ? "Freie Position" : "Shop-Produkt"}
                        </button>
                      ))}
                    </div>
                    {s.items.length > 1 && (
                      <button type="button" onClick={() => setS((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} className="inline-flex items-center gap-1 text-[13px] text-[#b42318] hover:underline">
                        <Trash2 className="size-3.5" aria-hidden /> Entfernen
                      </button>
                    )}
                  </div>
                  {it.kind === "product" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Produkt" htmlFor={`${k}-product`} error={err(`${k}.productId`)}>
                        <select id={`${k}-product`} className={cn(inputCls, "appearance-none")} value={it.productId} {...inv(`${k}.productId`)}
                          onChange={(e) => {
                            const p = catalog.products.find((x) => x.id === e.target.value);
                            const size = p?.sizes[0];
                            setItem(i, { productId: e.target.value, sizeId: size?.id ?? "", unitPrice: size ? money(size.price) : it.unitPrice, title: p?.name ?? "" });
                          }}>
                          <option value="">– Produkt wählen –</option>
                          {catalog.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Größe" htmlFor={`${k}-size`}>
                        <select id={`${k}-size`} className={cn(inputCls, "appearance-none")} value={it.sizeId} disabled={!product}
                          onChange={(e) => { const size = product?.sizes.find((x) => x.id === e.target.value); setItem(i, { sizeId: e.target.value, ...(size ? { unitPrice: money(size.price) } : {}) }); }}>
                          {(product?.sizes ?? []).map((sz) => <option key={sz.id} value={sz.id}>{sz.label} · {formatPrice(sz.price)}</option>)}
                        </select>
                      </Field>
                      <Field label="Beschreibung / Hinweis (optional)" htmlFor={`${k}-desc`} className="sm:col-span-2">
                        <textarea id={`${k}-desc`} rows={2} className={cn(inputCls, "h-auto min-h-[64px] py-2")} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                      </Field>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Titel" htmlFor={`${k}-title`} required error={err(`${k}.title`)} className="sm:col-span-2">
                        <input id={`${k}-title`} className={inputCls} value={it.title} placeholder="z. B. Strauß aus rosa Tulpen" onChange={(e) => setItem(i, { title: e.target.value })} {...inv(`${k}.title`)} />
                      </Field>
                      <Field label="Beschreibung" htmlFor={`${k}-desc`} hint="Sieht die Kund:in – und die Floristik im Auftrag." className="sm:col-span-2">
                        <textarea id={`${k}-desc`} rows={3} className={cn(inputCls, "h-auto min-h-[80px] py-2")} value={it.description} placeholder="z. B. ca. 30 rosa Tulpen, locker gebunden, ohne Grün" onChange={(e) => setItem(i, { description: e.target.value })} />
                      </Field>
                      <div className="sm:col-span-2">
                        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">Foto (optional)</p>
                        <ImageField id={`${k}-image`} value={it.image} onChange={(v) => setItem(i, { image: v })} placeholder="/media/… oder hochladen" compact />
                        <label className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
                          oder Foto eines Produkts:
                          <select className={cn(inputCls, "h-8 w-auto appearance-none py-0 text-[13px]")} value="" onChange={(e) => { const p = catalog.products.find((x) => x.id === e.target.value); if (p?.image) setItem(i, { image: p.image }); }}>
                            <option value="">– wählen –</option>
                            {catalog.products.filter((p) => p.image).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Field label="Menge" htmlFor={`${k}-qty`} error={err(`${k}.quantity`)}><input id={`${k}-qty`} inputMode="numeric" className={inputCls} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} {...inv(`${k}.quantity`)} /></Field>
                    <Field label="Preis je Stück (€)" htmlFor={`${k}-price`} required error={err(`${k}.unitPrice`)}><input id={`${k}-price`} inputMode="decimal" className={inputCls} value={it.unitPrice} placeholder="0,00" onChange={(e) => setItem(i, { unitPrice: e.target.value })} {...inv(`${k}.unitPrice`)} /></Field>
                    <Field label="Floristen-Budget (€)" htmlFor={`${k}-budget`} hint="Optional, intern."><input id={`${k}-budget`} inputMode="decimal" className={inputCls} value={it.floristBudget} onChange={(e) => setItem(i, { floristBudget: e.target.value })} /></Field>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" icon={<Plus className="size-4" aria-hidden />} onClick={() => setS((x) => ({ ...x, items: [...x.items, emptyItem("custom")] }))}>Freie Position</Button>
            <Button type="button" size="sm" variant="outline" icon={<Plus className="size-4" aria-hidden />} onClick={() => setS((x) => ({ ...x, items: [...x.items, emptyItem("product")] }))}>Shop-Produkt</Button>
          </div>
        </Card>

        <Card title="Extras" accent="amber" icon={Gift} description="Optional, Preis anpassbar.">
          {s.extras.length === 0 && <p className="mb-3 text-[13px] text-ink-muted">Keine Extras.</p>}
          <div className="space-y-3">
            {s.extras.map((e, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_90px_130px_auto]">
                <Field label="Extra" htmlFor={`x-${i}`} error={err(`extras.${i}.extraId`)}>
                  <select id={`x-${i}`} className={cn(inputCls, "appearance-none")} value={e.extraId}
                    onChange={(ev) => { const x = catalog.extras.find((y) => y.id === ev.target.value); setS((st) => ({ ...st, extras: st.extras.map((y, j) => (j === i ? { ...y, extraId: ev.target.value, unitPrice: x ? money(x.price) : y.unitPrice } : y)) })); }}>
                    <option value="">– wählen –</option>
                    {catalog.extras.map((x) => <option key={x.id} value={x.id}>{x.name} · {formatPrice(x.price)}</option>)}
                  </select>
                </Field>
                <Field label="Menge" htmlFor={`x-${i}-q`}><input id={`x-${i}-q`} inputMode="numeric" className={inputCls} value={e.quantity} onChange={(ev) => setS((st) => ({ ...st, extras: st.extras.map((y, j) => (j === i ? { ...y, quantity: ev.target.value } : y)) }))} /></Field>
                <Field label="Preis (€)" htmlFor={`x-${i}-p`} error={err(`extras.${i}.unitPrice`)}><input id={`x-${i}-p`} inputMode="decimal" className={inputCls} value={e.unitPrice} onChange={(ev) => setS((st) => ({ ...st, extras: st.extras.map((y, j) => (j === i ? { ...y, unitPrice: ev.target.value } : y)) }))} /></Field>
                <button type="button" aria-label={`Extra ${i + 1} entfernen`} onClick={() => setS((st) => ({ ...st, extras: st.extras.filter((_, j) => j !== i) }))} className="mb-1 inline-flex size-9 items-center justify-center rounded-md text-[#b42318] hover:bg-[#fdecea]"><Trash2 className="size-4" aria-hidden /></button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="mt-3" icon={<Plus className="size-4" aria-hidden />} onClick={() => setS((x) => ({ ...x, extras: [...x.extras, { extraId: "", quantity: "1", unitPrice: "" }] }))}>Extra hinzufügen</Button>
        </Card>

        <Card title="Lieferung" accent="teal" icon={CalendarClock} description="Frei wählbar: jedes Datum, jede Uhrzeit, jede Adresse oder ein Treffpunkt. Bezahlte Angebote werden nie automatisch einem Partner oder Kurier gegeben – das macht ihr von Hand.">
          <label className="mb-4 flex items-center gap-2 text-[14px] font-semibold"><input type="checkbox" className="size-4 accent-[#0f8f8f]" checked={s.delivery.enabled} onChange={(e) => set("delivery", { enabled: e.target.checked })} /> Mit Lieferung (sonst: Abholung / nach Absprache)</label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Datum" htmlFor="d-date" required={s.delivery.enabled} error={err("delivery.date")}><input id="d-date" type="date" className={inputCls} value={s.delivery.date} onChange={(e) => set("delivery", { date: e.target.value })} {...inv("delivery.date")} /></Field>
            <Field label="Von (optional)" htmlFor="d-from" error={err("delivery.from")}><input id="d-from" type="time" className={inputCls} value={s.delivery.from} onChange={(e) => set("delivery", { from: e.target.value })} {...inv("delivery.from")} /></Field>
            <Field label="Bis (optional)" htmlFor="d-to" error={err("delivery.to")}><input id="d-to" type="time" className={inputCls} value={s.delivery.to} onChange={(e) => set("delivery", { to: e.target.value })} {...inv("delivery.to")} /></Field>
          </div>
          <Field label="Zeit als Text (optional)" htmlFor="d-text" hint="z. B. „ca. 15 Uhr“ oder „nach Absprache“ – erscheint so bei der Kund:in." className="mt-4">
            <input id="d-text" className={inputCls} value={s.delivery.text} onChange={(e) => set("delivery", { text: e.target.value })} />
          </Field>
          {dayWarning && <Banner tone="warn" className="mt-3">Hinweis: {dayWarning} Das Angebot ist trotzdem möglich.</Banner>}
          {s.delivery.enabled && (<>
          <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Lieferort">
            {(["address", "meeting"] as const).map((kind) => (
              <button key={kind} type="button" role="radio" aria-checked={s.recipient.kind === kind} onClick={() => set("recipient", { kind })}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold", s.recipient.kind === kind ? "border-[#0f8f8f] bg-[#dff5f4] text-[#0c6467]" : "border-[#e7e2d9] bg-white text-[#4f4c47]")}>
                <MapPin className="size-3.5" aria-hidden /> {kind === "address" ? "Adresse" : "Treffpunkt"}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-6">
            <Field label="Straße" htmlFor="r-street" error={err("recipient.street")} className="sm:col-span-4"><input id="r-street" className={inputCls} value={s.recipient.street} onChange={(e) => set("recipient", { street: e.target.value })} {...inv("recipient.street")} /></Field>
            <Field label="Nr." htmlFor="r-no" error={err("recipient.houseNumber")} className="sm:col-span-2"><input id="r-no" className={inputCls} value={s.recipient.houseNumber} onChange={(e) => set("recipient", { houseNumber: e.target.value })} {...inv("recipient.houseNumber")} /></Field>
            <Field label={s.recipient.kind === "meeting" ? "Treffpunkt-Beschreibung" : "Zusatz (Stiege/Tür)"} htmlFor="r-add" required={s.recipient.kind === "meeting"} error={err("recipient.addition")} className="sm:col-span-6">
              <input id="r-add" className={inputCls} value={s.recipient.addition} placeholder={s.recipient.kind === "meeting" ? "z. B. Haupteingang Burgtheater" : "z. B. Stiege 2, Top 5"} onChange={(e) => set("recipient", { addition: e.target.value })} {...inv("recipient.addition")} />
            </Field>
            <Field label="PLZ" htmlFor="r-zip" error={err("recipient.zip")} className="sm:col-span-2"><input id="r-zip" inputMode="numeric" className={inputCls} value={s.recipient.zip} onChange={(e) => set("recipient", { zip: e.target.value })} {...inv("recipient.zip")} /></Field>
            <Field label="Ort" htmlFor="r-city" required error={err("recipient.city")} className="sm:col-span-4"><input id="r-city" className={inputCls} value={s.recipient.city} onChange={(e) => set("recipient", { city: e.target.value })} {...inv("recipient.city")} /></Field>
            <Field label="Empfänger:in Vorname" htmlFor="r-first" required error={err("recipient.firstName")} className="sm:col-span-3"><input id="r-first" className={inputCls} value={s.recipient.firstName} onChange={(e) => set("recipient", { firstName: e.target.value })} {...inv("recipient.firstName")} /></Field>
            <Field label="Empfänger:in Nachname" htmlFor="r-last" className="sm:col-span-3"><input id="r-last" className={inputCls} value={s.recipient.lastName} onChange={(e) => set("recipient", { lastName: e.target.value })} /></Field>
            <Field label="Telefon Empfänger:in" htmlFor="r-phone" error={err("recipient.phone")} hint="Empfohlen – für die Zustellung." className="sm:col-span-3"><input id="r-phone" type="tel" className={inputCls} value={s.recipient.phone} onChange={(e) => set("recipient", { phone: e.target.value })} {...inv("recipient.phone")} /></Field>
            <Field label="Firma (optional)" htmlFor="r-company" className="sm:col-span-3"><input id="r-company" className={inputCls} value={s.recipient.company} onChange={(e) => set("recipient", { company: e.target.value })} /></Field>
          </div>
          <button type="button" className="mt-2 text-[12.5px] font-semibold text-[#0a6644] hover:underline" onClick={() => set("recipient", { firstName: s.customer.firstName, lastName: s.customer.lastName, phone: s.recipient.phone || s.customer.phone })}>Empfänger:in = Kund:in</button>
          </>)}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={s.delivery.enabled ? "Liefergebühr (€)" : "Gebühr (€, optional)"} htmlFor="d-fee" error={err("delivery.fee")} hint={zone ? `Liefergebiet ${zone.name}: ${formatPrice(zoneFee ?? 0)}${s.feeTouched ? " – von Hand geändert" : ""}` : "Frei eintragen (aus der PLZ vorgeschlagen, wenn sie in einem Liefergebiet liegt)."}>
              <div className="flex gap-2">
                <input id="d-fee" inputMode="decimal" className={inputCls} value={s.feeTouched ? s.delivery.fee : money(fee)} onChange={(e) => setS((x) => ({ ...x, feeTouched: true, delivery: { ...x.delivery, fee: e.target.value } }))} {...inv("delivery.fee")} />
                {s.feeTouched && zone && <Button type="button" size="sm" variant="ghost" className="h-10" onClick={() => setS((x) => ({ ...x, feeTouched: false }))}>Zone</Button>}
              </div>
            </Field>
            <Field label="Lieferhinweis (optional)" htmlFor="d-note" hint="Für Kurier und Kund:in sichtbar."><input id="d-note" className={inputCls} value={s.delivery.note} onChange={(e) => set("delivery", { note: e.target.value })} /></Field>
          </div>
        </Card>

        <Card title="Hinweise" accent="violet" icon={StickyNote}>
          <div className="grid gap-4">
            {cardsEnabled ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                <Field label="Grußkarte (optional)" htmlFor="g-msg"><textarea id="g-msg" rows={2} className={cn(inputCls, "h-auto min-h-[64px] py-2")} value={s.greeting.message} onChange={(e) => set("greeting", { message: e.target.value })} /></Field>
                <Field label="Absender" htmlFor="g-from"><input id="g-from" className={inputCls} value={s.greeting.senderName} onChange={(e) => set("greeting", { senderName: e.target.value })} /></Field>
              </div>
            ) : (
              <p className="rounded-lg border border-[#e7e2d9] bg-[#f6f4ef] px-3 py-2 text-[13px] text-[#5f5c56]">Grußkarten sind im Shop noch nicht im Angebot („kommt bald“) – deshalb hier kein Kartentext.</p>
            )}
            <Field label="Hinweis an die Floristik (optional)" htmlFor="f-note" hint="Steht fett und farbig oben im Partner-Auftrag (wird beim Zuordnen vorausgefüllt).">
              <textarea id="f-note" rows={2} className={cn(inputCls, "h-auto min-h-[64px] py-2")} value={s.floristNote} onChange={(e) => set("floristNote", e.target.value)} />
            </Field>
            <Field label="Interne Notiz (optional)" htmlFor="i-note" hint="Nur für das Team.">
              <textarea id="i-note" rows={2} className={cn(inputCls, "h-auto min-h-[64px] py-2")} value={s.internalNote} onChange={(e) => set("internalNote", e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="size-4 accent-[#0f9466]" checked={showBilling} onChange={(e) => setShowBilling(e.target.checked)} /> Rechnungsadresse angeben (Firma, UID)</label>
            {showBilling && (
              <div className="grid gap-4 sm:grid-cols-2">
                {err("billing") && <Banner tone="error" className="sm:col-span-2">{err("billing")}</Banner>}
                <Field label="Firma" htmlFor="b-company"><input id="b-company" className={inputCls} value={s.billing.company} onChange={(e) => set("billing", { company: e.target.value })} /></Field>
                <Field label="Name" htmlFor="b-name"><input id="b-name" className={inputCls} value={s.billing.name} onChange={(e) => set("billing", { name: e.target.value })} /></Field>
                <Field label="Straße und Nr." htmlFor="b-street" className="sm:col-span-2"><input id="b-street" className={inputCls} value={s.billing.street} onChange={(e) => set("billing", { street: e.target.value })} /></Field>
                <Field label="PLZ" htmlFor="b-zip"><input id="b-zip" className={inputCls} value={s.billing.zip} onChange={(e) => set("billing", { zip: e.target.value })} /></Field>
                <Field label="Ort" htmlFor="b-city"><input id="b-city" className={inputCls} value={s.billing.city} onChange={(e) => set("billing", { city: e.target.value })} /></Field>
                <Field label="Land" htmlFor="b-country"><input id="b-country" className={inputCls} value={s.billing.country} onChange={(e) => set("billing", { country: e.target.value })} /></Field>
                <Field label="UID-Nummer" htmlFor="b-vat"><input id="b-vat" className={inputCls} value={s.billing.vatId} onChange={(e) => set("billing", { vatId: e.target.value })} /></Field>
              </div>
            )}
          </div>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <Card title="Summe" accent="emerald" icon={Receipt}>
          <dl className="space-y-1.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Positionen</dt><dd className="tabular-nums">{formatPrice(itemsTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Extras</dt><dd className="tabular-nums">{formatPrice(extrasTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Lieferung</dt><dd className="tabular-nums">{formatPrice(fee)}</dd></div>
            <div className="mt-2 flex justify-between rounded-xl bg-[linear-gradient(90deg,#e2f6ec,#f3fbf7)] px-3 py-2.5 text-[17px] font-bold"><dt>Gesamt</dt><dd className="tabular-nums text-[#0a6644]" data-testid="offer-form-total">{formatPrice(total)}</dd></div>
          </dl>
          {s.delivery.date && (
            <p className="mt-3 text-[13px] text-ink-muted">{formatDateLong(s.delivery.date)}{offerTimeLabel(s.delivery) ? `, ${offerTimeLabel(s.delivery)}` : ""}</p>
          )}
          <div className="mt-4">
            <Field label="Gültig bis" htmlFor="valid" required error={err("validUntil")} hint="Danach ist das Angebot nicht mehr bezahlbar.">
              <input id="valid" type="date" className={inputCls} value={s.validUntil} onChange={(e) => set("validUntil", e.target.value)} {...inv("validUntil")} />
            </Field>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Button type="button" loading={pending} icon={<Send className="size-4" aria-hidden />} onClick={() => submit(true)}>{id ? "Speichern & erneut senden" : "Speichern & senden"}</Button>
            <Button type="submit" variant="outline" disabled={pending}>{id ? "Speichern" : "Als Entwurf speichern"}</Button>
          </div>
        </Card>
      </aside>
    </form>
  );
}
