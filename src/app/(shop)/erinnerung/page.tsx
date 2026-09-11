import type { Metadata } from "next";
import { BellRing, CalendarCheck, MailCheck, Trash2 } from "lucide-react";
import { getOccasions, getSettings } from "@/lib/cms";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { ReminderForm } from "@/components/reminders/reminder-form";

export const metadata: Metadata = {
  title: "Anlass-Erinnerung – nie wieder einen Anlass vergessen",
  description: "Geburtstag, Jahrestag, Muttertag: Wir erinnern dich rechtzeitig per E-Mail, damit die Blumen pünktlich ankommen. Kostenlos, jederzeit löschbar.",
  alternates: { canonical: "/erinnerung" },
};

const STATUS_NOTES: Record<string, { tone: "success" | "info" | "error"; title: string; text: string }> = {
  bestaetigt: { tone: "success", title: "Erinnerung bestätigt.", text: "Wir melden uns rechtzeitig per E-Mail. Du kannst die Erinnerung jederzeit über den Link in der E-Mail löschen." },
  geloescht: { tone: "info", title: "Erinnerung gelöscht.", text: "Du bekommst zu diesem Anlass keine E-Mails mehr von uns." },
  ungueltig: { tone: "error", title: "Dieser Link ist nicht mehr gültig.", text: "Die Erinnerung wurde vielleicht schon gelöscht. Du kannst unten jederzeit eine neue anlegen." },
  fehler: { tone: "error", title: "Das hat gerade nicht geklappt.", text: "Bitte versuch es in einem Moment noch einmal." },
};

const STEPS = [
  { icon: CalendarCheck, title: "Anlass & Datum", text: "Wähle den Anlass, Tag und Monat – auf Wunsch jedes Jahr." },
  { icon: MailCheck, title: "Einmal bestätigen", text: "Du bekommst eine E-Mail mit Bestätigungslink. Erst dann ist die Erinnerung aktiv." },
  { icon: BellRing, title: "Rechtzeitig erinnert", text: "3, 7 oder 14 Tage vorher schreiben wir dir – mit Link zu passenden Sträußen." },
  { icon: Trash2, title: "Jederzeit löschen", text: "Jede Erinnerung hat einen Lösch-Link. Keine Werbung, kein Newsletter." },
];

export default async function ReminderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, occasions, settings] = await Promise.all([searchParams, getOccasions(), getSettings()]);
  const note = typeof sp.status === "string" ? STATUS_NOTES[sp.status] : undefined;
  const options = occasions.map((o) => ({ slug: o.slug, name: o.name }));

  return (
    <article>
      <PageHeader
        eyebrow="Service"
        title="Nie wieder einen Anlass vergessen."
        intro="Geburtstag, Jahrestag, Muttertag – wir erinnern dich ein paar Tage vorher per E-Mail. Genug Zeit, um Blumen auszusuchen und das Wunschdatum zu wählen."
        crumbs={[{ label: "Anlass-Erinnerung" }]}
      />

      <div className="container-x py-14 sm:py-20 lg:py-24">
        {note && (
          <div
            role={note.tone === "error" ? "alert" : "status"}
            className={
              "mb-10 max-w-3xl rounded-md border px-5 py-4 " +
              (note.tone === "success" ? "border-success/30 bg-[#eaf3ee]" : note.tone === "error" ? "border-danger/30 bg-rose-100/60" : "border-line bg-white/70")
            }
          >
            <p className="font-semibold text-ink">{note.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{note.text}</p>
          </div>
        )}

        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
          <section aria-labelledby="how-heading" className="space-y-10">
            <div>
              <p className="eyebrow mb-3">So funktioniert’s</p>
              <h2 id="how-heading" className="display-3 text-ink">Einmal eintragen, entspannt bleiben</h2>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li key={s.title} className="grid grid-cols-[auto_1fr] gap-x-4 py-5">
                    <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full bg-ivory-100 text-forest"><Icon className="size-4" aria-hidden /></span>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Schritt {i + 1}</p>
                      <p className="mt-1 font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-[14.5px] leading-relaxed text-ink-muted">{s.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="reminder-form-heading" className="rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
            <p className="eyebrow mb-3">Erinnerung</p>
            <h2 id="reminder-form-heading" className="display-3 text-ink">Woran sollen wir dich erinnern?</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
              Kostenlos und ohne Konto. Wir schreiben dir nur zu diesem Anlass – sonst nichts.
            </p>
            <ReminderForm occasions={options} className="mt-8" />
          </section>
        </div>
      </div>

      <JsonLd data={breadcrumbLd([{ name: "Start", url: "/" }, { name: "Anlass-Erinnerung", url: "/erinnerung" }], settings)} />
    </article>
  );
}
