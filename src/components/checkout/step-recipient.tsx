"use client";
import Link from "@/components/ui/link";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizePostalCode } from "@/lib/delivery";
import { routes } from "@/lib/urls";
import type { FieldErrors } from "@/lib/order-payload";
import { useI18n } from "@/i18n/client";
import { fieldId, isViennaZip, type CheckoutData } from "./checkout-state";
import { rich } from "./rich-text";

type Recipient = CheckoutData["recipient"];

export interface ZoneStatus {
  loading: boolean;
  /** null = not checked yet */
  available: boolean | null;
  zoneName?: string;
  error?: string | null;
}

export function StepRecipient({ data, set, errors, onBlur, zone }: {
  data: Recipient;
  set: (patch: Partial<Recipient>) => void;
  errors: FieldErrors;
  onBlur: (field: keyof Recipient) => void;
  zone: ZoneStatus;
}) {
  const id = (f: keyof Recipient) => fieldId(1, f);
  const { m, fmt } = useI18n();
  const t = m.checkout.recipient;
  const onZipChange = (raw: string) => {
    const zip = normalizePostalCode(raw);
    const patch: Partial<Recipient> = { zip };
    if (isViennaZip(zip) && (!data.city || data.city === "Wien")) patch.city = "Wien";
    else if (!isViennaZip(zip) && data.city === "Wien") patch.city = "";
    set(patch);
  };

  const zipHint = zone.loading
    ? undefined
    : zone.available && zone.zoneName
      ? undefined
      : t.zipHint;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <Input required id={id("firstName")} label={t.firstName} autoComplete="off" value={data.firstName} onChange={(e) => set({ firstName: e.target.value })} onBlur={() => onBlur("firstName")} error={errors.firstName} />
        <Input required id={id("lastName")} label={t.lastName} autoComplete="off" value={data.lastName} onChange={(e) => set({ lastName: e.target.value })} onBlur={() => onBlur("lastName")} error={errors.lastName} />
      </div>
      <Input id={id("company")} label={t.company} optional autoComplete="organization" value={data.company} onChange={(e) => set({ company: e.target.value })} onBlur={() => onBlur("company")} error={errors.company} hint={t.companyHint} />
      <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3 sm:grid-cols-[1fr_120px] sm:gap-5">
        <Input required id={id("street")} label={t.street} autoComplete="address-line1" value={data.street} onChange={(e) => set({ street: e.target.value })} onBlur={() => onBlur("street")} error={errors.street} />
        <Input required id={id("houseNumber")} label={t.houseNumber} inputMode="text" value={data.houseNumber} onChange={(e) => set({ houseNumber: e.target.value })} onBlur={() => onBlur("houseNumber")} error={errors.houseNumber} />
      </div>
      <Input id={id("addition")} label={t.addition} optional autoComplete="address-line2" value={data.addition} onChange={(e) => set({ addition: e.target.value })} onBlur={() => onBlur("addition")} error={errors.addition} />
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div className="relative">
          <Input required
            id={id("zip")} label={t.zip} inputMode="numeric" autoComplete="postal-code" maxLength={4}
            value={data.zip} onChange={(e) => onZipChange(e.target.value)} onBlur={() => onBlur("zip")}
            error={errors.zip} hint={zipHint}
            className="[&_input]:tracking-[0.08em]"
          />
          {zone.loading && <Loader2 className="absolute right-3 top-[38px] size-4 animate-spin text-ink-soft" aria-hidden />}
        </div>
        <Input required id={id("city")} label={t.city} autoComplete="address-level2" value={data.city} onChange={(e) => set({ city: e.target.value })} onBlur={() => onBlur("city")} error={errors.city} />
      </div>

      <div aria-live="polite" className="-mt-2 min-h-5 text-[13px]">
        {zone.available && zone.zoneName && !errors.zip && (
          <p className="flex items-center gap-2 font-semibold text-success animate-fade-in">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-2.5" strokeWidth={3} /></span>
            {fmt(t.deliveryPossible, { zip: data.zip, city: data.city })}
          </p>
        )}
        {zone.available === false && (
          <div role="alert" className="rounded-md border border-rose/40 bg-rose-100/60 p-4 text-ink animate-fade-in">
            <p className="font-semibold">{fmt(t.notDelivered, { zip: data.zip })}</p>
            <p className="mt-1 text-ink-muted">
              {rich(t.expanding, { link: <Link href={routes.delivery} className="font-semibold text-forest underline underline-offset-2">{t.deliveryLink}</Link> })}
            </p>
          </div>
        )}
        {zone.error && <p className="text-danger">{zone.error}</p>}
      </div>

      <Input required
        id={id("phone")} label={t.phone} type="tel" inputMode="tel" autoComplete="off"
        value={data.phone} onChange={(e) => set({ phone: e.target.value })} onBlur={() => onBlur("phone")} error={errors.phone}
        hint={t.phoneHint}
      />
    </div>
  );
}
