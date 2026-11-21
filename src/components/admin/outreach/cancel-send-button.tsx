"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cancelOutreachSendsAction } from "@/app/admin/outreach/actions";

/** Takes queued mails out of the queue. */
export function CancelSendButton({ ids, label = "Abbrechen" }: { ids: string[]; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending || !ids.length}
      onClick={() => {
        if (!confirm(ids.length === 1 ? "Diese Mail aus der Warteschlange nehmen?" : `${ids.length} Mails aus der Warteschlange nehmen?`)) return;
        start(async () => {
          await cancelOutreachSendsAction(ids);
          router.refresh();
        });
      }}
      className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2.5 text-[12px] font-semibold text-danger hover:border-danger disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}
