"use client";
import Link from "@/components/ui/link";
import { Checkbox, Input } from "@/components/ui/input";
import { routes } from "@/lib/urls";
import type { FieldErrors } from "@/lib/order-payload";
import { useI18n } from "@/i18n/client";
import { fieldId, type CheckoutData } from "./checkout-state";
import { rich } from "./rich-text";

type Customer = CheckoutData["customer"];

export function StepCustomer({ data, set, errors, onBlur, newsletterEnabled }: {
  data: Customer;
  set: (patch: Partial<Customer>) => void;
  errors: FieldErrors;
  onBlur: (field: keyof Customer) => void;
  newsletterEnabled: boolean;
}) {
  const id = (f: keyof Customer) => fieldId(4, f);
  const t = useI18n().m.checkout.customer;
  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-2 text-[14px] text-ink-muted">{rich(t.intro, { star: <span className="text-burgundy">*</span> })}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input required id={id("firstName")} label={t.firstName} autoComplete="given-name" value={data.firstName} onChange={(e) => set({ firstName: e.target.value })} onBlur={() => onBlur("firstName")} error={errors.firstName} />
        <Input required id={id("lastName")} label={t.lastName} autoComplete="family-name" value={data.lastName} onChange={(e) => set({ lastName: e.target.value })} onBlur={() => onBlur("lastName")} error={errors.lastName} />
      </div>
      <Input required id={id("email")} label={t.email} type="email" inputMode="email" autoComplete="email" value={data.email} onChange={(e) => set({ email: e.target.value })} onBlur={() => onBlur("email")} error={errors.email} hint={t.emailHint} />
      <Input required id={id("phone")} label={t.phone} type="tel" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(e) => set({ phone: e.target.value })} onBlur={() => onBlur("phone")} error={errors.phone} hint={t.phoneHint} />

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
                {rich(t.acceptTerms, {
                  terms: <Link href={routes.legal.terms} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-2">{t.terms}</Link>,
                  privacy: <Link href={routes.legal.privacy} target="_blank" rel="noreferrer" className="font-semibold text-forest underline underline-offset-2">{t.privacy}</Link>,
                })}
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
            label={<>{t.newsletter} <span className="text-ink-soft">{t.newsletterOptional}</span></>}
          />
        )}
      </div>
    </div>
  );
}
