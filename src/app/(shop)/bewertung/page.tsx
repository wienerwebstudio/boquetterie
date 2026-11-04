import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getOrderById } from "@/lib/cms";
import { formatDateLong } from "@/lib/format";
import { routes } from "@/lib/urls";
import { tokenMatches } from "@/lib/mail/reminders";
import { hasSubmittedReview } from "@/lib/mail/review-requests";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/content/page-header";
import { ReviewForm } from "@/components/reminders/review-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bewertung schreiben",
  robots: { index: false, follow: false },
};

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
  const sp = await searchParams;
  const orderId = typeof sp.order === "string" ? sp.order.trim().toUpperCase() : "";
  const token = typeof sp.token === "string" ? sp.token : "";
  const order = orderId ? await getOrderById(orderId) : null;

  if (!order || !tokenMatches(order.token, token)) {
    return <Notice title="Link nicht gültig" text="Der Link ist unvollständig oder nicht mehr gültig. Du findest ihn in unserer E-Mail „Wie war der Strauß?“." cta={{ label: "Zu den Sträußen", href: routes.shop }} />;
  }
  if (order.status !== "delivered") {
    return <Notice title="Noch ein wenig Geduld" text="Eine Bewertung ist möglich, sobald die Blumen zugestellt wurden." cta={{ label: "Bestellung ansehen", href: `/bestellung/${encodeURIComponent(order.id)}?token=${encodeURIComponent(order.token)}` }} />;
  }
  if (await hasSubmittedReview(order.id)) {
    return <Notice title="Danke, das haben wir schon." text="Für diese Bestellung wurde bereits eine Bewertung abgegeben. Wir lesen sie persönlich und geben sie dann frei." cta={{ label: "Zu den Sträußen", href: routes.shop }} />;
  }

  const first = order.lines[0];
  const defaultName = `${order.customer.firstName} ${order.customer.lastName.charAt(0)}.`.trim();

  return (
    <article>
      <PageHeader
        eyebrow={`Bestellung ${order.id}`}
        title="Wie war der Strauß?"
        intro={`${first ? `„${first.productName}“, ` : ""}zugestellt am ${formatDateLong(order.delivery.date)}. Zwei Minuten, die uns sehr helfen – und anderen bei der Wahl.`}
      />
      <div className="container-x py-14 sm:py-20 lg:py-24">
        <section aria-labelledby="review-heading" className="mx-auto max-w-2xl rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
          <p className="eyebrow mb-3">Deine Meinung</p>
          <h2 id="review-heading" className="display-3 text-ink">Ehrlich ist am besten</h2>
          <ReviewForm orderId={order.id} token={order.token} defaultName={defaultName} className="mt-8" />
        </section>
      </div>
    </article>
  );
}
