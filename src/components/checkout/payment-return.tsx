"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/urls";
import type { PaymentConfirmResponse } from "@/types/payments";

/**
 * Landing spot for redirect-based Stripe methods (EPS, Klarna, 3-D Secure).
 * Stripe appends `payment_intent`, `payment_intent_client_secret` and
 * `redirect_status`; we only forward orderId + token to the server, which
 * re-reads the intent and marks the order paid. Then on to the status page.
 */
export function PaymentReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const [confirmFailed, setConfirmFailed] = useState<string | null>(null);

  const orderId = params.get("orderId") ?? "";
  const token = params.get("token") ?? "";
  const redirectStatus = params.get("redirect_status");
  const incomplete = !orderId || !token;
  const failed = incomplete ? "Der Rückkehr-Link ist unvollständig." : confirmFailed;

  useEffect(() => {
    if (incomplete) return;
    let alive = true;
    const statusUrl = `/bestellung/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}&neu=1`;
    fetch("/api/payments/stripe/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, token }),
    })
      .then((r) => r.json() as Promise<PaymentConfirmResponse>)
      .then((body) => {
        if (!alive) return;
        if (body.status === "failed" || (redirectStatus === "failed" && body.status !== "paid")) {
          setConfirmFailed(body.message ?? "Die Zahlung wurde nicht abgeschlossen. Du kannst es im Checkout noch einmal versuchen.");
          return;
        }
        router.replace(statusUrl);
      })
      .catch(() => { if (alive) router.replace(statusUrl); });
    return () => { alive = false; };
  }, [incomplete, orderId, token, redirectStatus, router]);

  if (failed) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-rose-100 text-burgundy"><CircleAlert className="size-6" strokeWidth={1.5} aria-hidden /></span>
        <h1 className="display-3 text-ink">Zahlung nicht abgeschlossen</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{failed}</p>
        <Button href={`${routes.checkout}?cancelled=1`} size="lg" className="mt-8">Zurück zur Kasse</Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md py-16 text-center" role="status" aria-live="polite">
      <Loader2 className="mx-auto mb-5 size-8 animate-spin text-forest" aria-hidden />
      <h1 className="display-3 text-ink">Zahlung wird bestätigt …</h1>
      <p className="mt-3 text-[15px] text-ink-muted">Einen Moment, wir prüfen die Zahlung und leiten dich zu deiner Bestellung weiter.</p>
    </div>
  );
}
