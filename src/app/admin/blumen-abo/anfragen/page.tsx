import { formatDateTime } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/admin/controls";
import { getSubscriptionRequests } from "@/components/admin/subscription-requests";

export const dynamic = "force-dynamic";

const HIDDEN = new Set(["createdAt"]);

function cell(v: unknown) {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default async function SubscriptionRequestsPage() {
  const requests = await getSubscriptionRequests();
  const sorted = (requests ?? []).slice().sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const keys = Array.from(new Set(sorted.flatMap((r) => Object.keys(r)))).filter((k) => !HIDDEN.has(k));

  return (
    <>
      <PageHeader back={{ href: "/admin/blumen-abo", label: "Blumen-Abo" }} title="Abo-Anfragen" description="Anfragen über das Formular der Abo-Seite. Daten: data/subscription-requests.json." />
      {requests === null ? (
        <EmptyState>Es liegen noch keine Anfragen vor (die Datei data/subscription-requests.json existiert noch nicht).</EmptyState>
      ) : sorted.length === 0 ? (
        <EmptyState>Noch keine Anfragen.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Eingang</Th>
              {keys.map((k) => <Th key={k}>{k}</Th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i}>
                <Td className="whitespace-nowrap text-ink-muted">{r.createdAt ? formatDateTime(String(r.createdAt)) : "–"}</Td>
                {keys.map((k) => <Td key={k}>{cell(r[k])}</Td>)}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
