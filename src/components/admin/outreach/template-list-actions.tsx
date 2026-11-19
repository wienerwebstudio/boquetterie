"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";
import { deleteOutreachTemplateAction, duplicateOutreachTemplateAction } from "@/app/admin/outreach/actions";

/** Duplicate / delete buttons of one template card. */
export function TemplateListActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const cls = "inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold transition-colors hover:border-forest disabled:opacity-60";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={`${cls} text-ink`}
        onClick={() => start(async () => {
          const r = await duplicateOutreachTemplateAction(id);
          if (r.ok && r.id) router.push(`/admin/outreach/vorlagen/${r.id}`);
          else setError(r.message);
        })}
      >
        <Copy className="size-3.5" aria-hidden /> Duplizieren
      </button>
      <button
        type="button"
        disabled={pending}
        className={`${cls} text-danger`}
        onClick={() => {
          if (!confirm(`Vorlage „${name}“ löschen? Geplante Mails mit dieser Vorlage werden dann nicht gesendet.`)) return;
          start(async () => {
            const r = await deleteOutreachTemplateAction(id);
            if (r.ok) router.refresh();
            else setError(r.message);
          });
        }}
      >
        <Trash2 className="size-3.5" aria-hidden /> Löschen
      </button>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
