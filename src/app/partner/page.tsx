import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CalendarDays, CheckCircle2, Clock, Flower2, LogOut, MapPin, MessageSquareQuote, Truck } from "lucide-react";
import { formatDateShort, formatPrice } from "@/lib/format";
import { getPartnerSession } from "@/lib/partner-auth";
import { loadPartnerLedger } from "@/lib/partner-portal";
import { monthLabel, toPartnerView, type PartnerOrderView } from "@/lib/partner-ledger";
import { PartnerLoginForm } from "./login-form";
import { ConfirmButton } from "./confirm-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Partner-Portal" };

function Shell({ children, partnerName }: { children: ReactNode; partnerName?: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <p className="font-serif text-[26px] leading-none tracking-[0.02em] text-forest">Blumora</p>
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Partner-Portal{partnerName && <span className="block normal-case tracking-normal text-[13px] text-ink">{partnerName}</span>}</p>
        </div>
        {partnerName && (
          <form action="/api/partner/logout" method="post">
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-forest hover:border-forest/50">
              <LogOut className="size-4" aria-hidden />Abmelden
            </button>
          </form>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}

const timeFmt = new Intl.DateTimeFormat("de-AT", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" });

function bouquetSummary(v: PartnerOrderView) {
  return v.lines.map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${l.name}`).join(", ");
}

function UpcomingCard({ v }: { v: PartnerOrderView }) {
  return (
    <article className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" aria-label={`Auftrag ${v.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[17px] font-semibold text-ink"><CalendarDays className="size-4 text-forest" aria-hidden />{formatDateShort(v.deliveryDate)}</p>
          {v.windowLabel && <p className="mt-0.5 flex items-center gap-2 text-[14px] text-ink-muted"><Clock className="size-4" aria-hidden />Lieferfenster {v.windowLabel}</p>}
          {v.pickupAt && <p className="mt-0.5 flex items-center gap-2 text-[14px] text-ink-muted"><Truck className="size-4" aria-hidden />Abholung Kurier {timeFmt.format(new Date(v.pickupAt))} Uhr</p>}
        </div>
        <p className="text-[12px] font-semibold tracking-[0.08em] text-ink-soft">{v.id}</p>
      </div>

      {v.teamNote && (
        <p className="mt-4 whitespace-pre-line border-l-4 border-burgundy bg-rose-100 px-4 py-3 text-[15px] font-bold leading-snug text-burgundy">{v.teamNote}</p>
      )}

      <ul className="mt-4 space-y-3">
        {v.lines.map((l, i) => (
          <li key={i} className="text-[15px] leading-relaxed text-ink">
            <p className="flex items-start gap-2 font-semibold"><Flower2 className="mt-1 size-4 shrink-0 text-forest" aria-hidden /><span>{l.quantity > 1 ? `${l.quantity} × ` : ""}{l.name}</span></p>
            <p className="pl-6 text-[14px] text-ink-muted">Größe {l.size}{l.color ? ` · Farbe ${l.color}` : ""}</p>
            {l.description && <p className="pl-6 text-[14px] text-ink"><span className="font-semibold">Beschreibung:</span> {l.description}</p>}
            {l.extras.length > 0 && <p className="pl-6 text-[14px] text-ink">+ {l.extras.map((e) => `${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name}`).join(", ")}</p>}
            {l.floristNote && <p className="ml-6 mt-1 border-l-2 border-forest bg-ivory px-3 py-2 text-[14px]"><span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Wunsch der Kund:in</span>{l.floristNote}</p>}
          </li>
        ))}
      </ul>

      {v.card && (
        <div className="mt-4 rounded-md bg-ivory px-4 py-3 text-[14px] leading-relaxed">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted"><MessageSquareQuote className="size-3.5" aria-hidden />Grußkarte</p>
          <p className="mt-1 whitespace-pre-line text-ink">{v.card.text || "(ohne Text)"}</p>
          <p className="mt-1 text-ink-muted">{v.card.anonymous ? "Absender: anonym – keinen Namen auf die Karte" : v.card.sender ? `Absender: ${v.card.sender}` : ""}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[14px]">
        <p className="flex items-center gap-1.5 text-ink-muted"><MapPin className="size-4" aria-hidden />Für {v.recipient.firstName} · {v.recipient.zip}{v.recipient.area ? ` (${v.recipient.area})` : ""}</p>
        <p className="font-semibold text-ink">Betrag netto {formatPrice(v.amount)}</p>
      </div>

      <div className="mt-4">
        {v.confirmed ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-sage px-3 py-1.5 text-[14px] font-semibold text-sage-700"><CheckCircle2 className="size-4" aria-hidden />Bestätigt</p>
        ) : v.canConfirm ? (
          <ConfirmButton orderId={v.id} />
        ) : null}
      </div>
    </article>
  );
}

function Badge({ paid }: { paid: boolean }) {
  return paid
    ? <span className="rounded-full bg-sage px-2.5 py-0.5 text-[12px] font-semibold text-sage-700">bezahlt</span>
    : <span className="rounded-full bg-peach px-2.5 py-0.5 text-[12px] font-semibold text-peach-700">offen</span>;
}

export default async function PartnerPortalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [session, sp] = await Promise.all([getPartnerSession(), searchParams]);

  if (!session) {
    return (
      <Shell>
        <p className="eyebrow mb-3">Für Partner-Floristiken</p>
        <h1 className="display-2 text-ink">Anmelden</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">Gib die E-Mail-Adresse ein, die Blumora für euch freigeschaltet hat. Wir schicken dir einen Login-Link – ohne Passwort.</p>
        {sp.link === "ungueltig" && <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-rose-100 px-4 py-3 text-[14px] text-burgundy">Der Link ist abgelaufen oder wurde schon verwendet. Bitte fordere einen neuen an.</p>}
        {sp.abgemeldet && <p role="status" className="mt-5 rounded-md border border-line bg-white px-4 py-3 text-[14px] text-ink">Du bist abgemeldet.</p>}
        <div className="mt-8 max-w-md"><PartnerLoginForm /></div>
      </Shell>
    );
  }

  const { partner } = session;
  const ledger = await loadPartnerLedger(partner.id);
  const upcoming = ledger.upcoming.map((i) => toPartnerView(i, partner.id));
  const year = new Date().getFullYear();

  return (
    <Shell partnerName={partner.name}>
      <section aria-labelledby="offen-h" className="rounded-2xl bg-forest px-6 py-7 text-ivory">
        <p id="offen-h" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-ivory/75">Offen</p>
        <p className="mt-2 font-serif text-[52px] leading-none tracking-[-0.01em] tabular-nums" data-testid="partner-open">{formatPrice(ledger.open)}</p>
        <p className="mt-3 text-[14px] text-ivory/85">{ledger.owed.length} {ledger.owed.length === 1 ? "Auftrag" : "Aufträge"} · bisher bezahlt: {formatPrice(ledger.paymentsTotal)}</p>
      </section>

      <section aria-labelledby="anstehend-h" className="mt-10">
        <h2 id="anstehend-h" className="display-3 text-ink">Anstehend</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-[15px] text-ink-muted">Gerade keine offenen Aufträge.</p>
        ) : (
          <div className="mt-4 space-y-4">{upcoming.map((v) => <UpcomingCard key={v.id} v={v} />)}</div>
        )}
      </section>

      <section aria-labelledby="erledigt-h" className="mt-12">
        <h2 id="erledigt-h" className="display-3 text-ink">Erledigt</h2>
        {ledger.months.length === 0 ? (
          <p className="mt-3 text-[15px] text-ink-muted">Noch nichts abgerechnet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {ledger.months.map((m) => (
              <div key={m.month}>
                <h3 className="text-[15px] font-semibold text-ink">{monthLabel(m.month, year)}: {m.count} {m.count === 1 ? "Auftrag" : "Aufträge"} · {formatPrice(m.total)}</h3>
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
                  {m.items.map((i) => {
                    const v = toPartnerView(i, partner.id);
                    return (
                      <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{formatDateShort(v.deliveryDate)}</p>
                          <p className="truncate text-ink-muted">{bouquetSummary(v)}{v.cancelled ? " · storniert" : ""}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="tabular-nums font-semibold text-ink">{formatPrice(v.amount)}</span>
                          <Badge paid={v.paid} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="mt-12 text-[13px] leading-relaxed text-ink-muted">Fragen zu einem Auftrag oder zur Abrechnung? Antwortet einfach auf die Auftragsmail.</p>
    </Shell>
  );
}
