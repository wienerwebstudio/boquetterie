"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { processOutreachQueueAction } from "@/app/admin/outreach/actions";
import { btnOutline } from "./bits";

/** "Warteschlange jetzt abarbeiten" – sends due mails now (same as the 10-minute cron). */
export function ProcessQueueButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        className={btnOutline}
        onClick={() => start(async () => {
          try {
            const r = await processOutreachQueueAction();
            setMsg({ ok: !r.error && !r.failed, text: r.message });
            router.refresh();
          } catch {
            setMsg({ ok: false, text: "Das hat nicht geklappt – bitte neu laden." });
          }
        })}
      >
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden />
        {pending ? "Wird abgearbeitet …" : "Warteschlange jetzt abarbeiten"}
      </button>
      {msg && <p role="status" className={`text-[13px] ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
