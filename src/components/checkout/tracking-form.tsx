"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isEmail } from "@/lib/order-payload";

export function TrackingForm({ initialOrderId = "" }: { initialOrderId?: string }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ orderId?: string; email?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    const id = orderId.trim().toUpperCase();
    if (!/^(BQ-)?[A-Z0-9]{6}$/.test(id)) e.orderId = "Bitte gib deine Bestellnummer ein, z. B. BQ-7K2M9Q.";
    if (!isEmail(email)) e.email = "Bitte gib die E-Mail-Adresse ein, die du bei der Bestellung verwendet hast.";
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
        setMessage(body.message ?? "Wir konnten die Bestellung nicht finden.");
        return;
      }
      router.push(`/bestellung/${encodeURIComponent(body.id)}?token=${encodeURIComponent(body.token)}`);
    } catch {
      setMessage("Die Abfrage ist gerade nicht möglich. Bitte versuch es gleich noch einmal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" aria-label="Sendungsverfolgung">
      <Input
        id="track-order-id" label="Bestellnummer" placeholder="BQ-XXXXXX" autoComplete="off" autoCapitalize="characters"
        value={orderId} onChange={(e) => setOrderId(e.target.value)} onBlur={() => setErrors((p) => ({ ...p, orderId: validate().orderId }))}
        error={errors.orderId} className="[&_input]:tracking-[0.08em] [&_input]:uppercase"
      />
      <Input
        id="track-email" label="E-Mail-Adresse" type="email" inputMode="email" autoComplete="email"
        value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setErrors((p) => ({ ...p, email: validate().email }))}
        error={errors.email} hint="Die Adresse, die du bei der Bestellung angegeben hast."
      />
      {message && <p role="alert" className="rounded-md border border-danger/30 bg-rose-100/60 px-4 py-3 text-[14px] text-ink">{message}</p>}
      <Button type="submit" size="lg" loading={loading} iconRight={<ArrowRight className="size-4" aria-hidden />} className="sm:self-start sm:min-w-56">Status anzeigen</Button>
    </form>
  );
}
