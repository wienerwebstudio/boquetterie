import Link from "next/link";
import { Paperclip, Plus, Video, ImageIcon } from "lucide-react";
import { getOutreachTemplates } from "@/lib/cms";
import { TEMPLATE_CATEGORY_LABELS } from "@/lib/outreach/format";
import { EmptyState, PageHeader } from "@/components/admin/controls";
import { OutreachNav, btnPrimary } from "@/components/admin/outreach/bits";
import { TemplateListActions } from "@/components/admin/outreach/template-list-actions";

export const dynamic = "force-dynamic";

export default async function OutreachTemplatesPage() {
  const templates = (await getOutreachTemplates()).slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
  return (
    <>
      <PageHeader
        title="Vorlagen"
        description="Texte für die persönlichen Mails. Platzhalter wie {Anrede} oder {Firma} werden pro Kontakt ersetzt. Die Startvorlagen sind Vorschläge – bitte vor dem ersten Versand lesen und anpassen."
        actions={<Link href="/admin/outreach/vorlagen/neu" className={btnPrimary}><Plus className="size-4" aria-hidden /> Neue Vorlage</Link>}
      />
      <OutreachNav active="/admin/outreach/vorlagen" />
      {templates.length === 0 ? (
        <EmptyState>Keine Vorlagen. <Link href="/admin/outreach/vorlagen/neu" className="font-semibold text-forest">Neue Vorlage anlegen</Link></EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-col rounded-lg border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                <span className="rounded-full bg-ivory-200 px-2.5 py-0.5 text-ink-muted">{TEMPLATE_CATEGORY_LABELS[t.category] ?? t.category}</span>
                <span className="rounded-full bg-[#e8eef7] px-2.5 py-0.5 uppercase text-[#2d4a7a]">{t.language}</span>
                {t.attachments.length > 0 && <span className="inline-flex items-center gap-1 text-ink-muted"><Paperclip className="size-3.5" aria-hidden />{t.attachments.length}</span>}
                {t.video && <span className="inline-flex items-center gap-1 text-ink-muted"><Video className="size-3.5" aria-hidden />Video</span>}
                {t.headerImage && <span className="inline-flex items-center gap-1 text-ink-muted"><ImageIcon className="size-3.5" aria-hidden />Kopfbild</span>}
              </div>
              <Link href={`/admin/outreach/vorlagen/${t.id}`} className="mt-3 text-[16px] font-semibold text-ink underline-offset-4 hover:text-forest hover:underline">{t.name}</Link>
              <p className="mt-1 text-[13px] text-ink-muted">{t.subject}</p>
              <p className="mt-3 line-clamp-3 flex-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{t.body.replace(/\*\*/g, "")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/admin/outreach/vorlagen/${t.id}`} className="inline-flex h-9 items-center rounded-md bg-forest px-3 text-[13px] font-semibold text-ivory hover:bg-forest-700">Bearbeiten</Link>
                <TemplateListActions id={t.id} name={t.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
