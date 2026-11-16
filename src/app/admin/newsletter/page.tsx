import { Download } from "lucide-react";
import { getNewsletterSubscribers } from "@/lib/cms";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/controls";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const subscribers = (await getNewsletterSubscribers()).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const confirmed = subscribers.filter((s) => s.status === "confirmed").length;
  return (
    <>
      <PageHeader
        title="Newsletter"
        description={`${confirmed} bestätigt, ${subscribers.length - confirmed} offen. Newsletter nur an bestätigte Adressen senden (Double-Opt-in) – der CSV-Export enthält nur diese.`}
        actions={<Button href="/api/admin/newsletter.csv" size="sm" variant="outline" icon={<Download className="size-4" aria-hidden />}>CSV exportieren</Button>}
      />
      {subscribers.length === 0 ? (
        <EmptyState>Noch keine Anmeldungen.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr><Th>E-Mail</Th><Th>Status</Th><Th>Quelle</Th><Th>Angemeldet am</Th><Th>Bestätigt am</Th></tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.email}>
                <Td><a href={`mailto:${s.email}`} className="text-forest underline-offset-4 hover:underline">{s.email}</a></Td>
                <Td className="whitespace-nowrap">{s.status === "confirmed" ? "bestätigt" : s.status === "pending" ? "wartet auf Bestätigung" : "alt – nicht bestätigt"}</Td>
                <Td className="text-ink-muted">{s.source === "checkout" ? "Kasse" : s.source === "website" ? "Website" : "–"}</Td>
                <Td className="whitespace-nowrap text-ink-muted">{formatDateTime(s.createdAt)}</Td>
                <Td className="whitespace-nowrap text-ink-muted">{s.confirmedAt ? formatDateTime(s.confirmedAt) : "–"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
