import { NextResponse } from "next/server";
import { getSettings, getSubscription } from "@/lib/cms";
import { resolveSiteUrl, stripeConfigured } from "@/lib/payments";
import { createSubscriptionCheckout } from "@/lib/payments/stripe";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Frequency ids from content/subscription.json → Stripe recurring intervals. */
const INTERVALS: Record<string, { interval: "week" | "month"; intervalCount: number }> = {
  weekly: { interval: "week", intervalCount: 1 },
  biweekly: { interval: "week", intervalCount: 2 },
  monthly: { interval: "month", intervalCount: 1 },
};

/**
 * POST /api/payments/stripe/subscription { planId, frequencyId }
 * Creates a Stripe Checkout Session (mode `subscription`) with an inline price:
 * plan price minus frequency discount, billed per delivery interval.
 * Returns `{ url }` – the browser redirects there.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "subscription-checkout", limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!stripeConfigured()) return NextResponse.json({ ok: false, message: "Online-Abschluss ist derzeit nicht verfügbar." }, { status: 404 });

  const [settings, config] = await Promise.all([getSettings(), getSubscription()]);
  if (!settings.subscriptionEnabled || !config.enabled) {
    return NextResponse.json({ ok: false, message: "Das Blumen-Abo ist derzeit nicht verfügbar." }, { status: 404 });
  }

  let body: { planId?: unknown; frequencyId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  const plan = config.plans.find((p) => p.id === body.planId);
  const frequency = config.frequencies.find((f) => f.id === body.frequencyId);
  if (!plan) return NextResponse.json({ ok: false, message: "Bitte wähle ein Abo." }, { status: 400 });
  if (!frequency) return NextResponse.json({ ok: false, message: "Bitte wähle einen Rhythmus." }, { status: 400 });
  const recurring = INTERVALS[frequency.id];
  if (!recurring) return NextResponse.json({ ok: false, message: "Dieser Rhythmus kann online nicht abgeschlossen werden." }, { status: 400 });

  const unitAmount = Math.round(plan.price * (1 - frequency.discount / 100) * 100) / 100;
  try {
    const session = await createSubscriptionCheckout({
      planName: plan.name,
      planDescription: `${plan.stems} · ${frequency.label}`,
      unitAmount,
      interval: recurring.interval,
      intervalCount: recurring.intervalCount,
      siteUrl: resolveSiteUrl(req, settings),
      metadata: { planId: plan.id, frequencyId: frequency.id },
    });
    if (!session.url) throw new Error("Stripe returned no checkout url");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("[payments] subscription checkout failed", err);
    return NextResponse.json({ ok: false, message: "Der Abo-Abschluss ist gerade nicht möglich. Bitte versuch es später noch einmal." }, { status: 502 });
  }
}
