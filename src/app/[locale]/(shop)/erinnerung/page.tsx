import type { Metadata } from "next";
import { BellRing, CalendarCheck, MailCheck, Trash2 } from "lucide-react";
import { getOccasions, getSettings } from "@/lib/cms";
import { breadcrumbLd, JsonLd } from "@/lib/seo";
import { PageHeader } from "@/components/content/page-header";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { pageMetadata } from "@/lib/metadata";
import { getCapabilities } from "@/lib/capabilities";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/urls";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [{ reminders }, { m }] = await Promise.all([getCapabilities(), getI18n()]);
  return pageMetadata({
    noindex: !reminders,
    title: m.reminders.page.metaTitle,
    description: m.reminders.page.metaDescription,
    path: "/erinnerung",
  });
}

/** `?status=` value → tone and key of its texts in `reminders.page.status`. */
const STATUS_NOTES: Record<string, { tone: "success" | "info" | "error"; key: "confirmed" | "deleted" | "invalid" | "error" }> = {
  bestaetigt: { tone: "success", key: "confirmed" },
  geloescht: { tone: "info", key: "deleted" },
  ungueltig: { tone: "error", key: "invalid" },
  fehler: { tone: "error", key: "error" },
};

/** Texts come from `reminders.page.steps` (by key). */
const STEPS = [
  { icon: CalendarCheck, key: "occasion" },
  { icon: MailCheck, key: "confirm" },
  { icon: BellRing, key: "remind" },
  { icon: Trash2, key: "delete" },
] as const;

export default async function ReminderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, occasions, settings, capabilities, { m, fmt }] = await Promise.all([searchParams, getOccasions(), getSettings(), getCapabilities(), getI18n()]);
  const t = m.reminders.page;
  const status = typeof sp.status === "string" ? STATUS_NOTES[sp.status] : undefined;
  const note = status ? { tone: status.tone, ...t.status[status.key] } : undefined;
  const options = occasions.map((o) => ({ slug: o.slug, name: o.name }));

  return (
    <article>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
        crumbs={[{ label: t.breadcrumb }]}
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
              <p className="eyebrow mb-3">{t.howEyebrow}</p>
              <h2 id="how-heading" className="display-3 text-ink">{t.howTitle}</h2>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const step = t.steps[s.key];
                return (
                  <li key={s.key} className="grid grid-cols-[auto_1fr] gap-x-4 py-5">
                    <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full bg-ivory-100 text-forest"><Icon className="size-4" aria-hidden /></span>
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft">{fmt(t.step, { number: i + 1 })}</p>
                      <p className="mt-1 font-semibold text-ink">{step.title}</p>
                      <p className="mt-1 text-[14.5px] leading-relaxed text-ink-muted">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="reminder-form-heading" className="rounded-md border border-line bg-white/70 p-6 shadow-soft sm:p-10">
            <p className="eyebrow mb-3">{t.formEyebrow}</p>
            <h2 id="reminder-form-heading" className="display-3 text-ink">{t.formTitle}</h2>
            {capabilities.reminders ? (
              <>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
                  {t.formIntro}
                </p>
                <ReminderForm occasions={options} className="mt-8" />
              </>
            ) : (
              <div role="note" className="mt-6 rounded-md border border-line-strong bg-ivory-100 px-5 py-5">
                <p className="font-semibold text-ink">{t.unavailableTitle}</p>
                <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-ink-muted">
                  {t.unavailableText}
                </p>
                <Button href={routes.shop} variant="outline" className="mt-5">{t.unavailableCta}</Button>
              </div>
            )}
          </section>
        </div>
      </div>

      <JsonLd data={breadcrumbLd([{ name: t.breadcrumbHome, url: "/" }, { name: t.breadcrumb, url: "/erinnerung" }], settings)} />
    </article>
  );
}
