"use client";
import { useState, useTransition } from "react";
import { sendTestMailsAction } from "@/app/admin/actions";
import { inputCls } from "@/components/admin/controls";

/**
 * Sends the three order mails of a sample order ("[Beispiel]") to one address:
 * the one typed in here, else the test/admin address. Never to customers or the
 * florist unless their address is entered on purpose.
 */
export function TestMailButton({ defaultRecipient = "" }: { defaultRecipient?: string }) {
  const [pending, start] = useTransition();
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"all" | "partner" | "customer" | "internal">("all");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setResult(null);
        start(async () => setResult(await sendTestMailsAction(to.trim() || undefined, kind)));
      }}
    >
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Schickt die Mails einer Beispielbestellung (Betreff „[Beispiel]“, keine echten Kundendaten) an eine Adresse deiner Wahl.
      </p>
      <label htmlFor="test-mail-kind" className="mt-3 block text-[13px] font-semibold text-ink">Welche Mail?</label>
      <select
        id="test-mail-kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        className={`${inputCls} mt-1.5`}
      >
        <option value="all">Alle (3 Mails)</option>
        <option value="partner">Partner – Auftrag an die Floristik</option>
        <option value="customer">Kundenbestellung – Bestätigung an Kund:in</option>
        <option value="internal">Bestelleingang – interne Mail an uns</option>
      </select>
      <label htmlFor="test-mail-to" className="mt-3 block text-[13px] font-semibold text-ink">
        Empfänger <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <input
        id="test-mail-to"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder={defaultRecipient || "name@beispiel.at"}
        aria-describedby="test-mail-to-hint"
        className={`${inputCls} mt-1.5`}
      />
      <p id="test-mail-to-hint" className="mt-1 text-[12px] text-ink-soft">
        {defaultRecipient ? `Leer lassen = an ${defaultRecipient}.` : "Leer lassen = an die Adresse aus MAIL_ADMIN."}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex h-10 items-center rounded-md bg-forest px-4 text-[14px] font-semibold text-ivory transition-colors hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Wird gesendet …" : "Test-Mails senden"}
      </button>
      {result && (
        <p role="status" className={`mt-3 text-[13px] ${result.ok ? "text-success" : "text-danger"}`}>{result.message}</p>
      )}
    </form>
  );
}
