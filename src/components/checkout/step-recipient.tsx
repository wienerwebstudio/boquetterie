"use client";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizePostalCode } from "@/lib/delivery";
import { routes } from "@/lib/urls";
import type { FieldErrors } from "@/lib/order-payload";
import { fieldId, isViennaZip, type CheckoutData } from "./checkout-state";

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
      : "Wir liefern in Wien und im Wiener Umland.";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id={id("firstName")} label="Vorname" autoComplete="off" value={data.firstName} onChange={(e) => set({ firstName: e.target.value })} onBlur={() => onBlur("firstName")} error={errors.firstName} />
        <Input id={id("lastName")} label="Nachname" autoComplete="off" value={data.lastName} onChange={(e) => set({ lastName: e.target.value })} onBlur={() => onBlur("lastName")} error={errors.lastName} />
      </div>
      <Input id={id("company")} label="Firma / Hotel" optional autoComplete="organization" value={data.company} onChange={(e) => set({ company: e.target.value })} onBlur={() => onBlur("company")} error={errors.company} hint="Hilfreich bei Zustellung an Büro, Rezeption oder Station." />
      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Input id={id("street")} label="Straße" autoComplete="address-line1" value={data.street} onChange={(e) => set({ street: e.target.value })} onBlur={() => onBlur("street")} error={errors.street} />
        <Input id={id("houseNumber")} label="Hausnummer" inputMode="text" value={data.houseNumber} onChange={(e) => set({ houseNumber: e.target.value })} onBlur={() => onBlur("houseNumber")} error={errors.houseNumber} />
      </div>
      <Input id={id("addition")} label="Stiege / Tür" optional autoComplete="address-line2" value={data.addition} onChange={(e) => set({ addition: e.target.value })} onBlur={() => onBlur("addition")} error={errors.addition} />
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div className="relative">
          <Input
            id={id("zip")} label="PLZ" inputMode="numeric" autoComplete="postal-code" maxLength={4}
            value={data.zip} onChange={(e) => onZipChange(e.target.value)} onBlur={() => onBlur("zip")}
            error={errors.zip} hint={zipHint}
            className="[&_input]:tracking-[0.08em]"
          />
          {zone.loading && <Loader2 className="absolute right-3 top-[38px] size-4 animate-spin text-ink-soft" aria-hidden />}
        </div>
        <Input id={id("city")} label="Ort" autoComplete="address-level2" value={data.city} onChange={(e) => set({ city: e.target.value })} onBlur={() => onBlur("city")} error={errors.city} />
      </div>

      <div aria-live="polite" className="-mt-2 min-h-5 text-[13px]">
        {zone.available && zone.zoneName && !errors.zip && (
          <p className="flex items-center gap-2 font-semibold text-success animate-fade-in">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-2.5" strokeWidth={3} /></span>
            Lieferung möglich · {zone.zoneName}
          </p>
        )}
        {zone.available === false && (
          <div role="alert" className="rounded-md border border-rose/40 bg-rose-100/60 p-4 text-ink animate-fade-in">
            <p className="font-semibold">Leider liefern wir an {data.zip} noch nicht.</p>
            <p className="mt-1 text-ink-muted">
              Wir erweitern unsere Liefergebiete laufend. Alle aktuellen Gebiete findest du unter{" "}
              <Link href={routes.delivery} className="font-semibold text-forest underline underline-offset-2">Lieferung & Versand</Link>.
            </p>
          </div>
        )}
        {zone.error && <p className="text-danger">{zone.error}</p>}
      </div>

      <Input
        id={id("phone")} label="Telefonnummer für die Zustellung" type="tel" inputMode="tel" autoComplete="off"
        value={data.phone} onChange={(e) => set({ phone: e.target.value })} onBlur={() => onBlur("phone")} error={errors.phone}
        hint="Die Telefonnummer wird ausschließlich verwendet, falls es bei der Zustellung Rückfragen gibt."
      />
    </div>
  );
}
