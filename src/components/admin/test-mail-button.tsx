"use client";
import { useState, useTransition } from "react";
import { sendTestMailsAction } from "@/app/admin/actions";

/** Sends the three order mails for a fictitious order to the test/admin address. */
export function TestMailButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Schickt Bestellbestätigung, interne Mail und Auftragszettel einer Beispielbestellung an die Testadresse – nicht an Kund:innen oder die Floristik.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await sendTestMailsAction()))}
        className="mt-3 inline-flex h-10 items-center rounded-md bg-forest px-4 text-[14px] font-semibold text-ivory transition-colors hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Wird gesendet …" : "Test-Mails senden"}
      </button>
      {result && (
        <p role="status" className={`mt-3 text-[13px] ${result.ok ? "text-success" : "text-danger"}`}>{result.message}</p>
      )}
    </div>
  );
}
