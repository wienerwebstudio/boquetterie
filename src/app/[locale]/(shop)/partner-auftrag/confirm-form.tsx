"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmPartnerOrder, type ConfirmState } from "./actions";

export function ConfirmForm({ orderId, token }: { orderId: string; token: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmPartnerOrder, null);
  if (state?.ok) {
    return <p role="status" className="rounded-md bg-ivory-100 px-4 py-3 text-[15px] text-forest">{state.message}</p>;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="order" value={orderId} />
      <input type="hidden" name="token" value={token} />
      {state && <p role="alert" className="text-[14px] text-burgundy">{state.message}</p>}
      <Button type="submit" size="lg" loading={pending} icon={<Check className="size-4" aria-hidden />}>Auftrag bestätigen</Button>
    </form>
  );
}
