"use client";
import { useActionState } from "react";
import { Check } from "lucide-react";
import type { Customer, ProfileActionState } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";

type Action = (state: ProfileActionState, formData: FormData) => Promise<ProfileActionState>;

export function ProfileForm({ customer, action }: { customer: Customer; action: Action }) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(action, { ok: false });
  const { m, locale } = useI18n();
  const t = m.account.profile;
  return (
    <form action={formAction} noValidate className="rounded-lg border border-line bg-white/60 p-6 sm:p-8" aria-label={t.label}>
      {/* Language of the messages the server action returns. */}
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label={t.firstName} name="firstName" autoComplete="given-name" defaultValue={customer.firstName ?? ""} error={state.errors?.firstName} maxLength={80} />
        <Input label={t.lastName} name="lastName" autoComplete="family-name" defaultValue={customer.lastName ?? ""} error={state.errors?.lastName} maxLength={80} />
        <Input label={t.phone} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={customer.phone ?? ""} error={state.errors?.phone} optional maxLength={30} hint={t.phoneHint} />
        <Input label={t.email} value={customer.email} readOnly disabled hint={t.emailHint} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" aria-live="polite" className={state.message ? (state.ok ? "inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-success" : "text-[13.5px] text-danger") : "text-[12.5px] text-ink-soft"}>
          {state.message ? (<>{state.ok && <Check className="size-4" aria-hidden />}{state.message}</>) : t.note}
        </p>
        <Button type="submit" loading={pending}>{t.save}</Button>
      </div>
    </form>
  );
}
