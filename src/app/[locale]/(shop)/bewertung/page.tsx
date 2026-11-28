import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getOrderById } from "@/lib/content";
import { routes } from "@/lib/urls";
import { tokenMatches } from "@/lib/mail/reminders";
import { hasSubmittedReview } from "@/lib/mail/review-requests";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/content/page-header";
import { ReviewForm } from "@/components/reminders/review-form";
import { getI18n } from "@/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.reminders.review.metaTitle,
    robots: { index: false, follow: false },
  };
}

function Notice({ title, text, cta }: { title: string; text: string; cta?: { label: string; href: string } }) {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-ivory-200 text-forest"><Search className="size-6" strokeWidth={1.5} aria-hidden /></span>
        <h1 className="display-2 text-ink">{title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{text}</p>
        {cta && <Button href={cta.href} size="lg" className="mt-8">{cta.label}</Button>}
      </div>
    </div>
  );
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, { m, fmt, dateLong }] = await Promise.all([searchParams, getI18n()]);
  const t = m.reminders.review;
  const orderId = typeof sp.order === "string" ? sp.order.trim().toUpperCase() : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const order = orderId ? await getOrderById(orderId) : null;

  if (!order || !tokenMatches(order.token, token)) {
    return <Notice title={t.invalidTitle} text={t.invalidText} cta={{ label: t.toBouquets, href: routes.shop }} />;
  }
  if (order.status !== "delivered") {
    return <Notice title={t.notDeliveredTitle} text={t.notDeliveredText} cta={{ label: t.viewOrder, href: `/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}` }} />;
  }
  if (await hasSubmittedReview(order.id)) {
    return <Notice title={t.doneTitle} text={t.doneText} cta={{ label: t.toBouquets, href: routes.shop }} />;
  }

  const first = order.lines[0];
  const defaultName = `${order.customer.firstName} ${order.customer.lastName.charAt(0)}.`.trim();

  return (
    <article>
      <PageHeader
        eyebrow={fmt(t.eyebrow, { id: order.id })}
        title={t.title}
        intro={fmt(t.intro, { product: first ? fmt(t.productPrefix, { name: first.productName }) : "", date: dateLong(order.delivery.date) })}
      />
      <div className="container-x py-14 sm:py-20 lg:py-24">
        <section aria-labelledby="review-heading" className="mx-auto max-w-2xl rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
          <p className="eyebrow mb-3">{t.sectionEyebrow}</p>
          <h2 id="review-heading" className="display-3 text-ink">{t.sectionTitle}</h2>
          <ReviewForm orderId={order.id} token={order.token} defaultName={defaultName} askFoundVia={!order.foundVia} className="mt-8" />
        </section>
      </div>
    </article>
  );
}
