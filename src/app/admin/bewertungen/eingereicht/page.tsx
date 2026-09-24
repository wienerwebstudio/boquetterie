import Link from "next/link";
import { Check, X } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { getReviewSubmissions } from "@/lib/mail/review-requests";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/controls";
import { acceptSubmission, rejectSubmission } from "./actions";

export const dynamic = "force-dynamic";

export default async function SubmittedReviewsPage() {
  const submissions = (await getReviewSubmissions()).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bewertungen", label: "Bewertungen" }}
        title="Eingereichte Bewertungen"
        description={`${submissions.length} offen. „Übernehmen“ veröffentlicht die Bewertung in content/reviews.json (verifiziert, kein Demo). Daten: data/review-submissions.json.`}
      />
      {submissions.length === 0 ? (
        <EmptyState>Keine offenen Bewertungen. Anfragen werden 2–30 Tage nach Zustellung über /api/cron/review-requests verschickt.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><Th>Eingang</Th><Th>Bestellung</Th><Th>Name</Th><Th>Sterne</Th><Th>Text</Th><Th>Produkt</Th><Th className="text-right">Aktion</Th></tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(s.createdAt)}</Td>
                <Td><Link href={`/admin/bestellungen/${encodeURIComponent(s.orderId)}`} className="text-forest underline-offset-4 hover:underline">{s.orderId}</Link></Td>
                <Td className="whitespace-nowrap">{s.name}</Td>
                <Td><StarRating value={s.rating} /></Td>
                <Td className="min-w-[280px] max-w-xl whitespace-pre-line text-[13.5px] leading-relaxed">{s.text}</Td>
                <Td className="text-ink-muted">{s.productSlug ?? "–"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <form action={acceptSubmission}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" size="sm" icon={<Check className="size-4" aria-hidden />}>Übernehmen</Button>
                    </form>
                    <form action={rejectSubmission}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" size="sm" variant="ghost" icon={<X className="size-4" aria-hidden />}>Verwerfen</Button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
