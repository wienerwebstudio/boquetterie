"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send, Trash2 } from "lucide-react";
import {
  addOutreachNoteAction, deleteOutreachContactAction, deleteOutreachNoteAction, setOutreachStatusAction, setOutreachUnsubscribedAction,
  type OutreachActionResult,
} from "@/app/admin/outreach/actions";
import { inputCls } from "@/components/admin/controls";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/outreach/format";
import { cn, viennaDateTime } from "@/lib/format";
import { OUTREACH_STATUSES, type OutreachNote, type OutreachStatus } from "@/types/outreach";
import { rememberSelection } from "./contacts-board";
import { btnDanger, btnOutline, btnPrimary } from "./bits";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<OutreachActionResult>, after?: (r: OutreachActionResult) => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message });
      if (after) after(r);
      else router.refresh();
    });
  return { pending, msg, run, router };
}

const Msg = ({ msg }: { msg: { ok: boolean; text: string } | null }) =>
  msg ? <p role="status" className={`mt-2 text-[13px] ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p> : null;

export function StatusPicker({ id, status }: { id: string; status: OutreachStatus }) {
  const { pending, msg, run } = useAction();
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Status setzen">
        {OUTREACH_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === status}
            aria-pressed={s === status}
            onClick={() => run(() => setOutreachStatusAction(id, s))}
            className={cn("rounded-full px-3 py-1 text-[13px] font-semibold transition-opacity", STATUS_TONES[s], s === status ? "ring-2 ring-forest/40" : "opacity-70 hover:opacity-100")}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <Msg msg={msg} />
    </div>
  );
}

export function NotesPanel({ id, notes }: { id: string; notes: OutreachNote[] }) {
  const { pending, msg, run } = useAction();
  const [text, setText] = useState("");
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addOutreachNoteAction(id, text), (r) => { if (r.ok) setText(""); });
        }}
      >
        <label htmlFor="note-text" className="sr-only">Neue Notiz</label>
        <textarea id="note-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Telefonat mit Frau Huber – meldet sich nächste Woche" className={`${inputCls} h-auto py-2`} />
        <button type="submit" disabled={pending || !text.trim()} className={`${btnPrimary} mt-2`}>Notiz speichern</button>
      </form>
      <Msg msg={msg} />
      <ul className="mt-4 space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border border-line bg-ivory-100/60 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold text-ink-muted">{viennaDateTime(new Date(n.at))}</p>
              <button type="button" onClick={() => { if (confirm("Notiz löschen?")) run(() => deleteOutreachNoteAction(id, n.id)); }} aria-label="Notiz löschen" className="rounded p-1 text-ink-soft hover:text-danger">
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
            <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-ink">{n.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContactDangerZone({ id, email, unsubscribed }: { id: string; email: string; unsubscribed: boolean }) {
  const { pending, msg, run, router } = useAction();
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={unsubscribed}
        className={cn(btnPrimary, "w-full")}
        onClick={() => { rememberSelection([id]); router.push("/admin/outreach/senden?auswahl=1"); }}
      >
        <Send className="size-4" aria-hidden /> Mail schreiben
      </button>
      <button
        type="button"
        disabled={pending}
        className={cn(btnOutline, "w-full")}
        onClick={() => {
          const q = unsubscribed ? "Abmeldung aufheben? Nur, wenn der Betrieb ausdrücklich wieder Mails möchte." : "Als abgemeldet markieren? Diese Adresse bekommt dann keine Outreach-Mails mehr.";
          if (confirm(q)) run(() => setOutreachUnsubscribedAction(email, !unsubscribed));
        }}
      >
        {unsubscribed ? "Abmeldung aufheben" : "Als abgemeldet markieren"}
      </button>
      <button
        type="button"
        disabled={pending}
        className={cn(btnDanger, "w-full")}
        onClick={() => {
          if (confirm("Kontakt mit Verlauf und Notizen löschen? Das lässt sich nicht rückgängig machen.")) {
            run(() => deleteOutreachContactAction(id), (r) => { if (r.ok) router.push("/admin/outreach"); });
          }
        }}
      >
        <Trash2 className="size-4" aria-hidden /> Kontakt löschen
      </button>
      <Msg msg={msg} />
    </div>
  );
}
