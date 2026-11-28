import Image from "next/image";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { getAllProducts } from "@/lib/cms";
import { formatDateTime } from "@/lib/format";
import { formatClipDuration } from "@/lib/review-video";
import { getReviewSubmissions, MAX_DAYS_AFTER_DELIVERY, MIN_DAYS_AFTER_DELIVERY, reviewPhotoAlt } from "@/lib/mail/review-requests";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/controls";
import { acceptSubmission, rejectSubmission } from "./actions";

export const dynamic = "force-dynamic";

export default async function SubmittedReviewsPage() {
  const [all, products] = await Promise.all([getReviewSubmissions(), getAllProducts(true)]);
  const submissions = all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const productName = (slug?: string) => (slug ? products.find((p) => p.slug === slug)?.name ?? slug : null);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bewertungen", label: "Bewertungen" }}
        title="Eingereichte Bewertungen"
        description={`${submissions.length} offen. „Übernehmen“ veröffentlicht die Bewertung in content/reviews.json (verifiziert, kein Demo) – mit den angehakten Fotos und dem angehakten Video; nicht angehakte Fotos und Videos werden gelöscht. Videos sind erst nach dem Übernehmen öffentlich abspielbar. Daten: data/review-submissions.json.`}
      />
      {submissions.length === 0 ? (
        <EmptyState>Keine offenen Bewertungen. Anfragen gehen {MIN_DAYS_AFTER_DELIVERY}–{MAX_DAYS_AFTER_DELIVERY} Tage nach Zustellung automatisch raus (/api/cron/review-requests) oder von Hand auf der Bestellseite.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><Th>Eingang</Th><Th>Bestellung</Th><Th>Name</Th><Th>Sterne</Th><Th>Text</Th><Th>Fotos / Video</Th><Th>Produkt</Th><Th className="text-right">Aktion</Th></tr>
          </thead>
          <tbody>
            {submissions.map((s) => {
              const formId = `accept-${s.id}`;
              const name = productName(s.productSlug);
              return (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDateTime(s.createdAt)}
                    {s.consent && <span className="mt-1 block text-[12px]" title={s.consent.text}>Einwilligung {formatDateTime(s.consent.at)}</span>}
                  </Td>
                  <Td><Link href={`/admin/bestellungen/${encodeURIComponent(s.orderId)}`} className="text-[#0a6644] underline-offset-4 hover:underline">{s.orderId}</Link></Td>
                  <Td className="whitespace-nowrap">{s.name}</Td>
                  <Td><StarRating value={s.rating} /></Td>
                  <Td className="min-w-[280px] max-w-xl whitespace-pre-line text-[13.5px] leading-relaxed">{s.text}</Td>
                  <Td className="min-w-[140px]">
                    {s.video && (
                      <fieldset className="mb-3">
                        <legend className="sr-only">Video von {s.name} veröffentlichen</legend>
                        <div className="flex flex-col items-start gap-1.5">
                          {/* Pending videos are only served to a logged-in admin (see /media route). */}
                          <video
                            controls
                            playsInline
                            preload="none"
                            poster={s.video.posterUrl}
                            src={s.video.url}
                            aria-label={`Video von ${s.name} (${formatClipDuration(s.video.duration)} min)`}
                            className="h-40 w-auto max-w-[240px] rounded-md border border-line bg-ink object-contain"
                            data-testid="pending-review-video"
                          />
                          <span className="text-[12px] text-ink-muted">Video, {formatClipDuration(s.video.duration)} min, {(s.video.bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB</span>
                          <label className="flex items-center gap-1.5 text-[12.5px] text-ink">
                            <input type="checkbox" form={formId} name="video" value={s.video.id} defaultChecked className="size-4 accent-forest" />
                            Video zeigen
                          </label>
                        </div>
                      </fieldset>
                    )}
                    {s.photos?.length ? (
                      <fieldset>
                        <legend className="sr-only">Fotos von {s.name} veröffentlichen</legend>
                        <ul className="flex flex-wrap gap-3">
                          {s.photos.map((p, i) => (
                            <li key={p.key} className="flex flex-col items-start gap-1.5">
                              <a href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-line" aria-label={`Foto ${i + 1} groß ansehen (neuer Tab)`}>
                                <Image src={p.url} alt={reviewPhotoAlt(name)} width={80} height={80} className="size-20 object-cover" unoptimized />
                              </a>
                              <label className="flex items-center gap-1.5 text-[12.5px] text-ink">
                                <input type="checkbox" form={formId} name="photo" value={p.key} defaultChecked className="size-4 accent-forest" />
                                Zeigen
                              </label>
                            </li>
                          ))}
                        </ul>
                      </fieldset>
                    ) : (
                      !s.video && <span className="text-ink-muted">–</span>
                    )}
                  </Td>
                  <Td className="text-ink-muted">{name ?? "–"}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <form id={formId} action={acceptSubmission}>
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
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
