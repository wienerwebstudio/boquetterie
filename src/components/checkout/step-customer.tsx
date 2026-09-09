"use client";
import Link from "next/link";
import { Checkbox, Input } from "@/components/ui/input";
import { routes } from "@/lib/urls";
import type { FieldErrors } from "@/lib/order-payload";
import { fieldId, type CheckoutData } from "./checkout-state";

type Customer = CheckoutData["customer"];

export function StepCustomer({ data, set, errors, onBlur, newsletterEnabled }: {
  data: Customer;
  set: (patch: Partial<Customer>) => void;
  errors: FieldErrors;
  onBlur: (field: keyof Customer) => void;
  newsletterEnabled: boolean;
}) {
  const id = (f: keyof Customer) => fieldId(4, f);
  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-2 text-[14px] text-ink-muted">Die Bestellbestätigung und der Link zur Sendungsverfolgung gehen an dich – nicht an den Empfänger.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id={id("firstName")} label="Vorname" autoComplete="given-name" value={data.firstName} onChange={(e) => set({ firstName: e.target.value })} onBlur={() => onBlur("firstName")} error={errors.firstName} />
        <Input id={id("lastName")} label="Nachname" autoComplete="family-name" value={data.lastName} onChange={(e) => set({ lastName: e.target.value })} onBlur={() => onBlur("lastName")} error={errors.lastName} />
      </div>
      <Input id={id("email")} label="E-Mail-Adresse" type="email" inputMode="email" autoComplete="email" value={data.email} onChange={(e) => set({ email: e.target.value })} onBlur={() => onBlur("email")} error={errors.email} hint="Für Bestellbestätigung und Sendungsverfolgung." />
      <Input id={id("phone")} label="Telefon" type="tel" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(e) => set({ phone: e.target.value })} onBlur={() => onBlur("phone")} error={errors.phone} hint="Falls wir Rückfragen zu deiner Bestellung haben." />

      <div className="mt-2 flex flex-col gap-4 border-t border-line pt-5">
        <div className="flex flex-col gap-1.5">
          <Checkbox
            id={id("acceptedTerms")}
            checked={data.acceptedTerms}
            onChange={(e) => set({ acceptedTerms: e.target.checked })}
            onBlur={() => onBlur("acceptedTerms")}
            aria-invalid={Boolean(errors.acceptedTerms) || undefined}
            aria-describedby={errors.acceptedTerms ? `${id("acceptedTerms")}-error` : undefined}
            label={
              <>
                Ich habe die <Link href={routes.legal.terms} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-2">AGB</Link> und die{" "}
                <Link href={routes.legal.privacy} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-2">Datenschutzerklärung</Link> gelesen.
              </>
            }
          />
          {errors.acceptedTerms && <p id={`${id("acceptedTerms")}-error`} role="alert" className="pl-7 text-[13px] text-danger">{errors.acceptedTerms}</p>}
        </div>
        {newsletterEnabled && (
          <Checkbox
            id={id("newsletter")}
            checked={data.newsletter}
            onChange={(e) => set({ newsletter: e.target.checked })}
            label={<>Ich möchte gelegentlich Neuigkeiten und saisonale Empfehlungen per E-Mail erhalten. <span className="text-ink-soft">(optional, jederzeit abbestellbar)</span></>}
          />
        )}
      </div>
    </div>
  );
}
