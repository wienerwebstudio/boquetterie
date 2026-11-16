import type { Metadata } from "next";
import { NewsletterActionPage } from "@/components/content/newsletter-action-page";

export const metadata: Metadata = { title: "Newsletter bestätigen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const OUTCOMES: Record<string, { ok: boolean; title: string; text: string }> = {
  confirmed: { ok: true, title: "Du bist dabei.", text: "Danke – deine Anmeldung zum Newsletter ist bestätigt. Abmelden kannst du dich jederzeit über den Link in jeder Ausgabe." },
  already: { ok: true, title: "Schon bestätigt.", text: "Deine Anmeldung war bereits bestätigt. Du musst nichts weiter tun." },
  invalid: { ok: false, title: "Link ungültig.", text: "Dieser Bestätigungslink ist ungültig oder die Adresse wurde inzwischen gelöscht. Melde dich bei Bedarf einfach neu an." },
  fehler: { ok: false, title: "Das hat nicht geklappt.", text: "Die Bestätigung ist gerade nicht möglich. Bitte öffne den Link später noch einmal." },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const outcome = OUTCOMES[str(sp.status)];
  const id = str(sp.id);
  const token = str(sp.token);
  return (
    <NewsletterActionPage
      title="Newsletter-Anmeldung bestätigen"
      intro="Ein Klick, und du bekommst unseren Newsletter. Abmelden kannst du dich jederzeit."
      action="/api/newsletter/confirm"
      button="Anmeldung bestätigen"
      hidden={id && token ? { id, token } : undefined}
      outcome={outcome}
    />
  );
}
