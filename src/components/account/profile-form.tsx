"use client";
import { useActionState } from "react";
import { Check } from "lucide-react";
import type { Customer, ProfileActionState } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = (state: ProfileActionState, formData: FormData) => Promise<ProfileActionState>;

export function ProfileForm({ customer, action }: { customer: Customer; action: Action }) {
  const [state, formAction, pending] = useActionState<ProfileActionState, FormData>(action, { ok: false });
  return (
    <form action={formAction} noValidate className="rounded-lg border border-line bg-white/60 p-6 sm:p-8" aria-label="Profil">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Vorname" name="firstName" autoComplete="given-name" defaultValue={customer.firstName ?? ""} error={state.errors?.firstName} maxLength={80} />
        <Input label="Nachname" name="lastName" autoComplete="family-name" defaultValue={customer.lastName ?? ""} error={state.errors?.lastName} maxLength={80} />
        <Input label="Telefon" name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={customer.phone ?? ""} error={state.errors?.phone} optional maxLength={30} hint="Für Rückfragen zur Lieferung." />
        <Input label="E-Mail-Adresse" value={customer.email} readOnly disabled hint="Deine E-Mail-Adresse ist dein Login und kann hier nicht geändert werden." />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" aria-live="polite" className={state.message ? (state.ok ? "inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-success" : "text-[13.5px] text-danger") : "text-[12.5px] text-ink-soft"}>
          {state.message ? (<>{state.ok && <Check className="size-4" aria-hidden />}{state.message}</>) : "Diese Angaben helfen uns bei Rückfragen – sonst nichts."}
        </p>
        <Button type="submit" loading={pending}>Profil speichern</Button>
      </div>
    </form>
  );
}
