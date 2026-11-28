"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, BadgeCheck, Copy, ExternalLink, Mail, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner, Field, inputCls } from "@/components/admin/controls";
import { cancelOfferAction, markOfferPaidAction, sendOfferAction, shareOfferLinkAction, testSendOfferAction, type OfferActionResult } from "@/app/admin/angebote/actions";

/** Send / re-send, copy the link (WhatsApp), test mail, edit, cancel – for one offer. */
export function OfferActions({ id, url, sent, live, editable, cancellable, customerEmail }: {
  id: string;
  url: string;
  sent: boolean;
  /** The public page works (sent or link shared). */
  live: boolean;
  editable: boolean;
  cancellable: boolean;
  customerEmail: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<OfferActionResult | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidMethod, setPaidMethod] = useState("card");
  const [paidRef, setPaidRef] = useState("");
  const [paidNote, setPaidNote] = useState("");
  const [orderHref, setOrderHref] = useState<string | null>(null);

  const run = (fn: () => Promise<OfferActionResult>, after?: (r: OfferActionResult) => void | Promise<void>) => {
    setResult(null);
    start(async () => {
      const r = await fn();
      setResult(r);
      if (after) await after(r);
      router.refresh();
    });
  };

  const copy = () => run(() => shareOfferLinkAction(id), async (r) => {
    if (!r.ok || !r.url) return;
    setLink(r.url);
    try {
      await navigator.clipboard.writeText(r.url);
      setResult({ ok: true, message: "Link in die Zwischenablage kopiert – z. B. in WhatsApp einfügen." });
    } catch {
      setResult({ ok: true, message: "Link unten markieren und kopieren." });
    }
  });

  return (
    <div className="space-y-4">
      {result && (
        <Banner tone={result.ok ? "success" : "error"}>
          {result.message}
          {orderHref && result.ok && <> <a href={orderHref} className="font-semibold underline underline-offset-4">Zur Bestellung</a></>}
        </Banner>
      )}
      {editable && (
        <div className="flex flex-col gap-2">
          <Button type="button" loading={pending} icon={<Send className="size-4" aria-hidden />}
            onClick={() => { if (!sent || confirm(`Angebot noch einmal an ${customerEmail} senden?`)) run(() => sendOfferAction(id)); }}>
            {sent ? "Erneut senden" : `An ${customerEmail} senden`}
          </Button>
          <Button type="button" variant="outline" disabled={pending} icon={<Copy className="size-4" aria-hidden />} onClick={copy}>Link kopieren</Button>
          {link && <input readOnly value={link} aria-label="Link zum Angebot" className={`${inputCls} text-[12.5px]`} onFocus={(e) => e.currentTarget.select()} />}
          <div className="flex gap-2">
            <Button href={`/admin/angebote/${id}/bearbeiten`} variant="ghost" size="sm" icon={<Pencil className="size-4" aria-hidden />}>Bearbeiten</Button>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold text-forest hover:bg-ivory-200"><ExternalLink className="size-4" aria-hidden /> {live ? "Seite ansehen" : "Vorschau ansehen"}</a>
          </div>
        </div>
      )}
      <form className="space-y-2 border-t border-[#efebe4] pt-4" onSubmit={(e) => { e.preventDefault(); run(() => testSendOfferAction(id, testTo)); }}>
        <Field label="Test-Mail an" htmlFor="offer-test-to" hint="Schickt die Kundenmail mit „[Test]“ an diese Adresse – am Angebot ändert sich nichts.">
          <input id="offer-test-to" type="email" required value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="name@beispiel.at" className={inputCls} />
        </Field>
        <Button type="submit" size="sm" variant="outline" disabled={pending || !testTo.trim()} icon={<Mail className="size-4" aria-hidden />}>Test-Mail senden</Button>
      </form>
      {cancellable && (
        <div className="border-t border-[#efebe4] pt-4">
          {!paidOpen ? (
            <Button type="button" size="sm" variant="outline" disabled={pending} icon={<BadgeCheck className="size-4" aria-hidden />} onClick={() => setPaidOpen(true)}>
              Extern bezahlt – als bezahlt markieren
            </Button>
          ) : (
            <form className="space-y-2" onSubmit={(e) => {
              e.preventDefault();
              if (!confirm("Wirklich als bezahlt markieren? Die Bestellung wird angelegt und die Bestätigungsmails gehen raus.")) return;
              run(() => markOfferPaidAction(id, { method: paidMethod, reference: paidRef, note: paidNote }), (r) => { if (r.ok && r.url) { setOrderHref(r.url); setPaidOpen(false); } });
            }}>
              <p className="text-[13px] text-[#5f5c56]">Wenn die Kund:in außerhalb des Shops bezahlt hat (z. B. Stripe-Zahlungslink). Vorher im Stripe-Dashboard prüfen, dass das Geld da ist.</p>
              <Field label="Zahlart" htmlFor="offer-paid-method">
                <select id="offer-paid-method" value={paidMethod} onChange={(e) => setPaidMethod(e.target.value)} className={inputCls}>
                  <option value="card">Kreditkarte</option><option value="apple_pay">Apple Pay</option><option value="google_pay">Google Pay</option>
                  <option value="paypal">PayPal</option><option value="klarna">Klarna</option><option value="eps">EPS</option>
                </select>
              </Field>
              <Field label="Zahlungs-ID (optional)" htmlFor="offer-paid-ref" hint="z. B. pi_… oder ch_… aus Stripe">
                <input id="offer-paid-ref" value={paidRef} onChange={(e) => setPaidRef(e.target.value)} maxLength={120} className={inputCls} />
              </Field>
              <Field label="Notiz (optional)" htmlFor="offer-paid-note">
                <input id="offer-paid-note" value={paidNote} onChange={(e) => setPaidNote(e.target.value)} maxLength={200} placeholder="Stripe-Zahlungslink" className={inputCls} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={pending} icon={<BadgeCheck className="size-4" aria-hidden />}>Als bezahlt markieren</Button>
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setPaidOpen(false)}>Abbrechen</Button>
              </div>
            </form>
          )}
        </div>
      )}
      {cancellable && (
        <div className="border-t border-[#efebe4] pt-4">
          <Button type="button" size="sm" variant="ghost" disabled={pending} className="text-[#b42318]" icon={<Ban className="size-4" aria-hidden />}
            onClick={() => { if (confirm("Angebot stornieren? Der Link kann dann nicht mehr bezahlt werden.")) run(() => cancelOfferAction(id)); }}>
            Angebot stornieren
          </Button>
        </div>
      )}
    </div>
  );
}
