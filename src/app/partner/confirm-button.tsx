"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { confirmFromPortal, type PortalConfirmState } from "./actions";

export function ConfirmButton({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<PortalConfirmState, FormData>(confirmFromPortal, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="order" value={orderId} />
      <button
        type="submit" disabled={pending || state?.ok}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-forest px-6 text-[16px] font-semibold text-ivory transition-colors hover:bg-forest-700 disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
        {state?.ok ? "Bestätigt" : `Bestätigen`}
        <span className="sr-only"> – Auftrag {orderId}</span>
      </button>
      <div aria-live="polite">{state && !state.ok && <p className="text-[14px] font-medium text-burgundy">{state.message}</p>}</div>
    </form>
  );
}
