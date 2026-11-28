"use client";
import { useI18n, useLocalizedRouter } from "@/i18n/client";
import { useState } from "react";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isEmail } from "@/lib/order-payload";

export function TrackingForm({ initialOrderId = "" }: { initialOrderId?: string }) {
  const router = useLocalizedRouter();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ orderId?: string; email?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useI18n().m.checkout.tracking.form;

  const validate = () => {
    const e: typeof errors = {};
    const id = orderId.trim().toUpperCase();
    if (!/^(BQ-)?[A-Z0-9]{6}$/.test(id)) e.orderId = t.orderIdInvalid;
    if (!isEmail(email)) e.email = t.emailInvalid;
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setMessage(null);
    if (e.orderId) { document.getElementById("track-order-id")?.focus(); return; }
    if (e.email) { document.getElementById("track-email")?.focus(); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, email }) });
      const body = (await res.json()) as { ok: boolean; id?: string; token?: string; message?: string; errors?: Record<string, string> };
      if (!body.ok || !body.id || !body.token) {
        setErrors(body.errors ?? {});
        setMessage(body.message ?? t.notFound);
        return;
      }
      router.push(`/bestellung/${encodeURIComponent(body.id)}?token=${encodeURIComponent(body.token)}`);
    } catch {
      setMessage(t.unavailable);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-label={t.label}>
      <Input
        id="track-order-id" label={t.orderId} placeholder="BQ-XXXXXX" autoComplete="off" autoCapitalize="characters"
        value={orderId} onChange={(e) => setOrderId(e.target.value)} onBlur={() => setErrors((p) => ({ ...p, orderId: validate().orderId }))}
        error={errors.orderId} className="[&_input]:tracking-[0.08em] [&_input]:uppercase"
      />
      <Input
        id="track-email" label={t.email} type="email" inputMode="email" autoComplete="email"
        value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setErrors((p) => ({ ...p, email: validate().email }))}
        error={errors.email} hint={t.emailHint}
      />
      {message && <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{message}</p>}
      <Button type="submit" size="lg" loading={loading} iconRight={<ArrowRight className="size-4" aria-hidden />} className="sm:self-start sm:min-w-56">{t.submit}</Button>
    </form>
  );
}
