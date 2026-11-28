import { Banner } from "@/components/admin/controls";
import { ProcessQueueButton } from "./queue-button";

export interface QueueStats {
  queued: number;
  due: number;
  followUps: number;
  sentToday: number;
  limit: number;
  provider: "resend" | "smtp" | "console";
  secretOk: boolean;
}

/** Queue overview with the manual "process now" button. */
export function QueueCard({ stats }: { stats: QueueStats }) {
  const items = [
    { label: "Heute gesendet", value: `${stats.sentToday} / ${stats.limit}`, hint: "Tageslimit (OUTREACH_DAILY_LIMIT)" },
    { label: "In der Warteschlange", value: String(stats.queued), hint: stats.due ? `${stats.due} davon fällig` : "nichts fällig" },
    { label: "Geplantes Nachfassen", value: String(stats.followUps), hint: "nur wenn Status „Angeschrieben“" },
  ];
  return (
    <div className="mb-6 space-y-3">
      {!stats.secretOk && (
        <Banner tone="error">ADMIN_SECRET oder AUTH_SECRET (mind. 16 Zeichen) fehlt – ohne ihn gibt es keinen Abmeldelink, daher werden keine Outreach-Mails gesendet.</Banner>
      )}
      {stats.provider === "console" && (
        <Banner tone="warn">Kein Mailversand eingerichtet (RESEND_API_KEY oder SMTP_HOST fehlt): Mails werden nur ins Server-Log geschrieben und als „gesendet (nur Log)“ markiert.</Banner>
      )}
      <div className="flex flex-wrap items-stretch gap-3 rounded-lg border border-line bg-white p-4">
        {items.map((i) => (
          <div key={i.label} className="min-w-[150px] flex-1 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{i.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{i.value}</p>
            <p className="text-[12px] text-ink-soft">{i.hint}</p>
          </div>
        ))}
        <div className="flex items-center px-2"><ProcessQueueButton /></div>
      </div>
    </div>
  );
}
